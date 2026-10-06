import { Download, LoaderCircle, PackageCheck } from 'lucide-react'
import { t } from '../i18n/index.js'

const STATUS_KEYS = ['ok', 'missing', 'expiryNeeded', 'expired', 'notProvided']

export function getBlockers({ rows, items, counts }) {
  const blockers = []
  if (!rows) blockers.push(t('readiness.needTender'))
  if (items.some((d) => d.status === 'loading')) blockers.push(t('readiness.waitReading'))
  if (counts.missing > 0) blockers.push(t('readiness.missingMandatory', { count: counts.missing }))
  if (counts.expiryNeeded > 0) blockers.push(t('readiness.expiryNeeded', { count: counts.expiryNeeded }))
  if (counts.expired > 0) blockers.push(t('readiness.expired', { count: counts.expired }))
  return blockers
}

export function ActionBar({ rows, items, generating, onGenerate, lastGenerated }) {
  const counts = Object.fromEntries(STATUS_KEYS.map((k) => [k, rows?.filter((r) => r.status === k).length ?? 0]))
  const blockers = getBlockers({ rows, items, counts })
  const isReady = rows !== null && blockers.length === 0 && !generating

  return (
    <aside className="actionbar" id="generate" aria-labelledby="readiness-title">
      <div className="actionbar__inner">
        <div className="actionbar__info">
          <h2 id="readiness-title" className="actionbar__title">
            {t('readiness.title')}:{' '}
            <span className={`actionbar__state ${isReady ? 'actionbar__state--ready' : ''}`}>
              {isReady ? t('readiness.ready') : t('readiness.notReady')}
            </span>
          </h2>
          {rows && <p className="actionbar__counts">{t('readiness.summary', counts)}</p>}
          {blockers.length > 0 ? (
            <p className="actionbar__remaining" id="generate-reason">
              <strong>{t('readiness.remainingLabel')}</strong> {blockers.join(' · ')}
            </p>
          ) : lastGenerated ? (
            <p className="actionbar__success">
              {t('readiness.successBody', { pages: lastGenerated.totalPages })}
            </p>
          ) : null}
        </div>

        <div className="actionbar__btns">
          {lastGenerated && (
            <button
              type="button"
              className="btn btn--secondary btn--large"
              onClick={lastGenerated.download}
            >
              <Download size={18} aria-hidden="true" />
              {t('readiness.download')}
            </button>
          )}

          <button
            type="button"
            className="btn btn--primary btn--large"
            disabled={!isReady}
            onClick={onGenerate}
            aria-describedby={!isReady ? 'generate-reason' : undefined}
          >
            {generating ? (
              <LoaderCircle size={18} className="spin" aria-hidden="true" />
            ) : (
              <PackageCheck size={18} aria-hidden="true" />
            )}
            {generating ? t('readiness.generating') : t('readiness.generate')}
          </button>
        </div>
      </div>
    </aside>
  )
}
