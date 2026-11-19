// The one action that must never wait: calling NSRC 997. Shown before sign-in and on the
// first screen, so a victim can call without entering any data (PRD F1).
export default function EmergencyBar() {
  return (
    <aside className="sos no-print" aria-label="Emergency hotline">
      <div className="sos-text">
        <strong>Money just left your account?</strong>
        <span>Call the National Scam Response Centre now. Open 24 hours.</span>
      </div>
      <a className="action-btn" href="tel:997">
        Call 997
      </a>
    </aside>
  )
}
