import { useI18n } from './lib/i18n'
import ThemeToggle from './ThemeToggle'
import LangSwitch from './LangSwitch'
import EmergencyBar from './EmergencyBar'

// First screen: what ScamSOS does, one big way in ("Get help now"), and an optional log in.
// The 997 bar sits above everything, so a victim can call before reading anything else.
export default function WelcomeScreen({ onStart, onLogin }) {
  const { t } = useI18n()
  const steps = ['welcome.f1', 'welcome.f2', 'welcome.f3']

  return (
    <main>
      <div className="welcome">
        <div className="auth-top">
          <span className="logo">ScamSOS</span>
          <span className="auth-top-right">
            <LangSwitch />
            <ThemeToggle />
          </span>
        </div>

        <EmergencyBar />

        <section className="welcome-hero">
          <h1>{t('welcome.title')}</h1>
          <p className="sub">{t('welcome.sub')}</p>
          <div className="welcome-actions">
            <button type="button" className="primary" onClick={onStart}>
              {t('welcome.start')}
            </button>
            <button type="button" className="action-btn" onClick={onLogin}>
              {t('welcome.login')}
            </button>
          </div>
        </section>

        <ol className="welcome-steps">
          {steps.map((key, i) => (
            <li key={key}>
              <span className="welcome-num" aria-hidden="true">
                {i + 1}
              </span>
              <span>{t(key)}</span>
            </li>
          ))}
        </ol>

        <p className="welcome-trust">{t('welcome.trust')}</p>
      </div>
    </main>
  )
}
