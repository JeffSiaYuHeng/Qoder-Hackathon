import { useState } from 'react'
import { supabase } from './lib/supabase'
import ThemeToggle from './ThemeToggle'
import EmergencyBar from './EmergencyBar'

// HACK: demo account hardcoded for the on-stage flow
const DEMO = { email: 'demo@scamsos.my', password: 'ScamSOS2026!' }

export default function AuthScreen() {
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
        <ThemeToggle />
        <span className="logo">ScamSOS</span>
        <EmergencyBar />
        <h1>Sign in to start</h1>
        <p className="sub">
          Scammed just now? Sign in, tell us what happened, and get your next steps in
          under a minute.
        </p>

        <form onSubmit={(e) => signIn(null, e)}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <button className="primary" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <button className="link" onClick={() => signIn(DEMO)} disabled={busy}>
          Use demo account
        </button>
        {error && <p className="status error">{error}</p>}
      </div>
    </main>
  )
}
