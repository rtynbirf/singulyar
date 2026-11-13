# ROADMAP FOR AGENTS — the order of waves and crossing out rows

> **Status:** ✅ Current · **Introduced:** 2026-11-09 · Directive 1 of the swarm: every step is written here synchronously (the EN mirror is made by W1).
> Priority = risk per КРУ V2 (file 25). A wave crosses out ITS OWN rows and appends the fact (date, commit, verification) — the map lives, it is not a report.
> RU original (source of truth): [ДОРОЖНАЯ_КАРТА_АГЕНТОВ.md](ДОРОЖНАЯ_КАРТА_АГЕНТОВ.md).

## Order by risk

| Order | Wave | Why it goes first | Status |
|---|---|---|---|
| 0 | ~~Phase 0 remainder: live numbers on all faces~~ | cheap, and the whole navigation of the revision stands on the triple of numbers | ✅ 2026-11-09 — ПРАВДА-2 (F-019/F-020/F-021 closed; guards T-071…T-073 standing) |
| 0a | ~~REQUIRED/OPTIONAL + surviving last-known-good~~ | the only defect with an irreversible outcome | ✅ 2026-11-09 — ЛКГ-1 (F-001/F-022; T-010/T-070 in the guard) |
| 1 | **W1 The human update ritual** (UX §5) | after ЛКГ-1 a consent key is left without UI; the strongest external tensor at minimal code cost; + EN mirrors of the agents' package | ✅ 2026-11-09 — the ritual card in the hub, the `S15_ВЕДОМОСТЬ` key in the worker, guard `test_ритуал_такта.mjs`, T-070 alive; EN mirrors planted |
| 2 | ~~**W2 Fond readiness** (Phase 1 items 3–5)~~ | the offline promise of a song = the honest status "the fond is in the House" | ✅ 2026-11-13 — wave W2: CORE/SONG/MODEL/P2P_READY in ·38/·32 (definitions in the counters dictionary, +6), the "аудио_в_хранилище" counter from the OPFS list, the "evening" (songs × flagman languages ×157) with a forecast from the fond manifest and a cancel button, the ·32 ladder with the OPFS zero step and the honest SONG_UNAVAILABLE card; guard `test_готовность_фонда.mjs` 6/6 |
| 3 | ~~**W3 External actions** (Phase 2)~~ | permissions and external borders | ✅ 2026-11-14 — wave W3: canon of 6 states (dictionary +6, T-073); core внешние-действия/0.1 (append-only journal with a chain seal, capability badges, holder-side revocation); live status registry data/статусы.json ×13 actions ×7 doors (F-011, sg-registry 5 min); pir-core/0.2 (30-min TTL baked at issuance, recipient clock, answer echo-id); pin core/0.1 (PBKDF2 310k, back-off ceiling 15 min); 7 faces; guard 8/8 |
| 4 | **W4 Contracts + the worlds map** (Phase 3) | reduces the mismatch of doors and flows; the main↔rumu convergence — only with the owner's permission | ⬜ |
| 5 | **W5 AT matrix** (Phase 4) | confirms accessibility with facts | ⬜ |
| 6 | **W6 Connection/scale** (Phase 5 + webtorrent in the F-005 discipline) | expansion after a stable base | ⬜ |
| 7 | **W7 The living revision layer** (Phase 6 remainder) | closes the revision loop with the House | ⬜ |

## The crossing-out journal (append-only)

| Date | Wave | What was crossed out | Commit/verification |
|---|---|---|---|
| 2026-11-14 | **W3 «External actions»** (TZ §3) | a unified state + journal for every external action; a revoked right visible to the human immediately; live registry F-011; pir-core 0.2 (TTL/revoke); honest PIN ·42; the colleague-LLM «WHAT IS MISSING» synthesis adopted in ДОКУМЕНТЫ/ПОЛИМАТ_ЧЕГО_НЕТ (7 gaps — candidates) | guard test_внешние_действия.mjs 8/8; 54 JS + 13 Python 0 red; truth shop «ДРЕЙФ НЕТ»; cache v246 |
| 2026-11-13 | **W2 "Fond readiness"** (ТЗ §2) | the honest "the fond is in the House" status: CORE/SONG/MODEL/P2P_READY on ·38/·32; the "аудио_в_хранилище" counter = len(__ОПФС.список()); the evening — songs × flagman languages ×157 with a size forecast from the fond manifest and a cancel (AbortController); the ·32 ladder: OPFS → door-0 → чистый-минус → SONG_UNAVAILABLE; the counters dictionary +6 definitions; the "no media in precache" law intact | guard `test_готовность_фонда.mjs` 6/6; the whole House: 53 JS + 13 Python oracles, 0 red, truth shop "NO DRIFT", node --check clean |
| 2026-11-09 | ЛКГ-1 + ПРАВДА-2 | F-001, F-019, F-020, F-021, F-022; the core ceiling; T-070…T-073; the agents' package planted in the repo | latkas; the live ЭП-06 verification — for the releasing wave after the push |
| 2026-11-09 | W1 | the ritual card (S15_ВЕДОМОСТЬ + consent dialog) + EN mirrors of the package; the W1 row crossed out | latka v237→v238; guard `test_ритуал_такта.mjs`; T-070 alive |

## Rules of moving along the map

1. Take the NEXT wave in order; a jump — only on the owner's word (Law З.3 of the swarm).
2. A wave = a takt or a series of latkas; every `sw15.js` edit — a `S15_CACHE` bump.
3. What is found out of turn — do not touch colleagues' bytes: accept whole + renumber honestly (З.5).
4. «Done» = the DoD from [ТЗ_АГЕНТАМ_EN.md §9](ТЗ_АГЕНТАМ_EN.md), not «the commit went through».
5. What is NOT done (an addition to V1): aggressive skipWaiting; breaking the law "media outside the precache"; touching the ·43 chronicle and the archive worlds; counting the red «ПИН УСТАРЕЛ» a defect; merging the three door counters into one "correct" one.
