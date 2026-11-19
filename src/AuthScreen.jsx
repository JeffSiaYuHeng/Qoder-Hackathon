import { useState } from 'react'
import { useI18n } from './lib/i18n'
import ThemeToggle from './ThemeToggle'
import LangSwitch from './LangSwitch'
import EmergencyBar from './EmergencyBar'

// HACK: no real authentication in the hackathon build. "Signing in" only labels this browser
// session with an email; nothing is checked and nothing is stored on a server.
const DEMO_USER = { email: 'demo@scamsos.my' }

export default function AuthScreen({ onLogin, onGuest, onBack }) {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function submit(event) {
    event.preventDefault()
    onLogin({ email: email.trim() })
  }

  return (
    <main>
      <div className="auth">
        <div className="auth-top">
          <span className="logo">ScamSOS</span>
          <span className="auth-top-right">
            <LangSwitch />
            <ThemeToggle />
          </span>
        </div>
        <EmergencyBar />

        <button type="button" className="link auth-back" onClick={onBack}>
          {t('login.back')}
        </button>
        <h1>{t('signInTitle')}</h1>
        <p className="sub">{t('signInSub')}</p>

        <form onSubmit={submit}>
          <label>
            {t('email')}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            {t('password')}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <button className="primary">{t('signIn')}</button>
        </form>

        <button type="button" className="action-btn demo-login" onClick={() => onLogin(DEMO_USER)}>
          {t('useDemo')}
        </button>
        <p className="status">{t('login.note')}</p>

        <div className="guest">
          <button type="button" className="link" onClick={onGuest}>
            {t('continueAsGuest')}
          </button>
          <p className="status">{t('guestNote')}</p>
        </div>
      </div>
    </main>
  )
}
