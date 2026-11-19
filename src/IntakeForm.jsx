import { useRef, useState } from 'react'
import { useI18n } from './lib/i18n'
import { analyzeStory } from './lib/agent'
import { DEMO_MODE, CANNED_STORY } from './lib/demo'
import VoiceDialog from './VoiceDialog'
import Dropdown from './Dropdown'

const METHODS = ['call', 'whatsapp', 'sms', 'social', 'marketplace', 'other']

// Boxes the AI may fill from the spoken story, with the label each one shows.
const AUTOFILL = {
  amount: 'amountLabel',
  occurred_at: 'whenLabel',
  contact_method: 'methodLabel',
  scammer_phone: 'phoneLabel',
  scammer_account: 'accountLabel',
  transaction_ref: 'refLabel',
}

const EMPTY_FORM = {
  victim_summary: '',
  amount: '',
  occurred_at: '',
  contact_method: '',
  scammer_phone: '',
  scammer_account: '',
  transaction_ref: '',
}

export default function IntakeForm({ initialForm, saving, error, onBack, onSubmit }) {
  const { t } = useI18n()
  const [form, setForm] = useState(initialForm || EMPTY_FORM)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [autofill, setAutofill] = useState(null) // null | { state: 'working' | 'done' | 'error', filled: [] }
  const formRef = useRef(form)
  formRef.current = form

  // Voice: add the words to the story, then let the AI fill the other boxes from the whole story,
  // on screen, so the victim can check them before going on. Only empty boxes are filled, so it
  // never overwrites what the victim typed.
  async function addTranscript(text) {
    const before = formRef.current.victim_summary.trim()
    const story = before ? `${before} ${text}` : text
    setForm((f) => ({ ...f, victim_summary: story }))
    setAutofill({ state: 'working', filled: [] })
    try {
      const { fields = {} } = await analyzeStory(story)
      const current = formRef.current
      const updates = {}
      for (const key of Object.keys(AUTOFILL)) {
        const value = fields[key]
        if (value == null || String(current[key] ?? '').trim()) continue
        const next = key === 'occurred_at' ? String(value).slice(0, 16) : String(value)
        if (next) updates[key] = next
      }
      setForm((f) => {
        const merged = { ...f }
        for (const [key, value] of Object.entries(updates)) if (!String(f[key] ?? '').trim()) merged[key] = value
        return merged
      })
      setAutofill({ state: 'done', filled: Object.keys(updates) })
    } catch {
      setAutofill({ state: 'error', filled: [] })
    }
  }

  function set(field) {
    return (e) => {
      const { value } = e.target
      setForm((f) => ({ ...f, [field]: value }))
      // Once the victim edits an AI-filled box it's theirs: drop the "please check" highlight.
      setAutofill((a) => (a?.filled.includes(field) ? { ...a, filled: a.filled.filter((k) => k !== field) } : a))
    }
  }

  const aiFilled = (field) => (autofill?.filled.includes(field) ? 'ai-filled' : undefined)

  function submit(e) {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <div>
      <h1>{t('intakeTitle')}</h1>
      <p className="sub">{t('intakeSubSolo')}</p>

      <form onSubmit={submit} className="intake">
        <label>
          {t('summaryLabel')}
          <textarea
            rows={5}
            value={form.victim_summary}
            onChange={set('victim_summary')}
            placeholder={t('summaryPlaceholder')}
            required
            autoFocus
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="voice-icon"
            onClick={() => setVoiceOpen(true)}
            aria-label={t('voiceSpeak')}
            title={t('voiceSpeak')}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M5 11a7 7 0 0 0 14 0M12 18v3"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          {DEMO_MODE && (
            <button
              type="button"
              className="link"
              onClick={() => setForm((f) => ({ ...f, victim_summary: CANNED_STORY }))}
            >
              {t('demoStory')}
            </button>
          )}
        </div>
        {autofill && (
          <p className={`autofill-status${autofill.state === 'error' ? ' is-error' : ''}`} role="status">
            {autofill.state === 'working' && t('autofillWorking')}
            {autofill.state === 'error' && t('autofillError')}
            {autofill.state === 'done' &&
              (autofill.filled.length
                ? t('autofillDone', { fields: autofill.filled.map((k) => t(AUTOFILL[k])).join(', ') })
                : t('autofillNone'))}
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label>
            {t('amountLabel')}
            <input type="number" min="0" step="0.01" value={form.amount} onChange={set('amount')} className={aiFilled('amount')} />
          </label>
          <label>
            {t('whenLabel')}
            <input type="datetime-local" value={form.occurred_at} onChange={set('occurred_at')} className={aiFilled('occurred_at')} />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label>
            {t('methodLabel')}
            <Dropdown
              value={form.contact_method}
              onChange={(value) => {
                setForm((f) => ({ ...f, contact_method: value }))
                setAutofill((a) =>
                  a?.filled.includes('contact_method')
                    ? { ...a, filled: a.filled.filter((k) => k !== 'contact_method') }
                    : a,
                )
              }}
              options={[
                { value: '', label: t('methodSelect') },
                ...METHODS.map((m) => ({ value: m, label: t(`method.${m}`) })),
              ]}
              label={t('methodLabel')}
              className={aiFilled('contact_method')}
            />
          </label>
          <label>
            {t('phoneLabel')}
            <input type="tel" value={form.scammer_phone} onChange={set('scammer_phone')} className={aiFilled('scammer_phone')} />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label>
            {t('accountLabel')}
            <input value={form.scammer_account} onChange={set('scammer_account')} className={aiFilled('scammer_account')} />
          </label>
          <label>
            {t('refLabel')}
            <input value={form.transaction_ref} onChange={set('transaction_ref')} className={aiFilled('transaction_ref')} />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {onBack ? (
            <button type="button" className="link" onClick={onBack}>
              {t('back')}
            </button>
          ) : (
            <span className="status">{t('privacyNote')}</span>
          )}
          <button className="primary" disabled={saving}>
            {saving ? t('analyzing') : t('analyzeCta')}
          </button>
        </div>
        {error && <p className="status error">{error}</p>}
      </form>

      {voiceOpen && <VoiceDialog onClose={() => setVoiceOpen(false)} onTranscript={addTranscript} />}
    </div>
  )
}
