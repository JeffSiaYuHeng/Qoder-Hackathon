import { useI18n } from './lib/i18n'

// Where the victim is in the flow ("step 2 of 3"), like a checkout or delivery tracker.
// Keys match the `stage` values in App.jsx; reorder or add screens by editing FLOW only.
export const FLOW = [
  { stage: 'intake', labelKey: 'flow.intake' },
  { stage: 'pick', labelKey: 'flow.pick' },
  { stage: 'plan', labelKey: 'flow.plan' },
]

export default function Stepper({ stage }) {
  const { t } = useI18n()
  const current = FLOW.findIndex((s) => s.stage === stage)
  if (current === -1) return null

  return (
    <nav className="stepper no-print" aria-label={`Step ${current + 1} of ${FLOW.length}`}>
      <ol>
        {FLOW.map((s, i) => {
          const state = i < current ? 'done' : i === current ? 'current' : 'todo'
          return (
            <li key={s.stage} className={state} aria-current={state === 'current' ? 'step' : undefined}>
              <span className="stepper-dot" aria-hidden="true">
                {state === 'done' ? '✓' : i + 1}
              </span>
              <span className="stepper-label">{t(s.labelKey)}</span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
