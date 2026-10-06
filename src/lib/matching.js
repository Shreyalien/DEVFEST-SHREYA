/** Pure matching/status rules. No sample-specific logic. */

const ISO = /^\d{4}-\d{2}-\d{2}$/

/** Map of docId -> original docId for byte-identical copies (first upload is the original). */
export function computeDuplicates(items) {
  const firstByHash = new Map()
  const copies = new Map()
  for (const doc of items) {
    if (doc.status !== 'ready' || !doc.hash) continue
    const first = firstByHash.get(doc.hash)
    if (first === undefined) firstByHash.set(doc.hash, doc.id)
    else copies.set(doc.id, first)
  }
  return copies
}

/** Exactly one of: missing | notProvided | expiryNeeded | expired | ok */
export function deriveStatus(requirement, docId, expiry, deadline) {
  if (!docId) return requirement.mandatory ? 'missing' : 'notProvided'
  if (!requirement.hasExpiry) return 'ok'
  if (!expiry) return 'expiryNeeded'
  // Equality with the deadline is valid; only strictly earlier dates are expired.
  if (ISO.test(expiry) && ISO.test(deadline) && expiry < deadline) return 'expired'
  return 'ok'
}

/**
 * Can `docId` be assigned to `reqId`?
 * Rules: one requirement per file, and byte-identical copies may not serve different requirements.
 * @returns {{ ok: true } | { ok: false, reason: 'usedFor' | 'duplicateUsed', reqId: string }}
 */
export function canAssign({ reqId, docId, assignments, items }) {
  for (const [otherReq, otherDoc] of Object.entries(assignments)) {
    if (otherReq === reqId) continue
    if (otherDoc === docId) return { ok: false, reason: 'usedFor', reqId: otherReq }
  }
  const doc = items.find((d) => d.id === docId)
  if (doc?.hash) {
    for (const [otherReq, otherDoc] of Object.entries(assignments)) {
      if (otherReq === reqId || otherDoc === docId) continue
      const twin = items.find((d) => d.id === otherDoc)
      if (twin?.hash === doc.hash) return { ok: false, reason: 'duplicateUsed', reqId: otherReq }
    }
  }
  return { ok: true }
}
