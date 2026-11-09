# TZ FOR AGENTS — the technical assignment of the House's waves

> **Status:** ✅ Current · **Introduced:** 2026-11-09 · Customer: the owner.
> Basis: the КРУ V1 revision (files 00–16) and КРУ V2 (files 20–28, findings F-019…F-024) of 2026-11-09; the ЛКГ-1 and ПРАВДА-2 latkas (same day).
> Wave rules: [AGENTS_EN mirror](../ЗАДАНИЕ_АГЕНТАМ_EN.md), [docs/РИТУАЛ_ТАКТА.md](РИТУАЛ_ТАКТА.md) (RU), [docs/ПОЛИМАТ_МУЛЬТИАГЕНТ.md](ПОЛИМАТ_МУЛЬТИАГЕНТ.md) (RU), [docs/КАНОН_НАДЗОРА_EN.md](КАНОН_НАДЗОРА_EN.md). Order — [docs/ДОРОЖНАЯ_КАРТА_АГЕНТОВ_EN.md](ДОРОЖНАЯ_КАРТА_АГЕНТОВ_EN.md).
> RU original (source of truth): [ТЗ_АГЕНТАМ.md](ТЗ_АГЕНТАМ.md).

## 0. Already closed (do not redo)

| КРУ finding | What it was | How it was closed | Guard |
|---|---|---|---|
| F-001 · P0/P1 | the worker swallowed a file failure and activated an incomplete build | ЛКГ-1: `S15_ЯДРО_ОБЯЗАТЕЛЬНОЕ` (11 files), rejected install, smoke acceptance in install+activate | `test_sw15_приёмка.mjs` |
| Phase 1 item 2 | the old cache was wiped BEFORE the new one was verified | ЛКГ-1: wiping only after acceptance; last-known-good survives activation; an honest `S15_ПРИЁМКА` signal | `test_sw15_приёмка.mjs` |
| F-022 · P1 | unconditional `skipWaiting` | ЛКГ-1: activation = acceptance ∧ consent (`S15_ВХОД_В_ТАКТ`) | `test_sw15_приёмка.mjs` |
| F-019 · P1 | five generations of numbers in one build | ПРАВДА-2: footer, `meta sng-build`, README, JSON-LD ·35 — derived from the registry; deploy SHA — `pages.yml` → `meta sng-deploy-sha` | `test_лица_правды.mjs` (T-071) |
| F-020 · P2 | three door counters, two song counters without a dictionary | ПРАВДА-2: the counter dictionary in `versions.json` (8 definitions), keys `дверей_человек`/`песен_очередь_фонд` in sg-registry, 45 faces aligned | T-073 + the "tags" pass of the truth workshop |
| F-021 · P2 | AGENTS.md lied about the `main` branch | ПРАВДА-2: branch from `pages.yml`, the workshop's zone; the gate paints `rumu` | T-072 |
| (new, found by ЛКГ-1) | the `S15_MAX=140` ceiling cut the core (172 entries) on a non-core put | ЛКГ-1: the ceiling measures only non-core, the offline core is untouchable | `test_sw15_приёмка.mjs` |

## 1. Wave W1 — «The human update ritual» (UX §5, on top of ЛКГ-1)

**Task.** The ЛКГ-1 latka left the consent key (`S15_ВХОД_В_ТАКТ`) in the worker, but there is no UI ritual yet. Build it per file 24 §5 (КРУ V2): after a new takt is installed, an honest card «Дом обновился: такт X · поколение Y · комплектность ядра Z/Z — Войти в новый такт / Позже» (The House updated: takt X · generation Y · core completeness Z/Z — Enter the new takt / Later).

