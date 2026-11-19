// Records the mic and sends 16 kHz mono WAV to /api/stt (Google AI Studio).
// Conversion keeps the request small: ~32 KB per second instead of ~190 KB.

function audioBufferToWavBase64(buffer) {
  const samples = buffer.getChannelData(0)
  const bytes = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(bytes)
  const write = (offset, text) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i))
  }
  const rate = buffer.sampleRate

  write(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  write(8, 'WAVE')
  write(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, rate, true)
  view.setUint32(28, rate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  write(36, 'data')
  view.setUint32(40, samples.length * 2, true)

  let offset = 44
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }

  const data = new Uint8Array(bytes)
  let binary = ''
  for (let i = 0; i < data.length; i += 0x8000) {
    binary += String.fromCharCode(...data.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

async function blobToWavBase64(blob) {
  const ctx = new AudioContext()
  let decoded
  try {
    decoded = await ctx.decodeAudioData(await blob.arrayBuffer())
  } finally {
    await ctx.close()
  }

  const rate = 16000
  const offline = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * rate)), rate)
  const source = offline.createBufferSource()
  source.buffer = decoded
  source.connect(offline.destination)
  source.start()
  return audioBufferToWavBase64(await offline.startRendering())
}

export async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Microphone is not available in this browser')
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
  })

  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
  const mimeType = candidates.find((m) => MediaRecorder.isTypeSupported?.(m))
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
  const chunks = []

  recorder.ondataavailable = (e) => {
    if (e.data?.size) chunks.push(e.data)
  }
  const stopped = new Promise((resolve) => {
    recorder.addEventListener('stop', () => {
      resolve(new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' }))
    })
  })

  recorder.start()
  const releaseMic = () => stream.getTracks().forEach((track) => track.stop())

  return {
    async stop() {
      if (recorder.state !== 'inactive') recorder.stop()
      releaseMic()
      return stopped
    },
    cancel() {
      if (recorder.state !== 'inactive') recorder.stop()
      releaseMic()
    },
  }
}

export async function transcribeBlob(blob) {
  if (!blob || blob.size < 1000) throw new Error('Recording was too short')

  const res = await fetch('/api/stt', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ audio: await blobToWavBase64(blob), mimeType: 'audio/wav' }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `Transcription failed (${res.status})`)
  return json.text
}
