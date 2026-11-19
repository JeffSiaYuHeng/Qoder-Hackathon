import { useState } from 'react'
import { supabase } from './lib/supabase'
import { useI18n } from './lib/i18n'
import ThemeToggle from './ThemeToggle'
import EmergencyBar from './EmergencyBar'

// HACK: demo account hardcoded for the on-stage flow
const DEMO = { email: 'demo@scamsos.my', password: 'ScamSOS2026!' }

export default function AuthScreen({ onGuest }) {
  const { lang, setLang, t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function signIn(creds, event) {
    event?.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword(creds || { email, password })
    if (error) setError(error.message)
    setBusy(false)
  }

  return (
    <main>
      <div className="auth">
        <div className="auth-top">
          <span className="logo">ScamSOS</span>
          <span className="auth-top-right">
            <button className="link" onClick={() => setLang(lang === 'en' ? 'bm' : 'en')}>
              {lang === 'en' ? 'BM' : 'EN'}
            </button>
            <ThemeToggle />
          </span>
        </div>
        <EmergencyBar />
        <h1>{t('signInTitle')}</h1>
        <p className="sub">{t('signInSub')}</p>

        <form onSubmit={(e) => signIn(null, e)}>
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
          <button className="primary" disabled={busy}>
            {busy ? t('signingIn') : t('signIn')}
          </button>
        </form>

        <button className="link" onClick={() => signIn(DEMO)} disabled={busy}>
          {t('useDemo')}
        </button>
        {error && <p className="status error">{error}</p>}

        <div className="guest">
          <button className="action-btn guest-btn" onClick={onGuest} disabled={busy}>
            {t('continueAsGuest')}
          </button>
          <p className="status">{t('guestNote')}</p>
        </div>
      </div>
    </main>
  )
}
