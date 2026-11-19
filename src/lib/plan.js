function toTel(phone) {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return null
  return digits.startsWith('0') ? `tel:+60${digits.slice(1)}` : `tel:${digits}`
}

function formatAmount(amount) {
  if (!amount) return amount === 0 ? 'RM 0' : 'RM —'
  return `RM ${Number(amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`
}

function formatWhen(occurredAt, locale) {
  if (!occurredAt) return new Date(occurredAt || Date.now()).toLocaleString(locale)
  return new Date(occurredAt).toLocaleString(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

// HACK: rule-based stand-in for the LLM intake call (no LLM key yet).
// Same shape as the plan doc §5 so it can be swapped later.
export function buildActionPlan(form, institutions, t, locale) {
  const amount = formatAmount(form.amount)
  const when = form.occurred_at ? formatWhen(form.occurred_at, locale) : null
  const whenText = when || '—'
  const names = institutions.map((i) => i.name).join(', ')
  const steps = []

  for (const inst of institutions) {
    if (inst.hotline) {
      steps.push({
        title: t('step.callBank', { name: inst.name, hotline: inst.hotline }),
        action: 'call',
        value: toTel(inst.hotline),
        urgency: 'now',
      })
    }
  }

  steps.push({
    title: t('step.callNsrc'),
    action: 'call',
    value: 'tel:997',
    urgency: 'now',
  })

  for (const inst of institutions) {
    if (inst.report_url) {
      steps.push({
        title: t('step.openPage', { name: inst.name }),
        action: 'open',
        value: inst.report_url,
        urgency: 'now',
      })
    }
  }

  steps.push({
    title: t('step.findPolice'),
    action: 'map',
    value: 'https://www.google.com/maps/search/?api=1&query=police+station+near+me',
    urgency: 'soon',
  })

  const subject = t('mail.subject', { amount, when: whenText })
  const detailLines = [
    t('script.amount', { amount }),
    t('script.when', { when: whenText }),
    t('script.whatHappened', { summary: form.victim_summary }),
    form.scammer_phone ? t('script.phone', { phone: form.scammer_phone }) : `${t('script.phone', { phone: '' })} ${t('toAdd')}`,
    form.scammer_account ? t('script.account', { account: form.scammer_account }) : `${t('script.account', { account: '' })} ${t('toAdd')}`,
    form.transaction_ref ? t('script.ref', { ref: form.transaction_ref }) : `${t('script.ref', { ref: '' })} ${t('toAdd')}`,
  ]

  // One report per institution; template fixed by type, narrative from the victim's story.
  const reports = institutions.map((inst) => {
    const requestKey =
      inst.type === 'bank' ? 'mail.bankRequest' : inst.type === 'ewallet' ? 'mail.ewalletRequest' : 'mail.platformRequest'
    const body = [
      t('mail.intro'),
      '',
      ...detailLines,
      '',
      t(requestKey),
      t('mail.nsrc'),
      '',
      t('mail.disclaimer'),
    ].join('\n')
    return {
      slug: inst.slug,
      name: inst.name,
      type: inst.type,
      to: inst.support_email || null,
      subject: t('mail.subjectFor', { name: inst.name, amount }),
      body,
      mailto: `mailto:${inst.support_email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    }
  })

  for (const report of reports) {
    steps.push({
      title: report.to
        ? t('step.email', { name: report.name, email: report.to })
        : t('step.emailNoAddr', { name: report.name }),
      action: 'email',
      value: report.mailto,
      urgency: 'soon',
    })
  }

  const call_script = [
    t('script.intro'),
    '',
    t('script.amount', { amount }),
    t('script.when', { when: whenText }),
    t('script.institutions', { names }),
    t('script.whatHappened', { summary: form.victim_summary }),
    form.scammer_phone ? t('script.phone', { phone: form.scammer_phone }) : null,
    form.scammer_account ? t('script.account', { account: form.scammer_account }) : null,
    form.transaction_ref ? t('script.ref', { ref: form.transaction_ref }) : null,
    '',
    t('script.freeze'),
    t('script.nsrc'),
  ]
    .filter((line) => line !== null)
    .join('\n')

  return {
    steps,
    call_script,
    reports,
    summary: {
      amount: form.amount ? Number(form.amount) : null,
      when: whenText,
      institutions: institutions.map((i) => i.name),
      step_count: steps.length,
    },
  }
}
