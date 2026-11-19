import { useState } from 'react'
import { useI18n, localeFor } from './lib/i18n'
import { lookupInstitutions, sendAllReports } from './lib/agent'

const HINT_KEYS = [
  ['amount', 'hint.amount'],
  ['scammer_phone', 'hint.phone'],
  ['scammer_account', 'hint.account'],
  ['transaction_ref', 'hint.ref'],
]

export default function ActionPlan({ incident, institutions, onToggle, onReset, reportsBusy }) {
  const { lang, t } = useI18n()
  const locale = localeFor(lang)
  const [lookup, setLookup] = useState({ busy: false, log: [], results: null, error: null })
  const [send, setSend] = useState({ busy: false, email: '', statuses: {}, error: null, note: null })
  const [pdf, setPdf] = useState({ busy: false, error: null })
  const steps = incident.steps
  const missing = HINT_KEYS.filter(([field]) => !incident[field]).map(([, key]) => t(key))
  const reports = incident.reports || []
  const amountText = incident.amount
    ? `RM ${Number(incident.amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`
    : t('amountUnknown')
  const whenText = incident.occurred_at
    ? new Date(incident.occurred_at).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })
    : t('timeUnknown')
  const doneCount = steps.filter((s) => s.done).length

  async function runLookup() {
    setLookup({ busy: true, log: [], results: null, error: null })
    try {
      const out = await lookupInstitutions(institutions)
      setLookup({ busy: false, log: out.log, results: out.results, error: null })
    } catch (err) {
      setLookup({ busy: false, log: [], results: null, error: err.message })
    }
  }

  // Lazy import keeps pdf-lib out of the initial bundle.
  async function makePdf() {
    const { buildIncidentPdf, pdfBase64 } = await import('./lib/pdf.js')
    const bytes = await buildIncidentPdf(incident, institutions, t, locale)
    return { bytes, base64: pdfBase64(bytes), filename: `scamsos-report-${incident.id.slice(0, 8).toUpperCase()}.pdf` }
  }

  async function downloadPdf() {
    setPdf({ busy: true, error: null })
    try {
      const { bytes, filename } = await makePdf()
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setPdf({ busy: false, error: null })
    } catch (err) {
      setPdf({ busy: false, error: err.message })
    }
  }

  async function sendAll() {
    setSend((s) => ({ ...s, busy: true, error: null, note: null }))
    // A failed PDF must not block the emails — fall back to text-only.
    let attachment
    try {
      const { base64, filename } = await makePdf()
      attachment = { pdfBase64: base64, pdfFilename: filename }
    } catch (err) {
      setSend((s) => ({ ...s, note: err.message }))
    }
    try {
      const results = await sendAllReports(send.email, reports, attachment)
      setSend((s) => ({
        ...s,
        busy: false,
        statuses: Object.fromEntries(results.map((r) => [r.institution_id, r])),
      }))
    } catch (err) {
      setSend((s) => ({ ...s, busy: false, error: err.message }))
    }
  }

  return (
    <div>
      <h1 className="no-print">{t('planTitle')}</h1>
      <p className="sub no-print">{t('planSub')}</p>

      <section className="panel no-print">
        <h2>{t('incidentDetected')}</h2>
        <p className="incident-line">
          {amountText}
          {' · '}
          {whenText}
          {' · '}
          {institutions.map((i) => i.name).join(', ')}
        </p>
        {missing.length > 0 && (
          <ul className="hints">
            {missing.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        )}
      </section>

      <div
        className="progress no-print"
        role="progressbar"
        aria-label={t('stepsDone', { done: doneCount, total: steps.length })}
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-valuenow={doneCount}
      >
        <span className="progress-text">
          {t('stepsDone', { done: doneCount, total: steps.length })}
        </span>
        <span className="progress-track">
          <span className="progress-fill" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
        </span>
      </div>

      <ol className="steps no-print">
        {steps.map((s, idx) => (
          <li key={s.id} className={s.done ? 'step done' : 'step'}>
            <label className="check">
              <input type="checkbox" checked={s.done} onChange={() => onToggle(s)} />
              <span className="step-num">{idx + 1}</span>
            </label>
            <div className="step-body">
              <span className="step-title">{s.title}</span>
              <span className="step-urgency">{s.urgency === 'now' ? t('doNow') : t('next')}</span>
            </div>
            {s.value &&
              (s.action === 'call' ? (
                <a className="action-btn" href={s.value}>
                  {t('verb.call')}
                </a>
              ) : (
                <a className="action-btn" href={s.value} target="_blank" rel="noreferrer">
                  {t(`verb.${s.action}`)}
                </a>
              ))}
          </li>
        ))}
      </ol>

      <details className="panel no-print">
        <summary>{t('callScriptSummary')}</summary>
        <pre className="script">{incident.call_script}</pre>
      </details>

      <section className="panel no-print">
        <h2>{t('lookupCta')}</h2>
        <button className="primary" onClick={runLookup} disabled={lookup.busy}>
          {lookup.busy ? t('lookupRunning') : t('lookupCta')}
        </button>
        {lookup.error && <p className="status error">{t('lookupFailed', { msg: lookup.error })}</p>}
        {lookup.log.length > 0 && <pre className="lookup-log">{lookup.log.join('\n')}</pre>}
        {lookup.results && (
          <div className="verified-grid">
            {lookup.results.map((r) => (
              <div key={r.slug} className="verified-card">
                <span className="card-name">{r.name}</span>
                <span className={r.source === 'live' ? 'verified-source live' : 'verified-source'}>
                  {r.source === 'live' ? t('lookupLive') : t('lookupRegistry')}
                </span>
                {r.hotline && <span className="card-meta">{r.hotline}</span>}
                {r.fraud_page_url && (
                  <a className="action-btn" href={r.fraud_page_url} target="_blank" rel="noreferrer">
                    {t('verb.open')}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel no-print">
        <h2>{t('reportsTitle')}</h2>
        <p className="sub">{t('reportsSub')}</p>
        {reportsBusy && <p className="status">{t('reportsDrafting')}</p>}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            sendAll()
          }}
        >
          <label>
            {t('yourEmail')}
            <input
              type="email"
              value={send.email}
              onChange={(e) => setSend((s) => ({ ...s, email: e.target.value }))}
              placeholder="you@example.com"
            />
          </label>
          <div className="footer-row">
            <button className="primary" type="submit" disabled={send.busy || !send.email || !reports.length}>
              {send.busy ? t('sending') : t('sendAll')}
            </button>
          </div>
        </form>
        {send.error && <p className="status error">{t('sendUnavailable')}</p>}
        {send.note && <p className="status error">{t('pdfAttachFailed', { msg: send.note })}</p>}
        {reports.map((r) => {
          const status = send.statuses[r.slug]
          return (
            <details key={r.slug} className="panel">
              <summary>
                {r.name}
                {status && (
                  <span className={status.status === 'sent' ? 'send-status sent' : 'send-status failed'}>
                    {status.status === 'sent' ? t('sent') : t('sendFailed')}
                  </span>
                )}
              </summary>
              <p className="status">{r.subject}</p>
              <pre className="script">{r.body}</pre>
              <a className="action-btn" href={r.mailto}>
                {t('verb.email')}
              </a>
            </details>
          )
        })}
      </section>

      <div className="footer-row no-print">
        <button className="primary" onClick={() => window.print()}>
          {t('printReport')}
        </button>
        <button className="action-btn" onClick={downloadPdf} disabled={pdf.busy}>
          {pdf.busy ? t('pdfBuilding') : t('downloadPdf')}
        </button>
        <button className="link" onClick={onReset}>
          {t('newIncident')}
        </button>
      </div>
      {pdf.error && <p className="status error no-print">{t('pdfFailed', { msg: pdf.error })}</p>}

      <section className="report">
        <h2>{t('report.title')}</h2>
        <p className="report-meta">
          {t('report.prepared', {
            when: new Date(incident.created_at).toLocaleString(locale),
            ref: incident.id.slice(0, 8).toUpperCase(),
          })}
        </p>
        <table>
          <tbody>
            <tr>
              <th>{t('report.amountLost')}</th>
              <td>{incident.amount ? `RM ${Number(incident.amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}` : t('report.notKnown')}</td>
            </tr>
            <tr>
              <th>{t('report.when')}</th>
              <td>{incident.occurred_at ? new Date(incident.occurred_at).toLocaleString(locale) : t('report.notKnown')}</td>
            </tr>
            <tr>
              <th>{t('report.method')}</th>
              <td>{incident.contact_method ? t(`method.${incident.contact_method}`) : t('report.notKnown')}</td>
            </tr>
            <tr>
              <th>{t('report.institutions')}</th>
              <td>{institutions.map((i) => i.name).join(', ') || t('report.notKnown')}</td>
            </tr>
            <tr>
              <th>{t('report.suspectPhone')}</th>
              <td>{incident.scammer_phone || t('report.notKnown')}</td>
            </tr>
            <tr>
              <th>{t('report.suspectAccount')}</th>
              <td>{incident.scammer_account || t('report.notKnown')}</td>
            </tr>
            <tr>
              <th>{t('report.txnRef')}</th>
              <td>{incident.transaction_ref || t('report.notKnown')}</td>
            </tr>
          </tbody>
        </table>
        <h3>{t('report.statement')}</h3>
        <p className="report-statement">{incident.statement || incident.victim_summary}</p>
        <p className="report-note">
          {t('report.note', { done: steps.filter((s) => s.done).length, total: steps.length })}
        </p>
      </section>
    </div>
  )
}
