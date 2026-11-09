# HOUSE SUPERVISION CANON — how waves watch, maintain, and leave clean

> **Status:** ✅ Current · **Introduced:** 2026-11-09 (owner's order: «следить за состоянием дома, поддерживать его в надлежащем виде согласно канону и убирать все нотификации за собой» — watch the House's state, keep it in proper condition according to the canon, and clean up all of your notifications).
> Readers: every wave of agents. Extended by the owner's decisions. Changes are append-only with a date.
> RU original (source of truth): [КАНОН_НАДЗОРА.md](КАНОН_НАДЗОРА.md).

## 1. The supervision panel (take readings before any work)

| # | Sensor | Where to look | Healthy state |
|---|---|---|---|
| 1 | House registry | `data/versions.json` → `дом`, `счётчики` | takt/generation grow monotonically; counters = the dictionary |
| 2 | Live faces | hub footer, `meta sng-build`, README «одна правда» (one truth), JSON-LD ·35 | one triple «takt/cache/SHA» on all faces |
| 3 | Worker | `sw15.js` → `S15_CACHE`, guard `test_sw15_приёмка.mjs` | the mandatory core arrives whole; last-known-good survives activation |
| 4 | CI oracles | Actions: «Оракулы дома зелёные», «Такт-гейт», Lighthouse | green; red = a KNOWN_ISSUES entry with the run |
| 5 | Body pin | oracle-rumu vs `cell-swarm/swarm.json` | after a push — the pin follow-up `make pins --write` by a wave with permission |
| 6 | Worlds drift | main-drift-watch (ahead/behind) | drift known and accounted for in the map; convergence is the owner's work |
| 7 | Deploy | Pages log (`pages.yml`), live URL | live SW ≡ HEAD `rumu`; `meta sng-deploy-sha` = HEAD SHA |
| 8 | Tails | `KNOWN_ISSUES.md`, `TODO.md`, `PULSE.md`, #62/#64 | every red has an owner and a status |

Readings are written into the takt dossier (stage 1 of the ritual). Without fresh readings the "patcher" stage does not start.

## 2. The supervision cycle (every-wave minimum)

1. **Dossier:** panel readings (§1), PAT/permissions verified, the takt's task in one paragraph.
2. **Truth check:** `python3 ИНСТРУМЕНТЫ/цех_правды.py` — must show «ДРЕЙФ НЕТ» (NO DRIFT) before edits begin (if drift already exists — fix it first, as a separate move).
3. **Runs before:** `node --test` on the oracle files touched by the work; `node --check` on edited JS.
4. **Work** — latkas/takt per the ritual; bump `S15_CACHE` on any `sw15.js` edit; new assets go into the precache.
5. **Runs after:** the same oracles + `test_лица_правды.mjs` + `test_sw15_приёмка.mjs` + `test_цех_правды.mjs`.
6. **Live verification ЭП-06** on production after the cut — OK/FAIL checklist, screenshots.
7. **Wave journal:** what was done by stages, commits, leftovers; entries are append-only.

## 3. Keeping the House in proper condition (canon)

- **The single source of numbers** — `data/versions.json` → `счётчики` (definitions in `счётчики.словарь`). A new face of the House is connected via a `data-реестр="…"` tag, not by hand; tag fallbacks are aligned by the truth workshop (цех правды).
- **The truth about the deploy branch:** `rumu` (see `pages.yml`); AGENTS.md is checked by the gate (T-072).
- **The worker update law:** acceptance (smoke test, completeness of the mandatory core) ∧ human consent. «Aggressive skipWaiting» is forbidden. A mandatory file failing = rejected install: the worker does not stand, last-known-good keeps serving.
- **The takt ritual** is the only way to release; latkas follow its checklist without a takt number.
- **One fact — one place:** a number's explanation lives in the counter dictionary, not copied across faces.
- **Do not touch colleagues' bytes; on collision — honest renumbering** (Law З.5 of the swarm).
- **Media outside the precache; protected model caches survive takts** (AI-ABSOLUTE).
- **The immutable AGENTS.md (items 1–7)** — ergonomics/privacy, the chest-of-drawers architecture, CSP posture A, cache generation, Git Data API for pushes.

## 4. The clean-trail rule (notifications)

Every wave carries away EVERYTHING it produced. The departure checklist (passed before the wave journal):

- [ ] **Issues/threads:** the wave's seal — one comment in the live tracker (#62/#64); no new threads "for the checkbox"; your own threads are closed or handed over with an honest status and link.
- [ ] **CI runs:** every red run of this wave is fixed with a follow-up OR recorded in `KNOWN_ISSUES.md` (run link, cause, tail owner). A red without a record = an abandoned trail.
- [ ] **Pin:** after a push to `rumu` — the pin follow-up (`make pins --write` in cell-swarm) by a wave with permission, or a note to the owner in the journal (another repo is not touched silently).
- [ ] **Temporary artifacts:** debug files, banners, flag-latkas, draft branches — removed by the same wave; branches are cleaned after landing.
- [ ] **Local litter:** the sandbox/stand leaves no files in the repo root; `.gitignore` does not bloat with "temporary" entries.
- [ ] **Promises to people:** every "will do later" is either closed, or sits in `TODO.md` with an owner and a target date.
- [ ] **Escalations:** a defect outside the wave's permission — STOP-HORN, an honest entry in KNOWN_ISSUES/TODO, handover to the owner; silence is forbidden.

The wave formula: **arrive quietly — leave clean; take a turn — close the turn.**

## 5. Escalation and stops

- **STOP-HORN** (Law З.6 of the swarm): if the edit anchor is not unique — stop; fix the patcher/test, not the House; every horn goes into the wave's chronicle.
- **Other people's repos** (`cell-swarm`, `singulyar-llm`) — only with explicit permission; no permission — a record to the owner.
- **The 1.58 GB repo** — full clones/history rewrites only by protocol П-38/П-71 (SARCOPHAGUS-SCIENCE), by the owner's hands.
- **A red «ПИН УСТАРЕЛ»** is not a defect but the gate's design; red runs are interpreted through KNOWN_ISSUES, never by faking green.

## 6. Canon history

| Date | Event |
|---|---|
| 2026-11-09 | Introduced by the owner's order: supervision + maintenance + clean trail; the agents' package (TASK, TZ, map, this canon) planted in the repo by the ЛКГ-1/ПРАВДА-2 latkas (КРУ V2: F-001/F-019/F-020/F-021/F-022 closed, T-070…T-073 standing) |
