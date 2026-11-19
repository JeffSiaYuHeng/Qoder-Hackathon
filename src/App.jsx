import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'
import { LangContext, makeT, localeFor } from './lib/i18n'
import AuthScreen from './AuthScreen'
import InstitutionPicker from './InstitutionPicker'
import IntakeForm from './IntakeForm'
import ActionPlan from './ActionPlan'
import ThemeToggle from './ThemeToggle'
import LangSwitch from './LangSwitch'
import Stepper from './Stepper'
import EmergencyBar from './EmergencyBar'
import { buildActionPlan } from './lib/plan'
import { analyzeStory } from './lib/agent'

// Privacy (PRD §9): incident data lives in React state only — nothing is written to Supabase.
export default function App() {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [stage, setStage] = useState('intake')
  const [selected, setSelected] = useState([])
  const [detected, setDetected] = useState([])
  const [form, setForm] = useState(null)
  const [incident, setIncident] = useState(null)
  const [saving, setSaving] = useState(false)
  const [analyzeNote, setAnalyzeNote] = useState(null)
  const [guest, setGuest] = useState(() => sessionStorage.getItem('scamsos.guest') !== '0')
  const [lang, setLang] = useState(() => localStorage.getItem('scamsos.lang') || 'en')

  const t = useMemo(() => makeT(lang), [lang])

  useEffect(() => {
    localStorage.setItem('scamsos.lang', lang)
    document.documentElement.lang = { en: 'en', bm: 'ms', zh: 'zh-Hans' }[lang] || 'en'
  }, [lang])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (s) {
        sessionStorage.removeItem('scamsos.guest')
        setGuest(false)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  function startGuest() {
    sessionStorage.setItem('scamsos.guest', '1')
    setGuest(true)
  }

  function exitGuest() {
    sessionStorage.setItem('scamsos.guest', '0')
    setGuest(false)
  }

  async function submitIntake(input) {
    setSaving(true)
    setAnalyzeNote(null)
    let analysis = null
    try {
      analysis = await analyzeStory(input.victim_summary)
    } catch (err) {
      setAnalyzeNote(t('analyzeFailed', { msg: err.message }))
    }

    const merged = { ...input }
    if (analysis) {
      for (const [key, value] of Object.entries(analysis.fields)) {
        if (value === null || merged[key]) continue
        merged[key] = key === 'occurred_at' ? String(value).slice(0, 16) : String(value)
      }
      setDetected(analysis.detected)
    } else {
      setDetected([])
    }
    setForm(merged)
    setSaving(false)
    setStage('pick')
  }

  function confirmInstitutions(items) {
    setSelected(items)
    const plan = buildActionPlan(form, items, t, localeFor(lang))
    setIncident({
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      ...form,
      steps: plan.steps.map((s, idx) => ({ ...s, id: `step-${idx}`, done: false })),
      call_script: plan.call_script,
      reports: plan.reports,
    })
    setStage('plan')
  }

  function toggleStep(step) {
    setIncident((inc) => ({
      ...inc,
      steps: inc.steps.map((s) => (s.id === step.id ? { ...s, done: !s.done } : s)),
    }))
  }

  function reset() {
    setIncident(null)
    setSelected([])
    setDetected([])
    setForm(null)
    setAnalyzeNote(null)
    setStage('intake')
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {!authReady && (
        <main>
          <p className="status">Loading…</p>
        </main>
      )}

      {authReady && !session && !guest && <AuthScreen onGuest={startGuest} />}

      {authReady && (session || guest) && (
        <main>
          <header className="topbar no-print">
            <span className="logo">ScamSOS</span>
            <span className="topbar-right">
              <ThemeToggle />
              <LangSwitch />
              <span className="badge">{session ? session.user.email : t('guestBadge')}</span>
              {session ? (
                <button className="link" onClick={() => supabase.auth.signOut()}>
                  {t('signOut')}
                </button>
              ) : (
                <button className="link" onClick={exitGuest}>
                  {t('signIn')}
                </button>
              )}
            </span>
          </header>

          <Stepper stage={stage} />
          <EmergencyBar />

          {stage === 'intake' && (
            <IntakeForm initialForm={form} saving={saving} onSubmit={submitIntake} />
          )}

          {stage === 'pick' && (
            <InstitutionPicker
              initialSelected={detected}
              detected={detected}
              form={form}
              analyzeNote={analyzeNote}
              onBack={() => setStage('intake')}
              onContinue={confirmInstitutions}
            />
          )}

          {stage === 'plan' && incident && (
            <ActionPlan
              incident={incident}
              institutions={selected}
              onToggle={toggleStep}
              onReset={reset}
            />
          )}
        </main>
      )}
    </LangContext.Provider>
  )
}