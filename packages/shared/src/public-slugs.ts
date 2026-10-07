/**
 * Public URL slugs (frozen 2026-10-07, R22 to R25). The database stores the same strings in
 * public_slug columns (refresh_public_slugs()); these helpers rebuild them from the catalog
 * fields when a query returns only the internal slugs.
 */
export function checklistPublicSlug(setSlug: string): string {
  return setSlug.endsWith('-basketball') ? setSlug : `${setSlug}-basketball`;
}

export function playerPublicSlug(playerSlug: string, hasRookieCard: boolean): string {
  return `${playerSlug}-${hasRookieCard ? 'rookie-cards' : 'cards'}`;
}

export function cardPublicSlug(
  setSlug: string,
  playerSlug: string,
  isRookie: boolean,
  number: string,
): string {
  return `${setSlug}-${playerSlug}-${isRookie ? 'rookie-card' : 'card'}-${number.toLowerCase()}`;
}
