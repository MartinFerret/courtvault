# Vault Score and Leagues: legal basis and guardrails

Decision recorded 2026-10-08 (Martin). Applies to the Vault Score game, Leagues and every
ranking surface.

## Basis

- Free to play, no entry fee, no cash, no cards and no gift prizes. Rewards are badges only.
  With no consideration and no prize, the game is neither a lottery, a sweepstakes nor a paid
  fantasy contest.
- Player names and statistics are used as public facts. US precedent: _C.B.C. Distribution and
  Marketing v. Major League Baseball Advanced Media_ (8th Cir. 2007) held that names and
  statistics used in fantasy games are public information, outweighing publicity rights.
- Collections are self-declared. Points come only from real box scores; card value, rarity and
  Premium status never change a score.

## Guardrails (mandatory)

- No player photos or likenesses, no NBA, NBPA, team or arena logos, no real arena names, no
  team colors or logos on the court.
- "NBA" never appears in the game's name (Vault Score, Leagues) or branding.
- Nothing implies an official partnership or endorsement.
- "Not affiliated with the NBA or NBPA" (`AFFILIATION_DISCLAIMER` covers it) on the game
  screens, the rules page and the public "How scoring works" page.
- Terms of Service carry a "Vault Score and Leagues" section restating the no-prize rule.
- Ranking and league pages are noindex (web app only); usernames are filtered, emails never
  shown.

## Data source

Box scores come from Highlightly. Their Terms (updated 2026-07-24) allow using and storing the
data in our products (section 6.1) but do not mention derived data such as fantasy points, and
forbid using the data for gambling or betting (section 7). Status and the question sent to
them: `docs/legal/highlightly-terms.md`. Until they answer, scoring stays behind
`app_settings.vault_score.enabled` (false in production).
