/**
 * Topps release watch (SEO audit of 2026-10-08, item 7). The official checklists page is read
 * once a day with an identified User-Agent and nothing else: no retries, no other pages, no
 * alternative routes when the page is blocked or robots.txt disallows it.
 */
export const TOPPS_CHECKLISTS_URL = 'https://www.topps.com/pages/checklists';
export const TOPPS_ROBOTS_URL = 'https://www.topps.com/robots.txt';

export function botUserAgent(contact: string): string {
  return `HoopTickerBot/1.0 (+https://hoopticker.com; ${contact})`;
}

export interface FoundSet {
  slug: string;
  name: string;
  season: string;
}

/** "2026-27 Topps Chrome Basketball" -> slug "2026-27-topps-chrome-basketball", name "Topps Chrome". */
export function toFoundSet(season: string, product: string): FoundSet {
  const name = product
    .replace(/[®™]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*basketball\s*$/i, '')
    .trim();
  const slug = `${season} ${name} basketball`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return { slug, name, season };
}

/** Basketball products named on the page, newest season first, each once. */
export function findBasketballSets(html: string, minSeason = '2026-27'): FoundSet[] {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
  const re = /(20\d\d-\d\d)\s+(Topps[^.,;:()\n]{0,50}?Basketball)\b/gi;
  const found = new Map<string, FoundSet>();
  for (const m of text.matchAll(re)) {
    const set = toFoundSet(m[1], m[2]);
    if (set.season >= minSeason && !found.has(set.slug)) found.set(set.slug, set);
  }
  return [...found.values()].sort((a, b) => b.season.localeCompare(a.season));
}

/** True when robots.txt forbids the path for everyone or for our bot. Unknown or empty = allowed. */
export function robotsDisallows(robots: string, path: string, agent = 'HoopTickerBot'): boolean {
  let applies = false;
  let disallowed = false;
  let allowed = false;
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const [key, ...rest] = line.split(':');
    const value = rest.join(':').trim();
    if (key.toLowerCase() === 'user-agent') {
      applies = value === '*' || value.toLowerCase().includes(agent.toLowerCase());
    } else if (applies && key.toLowerCase() === 'disallow' && value && path.startsWith(value)) {
      disallowed = true;
    } else if (applies && key.toLowerCase() === 'allow' && value && path.startsWith(value)) {
      allowed = true;
    }
  }
  return disallowed && !allowed;
}
