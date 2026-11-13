# WAVE W5 «AT MATRIX (REAL ACCESSIBILITY)» — wave report (TZ §5)

> **Status:** ✅ Wave executed · **Date:** 2026-11-14 · **Base:** `rumu` = `e7ed8b81` (wave W4) → new cache generation `v248`
> The W5 line is crossed out by this wave per the rules of [ДОРОЖНАЯ_КАРТА_АГЕНТОВ.md](ДОРОЖНАЯ_КАРТА_АГЕНТОВ.md). A move on the owner's word «ПРОДОЛЖИ» — the next wave on the map. Russian canon: [W5_AT_МАТРИЦА_РАЗБОР.md](W5_AT_МАТРИЦА_РАЗБОР.md) (Directive 1 of the swarm).

## 1. Acceptance of TZ §5 — done line by line

**TZ: «AT matrix: NVDA/VoiceOver/TalkBack/Braille/switch/keyboard on the key faces (hub, ·31, ·01, ·35, ·38). Without it "accessible" is a statement, not a fact. Acceptance: probe protocols in docs/аудит/; defects in a findings registry with statuses OPEN/FIXED_VERIFIED + SHA.»**

| TZ line | What closed it | Trace |
|---|---|---|
| AT matrix 6 technologies × 5 faces | live registry `data/at-матрица.json` (at-матрица/v0.1): 30 cells — keyboard, switch, Braille, NVDA, VoiceOver, TalkBack × hub/·01/·31/·35/·38; every cell carries a status and a fact | sg-registry 5 min; ·38 panel |
| «Without it "accessible" is a statement, not a fact» | machine cells carry Chromium-run numbers ([ИЗМЕРЕНО]); live ones (NVDA/VoiceOver/TalkBack/box/display) — an honest 👤 row with a checklist; zero fantasies (UNKNOWN first-class) | protocol §1–§3 |
| Probe protocols in docs/аудит/ | [2026-11-14_W5_AT-матрица_пробы.md](аудит/2026-11-14_W5_AT-матрица_пробы.md): method, summary, §2 keyboard/switch, §3 ARIA substrate + Braille canon, §4 live-run checklist, §5 boundaries | file in docs/аудит/ |
| Defects — a registry of OPEN/FIXED_VERIFIED + SHA | [2026-11-14_реестр_находок_W5.md](аудит/2026-11-14_реестр_находок_W5.md): H-1/H-2/H-3 FIXED_VERIFIED (verification by a re-run, fix files named), H-4/H-5 OPEN with reasons; pin traces — the pin-follow-up metabolism | registry + matrix.findings |
| Agreement with the axe run of 2026-10-15 | the axe channel Э-1 is not duplicated («one fact — one place»); W5 closes its blind zone (traps/focus/screen-reader substrate) | protocol §5 |

## 2. Landing map — execution

1. **Machine probes** — `ИНСТРУМЕНТЫ/at_пробы.py` (Playwright Chromium, outside CI per the canon «browser probes are live agent runs»): 5 faces × (pageerror/console, Tab walk with focus visibility and traps, skip link with focus-in-target verification, Enter activation, ARIA substrate per the accname canon, switch substrate «mouse-only»).
2. **Fixes H-1…H-3** — skip target focusable (`singulyar-modules.js`: `tabindex="-1"` on main and on the target of static skip links — one fix for all faces; ·35/·38 — in the markup), ·01 h3→h2 (+CSS selector), ·01 miniCv aria-hidden.
3. **Live matrix registry** — `data/at-матрица.json`: 30 cells + 6 technologies + 5 findings; sg-registry re-reads it (SG_АТ + the `sg-ат-готов` event).
4. **Face ·38 PULSE** — the «AT matrix» panel: numbers only from SG_АТ (0 innerHTML, an honest «measurement running»), links to the protocol and the findings registry.
5. **Counters dictionary** — +1 (`at_проб` = 30, T-073), cache v247→v248.
6. **sw15.js** — bump v248 (the update law), pre-cache +5 light wave assets (registry, protocol, findings registry, report ×2 — the new-assets law), the same 2 mp3 exceptions.
7. **Wave guard** — `ИНСТРУМЕНТЫ/test_at_матрица.mjs` (9 probes, CI-safe: vm/files, 0 browser).
8. **Chronicle** — CHANGELOG, WORK_REPORT, the agents' map (+EN), README (the «AT matrix» truth row), docs/README (+EN).

## 3. Run facts (summary)

- **Keyboard ×5 [ИЗМЕРЕНО]**: 329 Tab stops, 0 invisible focuses, 0 traps, Enter activates ×5, the skip moves focus to MAIN ×5 (after H-1).
- **Switch substrate ×5 [ИЗМЕРЕНО]**: «mouse-only» = 0; interactive fully reachable (119/151/58/96/57).
- **ARIA substrate ×5 [ИЗМЕРЕНО]**: lang yes ×5; h1=1 on four, 2 on the hub (H-4 OPEN); 0 heading skips (after H-2); 0 images without alt (after H-3); 0 interactive without a name (accname canon: hidden pickers outside the tree, title counts as a name); aria-live 1–24.
- **Braille [ИЗМЕРЕНО]**: the canon's guards 16/16; display 👤.
- **pageerror/code console errors ×5 [ИЗМЕРЕНО]**: 0/0; environmental 404s counted and forgiven (sparse mirror).

## 4. Open questions of the wave (taken honestly, not silently)

1. **H-4 (the hub's two h1)** — the proposal is ready; the design decision is the owner's.
2. **H-5 (live screen readers/box/display)** — checklist §4 of the protocol; human hands.
3. **The axe backlog Э-1 (421 spots)** — its own map channel; not duplicated here.
4. **Agreement of the AT matrix with the «WHAT IS MISSING» candidate №7 (quality benchmarks)** — the AT matrix is the base of probe protocols; a system-quality benchmark is a separate line, waiting for the owner's word (continuity of the W4 report §5).

## 5. DoD (TZ §9) — line by line

- [x] The AT matrix 6×5 on the key faces — live registry + ·38 panel + protocol.
- [x] Probe protocols in docs/аудит/ — 2026-11-14_W5_AT-матрица_пробы.md.
- [x] Defects in the OPEN/FIXED_VERIFIED registry + trace — 2026-11-14_реестр_находок_W5.md (H-1…H-3 closed by a re-run).
- [x] «Accessible = fact»: machine cells carry numbers, live ones — honest 👤 with a checklist.
- [x] Oracles green on the full text mirror; `node --check` of the edited JS clean.
- [x] Truth shop «ДРЕЙФ НЕТ» (badges v248 idempotently).
- [x] Chronicle/CHANGELOG/WORK_REPORT/agents' map appended; the W5 row crossed out by the wave.
- [x] EN mirrors of the wave (report ×2).
- [x] The `sw15.js` edit = `S15_CACHE` bump v248; media outside the pre-cache; LKG not erased.
