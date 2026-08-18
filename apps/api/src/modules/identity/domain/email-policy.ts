/* ══════════════════════════════════════════════════════════════════════
   Email sign-up policy — the ONE place that decides whether an email domain
   may sign up (§8.2 one authority). Rider/driver accounts are created only
   through email sign-up, and temporary/disposable mailboxes are the abuse
   vector (fake accounts, coupon fraud), so the rule is an ALLOWLIST:

   1. Educational domains always pass: `edu`, `*.edu` (US) and `*.edu.<cc>`
      (e.g. ejust.edu.eg, ox.ac.uk style country-coded academic domains).
   2. The built-in list of popular consumer/business providers passes.
   3. The operator may extend the list at runtime via EMAIL_ALLOWED_DOMAINS
      (comma-separated; exact domain or wildcard-by-suffix).

   Everything else is refused at OTP-request time — before an email is ever
   sent — with auth.email_domain_not_allowed. Matching is case-insensitive.
   ══════════════════════════════════════════════════════════════════════ */

/** Country-coded academic second-level domains: `ejust.edu.eg`,
    `student.ejust.edu.eg`, `ox.ac.uk`… requires a label BEFORE `edu`, so
    `edu.com` (a commercial domain) and `evil-edu.com` do not pass. */
const EDUCATION_CC_SUFFIX = /\.edu\.[a-z]{2,}$/i;

/** Popular, legitimate consumer/business providers (2026 market leaders +
    their main regional variants). Temporary-mail services are deliberately
    absent — that is the point. The operator can add domains in env. */
const BUILTIN_ALLOWED_DOMAINS: ReadonlySet<string> = new Set([
  // Google
  'gmail.com', 'googlemail.com',
  // Microsoft
  'hotmail.com', 'hotmail.co.uk', 'hotmail.fr', 'hotmail.de', 'hotmail.it', 'hotmail.es',
  'hotmail.com.tr', 'hotmail.com.br', 'hotmail.com.ar', 'hotmail.com.mx', 'hotmail.ca', 'hotmail.gr',
  'outlook.com', 'outlook.co.uk', 'outlook.fr', 'outlook.de', 'outlook.it', 'outlook.es',
  'outlook.eg', 'outlook.sa', 'outlook.ae', 'outlook.in', 'outlook.jp', 'outlook.kr',
  'outlook.com.br', 'outlook.com.tr', 'outlook.com.ar', 'outlook.com.au',
  'live.com', 'live.co.uk', 'live.fr', 'live.de', 'live.it', 'live.nl', 'live.no', 'live.se',
  'live.com.au', 'live.com.mx', 'live.com.ar', 'live.com.pt', 'live.be', 'live.dk', 'live.fi',
  'msn.com',
  // Yahoo
  'yahoo.com', 'yahoo.co.uk', 'yahoo.fr', 'yahoo.de', 'yahoo.it', 'yahoo.es', 'yahoo.ca',
  'yahoo.co.jp', 'yahoo.co.in', 'yahoo.co.id', 'yahoo.com.sg', 'yahoo.com.ar', 'yahoo.com.br',
  'yahoo.com.mx', 'yahoo.com.tr', 'yahoo.com.au', 'yahoo.gr', 'yahoo.ie', 'yahoo.pl',
  'ymail.com', 'rocketmail.com',
  // Apple
  'icloud.com', 'me.com', 'mac.com',
  // AOL / Verizon
  'aol.com', 'aim.com',
  // Proton
  'proton.me', 'protonmail.com', 'pm.me',
  // Zoho
  'zoho.com', 'zohomail.com',
  // Mail.com (1&1)
  'mail.com', 'email.com',
  // GMX / Web.de (1&1)
  'gmx.com', 'gmx.net', 'gmx.de', 'gmx.at', 'gmx.ch', 'web.de',
  // Fastmail
  'fastmail.com', 'fastmail.fm', 'fastmail.net',
  // Tuta (Tutanota)
  'tuta.io', 'tuta.com', 'tutanota.com', 'keemail.me',
  // HEY
  'hey.com',
  // Hushmail / Mailfence
  'hushmail.com', 'mailfence.com',
  // Yandex (Russia + international)
  'yandex.com', 'yandex.ru', 'ya.ru',
  // Mail.ru group
  'mail.ru', 'inbox.ru', 'list.ru', 'bk.ru', 'internet.ru',
  // Tencent (China)
  'qq.com', 'foxmail.com',
  // NetEase (China)
  '163.com', '126.com',
  // Naver (Korea)
  'naver.com',
  // Rediff (India)
  'rediffmail.com',
]);

/** Case-insensitive membership for an exact or wildcard-suffix match.
    `isListed('x@Mail.GoogleMail.COM', ['googlemail.com'])` → true. */
function matchesList(domain: string, list: Iterable<string>): boolean {
  const d = domain.toLowerCase();
  for (const entry of list) {
    const e = entry.trim().toLowerCase();
    if (!e) continue;
    if (d === e || d.endsWith('.' + e)) return true;
  }
  return false;
}

/** Extract the domain part of a (already format-validated) email. */
export function emailDomain(email: string): string {
  const at = email.lastIndexOf('@');
  return at === -1 ? '' : email.slice(at + 1).toLowerCase();
}

export function isEducationDomain(domain: string): boolean {
  const d = (domain || '').trim().toLowerCase();
  // `.edu` gTLD (mit.edu, harvard.edu) or a country-coded `edu.<cc>`
  // (ejust.edu.eg) — never a first-label "edu" like edu.com.
  return d === 'edu' || d.endsWith('.edu') || EDUCATION_CC_SUFFIX.test(d);
}

/** The single policy decision. */
export function isAllowedEmailDomain(domain: string, extraDomains: readonly string[] = []): boolean {
  const d = (domain || '').trim().toLowerCase();
  if (!d) return false;
  if (isEducationDomain(d)) return true;
  if (BUILTIN_ALLOWED_DOMAINS.has(d)) return true;
  return matchesList(d, extraDomains);
}

/** Full email → allowed? (convenience for the service layer). */
export function isAllowedEmail(email: string, extraDomains: readonly string[] = []): boolean {
  return isAllowedEmailDomain(emailDomain(email), extraDomains);
}

/** The comma-separated env value → normalized domain list. */
export function parseExtraDomains(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
}
