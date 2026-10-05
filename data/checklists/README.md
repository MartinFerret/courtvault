# Checklists

CSV files imported with `pnpm import:checklist <file>` (idempotent: re-running creates no duplicates).

**Files prefixed `DEMO-` are demo data written by hand for local development.** Card numbers,
parallels and release dates are plausible but not official. They will be replaced by the
official Topps checklists before launch. Players whose team is empty had not been drafted
when this demo data was written.

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
