import { useEffect, useMemo, useRef, useState } from 'react'
import { LangContext, makeT, localeFor } from './lib/i18n'
import WelcomeScreen from './WelcomeScreen'
import InstitutionPicker from './InstitutionPicker'
import IntakeForm from './IntakeForm'
import ActionPlan from './ActionPlan'
import ThemeToggle from './ThemeToggle'
import LangSwitch from './LangSwitch'
import Stepper from './Stepper'
import EmergencyBar from './EmergencyBar'
import { buildActionPlan } from './lib/plan'
import { analyzeStory } from './lib/agent'
import { draftReports } from './lib/report'

// Privacy (PRD §9): incident data lives in React state only — nothing is written to Supabase.
export default function App() {
  const [stage, setStage] = useState('intake')
  const [selected, setSelected] = useState([])
  const [detected, setDetected] = useState([])
  const [form, setForm] = useState(null)
  const [incident, setIncident] = useState(null)
  const [saving, setSaving] = useState(false)
  const [analyzeNote, setAnalyzeNote] = useState(null)
  // Hackathon entry: welcome page, then straight into the app. No accounts.
  const [entry, setEntry] = useState(() => sessionStorage.getItem('scamsos.entry') || 'welcome')
  const [lang, setLang] = useState(() => localStorage.getItem('scamsos.lang') || 'en')
  const [reportsBusy, setReportsBusy] = useState(false)
  // Bumped on every draft request/reset so a late AI reply can't overwrite a newer incident.
  const draftSeq = useRef(0)

  const t = useMemo(() => makeT(lang), [lang])

  useEffect(() => {
    localStorage.setItem('scamsos.lang', lang)
    document.documentElement.lang = { en: 'en', bm: 'ms', zh: 'zh-Hans' }[lang] || 'en'
  }, [lang])

  useEffect(() => {
    sessionStorage.setItem('scamsos.entry', entry)
  }, [entry])

  function enterApp() {
    setEntry('app')
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
      statement: null,
    })
    setStage('plan')

    // Templates render immediately; the AI rewrite lands if it arrives in time.
    const seq = ++draftSeq.current
    setReportsBusy(true)
    draftReports({
      story: form.victim_summary,
      lang,
      form: {
        amount: form.amount,
        occurred_at: form.occurred_at,
        contact_method: form.contact_method,
        scammer_phone: form.scammer_phone,
        scammer_account: form.scammer_account,
        transaction_ref: form.transaction_ref,
      },
      institutions: items.map((i) => ({ slug: i.slug, name: i.name, type: i.type })),
      templates: plan.reports.map((r) => ({ slug: r.slug, name: r.name, type: r.type, subject: r.subject, body: r.body })),
    })
      .then((draft) => {
        if (seq !== draftSeq.current) return
        setIncident((inc) => {
          if (!inc) return inc
          const bySlug = new Map((draft.reports || []).map((r) => [r.slug, r]))
          return {
            ...inc,
            statement: draft.statement || inc.statement,
            reports: inc.reports.map((r) => {
              const next = bySlug.get(r.slug)
              if (!next) return r
              return {
                ...r,
                subject: next.subject,
                body: next.body,
                mailto: `mailto:${r.to || ''}?subject=${encodeURIComponent(next.subject)}&body=${encodeURIComponent(next.body)}`,
              }
            }),
          }
        })
        setReportsBusy(false)
      })
      .catch(() => {
        if (seq === draftSeq.current) setReportsBusy(false)
      })
  }

  function toggleStep(step) {
    setIncident((inc) => ({
      ...inc,
      steps: inc.steps.map((s) => (s.id === step.id ? { ...s, done: !s.done } : s)),
    }))
  }

  function reset() {
    draftSeq.current += 1
    setReportsBusy(false)
    setIncident(null)
    setSelected([])
    setDetected([])
    setForm(null)
    setAnalyzeNote(null)
    setStage('intake')
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {entry === 'welcome' && <WelcomeScreen onStart={enterApp} />}

      {entry === 'app' && (
        <main>
          <header className="topbar no-print">
            <span className="logo">ScamSOS</span>
            <span className="topbar-right">
              <ThemeToggle />
              <LangSwitch />
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
            reportsBusy={reportsBusy}
          />
        )}
        </main>
      )}
    </LangContext.Provider>
  )
}
