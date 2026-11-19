import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

const GROUPS = [
  ['bank', 'Banks'],
  ['ewallet', 'E-wallets'],
  ['platform', 'Platforms'],
]

export default function App() {
  const [institutions, setInstitutions] = useState([])
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase
      .from('institutions')
      .select('*')
      .order('name')
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setInstitutions(data)
        setLoading(false)
      })
  }, [])

  function toggle(id) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  const selectedNames = institutions
    .filter((i) => selected.includes(i.id))
    .map((i) => i.name)

  return (
    <main>
      <header className="topbar">
        <span className="logo">ScamSOS</span>
        <span className="badge">Malaysia · NSRC 997</span>
      </header>

      <h1>Money gone? Act now.</h1>
      <p className="sub">
        Pick where the money went — you can pick more than one. We will build your
        call list, checklist and police-ready report from here.
      </p>

      {loading && <p className="status">Loading institution registry…</p>}
      {error && <p className="status error">Could not load registry: {error}</p>}

      {GROUPS.map(([type, label]) => {
        const items = institutions.filter((i) => i.type === type)
        if (!items.length) return null
        return (
          <section key={type}>
            <h2>{label}</h2>
            <div className="grid">
              {items.map((i) => (
                <button
                  key={i.id}
                  className={selected.includes(i.id) ? 'card selected' : 'card'}
                  onClick={() => toggle(i.id)}
                  aria-pressed={selected.includes(i.id)}
                >
                  <span className="card-name">{i.name}</span>
                  {i.hotline && <span className="card-meta">{i.hotline}</span>}
                </button>
              ))}
            </div>
          </section>
        )
      })}

      <footer>
        <strong>Selected:</strong>{' '}
        {selectedNames.length ? selectedNames.join(', ') : 'none yet'}
      </footer>

      {!loading && !error && (
        <p className="status">
          Registry loaded from Supabase · {institutions.length} institutions
        </p>
      )}
    </main>
  )
}
