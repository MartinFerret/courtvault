/** Public paths of the website (slugs frozen 2026-10-07). The app mirrors them for deep links. */
export const PATHS = {
  checklists: '/checklists',
  players: '/players',
  cards: '/cards',
  rookies: '/most-valuable-basketball-rookie-cards',
  movers: '/trending-basketball-cards',
  method: '/how-we-price-cards',
  scoring: '/fantasy-basketball-scoring',
  values: '/basketball-card-values',
} as const;

export const checklistPath = (publicSlug: string) => `${PATHS.checklists}/${publicSlug}`;
export const playerPath = (publicSlug: string) => `${PATHS.players}/${publicSlug}`;
export const cardPath = (publicSlug: string) => `${PATHS.cards}/${publicSlug}`;
export const moversPath = (day?: string | null) => (day ? `${PATHS.movers}/${day}` : PATHS.movers);
