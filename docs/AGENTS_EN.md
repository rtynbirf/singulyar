# AGENTS.md — the rules for AI agents in the СИНГУЛЯР (SINGULAR) repository

> Translation of AGENTS.md (v10.85) · canonical RU version wins.
>
> **Status:** ✅ Current · **Updated:** 2026-10-11 · Readers: coding agents, LLM assistants, future you.
> README.md is for humans, this file is for machines. Do not mix them: here lives only what an agent needs in order to work with the repo and not break the house.

## What this repo is

`rtynbirf/singulyar` — the public repository of the house СИНГУЛЯР (SINGULAR) · ЛАДОМ (LADOM): the RUVSON PWA karaoke universe, deployed on GitHub Pages (`https://rtynbirf.github.io/singulyar/`), branch `main`, no bundler (zero node_modules at runtime). Upstream of the brains of МАЛЫШ (МАЛЫШ — the house's junior on-device AI): `rtynbirf/singulyar-llm`.

## The unshakable (do not break)

1. **The СИНГУЛЯР law**: ergonomics, privacy, confidentiality, usability in the first place. Any edit that takes convenience away from a human or leaks data is rejected, no matter the gain.
2. **Dresser architecture (комод — a chest of drawers)**: families of functions live in drawers (ящик — a drawer); the way out is through the bridge (`delete` + `defineProperty`). Do not carry things out of their drawers, do not rewrite the logic when moving house. Test: `ИНСТРУМЕНТЫ/test_bridge_logic.js`.
3. **The CSP meta — posture A**: `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob:` + all the other directives in full; keep the external hosts in script-src (jsdelivr lives with ЛАДОМ). Without `'unsafe-inline'` the house dies silently; without `'wasm-unsafe-eval'` the brains of МАЛЫШ (wllama) and the hearing (transformers.js) die. Forbidden: hashes without quotes (invalid source), text outside comments in `<head>` (it pushes the CSP into the body — the policy is ignored), editing the meta with regex pieces. Scars: v10.52, v10.54.
4. **Cache generation**: every такт (takt — a release beat) raises `S15_CACHE` in `sw15.js` (`s15-orkestrator-vNN+1`) and adds the new assets to the pre-cache. Not raising the generation = breaking the update.
5. **Push only through the Git Data API** (blobs → tree → commit → ref). Web sessions/cookies do not work from the sandbox.
6. **The ritual of the такт** (8 stages) — the only way of release. See [docs/РИТУАЛ_ТАКТА.md](docs/РИТУАЛ_ТАКТА.md). A такт without the live check ЭП-06 (EP-06 — the live check of the deployed house) does not count as released.
7. **The truth about numbers**: the door/song/language counters (дверь — a door) come from `data/versions.json` and the core manifest (`singulyar-modules.js`, `SNG.модуль`). Numbers in the old paragraphs of README/ДОКУМЕНТЫ are a historical chronicle, not truth (in the README they are marked with the «одна правда» ("one truth") block).

## Map of files (short)

- `index.html` — the hub ·00 (the crystal, the Ariadne thread (нить Ариадны), the search); `404.html` — the honest face of a dead end.
- `СИНГУЛЯР_NN_ИМЯ.html` — the 28 дверей (·01–·39, see the core manifest).
- `singulyar-modules.js` — the SNG core (the crystal, the shards, the thread, the map); `singulyar-ux-engine-v9.js` — the UX engine; `singulyar-design-v3.css` — the design system; `sw15.js` — the service worker; `cord.js` — КОРД (KORD).
- `docs/` — the living documentation (the map: `docs/README.md`); `ДОКУМЕНТЫ/` — the archive of protocols; `data/versions.json` — the chronicle of truth.
- `ДАННЫЕ/` — the corpora (the flagship of 157 languages LRC/SRT + the pipeline: «Где настоящее» ("Where the present is") 223, «Когда теряем» ("When we lose") 197); `БИБЛИОТЕКИ/adapter-os/` — the brains of МАЛЫШ (the offline copy + the upstream).
- `ИНСТРУМЕНТЫ/` — the `node --test` tests (22 files) and the stands.

## Commands

```bash
node --check sw15.js                          # syntax of the edited JS
node --test ИНСТРУМЕНТЫ/                      # the full test set of the house
python -m http.server 8907                    # local stand (any port)
node ИНСТРУМЕНТЫ/check_page_scripts.js        # the page scripts
```

Playwright checks of the face: the doors build (28), the house menu is full, the АРИАДНА (ARIADNA) search is alive, the CSP meta is in `<head>`, the console is clean (filter the stand noise: 404s from heavy assets that have not finished downloading).

## Conventions

- The language of the repo is Russian (code, comments, file names). Do not latinize file names.
- Patches are idempotent scripts (guard markers, exact anchors); editing big HTML — only by script, never by hand; after an insertion re-read the «new» with your own eyes (a duplicate `script-src` has already happened).
- Names of такты are one word, the number `v10.NN` is monotonic; the cache `s15-orkestrator-vNN` grows together with the такт.
- Facts about the released — in `CHANGELOG.md`; plans — in `docs/ДОРОЖНАЯ_КАРТА.md`; promises — in `docs/ТЗ.md`. One fact — one place.
- Content privacy: personal data, keys, tokens, internal session journals never get into the repo.

## The brains of МАЛЫШ (if you work with llm)

The offline copy: `БИБЛИОТЕКИ/adapter-os/` (`llm.mjs`). The upstream truth: `rtynbirf/singulyar-llm` (`ОБУЧЕНИЕ/ПРАВИЛА_СИНГУЛЯРА.txt` — 15 rules, `ОБУЧЕНИЕ/ПРИМЕРЫ_КОМАНД.jsonl` — phrases). Editing the rules = a commit upstream + a sync of the offline copy within the same такт (the two-repo rule). Rule 13 — the map of the 28 дверей; rule 14 — the law of the house; rule 15 — documentation.

## Neighbours

[README.md](README.md) · [docs/README.md](docs/README.md) · [docs/РИТУАЛ_ТАКТА.md](docs/РИТУАЛ_ТАКТА.md) · [docs/МАЛЫШ.md](docs/МАЛЫШ.md) · [docs/llms.txt](docs/llms.txt) · [CHANGELOG.md](CHANGELOG.md)

Canonical source: [AGENTS.md](../AGENTS.md) — the Russian original is authoritative.
