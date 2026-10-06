import en from './en.js'

const locales = { en }
let activeLocale = 'en'

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

export function setLocale(locale) {
  if (locales[locale]) activeLocale = locale
}
