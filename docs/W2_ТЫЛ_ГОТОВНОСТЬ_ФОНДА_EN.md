# WAVE W2 REAR «FUND READINESS» — recon and landing map (EN mirror)

> **Status:** ✅ Launchpad ready · **Recon:** 2026-11-13 · **Base:** `rumu` = `ee170bd` (wave ×23 "closing the rears")
> RU original: [W2_ТЫЛ_ГОТОВНОСТЬ_ФОНДА.md](W2_ТЫЛ_ГОТОВНОСТЬ_ФОНДА.md). This dossier does not close the W2 row — the wave itself does, per [ДОРОЖНАЯ_КАРТА_АГЕНТОВ_EN.md](ДОРОЖНАЯ_КАРТА_АГЕНТОВ_EN.md).

## 1. The literal TZ (docs/ТЗ_АГЕНТАМ_EN.md §2 — source of truth)

> **Task.** Honest "fund in the house" state: `CORE_READY/SONG_READY/MODEL_READY/P2P_READY` in ·38/·32; counter "how much audio is already in cache/OPFS"; manual "evening" warm-up (selected songs × languages) with size forecast and cancel; `SONG_UNAVAILABLE` instead of silence when raw/jsDelivr fail.
>
> **Requirements.** Do not break the "media out of pre-cache" law; show readiness, do not download everything; counters from the registry (dictionary), never by hand; new states go into the counters dictionary with a definition.
>
> **Acceptance.** T-015/T-016/T-073: a learned song sings on a plane; an unlearned one is honestly marked; external host failure is explained in the UI.

## 2. Launchpad (measured 2026-11-13)

