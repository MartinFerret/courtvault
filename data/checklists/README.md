# Checklists

CSV files imported with `pnpm import:checklist <file>` (idempotent: re-running creates no duplicates).

The 2025-26 Topps sets are converted from the official Topps checklist PDFs with
`pnpm convert:checklist` (see below). Each one has a companion `*.anomalies.md` report to review
by hand. Imported on 2026-10-07 (base cards, variations, rookies):

| Set                           | Cards                                             | Rookies                                                         | Numbered parallels      |
| ----------------------------- | ------------------------------------------------- | --------------------------------------------------------------- | ----------------------- |
| 2025-26 Topps Basketball      | 300                                               | 50                                                              | yes (`parallels/`)      |
| 2025-26 Topps Chrome          | 299                                               | 50                                                              | yes (`parallels/`)      |
| 2025-26 Topps Chrome Updates  | 200                                               | 50                                                              | **missing** (Base only) |
| 2025-26 Topps Hoops           | 300                                               | 47, inferred from the Chrome rookie list (no marker in the PDF) | **missing**             |
| 2025-26 Topps Finest          | 300 (common 1-200, rare 201-300)                  | 74, inferred                                                    | **missing**             |
| 2025-26 Topps Cosmic Chrome   | 199 (#48 absent from the PDF, #101 fixed by hand) | 46                                                              | **missing**             |
| 2025-26 Topps Chrome Sapphire | 300                                               | 50                                                              | **missing**             |
| 2025-26 Topps Midnight        | 100                                               | 40                                                              | **missing**             |

Bowman: no PDF yet. Numbered parallels for the six new sets come from the Topps collector
guides on ripped.topps.com (`parallels/<set_slug>.json`, then re-run the conversion and import).
`--rookies-from <csv>` flags rookies from a sibling set when the PDF carries no marker. **Files prefixed `DEMO-` are demo data written by
hand** (the 2026-27 set does not exist yet); players whose team is empty had not been drafted.

## Converting an official Topps checklist

```
pnpm convert:checklist /path/to/2025-26_Topps_Chrome_Basketball_Checklist.pdf \
  --season 2025-26 --set-slug 2025-26-topps-chrome --set-name "Topps Chrome"
```

- Needs `pdftotext` (`brew install poppler`). The PDF stays on your disk: it is never copied
  into the repository or the database (`*.pdf` is gitignored). Only facts are extracted.
- Scope: base cards, base variations (Golden Mirror, Clear, Team Color Border, Blackout,
  Player Number, Image Variation) and rookie flags. Inserts, autographs and relics are skipped
  and listed at the end of the report.
- Numbered parallels are not in the PDF. They come from `parallels/<set_slug>.json`, transcribed
  from Topps' official collector guides on ripped.topps.com (the source URL is in each file).
- Inconsistencies (same number with different players or teams across sections, unknown teams,
  odd casing, non-player rows, variations without a base card) go to the anomalies report
  instead of being guessed. Review it, fix the CSV by hand if needed, then
  `pnpm import:checklist data/checklists/<set_slug>.csv`.

Format (header required, UTF-8):

```
season,set_slug,set_name,card_number,player_name,team,is_rookie,parallels
2025-26,2025-26-topps-chrome,Topps Chrome,3,Cooper Flagg,Dallas Mavericks,true,Base|Refractor|Gold Refractor/50|Red Refractor/5|Superfractor/1
```

- `parallels`: `|`-separated list, serial run after `/` (`Gold Refractor/50` = numbered to 50).
  `Base` is a parallel too.
- `is_rookie`: `true` or `false`.
- `team` may be empty.
- Set names are displayed as plain text only (nominative use). No logos or typography.
