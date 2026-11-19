import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { useI18n } from './lib/i18n'

const GROUPS = [
  ['bank', 'banks'],
  ['ewallet', 'ewallets'],
  ['platform', 'platforms'],
]

export default function InstitutionPicker({ onContinue }) {
  const { t } = useI18n()
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

  return (
    <div>
      <h1>{t('pickTitle')}</h1>
      <p className="sub">{t('pickSub')}</p>

      {loading && <p className="status">{t('loadingRegistry')}</p>}
      {error && <p className="status error">{t('registryError', { msg: error })}</p>}

      {GROUPS.map(([type, labelKey]) => {
        const items = institutions.filter((i) => i.type === type)
        if (!items.length) return null
        return (
          <section key={type}>
            <h2>{t(labelKey)}</h2>
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
        <div className="footer-row">
          <span>
            <strong>{t('selected')}</strong>{' '}
            {institutions
              .filter((i) => selected.includes(i.id))
              .map((i) => i.name)
              .join(', ') || t('noneYet')}
          </span>
          <button
            className="primary"
            disabled={!selected.length}
            onClick={() => onContinue(institutions.filter((i) => selected.includes(i.id)))}
          >
            {t('continue')}
          </button>
        </div>
        {!loading && !error && (
          <p className="status">
            {t('registryLoaded', { count: institutions.length })}
          </p>
        )}
      </footer>
    </div>
  )
}
