# WAVE W4 «CONTRACTS + THE WORLDS MAP» — wave report (TZ §4)

> **Status:** ✅ Wave executed · **Date:** 2026-11-14 · **Base:** `rumu` = `99f1f440` (wave W3) → new cache generation `v247`
> The W4 line is crossed out by this wave per the rules of [ДОРОЖНАЯ_КАРТА_АГЕНТОВ.md](ДОРОЖНАЯ_КАРТА_АГЕНТОВ.md). Russian canon: [W4_КОНТРАКТЫ_КАРТА_МИРОВ_РАЗБОР.md](W4_КОНТРАКТЫ_КАРТА_МИРОВ_РАЗБОР.md) (Directive 1 of the swarm).

## 1. Acceptance of TZ §4 — done line by line

**TZ: «Contracts V1 (capability registry, intent/result envelope, object manifest, representation, event/session, evidence) — in force; the House's passport gains a "worlds" block (rumu / minus-fond / main / c590c6c9 — F-023). The main↔rumu convergence is a SEPARATE wave with the owner's permission, per П-71 discipline; without permission — only the drift map.»**

| TZ line | What closed it | Guard |
|---|---|---|
| Contracts V1 — in force | canon `js/контракты.js` (контракты/0.1): six types — capability registry (default-deny + revocation), envelope (intent → result → state → reason, UNKNOWN first-class), object manifest (SHA-256 required, 64 hex), representation (·21 canon forms: text/braille/speech/vibro), event/session, evidence (probe/measure/screenshot/live run + a trace); determinism — time via an injected support, two runs byte-identical | guard probes 1, 2 |
| Contracts registry | `data/контракты.json` (schema контракты-дома/v0.1): 8 named contracts in force (контракты/0.1, karaoke-adapters/0.2, singulyar.transport/0.1, внешние-действия/0.1, pir-core/0.2, пин-ядро/0.1, голос-локально/0.1, open-model-adapter/0.1) — each with a canon file, a guard, V1 types and a status; a contract without a canon file or guard is not a contract (registry law) | guard probe 3 |
| House passport — the «worlds» block | `data/миры.json` (schema миры-дома/v0.1, F-023): 6 worlds — 4 live branches (rumu, minus-fond, данные-дислокация, склад-полимата) + the main tombstone (tag MAIN-2026-11-11, tip e9222f97, ADR-0006) + the ×5-A snapshot (c590c6c9); the README «one truth» table gained the «Contracts V1» and «Worlds» rows; face ·37 gained a live worlds/contracts block (numbers only from the registries) | guard probes 4, 6 |
| Without permission — only the drift map | the drift map is baked into `data/миры.json.дрейф`: status «exhausted — one live head», the historical magnitude (ahead 774 / behind 631) named as chronicle, the head-comparison guards removed together with the branch (ADR-0006); convergence — a separate wave only with the owner's permission; in this wave the House did NOT merge, port or resurrect any branch | guard probe 4 |
| main↔rumu convergence | not executed — per TZ: only the drift map (see above); the honest gap is named: the Pages pointer (source.branch main) is the tombstone's legacy, the site lives via the pages.yml workflow from rumu; re-targeting is the owner's/truth shop's word, not silence | guard probe 4 |

## 2. Landing map — execution

