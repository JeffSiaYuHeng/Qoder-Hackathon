const VERB = {
  call: 'Call',
  open: 'Open page',
  map: 'Open map',
  email: 'Draft email',
  print: 'Print',
}

// Same labels as the intake form, so the printed report never shows raw values like "whatsapp".
const METHOD_LABELS = {
  call: 'Phone call',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  social: 'Social media',
  marketplace: 'Marketplace / shopping',
  other: 'Other',
}

const MISSING_HINTS = [
  ['amount', 'Add the amount if you know it'],
  ['scammer_phone', "Add the scammer's phone number"],
  ['scammer_account', "Add the account number the money went to"],
  ['transaction_ref', 'Add the transaction reference'],
]

export default function ActionPlan({ incident, institutions, onToggle, onReset }) {
  const steps = incident.steps
  const missing = MISSING_HINTS.filter(([field]) => !incident[field]).map(([, hint]) => hint)
  const emailSteps = steps.filter((s) => s.action === 'email')
  const doneCount = steps.filter((s) => s.done).length

  return (
    <div>
      <h1 className="no-print">Your action plan</h1>
      <p className="sub no-print">
        Do these in order, starting now. Reporting within 24 hours gives the best
        chance to freeze the money.
      </p>

      <section className="panel no-print">
        <h2>Incident detected</h2>
        <p className="incident-line">
          {incident.amount ? `RM ${Number(incident.amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}` : 'Amount unknown'}
          {' · '}
          {incident.occurred_at
            ? new Date(incident.occurred_at).toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' })
            : 'Time not given'}
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
        aria-label="Steps done"
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-valuenow={doneCount}
      >
        <span className="progress-text">
          {doneCount} of {steps.length} done
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
              <span className="step-urgency">{s.urgency === 'now' ? 'Do now' : 'Next'}</span>
            </div>
            {s.value &&
              (s.action === 'call' ? (
                <a className="action-btn" href={s.value}>
                  {VERB[s.action]}
                </a>
              ) : (
                <a className="action-btn" href={s.value} target="_blank" rel="noreferrer">
                  {VERB[s.action]}
                </a>
              ))}
          </li>
        ))}
      </ol>

      <details className="panel no-print">
        <summary>Call script — what to say</summary>
        <pre className="script">{incident.call_script}</pre>
      </details>

      {emailSteps.length > 0 && (
        <section className="panel no-print">
          <h2>Report to the platform</h2>
          <p className="sub">Opens your own email app with the report pre-filled.</p>
          <div className="row">
            {emailSteps.map((s) => (
              <a key={s.id} className="action-btn" href={s.value}>
                {s.title}
              </a>
            ))}
          </div>
        </section>
      )}

      <div className="footer-row no-print">
        <button className="primary" onClick={() => window.print()}>
          Print police-ready report
        </button>
        <button className="link" onClick={onReset}>
          Start a new incident
        </button>
      </div>

      <section className="report">
        <h2>INCIDENT REPORT (POLICE)</h2>
        <p className="report-meta">
          Prepared {new Date(incident.created_at).toLocaleString('en-MY')} · Reference{' '}
          {incident.id.slice(0, 8).toUpperCase()}
        </p>
        <table>
          <tbody>
            <tr>
              <th>Amount lost</th>
              <td>{incident.amount ? `RM ${Number(incident.amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}` : 'Not known'}</td>
            </tr>
            <tr>
              <th>Date/time of incident</th>
              <td>{incident.occurred_at ? new Date(incident.occurred_at).toLocaleString('en-MY') : 'Not known'}</td>
            </tr>
            <tr>
              <th>How victim was contacted</th>
              <td>{METHOD_LABELS[incident.contact_method] || incident.contact_method || 'Not known'}</td>
            </tr>
            <tr>
              <th>Institutions involved</th>
              <td>{institutions.map((i) => i.name).join(', ') || 'Not known'}</td>
            </tr>
            <tr>
              <th>Suspect contact number</th>
              <td>{incident.scammer_phone || 'Not known'}</td>
            </tr>
            <tr>
              <th>Suspect account number</th>
              <td>{incident.scammer_account || 'Not known'}</td>
            </tr>
            <tr>
              <th>Transaction reference</th>
              <td>{incident.transaction_ref || 'Not known'}</td>
            </tr>
          </tbody>
        </table>
        <h3>Statement</h3>
        <p className="report-statement">{incident.victim_summary}</p>
        <p className="report-note">
          Steps already taken: {steps.filter((s) => s.done).length} of {steps.length}.
          Attach screenshots of the conversation and transaction receipts.
        </p>
      </section>
    </div>
  )
}
