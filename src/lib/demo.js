// ?demo (any value) forces every live step onto canned/registry fallbacks (PRD §9 resilience).
export const DEMO_MODE = new URLSearchParams(window.location.search).has('demo')

export const CANNED_STORY =
  'A caller pretending to be from a parcel courier contacted me on WhatsApp and said I owed a delivery fee. ' +
  'I transferred RM4,800 from my Maybank account to account 5123 4567 8901 belonging to ABC Logistik. ' +
  'I found the seller on Shopee. It happened today at 2:15pm.'

export const CANNED_ANALYSIS = {
  scam_type: 'parcel_courier',
  fields: {
    amount: 4800,
    occurred_at: new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10) + 'T14:15:00+08:00',
    contact_method: 'whatsapp',
    scammer_phone: null,
    scammer_account: '5123 4567 8901',
    transaction_ref: null,
  },
  detected: ['maybank', 'shopee'],
  missing: ['scammer_phone', 'transaction_ref'],
}

export function cannedLookup(institutions) {
  return {
    log: institutions.flatMap((i) => [
      `Searching official fraud channels for ${i.name}…`,
      `${i.name}: demo mode — using verified registry.`,
    ]),
    results: institutions.map((i) => ({
      slug: i.slug,
      name: i.name,
      hotline: i.hotline,
      support_email: i.support_email,
      report_url: i.report_url,
      fraud_page_url: i.report_url,
      source: 'registry',
      rejected_domains: [],
    })),
  }
}