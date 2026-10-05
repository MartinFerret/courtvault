/** URL slugs for players, sets and cards. Deterministic so imports are idempotent. */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Card slug: `<set-slug>-<number>-<player-slug>`, e.g. `2025-26-topps-chrome-3-cooper-flagg`. */
export function cardSlug(setSlug: string, cardNumber: string, playerName: string): string {
  return slugify(`${setSlug}-${cardNumber}-${playerName}`);
}

/** Parses "Gold Refractor/50" into { name: "Gold Refractor", serialRun: 50 }. "Base" has no run. */
export function parseParallel(raw: string): { name: string; serialRun: number | null } {
  const trimmed = raw.trim();
  const match = /^(.*?)\s*\/\s*(\d+)$/.exec(trimmed);
  if (!match) return { name: trimmed, serialRun: null };
  return { name: (match[1] ?? '').trim(), serialRun: Number.parseInt(match[2] ?? '', 10) };
}

/** Display name for a parallel: "Gold Refractor /50", "Superfractor 1/1", "Base". */
export function formatParallel(name: string, serialRun: number | null): string {
  if (serialRun === null) return name;
  if (serialRun === 1) return `${name} 1/1`;
  return `${name} /${serialRun}`;
}
