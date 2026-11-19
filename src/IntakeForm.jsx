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
      <h1>{t('intakeTitle')}</h1>
      <p className="sub">
        {t('intakeSub', { names: institutions.map((i) => i.name).join(', ') })}
      </p>

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

        <div className="row">
          <label>
            {t('amountLabel')}
            <input type="number" min="0" step="0.01" value={form.amount} onChange={set('amount')} />
          </label>
          <label>
            {t('whenLabel')}
            <input type="datetime-local" value={form.occurred_at} onChange={set('occurred_at')} />
          </label>
        </div>

        <div className="row">
          <label>
            {t('methodLabel')}
            <select value={form.contact_method} onChange={set('contact_method')}>
              <option value="">{t('methodSelect')}</option>
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {t(`method.${m}`)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('phoneLabel')}
            <input type="tel" value={form.scammer_phone} onChange={set('scammer_phone')} />
          </label>
        </div>

        <div className="row">
          <label>
            {t('accountLabel')}
            <input value={form.scammer_account} onChange={set('scammer_account')} />
          </label>
          <label>
            {t('refLabel')}
            <input value={form.transaction_ref} onChange={set('transaction_ref')} />
          </label>
        </div>

        <div className="footer-row">
          <button type="button" className="link" onClick={onBack}>
            {t('back')}
          </button>
          <button className="primary" disabled={saving}>
            {saving ? t('buildingPlan') : t('getPlan')}
          </button>
        </div>
        {error && <p className="status error">{error}</p>}
      </form>
    </div>
  )
}