**Requirements.**
- The card reads the worker's acceptance (`S15_PING` → `ядро_обязательное`; `S15_ПРИЁМКА` → fit/reject); it does not invent numbers.
- «Later» — the worker waits, the House lives on the previous takt; consent → `postMessage({type:'S15_ВХОД_В_ТАКТ'})` → faces reload (the С147 latka already reloads on controller change).
- A refusal is not lost: the next install shows the card again.
- A11y: the dialog in the House canon (focus trap like the hub's удобства panel), `aria-live` announces the update fact.
- The wave's first item: EN mirrors of the agents' package (Directive 1 of the swarm).

**Acceptance.** T-070 alive: on refusal the build does not activate; on consent it activates and survives a browser restart. Screenshots of both branches in `download/`.

## 2. Wave W2 — «Fond readiness» (Phase 1 items 3–5, F-002/F-023)

**Task.** The honest state of "the fond is in the House": `CORE_READY/SONG_READY/MODEL_READY/P2P_READY` in ·38/·32; a counter of "how much audio is already in cache/OPFS"; a manual "evening" warm-up (selected songs × languages) with a volume forecast and cancellation; `SONG_UNAVAILABLE` instead of silence when raw/jsDelivr refuse.

**Requirements.** Do not break the law "media outside the precache"; show readiness, do not download everything; counters come from the registry (dictionary), not by hand; new states go into the counter dictionary with a definition.

**Acceptance.** T-015/T-016/T-073: a learned song sings on a plane; an unlearned one is honestly marked; an external host refusal is explained in the UI.

## 3. Wave W3 — «External actions» (Phase 2: ·47 Device Flow, ·48 providers, ·54 invite/TTL/revoke, ·42 PIN)

**Task.** Unified states of external actions + capability badges; F-012 statuses distributed to ·33/·49; `ГОТОВНОСТЬ.manifest` → a live status registry (F-011), linked with ·55 «Единое окно» (Single Window) and door cards.

**Acceptance.** Every external action has a state and a journal; a revoked permission is visible to a human immediately.

## 4. Wave W4 — «Contracts and convergence» (Phase 3 + the main↔rumu drift)

**Task.** Contracts V1 (capability registry, intent/result envelope, object manifest, representation, event/session, evidence) — in force; the House's passport gains a "worlds" block (rumu / minus-fond / main / c590c6c9 — F-023). The main↔rumu convergence (ahead 774/behind 631) is a SEPARATE wave with the owner's permission, per П-71 discipline; without permission — only the drift map.

## 5. Wave W5 — «Real accessibility» (Phase 4)

**Task.** The AT matrix: NVDA/VoiceOver/TalkBack/Braille/switch/keyboard on the key faces (hub, ·31, ·01, ·35, ·38). Without it "accessible" is a claim, not a fact.

**Acceptance.** Test protocols in `docs/аудит/`; defects go into the findings registry with OPEN/FIXED_VERIFIED statuses + SHA.

## 6. Wave W6 — «Connection and scale» (Phase 5 + webtorrent)

ICE diagnostics, latency/jitter/loss, self-TURN/SFU as an adapter, mesh limits tested, reconnect/resume; the webtorrent route goes into the F-005 transport discipline (what the route reveals, what it journals) BEFORE connecting.

## 7. Wave W7 — «The living revision layer» (Phase 6 remainder)

Link ·43 (the chronicle) and ·38/·63 with the living layer (issues/KNOWN_ISSUES) — «one fact, one place»; OPEN/FIXED_VERIFIED statuses with commit SHA + artifact.

## 8. General technical requirements for all waves

1. **Numbers:** only from `data/versions.json` (the counter dictionary); a new number = a new dictionary field with a definition; a hand-made number in a face = red CI.
2. **Worker:** editing `sw15.js` = bump `S15_CACHE`; a mandatory file failing = rejection; do not wipe last-known-good before acceptance; skipWaiting only on `S15_ВХОД_В_ТАКТ`.
3. **Tests:** every defect is closed with a guard (`ИНСТРУМЕНТЫ/test_*`); `node --check` on all edited JS; python oracles are deterministic (no network).
4. **Precache:** new assets go into `S15_CORE`; heavy things (media, models) are NOT precached.
5. **CSP meta** — as one whole text, posture A (the v10.52/v10.54 scars).
6. **Chronicle/CHANGELOG** — append-only; «one fact, one place».
7. **EN mirrors** of key documents — in the same wave (Directive 1 of the swarm); the agents' package carries only RU originals — the package's EN mirrors are made by W1 as its first item.
8. **Clean trail:** the departure checklist from [docs/КАНОН_НАДЗОРА_EN.md §4](КАНОН_НАДЗОРА_EN.md) is mandatory before the wave journal.

## 9. Definition of done (wave DoD)

- Oracles green (CI + locally on the wave's files).
- Truth workshop: «ДРЕЙФ НЕТ» (NO DRIFT).
- Live verification ЭП-06 with a checklist and screenshots.
- Chronicle/CHANGELOG/ДОРОЖНАЯ_КАРТА_АГЕНТОВ appended; the wave crosses out its own map rows.
- The clean-trail checklist is closed.
