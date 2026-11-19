import { useI18n, localeFor } from './lib/i18n'

const HINT_KEYS = [
  ['amount', 'hint.amount'],
  ['scammer_phone', 'hint.phone'],
  ['scammer_account', 'hint.account'],
  ['transaction_ref', 'hint.ref'],
]

export default function ActionPlan({ incident, institutions, onToggle, onReset }) {
  const { lang, t } = useI18n()
  const locale = localeFor(lang)
  const steps = incident.steps
  const missing = HINT_KEYS.filter(([field]) => !incident[field]).map(([, key]) => t(key))
  const emailSteps = steps.filter((s) => s.action === 'email')
  const amountText = incident.amount
    ? `RM ${Number(incident.amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`
    : t('amountUnknown')
  const whenText = incident.occurred_at
    ? new Date(incident.occurred_at).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })
    : t('timeUnknown')

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

      {emailSteps.length > 0 && (
        <section className="panel no-print">
          <h2>{t('reportToPlatform')}</h2>
          <p className="sub">{t('reportToPlatformSub')}</p>
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
          {t('printReport')}
        </button>
        <button className="link" onClick={onReset}>
          {t('newIncident')}
        </button>
      </div>

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
              <td>{incident.amount ? `RM ${Number(incident.amount).toFixed(2)}` : t('report.notKnown')}</td>
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
        <p className="report-statement">{incident.victim_summary}</p>
        <p className="report-note">
          {t('report.note', { done: steps.filter((s) => s.done).length, total: steps.length })}
        </p>
      </section>
    </div>
  )
}
