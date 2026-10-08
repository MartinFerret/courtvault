# Anomalies report: 2025-26 Topps Finest

Source: official Topps checklist (local file, not stored). Generated 2026-10-07.

## Summary

- Cards written: 300 (rookies: 74)
- Base sections: 3, variation sections: 0, rows read: 764
- Variation parallels found: none
- Numbered parallels applied: NONE (add /Users/martinferret/Desktop/nba/data/checklists/parallels/2025-26-topps-finest.json)
- Existing players matched: 156
- New players: 4

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

- unknown_team: 1
- rookies_inferred: 1

## Details

- [unknown_team] (BASE UNCOMMON, line 195) Unknown team "Philadelpia 76ers" for "Allen Iverson"
- [rookies_inferred] 74 rookie flags inferred from data/checklists/2025-26-topps-chrome.csv (no rookie marker in this PDF)

## Skipped sections (out of MVP scope)

- INSERT / ARRIVALS: 30 rows
- INSERT / FIRST: 30 rows
- INSERT / FINISHERS: 10 rows
- INSERT / PULSE: 20 rows
- INSERT / THE MAN: 20 rows
- INSERT / HEADLINERS: 15 rows
- INSERT / MUSE: 30 rows
- INSERT / AURA: 20 rows
- AUTOGRAPH / AUTOGRAPH CARDS: 54 rows
- AUTOGRAPH / ROOKIE AUTOGRAPHS: 40 rows
- AUTOGRAPH / BASELINE AUTOGRAPHS: 50 rows
- AUTOGRAPH / MASTERS AUTOGRAPHS: 47 rows
- AUTOGRAPH / ELECTRIFYING SIGNATURES: 49 rows
- AUTOGRAPH / COLOSSAL SHOTS AUTOGRAPHS: 49 rows

## Import (2025-26-topps-finest.csv)

Last run 2026-10-08. Player names that were not an exact match of an
existing player. "merged" rows were attached to the existing player and recorded as aliases;
"suffix" and "ambiguous" rows created a player to confirm; "new" names were not close to any
existing player. Add a typo to player-aliases.csv once it is confirmed to be a known player.

- merged: "Cade Cunnigham" -> "Cade Cunningham" (Cade Cunningham (1 edits, 0.71))
- merged: "Deni Avdja" -> "Deni Avdija" (Deni Avdija (1 edits, 0.64))
- new (1): "Ray Allen"
