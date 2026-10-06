import { PackageCheck } from 'lucide-react'
import { t } from '../i18n/index.js'

const STATUS_KEYS = ['ok', 'missing', 'expiryNeeded', 'expired', 'notProvided']

function getRemaining({ rows, items, counts }) {
  const remaining = []
  if (!rows) remaining.push(t('readiness.needTender'))
  if (items.some((d) => d.status === 'loading')) remaining.push(t('readiness.waitReading'))
  if (counts.missing > 0) remaining.push(t('readiness.missingMandatory', { count: counts.missing }))
  if (counts.expiryNeeded > 0) remaining.push(t('readiness.expiryNeeded', { count: counts.expiryNeeded }))
  if (counts.expired > 0) remaining.push(t('readiness.expired', { count: counts.expired }))
  // Generation is implemented in the next step, so the package can never be ready yet.
  remaining.push(t('readiness.needGeneration'))
  return remaining
}

export function ActionBar({ rows, items }) {
  const counts = Object.fromEntries(STATUS_KEYS.map((k) => [k, rows?.filter((r) => r.status === k).length ?? 0]))
  const remaining = getRemaining({ rows, items, counts })

  return (
    <aside className="actionbar" id="generate" aria-labelledby="readiness-title">
      <div className="actionbar__inner">
        <div className="actionbar__info">
          <h2 id="readiness-title" className="actionbar__title">
            {t('readiness.title')}: <span className="actionbar__state">{t('readiness.notReady')}</span>
          </h2>
          {rows && <p className="actionbar__counts">{t('readiness.summary', counts)}</p>}
          <p className="actionbar__remaining" id="generate-reason">
            <strong>{t('readiness.remainingLabel')}</strong> {remaining.join(' · ')}
          </p>
        </div>
        <button type="button" className="btn btn--primary btn--large" disabled aria-describedby="generate-reason">
          <PackageCheck size={18} aria-hidden="true" />
          {t('readiness.generate')}
        </button>
      </div>
    </aside>
  )
}
