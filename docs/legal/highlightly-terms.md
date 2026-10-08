# Highlightly Terms of Service: what they say about our use

Read on 2026-10-08 at https://highlightly.net/terms/ (last updated 2026-07-24, Highlightly,
Slovenia).

| Topic                         | What the Terms say                                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Use in our products           | Section 6.1: "You are free to use the data in your applications and products."                                                                   |
| Storage and distribution      | Section 6.1: distribution, transfer and storage of the data are allowed.                                                                         |
| Reselling the API             | Section 6.1: no reselling, sublicensing or redistributing direct access to the API, no proxy or pass-through service without written permission. |
| Database rights               | Section 6.2: no systematic extraction or re-utilization of the whole or a substantial part of their database.                                    |
| Commercial use                | Not restricted for data; for logos and images, compliance is our responsibility (6.4). We use neither.                                           |
| Attribution                   | Not required.                                                                                                                                    |
| Prohibited uses               | Section 7: gambling or betting; creating a competing database or service; circumventing limits.                                                  |
| Derived data (fantasy points) | **Not mentioned.**                                                                                                                               |

Assessment: displaying box scores and our own computed points is close to "use in our
products", and the game has no stakes, so it is not gambling. But derived fantasy scoring is
not covered explicitly and "fantasy" sits next to the betting clause in many readers' minds.
Per CLAUDE.md we do not guess on API terms: we ask in writing.

Status: **question to send** (draft below). Scoring is built but stays disabled in production
(`app_settings.vault_score.enabled = false`) until a written answer allows it.

## Draft email to Highlightly support

To: Highlightly support (contact form or the support address shown in your dashboard)
Subject: Terms question: free fantasy game computed from NBA box scores

> Hello,
>
> I run HoopTicker (hoopticker.com), a basketball trading card catalog and collection tracker
> that uses your NBA API (box scores) on a paid plan.
>
> We are adding a free-to-play game: each user picks five players and a captain, and we compute
> points from the real box scores we receive from your API (for example points x 1, rebounds
> x 1.2, assists x 1.5, steals x 3, blocks x 3, turnovers x -1). Users see their total, a
> per-player breakdown and rankings among friends. There is no entry fee, no cash, no prize of
> any kind (badges only), and nothing related to gambling or betting. We never resell or expose
> API access, and we store only the box score lines we need.
>
> Could you confirm in writing that this use, computing and displaying fantasy points derived
> from your box scores in a free game with no prizes, is allowed under your Terms (sections 6
> and 7)? If a specific plan or an attribution is required, please tell us.
>
> Thank you,
> Martin Ferret
> HoopTicker, 9 rue des Erables, 45250 Briare, France
> mferret.pro@gmail.com
