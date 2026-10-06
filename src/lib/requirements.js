const TENDER_FIELDS = ['tender_id', 'title', 'procuring_entity', 'bidder', 'submission_deadline']

const isText = (v) => typeof v === 'string' && v.trim() !== ''
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

const REQUIREMENT_CHECKS = [
  ['id', isText, 'text'],
  ['order', (v) => typeof v === 'number' && Number.isFinite(v), 'number'],
  ['title_en', isText, 'text'],
  ['mandatory', (v) => typeof v === 'boolean', 'boolean'],
  ['has_expiry', (v) => typeof v === 'boolean', 'boolean'],
]

/**
 * Validates the text of a requirements file.
 * Errors are `{ key, params }` descriptors so the UI can translate them.
 * @returns {{ ok: true, tender, requirements } | { ok: false, errors: {key: string, params?: object}[] }}
 */
export function parseRequirementsText(text) {
  let data
  try {
    data = JSON.parse(text.replace(/^\uFEFF/, ''))
  } catch (error) {
    return { ok: false, errors: [{ key: 'errors.jsonInvalid', params: { detail: error.message } }] }
  }

  if (!isPlainObject(data)) return { ok: false, errors: [{ key: 'errors.notObject' }] }

  const errors = []

  if (!isPlainObject(data.tender)) {
    errors.push({ key: 'errors.tenderMissing' })
  } else {
    for (const field of TENDER_FIELDS) {
      if (!isText(data.tender[field])) errors.push({ key: 'errors.tenderField', params: { field } })
    }
  }

  if (!Array.isArray(data.requirements)) {
    errors.push({ key: 'errors.requirementsMissing' })
  } else if (data.requirements.length === 0) {
    errors.push({ key: 'errors.requirementsEmpty' })
  } else {
    const seen = new Set()
    data.requirements.forEach((item, i) => {
      const index = i + 1
      if (!isPlainObject(item)) {
        errors.push({ key: 'errors.itemNotObject', params: { index } })
        return
      }
      for (const [field, check, expected] of REQUIREMENT_CHECKS) {
        if (!check(item[field])) {
          errors.push({
            key: 'errors.itemField',
            params: { index, field, expected: `errors.expected.${expected}` },
          })
        }
      }
      if (isText(item.id)) {
        if (seen.has(item.id)) errors.push({ key: 'errors.duplicateId', params: { id: item.id } })
        seen.add(item.id)
      }
    })
  }

  if (errors.length > 0) return { ok: false, errors }

  const tender = Object.fromEntries(TENDER_FIELDS.map((f) => [f, data.tender[f].trim()]))
  const requirements = data.requirements
    .map((item, position) => ({
      id: item.id,
      order: item.order,
      title: item.title_en.trim(),
      titleBn: typeof item.title_bn === 'string' ? item.title_bn : null,
      mandatory: item.mandatory,
      hasExpiry: item.has_expiry,
      position,
    }))
    .sort((a, b) => a.order - b.order || a.position - b.position)
    .map(({ position: _position, ...rest }) => rest)

  return { ok: true, tender, requirements }
}

/** Initial checklist status before any matching exists. */
export function initialStatus(requirement) {
  return requirement.mandatory ? 'missing' : 'notProvided'
}
