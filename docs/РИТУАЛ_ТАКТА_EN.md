# Takt Ritual — how a house version ships

> **Status:** ✅ Current · **Takt:** v10.59 «SYNTHESIS» (СИНТЕЗ) · **Updated:** 2026-10-11
> A how-to for the developer/agent. Skipping stages is forbidden — the house remembers everything. See also: [АРХИТЕКТУРА.md](АРХИТЕКТУРА.md) — why it is so; [МАЛЫШ.md](МАЛЫШ.md) — guidance for the agent; [../CHANGELOG.md](../CHANGELOG.md) — where the fact goes. (Companion files are kept in Russian as the single source of truth; this is a semantic translation, Д7 step — v10.78.)

## What a takt is

A **takt** (beat) is one breathing cycle of the house: a version + a ritual of 8 stages. The takt name is one word capturing the essence of the work («ПРОЁМ»/REVEAL, «ОРГАНИЗМ»/ORGANISM, «АТЛАС»/ATLAS). The takt number `v10.NN` and the cache generation `s15-orkestrator-vNN` grow monotonically (after v10.54/v109 the next slot is v10.55/v110).

## The eight stages

1. **dossier** — reconnaissance before work: verify the PAT; read `data/versions.json` (current takt, generation); re-read the target files from the repo (never from memory!); state the takt's task in one paragraph.
2. **patcher** — code and text edits via scripts, each of which is **idempotent** (a second run does not break anything): exact anchors, guard markers (`guard=`), a "new contains old" check before insertion; the CSP meta is edited as whole text, never as regex fragments; the build pipeline is fixed (patcher → resurrect → in-place) and its stage order must not change — tests catch deviations.
3. **vm-test** — `node --check` on every edited JS; raise a local stand (`python -m http.server`); a Playwright run: doors build, the menu is alive, the console is clean; stand noise (404s from not-yet-cached assets) is filtered out; tests must catch real bugs — fix the code, not the expectations (three takts in a row the vm-test caught a live bug: `норма(`, a duplicated `script-src`, a dead КОРД).
4. **shop** (цех) — release assembly: bump `S15_CACHE` in `sw15.js`, add new assets to the pre-cache, record the takt in `data/versions.json` (version, takt, date, counters, chronicle +1); when the Baby (Малыш) upstream moved — sync `БИБЛИОТЕКИ/adapter-os/llm.mjs` with the `ОБУЧЕНИЕ/` upstream (two-repo rule).
5. **pusher** — publishing via the **Git Data API** (blobs → tree → commit → ref) — one-two commits per takt; **СТОП-ГОРН** (STOP-HORN) is the pusher's guard: if the integrity check fails, the commit is not born; web sessions and cookies are not used for pushing (the risk engine rolls them back).
6. **cut** (отрез) — a pause after the commit: GitHub Pages rebuilds (usually under a minute); touch nothing during this window.
7. **live verification ЭП-06** — a cold load of the live `rtynbirf.github.io/singulyar`: an OK/FAIL checklist (version, door counter, cache generation, the takt's key features, clean console); the Baby upstream is verified separately; screenshots go to `download/`. Only verification grants the right to write the journal.
8. **journal** — an entry in the work journal: Task ID, what was done per stage, commits, screenshots, leftovers for future takts.

## The takt checklist (short version)

```text
[ ] PAT verified, the repo is the one (rtynbirf/singulyar — exactly so; singular = 404)
[ ] patchers are idempotent, anchors taken from live files; "new" checked (a duplicated script-src is caught by the test)
[ ] node --check is green; Playwright: doors/menu/console; CSP meta in head on touched faces
[ ] S15_CACHE bumped (vNN+1), new assets in the pre-cache
[ ] data/versions.json: version, takt, date, counters, chronicle +1
[ ] pusher via Git Data API, STOP-HORN at its post
[ ] ЭП-06 on live: OK/FAIL checklist, screenshots
[ ] journal written; CHANGELOG.md fed with facts; ДОРОЖНАЯ_КАРТА.md closes its lines
```

## Traps (already caught — don't catch them twice)

- **The CSP meta** blocks inline scripts silently; the diagnosis is `securitypolicyviolation`; the canon is posture A (see [АРХИТЕКТУРА](АРХИТЕКТУРА.md), CSP section: two killers — text outside a comment in head, hashes without quotes).
- **Cache**: fail to bump the generation and the resident walks the old house believing the edit does not work.
- **Patch anchors**: "new contains old" without a guard marker duplicates insertions; a misquoted quote breaks a replacement — grep the anchors after assembly.
- **Replacing part of a directive**: inserting `script-src ...` into a line where the word `script-src` already stands before the group yields a duplicated directive; a replacement must cover exactly the group, not the word.
- **Git via web sessions** is impossible from the sandbox — only the Git Data API.
- **The vm stand**: 404 noise and a suspended AudioContext are not house bugs; do not mix them into the checklist.
- **"Downloaded and forgot"**: a takt without ЭП-06 is not a takt.

## Neighbours

- [АРХИТЕКТУРА.md](АРХИТЕКТУРА.md) · [ТЗ.md](ТЗ.md) · [ДОРОЖНАЯ_КАРТА.md](ДОРОЖНАЯ_КАРТА.md) · [МАЛЫШ.md](МАЛЫШ.md) · [../ДОКУМЕНТЫ/ЗАКАЛКА_ЧЁРНЫЙ_ЭКРАН.md](../ДОКУМЕНТЫ/ЗАКАЛКА_ЧЁРНЫЙ_ЭКРАН.md)
