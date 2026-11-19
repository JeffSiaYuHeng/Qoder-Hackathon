import { useState } from 'react'
import { supabase } from './lib/supabase'
import { useI18n } from './lib/i18n'

// HACK: demo account hardcoded for the on-stage flow
const DEMO = { email: 'demo@scamsos.my', password: 'ScamSOS2026!' }

export default function AuthScreen() {
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
    <main className="mx-auto max-w-[720px] px-5 pb-16 pt-8">
      <div className="mx-auto mt-12 max-w-[380px]">
        <div className="flex items-center justify-between">
          <span className="font-bold tracking-wide text-brand">ScamSOS</span>
          <button className="link" onClick={() => setLang(lang === 'en' ? 'bm' : 'en')}>
            {lang === 'en' ? 'BM' : 'EN'}
          </button>
        </div>
        <h1 className="mb-3 text-[28px] font-semibold leading-tight">{t('signInTitle')}</h1>
        <p className="mb-8 leading-relaxed text-muted">{t('signInSub')}</p>

        <form onSubmit={(e) => signIn(null, e)}>
          <label className="mb-3.5 flex flex-col gap-1.5 text-[13px] text-muted">
            {t('email')}
            <input
              type="email"
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label className="mb-3.5 flex flex-col gap-1.5 text-[13px] text-muted">
            {t('password')}
            <input
              type="password"
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <button className="btn-primary" disabled={busy}>
            {busy ? t('signingIn') : t('signIn')}
          </button>
        </form>

        <button className="link" onClick={() => signIn(DEMO)} disabled={busy}>
          {t('useDemo')}
        </button>
        {error && <p className="mt-2.5 text-xs text-red-300">{error}</p>}
      </div>
    </main>
  )
}
