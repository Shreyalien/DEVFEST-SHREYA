import { useCallback, useMemo, useState } from 'react'
import { canAssign } from '../lib/matching.js'

const EMPTY = { assignments: {}, expiries: {} }

/**
 * Editable, undoable matching state. Entries pointing at removed/unready files are
 * filtered out of `live`, so removal never leaves stale assignments or expiry dates.
 */
export function useMatching(requirements, items) {
  const [state, setState] = useState(EMPTY)
  const [history, setHistory] = useState([])

  const live = useMemo(() => {
    const readyIds = new Set(items.filter((d) => d.status === 'ready').map((d) => d.id))
    const reqIds = new Set((requirements ?? []).map((r) => r.id))
    const assignments = {}
    for (const [reqId, docId] of Object.entries(state.assignments)) {
      if (reqIds.has(reqId) && readyIds.has(docId)) assignments[reqId] = docId
    }
    const expiries = {}
    for (const [reqId, date] of Object.entries(state.expiries)) {
      if (assignments[reqId]) expiries[reqId] = date
    }
    return { assignments, expiries }
  }, [state, items, requirements])

  const commit = useCallback(
    (next) => {
      setHistory((h) => [...h.slice(-49), live])
      setState(next)
    },
    [live],
  )

  const assign = useCallback(
    (reqId, docId) => {
      if (live.assignments[reqId] === (docId || undefined)) return { ok: true }
      const assignments = { ...live.assignments }
      const expiries = { ...live.expiries }
      if (!docId) {
        delete assignments[reqId]
      } else {
        const check = canAssign({ reqId, docId, assignments: live.assignments, items })
        if (!check.ok) return check
        assignments[reqId] = docId
      }
      delete expiries[reqId] // an expiry date belongs to the file it was entered for
      commit({ assignments, expiries })
      return { ok: true }
    },
    [live, items, commit],
  )

  const setExpiry = useCallback(
    (reqId, value) => {
      if (!live.assignments[reqId] || (live.expiries[reqId] ?? '') === value) return
      const expiries = { ...live.expiries }
      if (value) expiries[reqId] = value
      else delete expiries[reqId]
      commit({ assignments: live.assignments, expiries })
    },
    [live, commit],
  )

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h
      setState(h[h.length - 1])
      return h.slice(0, -1)
    })
  }, [])

  const reset = useCallback(() => {
    setState(EMPTY)
    setHistory([])
  }, [])

  return { ...live, assign, setExpiry, undo, reset, canUndo: history.length > 0 }
}
