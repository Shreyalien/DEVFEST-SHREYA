import { useRef } from 'react'
import { AlertCircle, FileJson, FlaskConical, LoaderCircle } from 'lucide-react'
import { t } from '../i18n/index.js'
import { formatDeadline } from '../lib/limits.js'
import { describe } from '../lib/messages.js'

const MAX_SHOWN_ERRORS = 6

export function TenderPanel({ data, importErrors, busy, onImportFile, onLoadSample }) {
  const inputRef = useRef(null)
  const working = busy !== null
  const tender = data?.tender

  const handleChange = (event) => {
    const file = event.target.files?.[0]
    event.target.value = '' // allow choosing the same file again
    if (file) onImportFile(file)
  }

  const fields = tender
    ? [
        ['id', t('tender.id'), tender.tender_id],
        ['name', t('tender.name'), tender.title],
        ['entity', t('tender.entity'), tender.procuring_entity],
        ['bidder', t('tender.bidder'), tender.bidder],
        ['deadline', t('tender.deadline'), formatDeadline(tender.submission_deadline)],
      ]
    : []

  return (
    <section className="panel" id="tender" aria-labelledby="tender-title">
      <div className="panel__head">
        <h2 id="tender-title" className="panel__title">
          {t('tender.title')}
        </h2>
      </div>

      <div className="toolbar">
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          className="visually-hidden"
          onChange={handleChange}
          tabIndex={-1}
          aria-label={t('tender.importHint')}
        />
        <button
          type="button"
          className={`btn ${tender ? 'btn--secondary' : 'btn--primary'}`}
          onClick={() => inputRef.current?.click()}
          disabled={working}
        >
          {busy === 'import' ? <LoaderCircle size={16} className="spin" aria-hidden="true" /> : <FileJson size={16} aria-hidden="true" />}
          {busy === 'import' ? t('tender.importing') : t('tender.import')}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onLoadSample} disabled={working} title={t('tender.sampleHint')}>
          {busy === 'sample' ? <LoaderCircle size={16} className="spin" aria-hidden="true" /> : <FlaskConical size={16} aria-hidden="true" />}
          {busy === 'sample' ? t('tender.sampleLoading') : t('tender.sample')}
        </button>
      </div>

      {importErrors && (
        <div className="alert alert--error" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <div>
            <p className="alert__title">{t('errors.importTitle')}</p>
            <ul className="alert__list">
              {importErrors.slice(0, MAX_SHOWN_ERRORS).map((error, i) => (
                <li key={i}>{describe(error)}</li>
              ))}
            </ul>
            {importErrors.length > MAX_SHOWN_ERRORS && (
              <p className="alert__more">{t('errors.importMore', { count: importErrors.length - MAX_SHOWN_ERRORS })}</p>
            )}
          </div>
        </div>
      )}

      {tender ? (
        <dl className="facts">
          {fields.map(([key, label, value]) => (
            <div key={key} className={`facts__row facts__row--${key}`}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <div className="empty">
          <FileJson size={28} strokeWidth={1.5} aria-hidden="true" />
          <p className="empty__title">{t('tender.emptyTitle')}</p>
          <p className="empty__body">{t('tender.emptyBody')}</p>
        </div>
      )}
      {data?.sourceName && <p className="source">{t('tender.loadedFrom', { name: data.sourceName })}</p>}
    </section>
  )
}