1. **Contracts canon** — `js/контракты.js` (контракты/0.1, ES2019, support injection `__КОНТРАКТЫ.ядро({сейчас})`, 0 network, 0 innerHTML, 0 randomness): six types as validators and factories; default-deny — «no right in the registry» with a named reason; revocation changes the right immediately; a refusal without a reason fails validation.
2. **Live contracts registry** — `data/контракты.json` + candidates: gap №1 of «WHAT IS MISSING» is closed in the House (envelope = the inter-organ format, capability registry = rights), the cell-swarm cell remains for the owner's word.
3. **Live worlds registry** — `data/миры.json`: a world = ид/type (branch/tag/commit-snapshot)/status (live/tombstone/frozen)/role/head-at-measure/measure/law; world types are named; releases are supply worlds outside the registry (one fact — one place).
4. **sg-registry** — re-reads `data/контракты.json` and `data/миры.json` (candidates up the subfolder ladder, cache-buster, 5 minutes) → `SG_КОНТРАКТЫ`/`SG_МИРЫ` + events (the «truth is re-read» law).
5. **The circle of questions (the owner's word)** — doctrine `docs/КРУГ_ВОПРОСОВ.md` (+EN): three scales (individual / communities / the Human as a whole), the general circle as a frame about the Human as a whole (not a majority agenda, not a sum of interests), the openness of the circle (mechanisms for discovering new questions), three directions (understand the existing / discover the possible / create what does not yet exist), the Human's role in the noosphere — the Human creates an environment and new possibilities of existence.
6. **Faces of the wave** — README (truth rows + doctrine in the live docs), ·35 (the «Circle of questions» section ×4 questions, JSON-LD ×31, counter 31), ·37 (the «Worlds and the circle of the house» section with a live panel from the registries), docs/README (+EN), СИНТЕЗ (knowledge map), llms.txt.
7. **Wave guard** — `ИНСТРУМЕНТЫ/test_контракты.mjs`, 8 probes (see §6).
8. **sw15.js** — `S15_CACHE` bump v246→v247; pre-cache +7 light wave assets (canon, 2 registries, report ×2, doctrine ×2 — the new-assets law); media outside the pre-cache — the same 2 mp3 exceptions.
9. **Truth shop** — `--apply` across all live faces (badge fallbacks = v247 idempotently; «ДРЕЙФ НЕТ»).
10. **Chronicle** — CHANGELOG, WORK_REPORT, the agents' map (+EN), versions.json (cache v247, dictionary +2: контрактов/миров, counters 8/6).

## 3. Faces of the wave

| Face | What stood up |
|---|---|
| README | the «Contracts V1» and «Worlds» rows in the «one truth» table; the doctrine in the live docs line |
| ·35 QUESTIONS | the «Circle of questions» section (q-28…q-31): three scales, the general circle, three directions, the Human's role in the noosphere; JSON-LD FAQPage mainEntity ×31 |
| ·37 ABOUT THE HOUSE | the «Worlds and the circle of the house» section: a live worlds/drift/contracts panel from SG_МИРЫ/SG_КОНТРАКТЫ (0 innerHTML), links to the canon and registries |
| docs/README (+EN) | the doctrine rows in the documentation map |
| docs/СИНТЕЗ.md | a knowledge-map row: «The circle of questions and the Human's role?» |
| docs/llms.txt | the doctrine row for machines |

## 4. The owner's word — the doctrine content written in everywhere

Three scales of questions (individual / communities / the Human as a whole); the general circle of questions = a frame about the Human as a whole, **not** a majority agenda and **not** a sum of individual interests; the circle is not closed — with mechanisms for discovering new questions; three fundamental directions — understand the existing, discover the possible, create what does not yet exist; the Human's role in the noosphere — **the Human creates an environment and new possibilities of existence** (not merely studying the world and adapting). Entry points: [docs/КРУГ_ВОПРОСОВ.md](КРУГ_ВОПРОСОВ.md) (canon, RU+EN), ·35 (the live reading ×4 questions + JSON-LD for machines), ·37 (the about face), README (live docs), СИНТЕЗ (knowledge map), llms.txt (LLM map). One fact — one place; faces link, not duplicate.

## 5. The wave's word on the «WHAT IS MISSING» candidates (7 gaps, §3 of the colleague-LLM report)

The candidates were waiting for a word (W3 honestly left them «THIS IS NOT A GUIDE TO ACTION»). The owner's word of this wave set the frame (the doctrine of the circle of questions: discover the possible — the «WHAT IS MISSING» method — and create what does not yet exist). W4's map of the seven gaps:

| # | Gap | W4's word |
|---|---|---|
| 1 | A single machine protocol of exchange between organs | **closed in the House by this wave**: конверт/0.1 (intent → result → state) + capability registry = the inter-organ format and rights in the canon `js/контракты.js`; the candidate агент-сообщение/0.1 remains for the cell-swarm cell (a foreign repo, not touched) — the owner's word |
| 2 | Common long-term error memory | candidate — wave W7 «The live revision layer» (closes the revision loop: an error is data for the next time); execution — the owner's word |
| 3 | Planner from a decree | candidate — W7 or a separate wave; the «decree» input must come from the owner (DECREE > ADR > code); without the word it does not start |
| 4 | Dispute mechanism | candidate — W7 (escalation «WAITING FOR THE HUMAN» into a formal contour); THE HUMAN DECIDES |
| 5 | Resource economy | candidate — W5 tail (a budget counter in ·38 by the W2 readiness-counter precedent); execution — the owner's word |
| 6 | Layer checks | candidate — W5 AT matrix (the probe-protocol base in docs/аудит/) + layer probes of polimat-task174; execution — the owner's word |
| 7 | System quality benchmarks | candidate — W5 (the AT matrix as the base) + a separate intelligence-benchmark line; execution — the owner's word |

None of the six is executed without a word — THE HUMAN DECIDES; W4 executed only the one that was already the owner's word (TZ §4 = contracts V1 = gap №1 in the House's part).

