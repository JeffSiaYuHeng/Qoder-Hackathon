import { useState } from 'react'

const METHODS = [
  ['call', 'Phone call'],
  ['whatsapp', 'WhatsApp'],
  ['sms', 'SMS'],
  ['social', 'Social media'],
  ['marketplace', 'Marketplace / shopping'],
  ['other', 'Other'],
]

export default function IntakeForm({ institutions, saving, error, onBack, onSubmit }) {
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
      <h1>What happened?</h1>
      <p className="sub">
        Involved: <strong>{institutions.map((i) => i.name).join(', ')}</strong>. Type
        it like you would tell a friend — we will turn it into steps and reports.
      </p>

      <form onSubmit={submit} className="intake">
        <label>
          Tell us what happened
          <textarea
            rows={5}
            value={form.victim_summary}
            onChange={set('victim_summary')}
            placeholder="e.g. A caller pretending to be from a parcel courier said I owed a delivery fee, and I transferred RM 4,800…"
            required
            autoFocus
          />
        </label>

        <div className="row">
          <label>
            Amount (RM)
            <input type="number" min="0" step="0.01" value={form.amount} onChange={set('amount')} />
          </label>
          <label>
            When
            <input type="datetime-local" value={form.occurred_at} onChange={set('occurred_at')} />
          </label>
        </div>

        <div className="row">
          <label>
            How they contacted you
            <select value={form.contact_method} onChange={set('contact_method')}>
              <option value="">Select…</option>
              {METHODS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label>
            Scammer's phone number
            <input type="tel" value={form.scammer_phone} onChange={set('scammer_phone')} />
          </label>
        </div>

        <div className="row">
          <label>
            Scammer's account number
            <input value={form.scammer_account} onChange={set('scammer_account')} />
          </label>
          <label>
            Transaction reference
            <input value={form.transaction_ref} onChange={set('transaction_ref')} />
          </label>
        </div>

        <div className="footer-row">
          <button type="button" className="link" onClick={onBack}>
            ← Back
          </button>
          <button className="primary" disabled={saving}>
            {saving ? 'Building your plan…' : 'Get my action plan'}
          </button>
        </div>
        {error && <p className="status error">{error}</p>}
      </form>
    </div>
  )
}
