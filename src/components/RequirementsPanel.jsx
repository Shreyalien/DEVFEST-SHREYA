import { CalendarClock, ClipboardList, Undo2 } from 'lucide-react'
import { t } from '../i18n/index.js'
import { formatDeadline } from '../lib/limits.js'
import { canAssign } from '../lib/matching.js'

export function RequirementsPanel({ rows, items, assignments, deadline, onAssign, onExpiry, onUndo, canUndo }) {
  const mandatoryCount = rows?.filter((r) => r.req.mandatory).length ?? 0
  const readyDocs = items.filter((d) => d.status === 'ready')
  const titleOf = (reqId) => rows.find((r) => r.req.id === reqId)?.req.title ?? ''

  return (
    <section className="panel panel--workspace" id="checklist" aria-labelledby="requirements-title">
      <div className="panel__head">
        <h2 id="requirements-title" className="panel__title">
          {t('requirements.title')}
        </h2>
        <div className="panel__tools">
          {rows && (
            <p className="usage">
              {t('requirements.count', { count: rows.length })} · {t('requirements.mandatoryCount', { count: mandatoryCount })}
            </p>
          )}
          {rows && (
            <button type="button" className="btn btn--secondary btn--small" onClick={onUndo} disabled={!canUndo}>
              <Undo2 size={15} aria-hidden="true" />
              {t('requirements.undo')}
            </button>
          )}
        </div>
      </div>

      {rows ? (
        <ol className="reqs" aria-label={t('requirements.listLabel')}>
          {rows.map(({ req, docId, expiry, status }, index) => {
            const statusText = t(`requirements.${status}`)
            const selectId = `match-${req.id}`
            const dateId = `expiry-${req.id}`
            return (
              <li key={req.id} className="req">
                <span className="req__num" aria-hidden="true">
                  {index + 1}
                </span>
                <div className="req__main">
                  <p className="req__title">{req.title}</p>
                  <p className="req__meta">
                    <span className={`tag ${req.mandatory ? 'tag--mandatory' : 'tag--optional'}`}>
                      {req.mandatory ? t('requirements.mandatory') : t('requirements.optional')}
                    </span>
                    <span className={`expiry${req.hasExpiry ? ' expiry--yes' : ''}`}>
                      {req.hasExpiry && <CalendarClock size={14} aria-hidden="true" />}
                      {req.hasExpiry ? t('requirements.expiryRequired') : t('requirements.noExpiry')}
                    </span>
                  </p>
                  <div className="req__edit">
                    <div className="field">
                      <label htmlFor={selectId}>{t('requirements.document')}</label>
                      <select id={selectId} value={docId ?? ''} onChange={(e) => onAssign(req.id, e.target.value)}>
                        <option value="">{t('requirements.noDocument')}</option>
                        {readyDocs.map((doc) => {
                          const check = canAssign({ reqId: req.id, docId: doc.id, assignments, items })
                          const label = check.ok
                            ? doc.name
                            : t(check.reason === 'usedFor' ? 'requirements.optionUsed' : 'requirements.optionDuplicate', {
                                name: doc.name,
                                title: titleOf(check.reqId),
                              })
                          return (
                            <option key={doc.id} value={doc.id} disabled={!check.ok}>
                              {label}
                            </option>
                          )
                        })}
                      </select>
                    </div>
                    {docId && req.hasExpiry && (
                      <div className="field">
                        <label htmlFor={dateId}>{t('requirements.expiryDate')}</label>
                        <input id={dateId} type="date" value={expiry ?? ''} onChange={(e) => onExpiry(req.id, e.target.value)} aria-describedby={`${dateId}-hint`} />
                        <p id={`${dateId}-hint`} className={`hint${status === 'expired' ? ' hint--error' : ''}`}>
                          {t(status === 'expired' ? 'requirements.expiredHint' : 'requirements.expiryHint', { deadline: formatDeadline(deadline) })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <span className={`status status--${status}`} aria-label={t('requirements.statusLabel', { status: statusText })}>
                  {statusText}
                </span>
              </li>
            )
          })}
        </ol>
      ) : (
        <div className="empty empty--large">
          <ClipboardList size={32} strokeWidth={1.5} aria-hidden="true" />
          <p className="empty__title">{t('requirements.emptyTitle')}</p>
          <p className="empty__body">{t('requirements.emptyBody')}</p>
        </div>
      )}
    </section>
  )
}
