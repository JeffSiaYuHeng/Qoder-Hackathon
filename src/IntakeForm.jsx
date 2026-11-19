import { useState } from 'react'
import { useI18n } from './lib/i18n'

const METHODS = ['call', 'whatsapp', 'sms', 'social', 'marketplace', 'other']

export default function IntakeForm({ institutions, saving, error, onBack, onSubmit }) {
  const { t } = useI18n()
  const [form, setForm] = useState({
    victim_summary: '',
    amount: '',
    occurred_at: '',
    contact_method: '',
    scammer_phone: '',
    scammer_account: '',
    transaction_ref: '',
  })

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  function submit(e) {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <div>
      <h1 className="mb-3 text-[34px] font-semibold leading-tight">{t('intakeTitle')}</h1>
      <p className="mb-8 leading-relaxed text-muted">
        {t('intakeSub', { names: institutions.map((i) => i.name).join(', ') })}
      </p>

      <form onSubmit={submit} className="intake">
        <label className="mb-3.5 flex flex-col gap-1.5 text-[13px] text-muted">
          {t('summaryLabel')}
          <textarea
            rows={5}
            className="field"
            value={form.victim_summary}
            onChange={set('victim_summary')}
            placeholder={t('summaryPlaceholder')}
            required
            autoFocus
          />
        </label>

        <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
          <label className="mb-3.5 flex flex-col gap-1.5 text-[13px] text-muted">
            {t('amountLabel')}
            <input type="number" className="field" min="0" step="0.01" value={form.amount} onChange={set('amount')} />
          </label>
          <label className="mb-3.5 flex flex-col gap-1.5 text-[13px] text-muted">
            {t('whenLabel')}
            <input type="datetime-local" className="field" value={form.occurred_at} onChange={set('occurred_at')} />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
          <label className="mb-3.5 flex flex-col gap-1.5 text-[13px] text-muted">
            {t('methodLabel')}
            <select className="field" value={form.contact_method} onChange={set('contact_method')}>
              <option value="">{t('methodSelect')}</option>
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {t(`method.${m}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="mb-3.5 flex flex-col gap-1.5 text-[13px] text-muted">
            {t('phoneLabel')}
            <input type="tel" className="field" value={form.scammer_phone} onChange={set('scammer_phone')} />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
          <label className="mb-3.5 flex flex-col gap-1.5 text-[13px] text-muted">
            {t('accountLabel')}
            <input className="field" value={form.scammer_account} onChange={set('scammer_account')} />
          </label>
          <label className="mb-3.5 flex flex-col gap-1.5 text-[13px] text-muted">
            {t('refLabel')}
            <input className="field" value={form.transaction_ref} onChange={set('transaction_ref')} />
          </label>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button type="button" className="link" onClick={onBack}>
            {t('back')}
          </button>
          <button className="btn-primary" disabled={saving}>
            {saving ? t('buildingPlan') : t('getPlan')}
          </button>
        </div>
        {error && <p className="mt-2.5 text-xs text-red-300">{error}</p>}
      </form>
    </div>
  )
}
