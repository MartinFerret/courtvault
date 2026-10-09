# Anomalies report: 2025-26 Topps Chrome Sapphire

Source: official Topps checklist (local file, not stored). Generated 2026-10-07.

## Summary

- Cards written: 300 (rookies: 50)
- Base sections: 3, variation sections: 0, rows read: 540
- Variation parallels found: none
- Numbered parallels applied: NONE (add /Users/martinferret/Desktop/nba/data/checklists/parallels/2025-26-topps-chrome-sapphire.json)
- Existing players matched: 299
- New players: 1

## Unverified cards

The base section is the source of truth. These numbers have a different player in at least one
variation section; verify with a real card photo before trusting them:

- none

## Rules applied

- Teams: the base section wins when a variation section disagrees. The team printed on a card is
  catalog information only; stats and "Last night" match on player identity, never on the team.
- Team cards and other rows without a player (e.g. "WE THE NORTH RAPTORS SHINE") are skipped for the MVP.
- Known team misspellings (e.g. "Portland Trailblazers") are normalized automatically and listed as team_alias.

## Anomalies by type

- suspicious_name: 1
- team_alias: 2

## Details

- [suspicious_name] (BASE CARDS I, line 44) Odd casing "Kristaps PORZINGIS" normalized to "Kristaps Porzingis"
- [team_alias] (BASE CARDS III, line 223) Team "Portland Trailblazers" normalized to "Portland Trail Blazers" for "Kris Murray"
- [team_alias] (BASE CARDS III, line 232) Team "Portland Trailblazers" normalized to "Portland Trail Blazers" for "Sidy Cissoko"

## Skipped sections (out of MVP scope)

- INSERT / SAPPHIRE SELECTIONS: 20 rows
- INSERT / INFINITE SAPPHIRE: 20 rows
- AUTOGRAPH / TOPPS CHROME AUTOGRAPHS: 25 rows
- AUTOGRAPH / TOPPS CHROME AUTOGRAPHS ROOKIES: 40 rows
- AUTOGRAPH / SKY WRITE SIGNATURES: 33 rows
- AUTOGRAPH / TOPPS AUTOGRAPH ISSUE ROOKIES: 30 rows
- AUTOGRAPH / NEXT STOP SIGNATURES: 30 rows
- AUTOGRAPH / SIGNATURE STYLE: 37 rows
- AUTOGRAPH / TOPPS CHROME AUTOGRAPHS II: 1 rows
- AUTOGRAPH / PACKAGING: 0 rows
- AUTOGRAPH / SELL SHEET: 0 rows
- AUTOGRAPH / SELL SHEET: 4 rows

## Import (2025-26-topps-chrome-sapphire.csv)

Last run 2026-10-09. Player names that were not an exact match of an
existing player. "merged" rows were attached to the existing player and recorded as aliases;
"suffix" and "ambiguous" rows created a player to confirm; "new" names were not close to any
existing player. Add a typo to player-aliases.csv once it is confirmed to be a known player.

- new (1): "Sidy Cissoko"
