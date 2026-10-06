import en from './en.js'
import bn from './bn.js'

const locales = { en, bn }
let activeLocale = 'en'
const listeners = new Set()

function lookup(messages, key) {
  return key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), messages)
}

/**
 * Translate a dotted key, e.g. t('documents.page', { count: 3 }).
 * `{name}` placeholders are replaced from params; `_one` / `_other`
 * variants are picked from params.count.
 */
export function t(key, params = {}) {
  const messages = locales[activeLocale] ?? en
  let resolvedKey = key
  if (typeof params.count === 'number') {
    const suffix = params.count === 1 ? '_one' : '_other'
    if (lookup(messages, key + suffix) !== undefined) resolvedKey = key + suffix
  }
  const template = lookup(messages, resolvedKey) ?? lookup(en, resolvedKey)
  if (typeof template !== 'string') return key
  return template.replace(/\{(\w+)\}/g, (_, name) => (params[name] ?? `{${name}}`))
}

export function getLocale() {
  return activeLocale
}

export function setLocale(locale) {
  if (locales[locale] && activeLocale !== locale) {
    activeLocale = locale
    listeners.forEach((fn) => fn(activeLocale))
  }
}

export function subscribeLocale(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
