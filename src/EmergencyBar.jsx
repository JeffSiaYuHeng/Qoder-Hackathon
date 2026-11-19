import { useI18n } from './lib/i18n'

// The one action that must never wait: calling NSRC 997. Shown on every screen, so a
// victim can call without entering any data (PRD F1).
export default function EmergencyBar() {
  const { t } = useI18n()
  return (
    <aside className="sos no-print" aria-label="Emergency hotline">
      <div className="sos-text">
        <strong>{t('sos.title')}</strong>
        <span>{t('sos.body')}</span>
      </div>
      <a className="action-btn" href="tel:997">
        {t('sos.call')}
      </a>
    </aside>
  )
}
