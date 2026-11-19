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
      <h1 className="no-print mb-3 text-[34px] font-semibold leading-tight">{t('planTitle')}</h1>
      <p className="no-print mb-8 leading-relaxed text-muted">{t('planSub')}</p>

      <section className="panel no-print">
        <h2 className="m-0 mb-2.5 text-xs uppercase tracking-[0.1em] text-dim">{t('incidentDetected')}</h2>
        <p className="m-0 text-sm">
          {amountText}
          {' · '}
          {whenText}
          {' · '}
          {institutions.map((i) => i.name).join(', ')}
        </p>
        {missing.length > 0 && (
          <ul className="mt-3 list-disc pl-5 text-[13px] leading-relaxed text-[#ffb3b5]">
            {missing.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        )}
      </section>

      <ol className="no-print m-0 mt-5 flex list-none flex-col gap-2.5 p-0">
        {steps.map((s, idx) => (
          <li
            key={s.id}
            className={`flex items-center gap-3 rounded-xl border border-edge bg-panel px-3.5 py-3 max-sm:flex-wrap ${s.done ? 'opacity-60' : ''}`}
          >
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                className="h-[18px] w-[18px] accent-brand"
                checked={s.done}
                onChange={() => onToggle(s)}
              />
              <span className="text-[13px] font-bold text-brand">{idx + 1}</span>
            </label>
            <div className="flex flex-1 flex-col gap-0.5">
              <span className={`text-sm ${s.done ? 'line-through' : ''}`}>{s.title}</span>
              <span className="text-[11px] uppercase tracking-[0.06em] text-dim">
                {s.urgency === 'now' ? t('doNow') : t('next')}
              </span>
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
        <summary className="cursor-pointer text-sm font-semibold">{t('callScriptSummary')}</summary>
        <pre className="whitespace-pre-wrap rounded-lg bg-[#0f151c] p-3 text-[13px] leading-relaxed text-[#c9d3dd]">
          {incident.call_script}
        </pre>
      </details>

      {emailSteps.length > 0 && (
        <section className="panel no-print">
          <h2 className="m-0 mb-2 text-xs uppercase tracking-[0.1em] text-dim">{t('reportToPlatform')}</h2>
          <p className="mb-3 text-sm text-muted">{t('reportToPlatformSub')}</p>
          <div className="flex flex-wrap gap-2">
            {emailSteps.map((s) => (
              <a key={s.id} className="action-btn" href={s.value}>
                {s.title}
              </a>
            ))}
          </div>
        </section>
      )}

      <div className="no-print mt-4 flex items-center justify-between gap-3">
        <button className="btn-primary" onClick={() => window.print()}>
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
