/**
 * Cookies shared with the website on .hoopticker.com. Only flags and first-touch attribution:
 * never a token (the session stays in this app's storage).
 */
const ATTR_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'ref',
] as const;

function cookieSuffix(): string {
  if (typeof location === 'undefined') return '';
  const domain = location.hostname.endsWith('hoopticker.com') ? '; Domain=.hoopticker.com' : '';
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  return `; Path=/; SameSite=Lax${domain}${secure}`;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = new RegExp(`(?:^|;\\s*)${name}=([^;]*)`).exec(document.cookie);
  return match ? decodeURIComponent(match[1]!) : null;
}

/** `ht_session=1` while signed in, so hoopticker.com shows "Open my Vault". */
export function setSignedInFlag(signedIn: boolean): void {
  if (typeof document === 'undefined') return;
  document.cookie = signedIn
    ? `ht_session=1; Max-Age=${30 * 86400}${cookieSuffix()}`
    : `ht_session=; Max-Age=0${cookieSuffix()}`;
}

/** First-touch attribution set by the website, or by this app when traffic lands here first. */
export function readAttribution(): Record<string, string> {
  try {
    const raw = readCookie('ht_attr');
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** Records the UTMs of a visit that lands directly on the app (no website first touch). */
export function captureLandingAttribution(): void {
  if (typeof location === 'undefined' || readCookie('ht_attr')) return;
  const params = new URLSearchParams(location.search);
  const attr: Record<string, string> = {};
  for (const key of ATTR_KEYS) {
    const value = params.get(key);
    if (value) attr[key] = value.slice(0, 200);
  }
  if (Object.keys(attr).length === 0) return;
  attr['landing'] = `app${location.pathname}`.slice(0, 200);
  attr['first_seen'] = new Date().toISOString();
  document.cookie = `ht_attr=${encodeURIComponent(JSON.stringify(attr))}; Max-Age=${30 * 86400}${cookieSuffix()}`;
}
