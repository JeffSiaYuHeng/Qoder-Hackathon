// Where the victim is in the flow ("step 2 of 3"), like a checkout or delivery tracker.
// Keys match the `stage` values in App.jsx; reorder or add screens by editing FLOW only.
export const FLOW = [
  { stage: 'pick', label: 'Where it went' },
  { stage: 'intake', label: 'What happened' },
  { stage: 'plan', label: 'Action plan' },
]

export default function Stepper({ stage }) {
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
              <span className="stepper-label">{s.label}</span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
