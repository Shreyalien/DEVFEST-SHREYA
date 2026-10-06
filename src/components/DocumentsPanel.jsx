import { useRef, useState } from 'react'
import { AlertCircle, FileText, LoaderCircle, Trash2, Upload, X } from 'lucide-react'
import { t } from '../i18n/index.js'
import { MAX_PDF_FILES, MAX_TOTAL_BYTES, formatBytes } from '../lib/limits.js'
import { describe } from '../lib/messages.js'

export function DocumentsPanel({ items, issues, matchTitles, duplicateNames, disabled, onAddFiles, onRemove, onDismissIssues }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const totalBytes = items.reduce((sum, d) => sum + d.size, 0)
  const sizePercent = Math.min(100, (totalBytes / MAX_TOTAL_BYTES) * 100)

  const handleChange = (event) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    onAddFiles(files)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setDragging(false)
    if (!disabled) onAddFiles(Array.from(event.dataTransfer.files))
  }

  return (
    <section className="panel" id="documents" aria-labelledby="documents-title">
      <div className="panel__head">
        <h2 id="documents-title" className="panel__title">
          {t('documents.title')}
        </h2>
        <p className="usage" aria-live="polite">
          {t('documents.usage', { count: items.length, max: MAX_PDF_FILES })}
        </p>
      </div>

      <div
        className={`dropzone${dragging ? ' dropzone--active' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <Upload size={22} strokeWidth={1.75} aria-hidden="true" />
        <p className="dropzone__title">{t('documents.dropTitle')}</p>
        <p className="dropzone__body">{t('documents.dropBody')}</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,application/pdf"
          className="visually-hidden"
          onChange={handleChange}
          tabIndex={-1}
          aria-label={t('documents.choose')}
        />
        <button type="button" className="btn btn--primary" onClick={() => inputRef.current?.click()} disabled={disabled}>
          <Upload size={16} aria-hidden="true" />
          {t('documents.choose')}
        </button>
        <p className="dropzone__limits">{t('documents.limits', { maxFiles: MAX_PDF_FILES, maxSize: formatBytes(MAX_TOTAL_BYTES) })}</p>
      </div>

      <div className="meter" aria-hidden="true">
        <div className="meter__bar" style={{ width: `${sizePercent}%` }} />
      </div>
      <p className="meter__label">
        {t('documents.usageSize', { used: formatBytes(totalBytes), limit: formatBytes(MAX_TOTAL_BYTES) })}
      </p>

      {issues.length > 0 && (
        <div className="alert alert--error" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <div className="alert__body">
            <p className="alert__title">{t('documents.issuesTitle', { count: issues.length })}</p>
            <ul className="alert__list">
              {issues.map((issue) => (
                <li key={issue.id}>{describe(issue)}</li>
              ))}
            </ul>
          </div>
          <button type="button" className="icon-btn" onClick={onDismissIssues} aria-label={t('documents.dismiss')}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="empty">
          <FileText size={28} strokeWidth={1.5} aria-hidden="true" />
          <p className="empty__title">{t('documents.emptyTitle')}</p>
          <p className="empty__body">{t('documents.emptyBody')}</p>
        </div>
      ) : (
        <ul className="files" aria-label={t('documents.listLabel')}>
          {items.map((doc) => (
            <li key={doc.id} className="file">
              <FileText size={18} strokeWidth={1.75} className="file__icon" aria-hidden="true" />
              <div className="file__text">
                <span className="file__name" title={doc.name}>
                  {doc.name}
                </span>
                <span className="file__meta">
                  {doc.status === 'loading' ? (
                    <>
                      <LoaderCircle size={13} className="spin" aria-hidden="true" /> {t('documents.reading')}
                    </>
                  ) : (
                    <>
                      {t('documents.page', { count: doc.pages })} · {formatBytes(doc.size)}
                    </>
                  )}
                </span>
                {doc.status === 'ready' && (
                  <span className="file__tags">
                    <span className={`tag ${matchTitles[doc.id] ? 'tag--matched' : 'tag--optional'}`}>
                      {matchTitles[doc.id] ? t('documents.matchedTo', { title: matchTitles[doc.id] }) : t('documents.unmatched')}
                    </span>
                    {duplicateNames[doc.id] && (
                      <span className="tag tag--duplicate">
                        {t('documents.duplicate')}: {t('documents.duplicateOf', { name: duplicateNames[doc.id] })}
                      </span>
                    )}
                  </span>
                )}
              </div>
              <button type="button" className="icon-btn" onClick={() => onRemove(doc.id)} aria-label={t('documents.remove', { name: doc.name })}>
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