| What | Fact |
|---|---|
| HEAD `rumu` | `ee170bd` — "wave ×23 closing the rears", 2026-11-13T13:49:41Z |
| CI on HEAD | House oracles run 43437258935 green · Tact-gate run 43437068665 green · OpenSSF Scorecard green |
| Open issues/PRs | 0 (dependabot #67/#69/#70 merged ×23; issue #68 / W6 closed) |
| Worker | `S15_CACHE = s15-orkestrator-v240` · `S15_CORE` = **180 entries** |
| Media in core | only 2 same-origin exceptions with dossiers: `./minus/prosto-lubi.mp3` (house chassis, TH-AUDIO-44/45) and `./звуки/тон-тест.mp3` — the "media out of pre-cache" law holds; the heavy fund is not in core |
| КРУ files 00–28 | not in repo (the audit arrived as a package); findings F-002/F-023 described in TZ §0/§4 — T-015/T-016 guards do **not** live in the repo; wave W2 creates its own guards (TZ §8.3) |

## 3. Foundation already in the house (do not rebuild)

- **`js/opfs-core.js`** — canon opfs-core/0.1 (tact v11.23 «СТОЙКОСТЬ», С100): `window.__ОПФС` with `положить/взять/есть/убрать/список/оценка/закрепить/постоянное/возможности`; default dir **«фонограммы»** (phonograms); id law allows YouTube ids; ES2019, zero network. Connected in ·15/·19/·38; **not yet in ·32** (one `<script>` line; ·32 CSP already allows `'self'`).
- **`js/minus-fond.js`** — the only fund path builder: door-0 same-origin `./minus/голос/…` (pages.yml materializes 62 files, 458 MB, from branch `minus-fond` into the Pages artifact), raw BASE for МИН/Сборник, jsDelivr mirror (С172), tags `MINUS_FOND_TAG / MINUS_FOND_MIRROR_TAG / MINUS_DOOR0_TAG`.
- **`data/versions.json`** — counters dictionary (F-020, T-073): 8 definitions; the «песен» definition already carries F-023 ("fund bodies live on branch minus-fond, rumu carries the общак"). New W2 states go ONLY here, with definitions.
- **·38 ПУЛЬС** (`СИНГУЛЯР_38_ПУЛЬС.html` + `js/room-38.js`): worker PING/ОТЧЁТ, cache table (content-length weight, bodies never read), device quota, AI states (library/hearing/brain) with honest "warmed/not warmed" and click-only warm-up (I-01). Landing pad for `CORE_READY / MODEL_READY / P2P_READY`, the audio counter and the "evening" warm-up.
- **·32 СЦЕНА** (`СИНГУЛЯР_32_СЦЕНА.html`): plays the fund via `window.minusUrl` with the honest ladder `голос/{id}.mp3` → `чистый-минус/{id}.mp3`; voiceless v10.69 exceptions have their own paths; chassis — same-origin `minus/prosto-lubi.mp3`. Landing pad for `SONG_READY / SONG_UNAVAILABLE`.

## 4. W2 landing map (recon proposal — the wave decides)

1. **`js/room-38.js` (+ ·38 HTML)** — "House readiness" section: `CORE_READY` (worker acceptance via `S15_ПРИЁМКА`/PING — read the worker, never invent numbers); `MODEL_READY` (hearing+brain, caches `s15-ai-v1`/`transformers-cache`/`singular-llm-parts-v1`); `P2P_READY` (honest definition: link modules in core cache + browser `RTCDataChannel` support); `SONG_READY`/counter via `__ОПФС.список()` + `оценка()`; **evening warm-up**: pick songs × languages → size forecast (HEAD content-length, zero bodies) → download into `__ОПФС.положить()` with progress and **cancel** (AbortController); offer `закрепить()` (persist) before warming.
2. **`СИНГУЛЯР_32_СЦЕНА.html`** — OPFS becomes step zero of the ladder: learned song (present in «фонограммы») plays from OPFS (sings on a plane); then door-0 → raw → jsDelivr; full ladder failure = **`SONG_UNAVAILABLE`** honest card with reason, no silence, no auto-skip.
3. **`data/versions.json`** — new dictionary keys with definitions (final names are the wave's call), e.g. core/songs/models/p2p readiness, audio-in-storage counter, song-unavailable state.
4. **New guards** — `ИНСТРУМЕНТЫ/test_готовность_фонда.mjs` (+ browser probe if needed): learned song sings from OPFS offline; unlearned honestly marked; host failure explained; counters from the dictionary; no media slipped into pre-cache.
5. **`sw15.js`** — if touched: bump `S15_CACHE` v240→v241; new assets — code/docs only in `S15_CORE`; **no media**.
6. **Languages for the evening** — language texts live in `ДАННЫЕ/…`; selected language bodies are also out of pre-cache, stored on choice, counted in the forecast.

## 5. World practices 2025–2026 (research-first, open sources)

- "When a web app first loads, it must indicate whether it's ready for offline use" — web.dev, https://web.dev/articles/offline-ux-design-guidelines — exactly `CORE_READY/SONG_READY`.
- OPFS lives under the origin quota; usage/quota via `navigator.storage.estimate()` — MDN, https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system.
- `persist()` protects storage from eviction — https://www.mironsoft.de/en/blog/javascript-origin-private-file-system-opfs-in-the-browser (2025); https://fast.io/resources/file-system-access-api (2026).
- Cache version as a worker constant, bump on every change — MDN, https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers — the house already holds `S15_CACHE`.

## 6. Open questions for wave W2

1. OPFS ids — recon recommendation: id = YouTube id (one truth with fund ·31 and the «s31-склад»); step suffix (`голос/`/`минус/`) is the wave's call.
2. `P2P_READY` without lying — "modules cached + browser supports DataChannel" is a *capability*, not a connection; the face copy must separate them honestly.
3. Chassis and tone-test (`./minus/prosto-lubi.mp3` in core) — deliberate exceptions with dossiers (TH-AUDIO-44/45); do not "fix", do not count as learned.
4. T-015/T-016 — КРУ V1 numbers do not live in the repo; name guards by the wave's fact, reference TZ §2 acceptance honestly.
5. Forecast when content-length is missing — show «—» with an honest note (pattern: ·38 cache table).

## 7. DoD checklist (TZ §9) — before the wave journal

- [ ] Oracles green (CI + local per files); `node --check` on every edited JS.
- [ ] Truth shop: "NO DRIFT"; counters from the dictionary, zero hand-written numbers on faces.
- [ ] Live acceptance ЭП-06 with checklist and screenshots (both branches: learned/unlearned + host failure).
- [ ] Chronicle/CHANGELOG/ДОРОЖНАЯ_КАРТА_АГЕНТОВ appended; W2 row closed by the wave.
- [ ] EN mirrors of key documents — same wave (Directive 1 of the swarm).
- [ ] Clean-trace checklist ([КАНОН_НАДЗОРА.md §4](КАНОН_НАДЗОРА.md)) closed.
- [ ] `sw15.js` edit = bump `S15_CACHE`; mandatory failure = rejected install; LKG not wiped; skipWaiting only on `S15_ВХОД_В_ТАКТ`.
