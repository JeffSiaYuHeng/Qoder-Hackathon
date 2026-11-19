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
      <h1 className="mb-3 text-[34px] font-semibold leading-tight">{t('pickTitle')}</h1>
      <p className="mb-8 leading-relaxed text-muted">{t('pickSub')}</p>

      {loading && <p className="mt-2.5 text-xs text-dim">{t('loadingRegistry')}</p>}
      {error && <p className="mt-2.5 text-xs text-red-300">{t('registryError', { msg: error })}</p>}

      {GROUPS.map(([type, labelKey]) => {
        const items = institutions.filter((i) => i.type === type)
        if (!items.length) return null
        return (
          <section key={type}>
            <h2 className="mb-2.5 mt-7 text-xs uppercase tracking-[0.1em] text-dim">{t(labelKey)}</h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2.5">
              {items.map((i) => (
                <button
                  key={i.id}
                  className={`card ${selected.includes(i.id) ? 'card-selected' : ''}`}
                  onClick={() => toggle(i.id)}
                  aria-pressed={selected.includes(i.id)}
                >
                  <span className="font-semibold">{i.name}</span>
                  {i.hotline && <span className="text-xs text-muted">{i.hotline}</span>}
                </button>
              ))}
            </div>
          </section>
        )
      })}

      <footer className="mt-9 border-t border-edge pt-4 text-[#c9d3dd]">
        <div className="mt-4 flex items-center justify-between gap-3">
          <span>
            <strong>{t('selected')}</strong>{' '}
            {institutions
              .filter((i) => selected.includes(i.id))
              .map((i) => i.name)
              .join(', ') || t('noneYet')}
          </span>
          <button
            className="btn-primary"
            disabled={!selected.length}
            onClick={() => onContinue(institutions.filter((i) => selected.includes(i.id)))}
          >
            {t('continue')}
          </button>
        </div>
        {!loading && !error && (
          <p className="mt-2.5 text-xs text-dim">
            {t('registryLoaded', { count: institutions.length })}
          </p>
        )}
      </footer>
    </div>
  )
}
