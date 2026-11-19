import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'
import { LangContext, makeT, localeFor } from './lib/i18n'
import AuthScreen from './AuthScreen'
import InstitutionPicker from './InstitutionPicker'
import IntakeForm from './IntakeForm'
import ActionPlan from './ActionPlan'
import { buildActionPlan } from './lib/plan'

export default function App() {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [stage, setStage] = useState('pick')
  const [selected, setSelected] = useState([])
  const [incident, setIncident] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [lang, setLang] = useState(() => localStorage.getItem('scamsos.lang') || 'en')

  const t = useMemo(() => makeT(lang), [lang])

  useEffect(() => {
    localStorage.setItem('scamsos.lang', lang)
  }, [lang])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  async function submitIntake(form) {
    setSaving(true)
    setError(null)
    const plan = buildActionPlan(form, selected, t, localeFor(lang))

    const { data: created, error: insertError } = await supabase
      .from('incidents')
      .insert({
        user_id: session.user.id,
        victim_summary: form.victim_summary,
        amount: form.amount ? Number(form.amount) : null,
        occurred_at: form.occurred_at || null,
        contact_method: form.contact_method || null,
        scammer_phone: form.scammer_phone || null,
        scammer_account: form.scammer_account || null,
        transaction_ref: form.transaction_ref || null,
        status: 'action',
        llm_summary: plan.summary,
        call_script: plan.call_script,
      })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }

    const [links, stepsResult] = await Promise.all([
      supabase
        .from('incident_institutions')
        .insert(selected.map((i) => ({ incident_id: created.id, institution_id: i.id }))),
      supabase
        .from('action_steps')
        .insert(
          plan.steps.map((s, idx) => ({
            incident_id: created.id,
            step_order: idx + 1,
            title: s.title,
            action: s.action,
            value: s.value,
            urgency: s.urgency,
          })),
        )
        .select(),
    ])

    if (links.error || stepsResult.error) {
      setError((links.error || stepsResult.error).message)
      setSaving(false)
      return
    }

    setIncident({
      ...created,
      steps: stepsResult.data.sort((a, b) => a.step_order - b.step_order),
    })
    setSaving(false)
    setStage('plan')
  }

  async function toggleStep(step) {
    const done = !step.done
    setIncident((inc) => ({
      ...inc,
      steps: inc.steps.map((s) => (s.id === step.id ? { ...s, done } : s)),
    }))
    await supabase.from('action_steps').update({ done }).eq('id', step.id)
  }

  function reset() {
    setIncident(null)
    setSelected([])
    setStage('pick')
    setError(null)
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {!authReady && <main className="mx-auto max-w-[720px] px-5 pb-16 pt-8"><p className="mt-2.5 text-xs text-dim">Loading…</p></main>}

      {authReady && !session && <AuthScreen />}

      {authReady && session && (
        <main className="mx-auto max-w-[720px] px-5 pb-16 pt-8">
          <header className="no-print mb-10 flex items-center justify-between">
            <span className="font-bold tracking-wide text-brand">ScamSOS</span>
            <span className="flex items-center gap-3">
              <span className="rounded-full border border-edge px-2.5 py-1 text-xs text-muted">{session.user.email}</span>
              <button className="link" onClick={() => setLang(lang === 'en' ? 'bm' : 'en')}>
                {lang === 'en' ? 'BM' : 'EN'}
              </button>
              <button className="link" onClick={() => supabase.auth.signOut()}>
                {t('signOut')}
              </button>
            </span>
          </header>

          {stage === 'pick' && (
            <InstitutionPicker
              onContinue={(items) => {
                setSelected(items)
                setStage('intake')
              }}
            />
          )}

          {stage === 'intake' && (
            <IntakeForm
              institutions={selected}
              saving={saving}
              error={error}
              onBack={() => setStage('pick')}
              onSubmit={submitIntake}
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
