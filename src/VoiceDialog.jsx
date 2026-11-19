import { useEffect, useRef, useState } from 'react'
import { useI18n } from './lib/i18n'
import { startRecording, transcribeBlob } from './lib/stt'

function MicIcon() {
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

// Hold-to-talk dialog: press = record, release = transcribe, transcript appends to the form.
export default function VoiceDialog({ onClose, onTranscript }) {
  const { t } = useI18n()
  const [phase, setPhase] = useState('idle') // idle | recording | transcribing | done
  const [error, setError] = useState(null)
  const [lastText, setLastText] = useState('')
  const recorderRef = useRef(null)
  const timerRef = useRef(null)
  const phaseRef = useRef('idle')
  const holdingRef = useRef(false)

  function go(p) {
    phaseRef.current = p
    setPhase(p)
  }

  useEffect(
    () => () => {
      clearTimeout(timerRef.current)
      recorderRef.current?.cancel()
    },
    [],
  )

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function beginHold() {
    if (phaseRef.current === 'recording' || phaseRef.current === 'transcribing') return
    setError(null)
    try {
      recorderRef.current = await startRecording()
      if (!holdingRef.current) {
        // Released while the mic permission prompt was open.
        recorderRef.current.cancel()
        recorderRef.current = null
        return
      }
      go('recording')
      timerRef.current = setTimeout(endHold, 60000)
    } catch (err) {
      setError(err.message)
      go('idle')
    }
  }

  async function endHold() {
    holdingRef.current = false
    clearTimeout(timerRef.current)
    if (phaseRef.current !== 'recording' || !recorderRef.current) return
    go('transcribing')
    try {
      const blob = await recorderRef.current.stop()
      const text = await transcribeBlob(blob)
      onTranscript(text)
      setLastText(text)
      go('done')
    } catch (err) {
      setError(err.message)
      go('idle')
    } finally {
      recorderRef.current = null
    }
  }

  function press(e) {
    e.preventDefault()
    holdingRef.current = true
    beginHold()
  }

  function keyPress(e) {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) press(e)
  }

  const recording = phase === 'recording'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('voiceTitle')}
        className="w-full max-w-[420px] rounded-2xl border border-edge bg-panel p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('voiceTitle')}</h2>
          <button type="button" className="link" onClick={onClose}>
            {t('voiceClose')}
          </button>
        </div>

        <div className="flex flex-col items-center py-6">
          <button
            type="button"
            className={`voice-mic ${recording ? 'voice-mic-live' : ''}`}
            disabled={phase === 'transcribing'}
            aria-label={t('voiceHold')}
            onPointerDown={press}
            onPointerUp={endHold}
            onPointerLeave={endHold}
            onPointerCancel={endHold}
            onKeyDown={keyPress}
            onKeyUp={endHold}
            onContextMenu={(e) => e.preventDefault()}
          >
            {phase === 'transcribing' ? <span className="voice-spinner" aria-hidden="true" /> : <MicIcon />}
          </button>

          {recording && (
            <div className="voice-bars" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} style={{ animationDelay: `${i * 0.12}s` }} />
              ))}
            </div>
          )}

          <p className={`mt-4 text-sm ${recording ? 'text-brand' : 'text-muted'}`}>
            {phase === 'transcribing' ? t('voiceTranscribing') : recording ? t('voiceRelease') : t('voiceHold')}
          </p>
          <p className="mt-2 text-center text-xs text-dim">{t('voiceHint')}</p>
        </div>

        {phase === 'done' && (
          <div className="mb-4 rounded-[10px] border border-edge bg-canvas p-3">
            <p className="mb-1 text-xs font-semibold text-brand">{t('voiceAdded')}</p>
            <p className="max-h-32 overflow-y-auto text-sm leading-relaxed text-ink">{lastText}</p>
          </div>
        )}

        {error && <p className="mb-4 text-xs text-red-300">{t('voiceError', { msg: error })}</p>}

        {phase === 'done' && (
          <div className="flex justify-end gap-3">
            <button type="button" className="action-btn" onClick={() => go('idle')}>
              {t('voiceAgain')}
            </button>
            <button type="button" className="btn-primary" onClick={onClose}>
              {t('voiceDone')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}