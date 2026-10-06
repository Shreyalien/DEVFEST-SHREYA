import { t } from '../i18n/index.js'

/** Turns a `{ key, params }` descriptor into display text, translating nested keys. */
export function describe(message) {
  const params = { ...(message.params ?? {}) }
  for (const [name, value] of Object.entries(params)) {
    if (typeof value === 'string' && value.startsWith('errors.expected.')) params[name] = t(value)
  }
  return t(message.key, params)
}
