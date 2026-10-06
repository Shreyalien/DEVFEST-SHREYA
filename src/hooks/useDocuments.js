import { useCallback, useRef, useState } from 'react'
import { MAX_PDF_FILES, MAX_TOTAL_BYTES, formatBytes } from '../lib/limits.js'
import { PdfReadError, looksLikePdf, readPdfInfo } from '../lib/pdf.js'

let nextId = 1
const newId = () => `doc-${nextId++}`

/**
 * Local PDF list. Files never leave the browser.
 * Items: { id, file, name, size, status: 'loading' | 'ready', pages }
 * Issues: { id, key, params } translatable messages for rejected files.
 */
export function useDocuments() {
  const [items, setItems] = useState([])
  const [issues, setIssues] = useState([])
  const itemsRef = useRef([])

  const commit = useCallback((next) => {
    itemsRef.current = next
    setItems(next)
  }, [])

  const pushIssues = useCallback((list) => {
    if (list.length === 0) return
    setIssues((prev) => [...prev, ...list.map((i) => ({ ...i, id: newId() }))])
  }, [])

  const addFiles = useCallback(
    async (fileList) => {
      const files = Array.from(fileList ?? [])
      if (files.length === 0) return
      setIssues([])

      const rejected = []
      const accepted = []
      let count = itemsRef.current.length
      let total = itemsRef.current.reduce((sum, d) => sum + d.size, 0)

      for (const file of files) {
        const params = { name: file.name, max: MAX_PDF_FILES, limit: formatBytes(MAX_TOTAL_BYTES) }
        if (!looksLikePdf(file)) {
          rejected.push({ key: 'errors.notPdf', params })
        } else if (count >= MAX_PDF_FILES) {
          rejected.push({ key: 'errors.tooMany', params })
        } else if (total + file.size > MAX_TOTAL_BYTES) {
          rejected.push({ key: 'errors.tooLarge', params })
        } else {
          accepted.push({ id: newId(), file, name: file.name, size: file.size, status: 'loading', pages: null, hash: null })
          count += 1
          total += file.size
        }
      }

      pushIssues(rejected)
      if (accepted.length === 0) return
      commit([...itemsRef.current, ...accepted])

      for (const item of accepted) {
        try {
          const info = await readPdfInfo(item.file)
          if (!itemsRef.current.some((d) => d.id === item.id)) continue // removed while reading
          commit(itemsRef.current.map((d) => (d.id === item.id ? { ...d, status: 'ready', pages: info.pages, hash: info.hash } : d)))
        } catch (error) {
          if (!itemsRef.current.some((d) => d.id === item.id)) continue
          commit(itemsRef.current.filter((d) => d.id !== item.id))
          const code = error instanceof PdfReadError ? error.code : 'unreadable'
          pushIssues([{ key: `errors.${code}`, params: { name: item.name } }])
        }
      }
    },
    [commit, pushIssues],
  )

  const removeFile = useCallback(
    (id) => commit(itemsRef.current.filter((d) => d.id !== id)),
    [commit],
  )

  const clearAll = useCallback(() => {
    commit([])
    setIssues([])
  }, [commit])

  const dismissIssues = useCallback(() => setIssues([]), [])

  return { items, issues, addFiles, removeFile, clearAll, dismissIssues, pushIssues }
}
