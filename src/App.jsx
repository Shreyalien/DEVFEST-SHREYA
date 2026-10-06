import { useEffect, useMemo, useState } from 'react'
import { getLocale, t } from './i18n/index.js'
import { Header, WorkflowNav } from './components/Header.jsx'
import { TenderPanel } from './components/TenderPanel.jsx'
import { DocumentsPanel } from './components/DocumentsPanel.jsx'
import { RequirementsPanel } from './components/RequirementsPanel.jsx'
import { ActionBar, getBlockers } from './components/ActionBar.jsx'
import { useDocuments } from './hooks/useDocuments.js'
import { useMatching } from './hooks/useMatching.js'
import { computeDuplicates, deriveStatus } from './lib/matching.js'
import { MAX_REQUIREMENTS_FILE_BYTES } from './lib/limits.js'
import { parseRequirementsText } from './lib/requirements.js'
import { loadSamplePack } from './lib/sample.js'
import { generatePackagePdf } from './lib/generator.js'

export default function App() {
  const [currentLocale, setCurrentLocale] = useState(getLocale())
  const documents = useDocuments()
  const [data, setData] = useState(null) // { tender, requirements, sourceName }
  const [importErrors, setImportErrors] = useState(null)
  const [busy, setBusy] = useState(null) // 'import' | 'sample' | null
  const [generating, setGenerating] = useState(false)
  const [lastGenerated, setLastGenerated] = useState(null) // { blob, filename, totalPages, download }

  const matching = useMatching(data?.requirements, documents.items)
  const duplicates = useMemo(() => computeDuplicates(documents.items), [documents.items])

  // Invalidate generated results whenever assignments, expiries, files, or requirements change
  useEffect(() => {
    setLastGenerated(null)
  }, [matching.assignments, matching.expiries, documents.items, data])

  const applyRequirementsText = (text, sourceName) => {
    const result = parseRequirementsText(text)
    if (result.ok) {
      setData({ tender: result.tender, requirements: result.requirements, sourceName })
      setImportErrors(null)
      matching.reset()
      setLastGenerated(null)
      return true
    }
    // A failed import never discards the tender that is already loaded.
    setImportErrors(result.errors)
    return false
  }

  const importFile = async (file) => {
    setBusy('import')
    try {
      if (file.size > MAX_REQUIREMENTS_FILE_BYTES) {
        setImportErrors([{ key: 'errors.jsonTooLarge' }])
        return
      }
      applyRequirementsText(await file.text(), file.name)
    } catch {
      setImportErrors([{ key: 'errors.readFailed', params: { name: file.name } }])
    } finally {
      setBusy(null)
    }
  }

  const loadSample = async () => {
    setBusy('sample')
    try {
      const sample = await loadSamplePack()
      if (applyRequirementsText(sample.requirementsText, 'sample pack')) {
        documents.clearAll()
        await documents.addFiles(sample.files)
      }
    } catch (error) {
      setImportErrors([{ key: 'errors.sampleFailed', params: { detail: error.message } }])
    } finally {
      setBusy(null)
    }
  }

  const deadline = data?.tender.submission_deadline ?? ''
  const rows = data?.requirements.map((req) => {
    const docId = matching.assignments[req.id]
    const expiry = matching.expiries[req.id]
    return { req, docId, expiry, status: deriveStatus(req, docId, expiry, deadline) }
  }) ?? null

  const itemById = Object.fromEntries(documents.items.map((d) => [d.id, d]))
  const matchTitles = Object.fromEntries(
    (rows ?? []).filter((r) => r.docId).map((r) => [r.docId, r.req.title || r.req.title_en])
  )
  const duplicateNames = Object.fromEntries(
    [...duplicates].map(([copy, original]) => [copy, itemById[original]?.name])
  )

  const handleGenerate = async () => {
    if (!data?.tender || !rows) return

    // Revalidate on click
    const counts = {
      ok: rows.filter((r) => r.status === 'ok').length,
      missing: rows.filter((r) => r.status === 'missing').length,
      expiryNeeded: rows.filter((r) => r.status === 'expiryNeeded').length,
      expired: rows.filter((r) => r.status === 'expired').length,
      notProvided: rows.filter((r) => r.status === 'notProvided').length,
    }
    const blockers = getBlockers({ rows, items: documents.items, counts })
    if (blockers.length > 0) return

    setGenerating(true)
    try {
      const { bytes, filename, totalPages } = await generatePackagePdf({
        tender: data.tender,
        rows,
        items: documents.items,
      })

      const blob = new Blob([bytes], { type: 'application/pdf' })
      const download = () => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      }

      // Automatically trigger download
      download()
      setLastGenerated({ blob, filename, totalPages, download })
    } catch (err) {
      console.error('PDF Generation Error:', err)
      alert(t('errors.generateFailed', { detail: err.message }))
    } finally {
      setGenerating(false)
    }
  }

  const readyDocs = documents.items.filter((d) => d.status === 'ready').length
  const isReady = rows !== null && rows.every((r) => r.status === 'ok' || r.status === 'notProvided') && readyDocs > 0

  const steps = [
    { id: 'tender', label: t('nav.tender'), done: Boolean(data) },
    { id: 'documents', label: t('nav.documents'), done: readyDocs > 0 },
    { id: 'checklist', label: t('nav.checklist'), done: isReady },
    { id: 'generate', label: t('nav.generate'), done: Boolean(lastGenerated) },
  ].map((step, i, all) => {
    const firstOpen = all.findIndex((s) => !s.done)
    return { ...step, state: step.done ? 'done' : i === firstOpen ? 'current' : 'upcoming' }
  })

  return (
    <div className="app">
      <Header currentLocale={currentLocale} onLocaleChange={setCurrentLocale} />
      <WorkflowNav steps={steps} />
      <main className="layout">
        <div className="layout__side">
          <TenderPanel
            data={data}
            importErrors={importErrors}
            busy={busy}
            onImportFile={importFile}
            onLoadSample={loadSample}
          />
          <DocumentsPanel
            items={documents.items}
            issues={documents.issues}
            matchTitles={matchTitles}
            duplicateNames={duplicateNames}
            disabled={busy === 'sample'}
            onAddFiles={documents.addFiles}
            onRemove={documents.removeFile}
            onDismissIssues={documents.dismissIssues}
          />
        </div>
        <RequirementsPanel
          rows={rows}
          items={documents.items}
          assignments={matching.assignments}
          deadline={deadline}
          onAssign={matching.assign}
          onExpiry={matching.setExpiry}
          onUndo={matching.undo}
          canUndo={matching.canUndo}
        />
      </main>
      <ActionBar
        rows={rows}
        items={documents.items}
        generating={generating}
        onGenerate={handleGenerate}
        lastGenerated={lastGenerated}
      />
    </div>
  )
}
