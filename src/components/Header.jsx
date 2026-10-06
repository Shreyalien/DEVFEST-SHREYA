import { FileStack, Globe, Lock } from 'lucide-react'
import { getLocale, setLocale, t } from '../i18n/index.js'

export function Header({ currentLocale, onLocaleChange }) {
  const toggleLocale = () => {
    const next = currentLocale === 'en' ? 'bn' : 'en'
    setLocale(next)
    onLocaleChange(next)
  }

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">
            <FileStack size={22} strokeWidth={1.75} />
          </span>
          <div>
            <h1 className="brand__name">{t('app.name')}</h1>
            <p className="brand__tagline">{t('app.tagline')}</p>
          </div>
        </div>

        <div className="site-header__actions">
          <button
            type="button"
            className="lang-toggle"
            onClick={toggleLocale}
            aria-label={currentLocale === 'en' ? 'Switch to Bangla' : 'Switch to English'}
          >
            <Globe size={15} aria-hidden="true" />
            <span>{currentLocale === 'en' ? 'বাংলা' : 'English'}</span>
          </button>

          <p className="privacy" title={t('app.privacyHint')}>
            <Lock size={15} aria-hidden="true" />
            <span>{t('app.privacy')}</span>
          </p>
        </div>
      </div>
    </header>
  )
}

export function WorkflowNav({ steps }) {
  return (
    <nav className="workflow" aria-label={t('nav.label')}>
      <ol className="workflow__list">
        {steps.map((step, index) => (
          <li key={step.id}>
            <a
              className="workflow__step"
              href={`#${step.id}`}
              data-state={step.state}
              aria-current={step.state === 'current' ? 'step' : undefined}
            >
              <span className="workflow__num" aria-hidden="true">
                {index + 1}
              </span>
              <span>{step.label}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
