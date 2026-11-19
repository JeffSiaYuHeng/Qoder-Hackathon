function toTel(phone) {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return null
  return digits.startsWith('0') ? `tel:+60${digits.slice(1)}` : `tel:${digits}`
}

function formatAmount(amount) {
  if (!amount) return 'an unknown amount'
  return `RM ${Number(amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`
}

function formatWhen(occurredAt) {
  if (!occurredAt) return 'recently'
  return new Date(occurredAt).toLocaleString('en-MY', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

// HACK: rule-based stand-in for the LLM intake call (no LLM key yet).
// Same shape as scam-response-app.md §5 so it can be swapped later.
export function buildActionPlan(form, institutions) {
  const amount = formatAmount(form.amount)
  const when = formatWhen(form.occurred_at)
  const names = institutions.map((i) => i.name).join(', ')
  const steps = []

  for (const inst of institutions) {
    if (inst.hotline) {
      steps.push({
        title: `Call ${inst.name} fraud line (${inst.hotline})`,
        action: 'call',
        value: toTel(inst.hotline),
        urgency: 'now',
      })
    }
  }

  steps.push({
    title: 'Call NSRC 997 (National Scam Response Centre)',
    action: 'call',
    value: 'tel:997',
    urgency: 'now',
  })

  for (const inst of institutions) {
    if (inst.report_url) {
      steps.push({
        title: `Open ${inst.name} fraud report page`,
        action: 'open',
        value: inst.report_url,
        urgency: 'now',
      })
    }
  }

  steps.push({
    title: 'Find your nearest police station',
    action: 'map',
    value: 'https://www.google.com/maps/search/?api=1&query=police+station+near+me',
    urgency: 'soon',
  })

  const subject = `Fraud report — ${amount} on ${when}`
  const bodyLines = [
    `I am writing to report a fraudulent transaction.`,
    ``,
    `Amount: ${amount}`,
    `Date/time: ${when}`,
    `What happened: ${form.victim_summary}`,
    form.scammer_phone && `Scammer phone: ${form.scammer_phone}`,
    form.scammer_account && `Scammer account: ${form.scammer_account}`,
    form.transaction_ref && `Transaction reference: ${form.transaction_ref}`,
    ``,
    `Please freeze the receiving account and attempt to recall the transaction.`,
    `I am also lodging an NSRC 997 report and a police report.`,
  ].filter(Boolean)

  for (const inst of institutions) {
    if (inst.support_email) {
      steps.push({
        title: `Email ${inst.name} (${inst.support_email})`,
        action: 'email',
        value: `mailto:${inst.support_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join('\n'))}`,
        urgency: 'soon',
      })
    }
  }

  const call_script = [
    `Hi, I'm calling to report a fraudulent transaction.`,
    ``,
    `Amount: ${amount}`,
    `Date/time: ${when}`,
    `Institutions involved: ${names}`,
    `What happened: ${form.victim_summary}`,
    form.scammer_phone ? `Scammer phone: ${form.scammer_phone}` : null,
    form.scammer_account ? `Scammer account: ${form.scammer_account}` : null,
    form.transaction_ref ? `Transaction reference: ${form.transaction_ref}` : null,
    ``,
    `Please freeze my account and attempt to recall the transaction.`,
    `I am reporting this to NSRC 997 and will lodge a police report immediately.`,
  ]
    .filter((line) => line !== null)
    .join('\n')

  return {
    steps,
    call_script,
    summary: {
      amount: form.amount ? Number(form.amount) : null,
      when,
      institutions: institutions.map((i) => i.name),
      step_count: steps.length,
    },
  }
}
