import { PDFDocument, StandardFonts } from 'pdf-lib'

// HACK: one fixed A4 layout, no abstractions — values copied from the on-screen report.
const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN = 48
const MAX_W = PAGE_W - MARGIN * 2

// WinAnsi (the standard fonts) cannot encode anything outside Latin-1, so fold
// common typographic characters down to ASCII and drop the rest (e.g. emoji).
export function sanitize(text) {
  return String(text ?? '')
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u20AC]/g, 'EUR')
    .replace(/[^\u0000-\u00FF]/g, '')
}

// Resend wants a plain base64 string. Chunked so String.fromCharCode never sees
// a huge argument list (browser-safe, no Buffer).
export function pdfBase64(bytes) {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

function wrap(text, font, size, maxWidth) {
  const out = []
  for (const raw of String(text).split('\n')) {
    const words = raw.split(/\s+/).filter(Boolean)
    if (!words.length) {
      out.push('')
      continue
    }
    let line = ''
    for (const word of words) {
      const next = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(next, size) <= maxWidth) {
        line = next
        continue
      }
      if (line) out.push(line)
      // A single word longer than the line: hard-break it.
      let rest = word
      while (font.widthOfTextAtSize(rest, size) > maxWidth) {
        let cut = rest.length - 1
        while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > maxWidth) cut -= 1
        out.push(rest.slice(0, cut))
        rest = rest.slice(cut)
      }
      line = rest
    }
    if (line) out.push(line)
  }
  return out
}

export async function buildIncidentPdf(incident, institutions, t, locale) {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const pages = []
  let page
  let y = 0

  const newPage = () => {
    page = doc.addPage([PAGE_W, PAGE_H])
    pages.push(page)
    y = PAGE_H - MARGIN
  }
  const need = (h) => {
    if (!page || y - h < 60) newPage()
  }
  const write = (text, { size = 11, b = false, gap = 4, indent = 0 } = {}) => {
    const f = b ? bold : font
    for (const line of wrap(sanitize(text), f, size, MAX_W - indent)) {
      need(size + 2)
      y -= size + 2
      page.drawText(line, { x: MARGIN + indent, y, size, font: f })
    }
    y -= gap
  }
  const rule = () => {
    need(12)
    y -= 8
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.75 })
    y -= 8
  }

  const notKnown = t('report.notKnown')
  const ref = String(incident.id || '').slice(0, 8).toUpperCase()
  const prepared = new Date(incident.created_at).toLocaleString(locale)
  const amount = incident.amount
    ? `RM ${Number(incident.amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`
    : notKnown
  const when = incident.occurred_at ? new Date(incident.occurred_at).toLocaleString(locale) : notKnown
  const steps = incident.steps || []
  const reports = incident.reports || []

  newPage()

  // Police-report section
  write(t('report.title'), { size: 16, b: true, gap: 6 })
  write(t('report.prepared', { when: prepared, ref }), { size: 10, gap: 8 })
  rule()

  const rows = [
    [t('report.amountLost'), amount],
    [t('report.when'), when],
    [t('report.method'), incident.contact_method ? t(`method.${incident.contact_method}`) : notKnown],
    [t('report.institutions'), institutions.map((i) => i.name).join(', ') || notKnown],
    [t('report.suspectPhone'), incident.scammer_phone || notKnown],
    [t('report.suspectAccount'), incident.scammer_account || notKnown],
    [t('report.txnRef'), incident.transaction_ref || notKnown],
  ]
  for (const [label, value] of rows) {
    need(28)
    const lines = wrap(sanitize(value), font, 11, MAX_W - 170)
    y -= 14
    page.drawText(sanitize(label), { x: MARGIN, y, size: 10, font: bold })
    let vy = y
    for (const line of lines) {
      page.drawText(line, { x: MARGIN + 170, y: vy, size: 11, font })
      vy -= 13
    }
    y = Math.min(y - lines.length * 13, vy)
    y -= 2
  }

  rule()
  write(t('report.statement'), { size: 12, b: true, gap: 4 })
  write(incident.statement || incident.victim_summary || notKnown, { gap: 8 })
  write(t('report.note', { done: steps.filter((s) => s.done).length, total: steps.length }), { size: 10, gap: 8 })

  // Checklist status — text markers, never colour alone.
  if (steps.length) {
    rule()
    write(t('pdfSteps', { done: steps.filter((s) => s.done).length, total: steps.length }), {
      size: 12,
      b: true,
      gap: 4,
    })
    for (const s of steps) {
      write(`${s.done ? '\u2713' : '\u25CB'} ${s.title}`, { size: 10, gap: 2, indent: 8 })
    }
  }

  // One draft per institution
  for (const r of reports) {
    newPage()
    write(r.name, { size: 14, b: true, gap: 4 })
    write(r.subject, { size: 11, b: true, gap: 8 })
    rule()
    for (const para of String(r.body || '').split('\n')) {
      write(para, { size: 11, gap: 2 })
    }
  }

  // Page numbers (1 / N), added after all pages exist.
  const total = pages.length
  pages.forEach((p, i) => {
    const label = `${i + 1} / ${total}`
    p.drawText(label, {
      x: PAGE_W - MARGIN - bold.widthOfTextAtSize(label, 9),
      y: 32,
      size: 9,
      font,
    })
  })

  return await doc.save()
}