## 6. Wave guard — ИНСТРУМЕНТЫ/test_контракты.mjs, 8 probes

1. **Counters dictionary** — контрактов/миров defined (T-073), numbers consistent with the registries (8 = len(контракты.json.контракты), 6 = len(миры.json.миры)); the old W2/W3 dictionary intact.
2. **контракты/0.1** — the core: version, six types, the state canon, ·21 forms, evidence kinds; default-deny (no entry — a refusal with a reason); grant/for/revoke; the envelope (assemble/execute/validate; an executor's fall — an honest «refused» with a reason); SHA-256 manifest (64 hex required); representation (a form outside the canon — a refusal); session events; evidence (without a trace — not evidence); determinism — two cores with the «now» support give a byte-identical result.
3. **data/контракты.json** — schema; типы_V1 = the six canon names of the core; every contract: ид/дверь/имя/файл/страж/типы ⊆ six/law/status/measure; canon files and guards exist in the repo; ид unique.
4. **data/миры.json** — schema; every world: ид/type from the canon (branch/tag/commit-snapshot)/status from the canon (live/tombstone/frozen)/role/head-at-measure/measure/law; the main tombstone named by the tag MAIN-2026-11-11, the tip e9222f97 and ADR-0006; rumu — a live branch; drift: «exhausted», ADR-0006, «a separate wave» + «the owner's permission».
5. **Core laws** — the js/контракты.js source: 0 fetch/0 XMLHttpRequest, 0 innerHTML, 0 eval, 0 randomness (`Math.random`), ES2019 (no `?.`/`??`).
6. **Faces of the wave** — README (Worlds/Contracts rows + doctrine), ·35 (q-28…q-31 + JSON-LD ×31 + counter), ·37 (the live block + SG_МИРЫ/SG_КОНТРАКТЫ), docs/README (+EN), СИНТЕЗ, llms.txt, the doctrine (+EN) exists.
7. **Worker** — cache v247 ≡ the registry; wave assets in the pre-cache (canon, 2 registries, report ×2, doctrine ×2); the same 2 mp3 exceptions, zero new media.
8. **sg-registry + node --check** — the re-reading of contracts/worlds (candidates, windows, events, start) + `node --check` of the wave's edited JS.

## 7. Open questions of the wave (taken honestly, not silently)

1. **Live verification ЭП-06 (screenshots)** — for the release wave (the W2/W3 precedent; the owner's word of 2026-11-14); the guard holds the byte canon.
2. **The Pages pointer to the tombstone** — `source.branch: main` in the Pages API with the live pages.yml workflow from rumu: the site lives honestly, but the pointer is ADR-0006's legacy; re-targeting is the owner's/truth shop's word.
3. **The cell-swarm cell** — агент-сообщение/0.1 (gap №1 in the swarm's part) lives in a foreign repo: the right and the term are the owner's word.
4. **Releases as supply worlds** — outside the worlds registry (one fact — one place: the Release API + CHANGELOG); if the owner wants them in the map — a separate row.
5. **The «WHAT IS MISSING» candidates №2–№7** — the wave map above (§5); each starts only with the owner's word.

## 8. DoD (TZ §9) — line by line

- [x] Oracles green locally on the full mirror: W4 guard 8/8; the W3 guard 8/8 and the truth-shop guard 3/3 regressions clean; `node --check` of the edited JS clean.
- [x] Truth shop: «ДРЕЙФ НЕТ» after `--apply` (badge fallbacks = v247 idempotently).
- [x] Contracts V1 in force — canon + registry + guard (probes 1–3).
- [x] The house passport gained the «worlds» block — README + ·37 + data/миры.json (probes 4, 6).
- [x] Without permission — only the drift map: no branches merged; the drift block is honest (probe 4).
- [x] The owner's word written in everywhere: the circle-of-questions doctrine — canon + 4 faces + maps (probe 6).
- [ ] Live verification ЭП-06 with a checklist and screenshots — for the release wave (open question 1).
- [x] Chronicle/CHANGELOG/WORK_REPORT/ДОРОЖНАЯ_КАРТА_АГЕНТОВ appended; the W4 line crossed out by the wave.
- [x] EN mirrors of the key documents — by this wave (report ×2, doctrine ×2).
- [x] The `sw15.js` edit = `S15_CACHE` bump v247; media outside the pre-cache; LKG not erased.
