export const MAX_PDF_FILES = 30
export const MAX_TOTAL_BYTES = 50 * 1024 * 1024
export const MAX_REQUIREMENTS_FILE_BYTES = 2 * 1024 * 1024

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Shows ISO dates (YYYY-MM-DD) in a readable form; anything else is shown as written. */
export function formatDeadline(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return value
  const [, y, m, d] = match.map(Number)
  const date = new Date(y, m - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return value
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}
