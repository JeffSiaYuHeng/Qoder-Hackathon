-- Fallback registry: verified against official bank/platform pages (Nov 2026).
-- hotline is stored as displayed; the UI turns it into a tel: link.

insert into institutions (slug, name, type, hotline, report_url, support_email, source) values
  ('maybank',     'Maybank',             'bank',     '03-5891 4744', 'https://www.maybank2u.com.my/maybank2u/malaysia/en/personal/security_alert/report-disputed-transaction.page', null, 'fallback'),
  ('cimb',        'CIMB Bank',           'bank',     '03-6204 7788', 'https://www.cimb.com.my/en/personal/help-support/security-and-fraud/security-and-fraud-awareness.html', null, 'fallback'),
  ('public-bank', 'Public Bank',         'bank',     '03-2177 3555', 'https://www.pbebank.com/en/contact-us/', null, 'fallback'),
  ('rhb',         'RHB Bank',            'bank',     '03-9206 8118', 'https://www.rhbgroup.com/others/fraud-awareness/index.html', 'customer.service@rhbgroup.com', 'fallback'),
  ('hong-leong',  'Hong Leong Bank',     'bank',     '03-7626 8899', 'https://www.hlb.com.my/en/personal-banking/help-support/contact-us.html', null, 'fallback'),
  ('tng-ewallet', 'Touch ''n Go eWallet','ewallet',  '03-5022 3888', 'https://www.tngdigital.com.my/security-centre/', null, 'fallback'),
  ('shopee',      'Shopee',              'platform', null,           'https://help.shopee.com.my/portal/4/article/78567-[Account-Safety]-How-do-I-avoid-report-scam%2Fsuspicious-activity', null, 'fallback')
on conflict (slug) do update set
  name = excluded.name,
  type = excluded.type,
  hotline = excluded.hotline,
  report_url = excluded.report_url,
  support_email = excluded.support_email,
  source = excluded.source;
