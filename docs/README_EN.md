# SINGULAR Documentation Map (EN)

> **Status:** ✅ Current · **Takt:** v10.82 «СХОДИМОСТЬ» (CONVERGENCE) · **Updated:** 2026-10-13
> English translation of [README.md](README.md); the Russian original is authoritative. When the two disagree, RU wins. See also: [ДОКУМЕНТАЦИЯ.html](../ДОКУМЕНТАЦИЯ.html) — the face of the documentation; [README.md](../README.md) — the face of the repository.

The SINGULAR · LADOM house is an offline karaoke universe by RUVSON: a PWA with no server, no tracking, no ads. The umbrella is «СИНГУЛЯР · ЛАДОМ»: the device is LADOM, the slogan is «Быть рядом. По-своему.» ("Being near. In one's own way.") Each document below holds one type of knowledge, so a reader can tell in two seconds whether the file can be trusted and what it is about.

## Contents

| Document | Type | What is inside | For whom |
|---|---|---|---|
| [СИНТЕЗ.md](СИНТЕЗ.md) | synthesis | the house at a glance: laws, structure, rhythm, knowledge map, state, road | everyone, quick entry |
| [СИНТЕЗ_EN.md](СИНТЕЗ_EN.md) | translation | "SYNTHESIS — the house at a glance": the master synthesis in English — the first accepted translation of the documentation (v10.62 «ЖЕСТ») | everyone, entry without Russian |
| [СМЫСЛ_ПРОТОКОЛ](../ДАННЫЕ/смысл_200/СМЫСЛ_ПРОТОКОЛ.md) | protocol | semantic translation: 3 levels, back-translation, 10 traps — teach МАЛЫШ (the Kid) | translators and МАЛЫШ (RU only) |
| [ТЗ.md](ТЗ.md) | living brief | user stories with acceptance criteria — what the house promises to a person | resident, developer |
| [ТЗ_EN.md](ТЗ_EN.md) | translation | the house's user stories in English, US-01–US-16 (v10.77 «СВЯЗКА») | everyone, entry without Russian |
| [ДОРОЖНАЯ_КАРТА.md](ДОРОЖНАЯ_КАРТА.md) | plan | **THE UNIFIED ROADMAP**: all of the house's maps merged (register of 17 maps + the entire open front by line: 🚧 📋 👤 🌐) | everyone |
| [ДОРОЖНАЯ_КАРТА_EN.md](ДОРОЖНАЯ_КАРТА_EN.md) | translation | the unified roadmap in English — register of maps and open lines with statuses and closure criteria (v10.79 «СЛОГ») | everyone, entry without Russian |
| [АРХИТЕКТУРА.md](АРХИТЕКТУРА.md) | explanation | the chest of drawers: drawers → bridge → things; doors, threads, cache, CSP | developer |
| [АРХИТЕКТУРА_EN.md](АРХИТЕКТУРА_EN.md) | translation | the architecture map in English (v10.80 «ХВОСТЫ») | developer, entry without Russian |
| [РИТУАЛ_ТАКТА.md](РИТУАЛ_ТАКТА.md) | manual | how a version ships: the 8 stages of a takt | developer |
| [РИТУАЛ_ТАКТА_EN.md](РИТУАЛ_ТАКТА_EN.md) | translation | the takt ritual in English (v10.78 «ОТКЛИК») | developer, entry without Russian |
| [МАЛЫШ.md](МАЛЫШ.md) | textbook | precepts for the house's junior agent — everything the senior knows | МАЛЫШ (the Kid), agents (RU only) |
| [README_EN.md](README_EN.md) | translation | this file — the documentation map in English (v10.82 «СХОДИМОСТЬ») | everyone, entry without Russian |
| [../CHANGELOG.md](../CHANGELOG.md) | chronicle | every takt, Keep a Changelog style: Added/Changed/Fixed | everyone |
| [../AGENTS.md](../AGENTS.md) | reference | the rulebook for AI agents working with this repo | agents (RU) |
| [llms.txt](llms.txt) | map for LLMs | the machine map of the house's knowledge | LLMs, МАЛЫШ |
| [adr/](adr/) | decisions | architecture decisions and their consequences (MADR) | developer |

## Rules of this folder

- One fact lives in one place: the road lives in ДОРОЖНАЯ_КАРТА, facts about what shipped live in CHANGELOG, the truth about how it is built lives in АРХИТЕКТУРА.
- Every document's header answers: status, version, date. Neighbours are listed at the bottom.
- Privacy is law: only what can be shown to the world is published in `docs/`. Personal data, keys, internal logs stay out of the repo.
- Door counters are taken from `data/versions.json` and `singulyar-modules.js` (the core manifest) — not from stale README paragraphs.

## Neighbours

- [ДОКУМЕНТАЦИЯ.html](../ДОКУМЕНТАЦИЯ.html) — all knowledge in human form · [ДОКУМЕНТЫ/](../ДОКУМЕНТЫ/) — archive of protocols and reports · [СИНГУЛЯР_36_СЛОВАРЬ.html](../СИНГУЛЯР_36_СЛОВАРЬ.html) — glossary · [СИНГУЛЯР_35_ВОПРОСЫ.html](../СИНГУЛЯР_35_ВОПРОСЫ.html) — FAQ
- [АРХИТЕКТУРА_EN.md](АРХИТЕКТУРА_EN.md) — the English translation of the architecture map (v10.80); the Russian original is authoritative.
