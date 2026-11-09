# SYNTHESIS — the house at a glance

> **Status:** ✅ Current · **English translation of** [СИНТЕЗ.md](СИНТЕЗ.md) (original in Russian, такт v10.59 «СИНТЕЗ») · **Translated and adopted:** v10.62 «ЖЕСТ» · **Updated:** 2026-10-11
> One document to understand the house in ten minutes: what it is, who it is for, what laws it obeys, how it is built, how it breathes, where to read what, and where it is going. Every line leads to a source document — nothing is duplicated here, only linked. See also: [ТЗ.md](ТЗ.md) · [ДОРОЖНАЯ_КАРТА.md](ДОРОЖНАЯ_КАРТА.md) · [АРХИТЕКТУРА.md](АРХИТЕКТУРА.md) · [РИТУАЛ_ТАКТА.md](РИТУАЛ_ТАКТА.md) · [МАЛЫШ.md](МАЛЫШ.md). House documents are written in Russian (the house speaks to its people in their language); this translation opens the door for non-Russian readers — for «Перевод документации» acceptance rule, see [ДОРОЖНАЯ_КАРТА.md](ДОРОЖНАЯ_КАРТА.md).

## 1. What this is

**СИНГУЛЯР · ЛАДОМ** — the offline universe of RUVSON karaoke: a PWA with no server, no build step, no tracking, no ads. Hub ·00 and 31 doors (`СИНГУЛЯР_NN_ИМЯ.html` + `СИНГУЛЯР_39_КОЛОНКА.html`); each lives on its own, together they are a house. The evening hall ·31 **ЛАДОМ** is the heart: the song «Просто люби» (Just Love), 157 languages of one song, 62 backing tracks of the fund, a remote control with six register views, and Малыш — the voice of the house. Deployment is one link: `https://rtynbirf.github.io/singulyar/` — from there the house itself puts the core into pre-cache and lives without the network.

Brand: the device is **ЛАДОМ**, the page title is «ЛАДОМ — пространство своих» (ЛАДОМ — a space of one's own people), the subtitle is «Общайтесь так, как удобно каждому» (Communicate the way that suits each person), the umbrella is «СИНГУЛЯР · ЛАДОМ», the slogan is «Быть рядом. По-своему.» (Being close. Your own way.) The historical name «квартирник» (house-party gig) has been struck out of the house; in document chronicles it remains only as a date in history (one fact — one place: facts live in [CHANGELOG.md](../CHANGELOG.md)).

## 2. The law (above everything)

**THE LAW OF СИНГУЛЯР:** ergonomics, privacy, confidentiality and usability stand at the head of the corner. The project serves the human and does not test them with discomfort. This is the filter for every feature: if the feature wins and the human loses — the feature is rejected. Practical consequences: zero counters and zero network for brains (LLM and hearing run on the device), a person's data never leaves the browser, everything is reversible (law I-11: discoverable / explainable / controllable / reversible), honesty instead of declaration («this does not exist» is an acceptable answer; «ok: true» without a real check is not).

## 3. How it is built (the minimum to not get lost)

- **The dresser (комод)**: families of functions live in isolated drawers (script blocks); they face outward via bridges (`delete` + `defineProperty`) and lie in the rooms as ordinary things (`window.__*`). Logic is never rewritten when a family moves house. — [АРХИТЕКТУРА.md](АРХИТЕКТУРА.md)
- **The core manifest** (`singulyar-modules.js`, `SNG.модуль`, v1.20.0) is the single source of truth about doors and threads; **the chronicle** (`data/versions.json`) holds the version, the такт, counters and the history of тактов.
- **Cache generations**: `sw15.js` holds generation `s15-orkestrator-vNN`; a new такт = a new generation (v114 as of the date of synthesis) — otherwise a resident walks an old house and believes the fix did not work.
- **CSP**: posture А on every face — `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob:`; three silent killers are dissected in the scars of v10.52/v10.54 (text in head, a hash without quotes, an outdated hash whitelist).
- **Brains on the device**: Малыш-LLM (Qwen2.5-0.5B via wllama, rules learn upstream from `rtynbirf/singulyar-llm`), hearing — Whisper locally; there is no weights-bearer in the house — only door ·42 КОЛОНКА describes the full stack of an autonomous smart speaker.

## 4. How the house breathes

The house grows in **такты**: one такт = one version = eight stages (dossier → patcher → vm-test → workshop → pusher with STOP-HORN → cutoff → live verification ЭП-06 → journal). The name of a такт is one word about its essence («ПРОЁМ», «ОРГАНИЗМ», «АТЛАС», «ВАЛЬС», «СИНТЕЗ»). Такты do not agree with words — they are verified by test and by battle in a real browser; a collision of тактов (two pushing in parallel) is resolved by the STOP-HORN: the other's move went first — their name and door stand, our deltas re-land on their bytes, the chronicle is restored. The full instruction is in [РИТУАЛ_ТАКТА.md](РИТУАЛ_ТАКТА.md).

## 5. What the house promises a human (the ТЗ digest)

| # | Promise | Where to check |
|---|---|---|
| US-01 | The house lives offline (pre-cache, generational cache, КОРД) | switch the network off — the house holds |
| US-02 | Privacy without exceptions (zero trackers, brains local) | ПУЛЬТ → golden shield |
| US-03 | Navigation: intent → door (АРИАДНА, typos forgiven) | tell the hub «хочу петь» (I want to sing) |
| US-04 | Karaoke from backing track to score (62 tracks, ТЭП, 157 languages) | door ·32 СЦЕНА |
| US-05 | Малыш — the voice of the house (offline, honest about what it lacks) | the calm dot in hall ·31 |
| US-06 | ПУЛЬТ: one remote — six register views (incl. 11 ЛИЦ faces) | G or ⚙ in the hall |
| US-07 | Human in the centre (accessibility profiles, Braille/speech/vibro) | door ·19, tab ПРОФИЛЬ |
| US-08 | Knowledge is open (docs/, CHANGELOG, AGENTS.md, llms.txt) | this document is an example |
| US-09 | The fund: quiet help (BIP84 on device, anonymity first) | door ·33 ФОНД |
| US-10 | Tracks are brothers (one file = the whole platform, horn protocol) | ·01, ·02, ·39, ·42 |
| US-11 | Door ·42 КОЛОНКА: autonomous smart speaker (DAG, Policy Gate, hash audit) | door ·42 |

Acceptance criteria with checkboxes — in [ТЗ.md](ТЗ.md); a checkbox is removed by verification, not by declaration.

## 6. Where to read what (the map of knowledge)

| Question | Answer |
|---|---|
| «What does the house promise?» | [ТЗ.md](ТЗ.md) — user stories with acceptance criteria |
| «What is done and what is next?» | [ДОРОЖНАЯ_КАРТА.md](ДОРОЖНАЯ_КАРТА.md) (future) + [CHANGELOG.md](../CHANGELOG.md) (facts) |
| «Why is it built this way?» | [АРХИТЕКТУРА.md](АРХИТЕКТУРА.md) + [adr/](adr/) |
| «How is a version released?» | [РИТУАЛ_ТАКТА.md](РИТУАЛ_ТАКТА.md) |
| «How does an agent live in the house?» | [МАЛЫШ.md](МАЛЫШ.md) + [../AGENTS.md](../AGENTS.md) |
| «Numbers and doors?» | `data/versions.json` — not from memory, not from old paragraphs |
| «A map for LLMs?» | [llms.txt](llms.txt) |
| «Glossary and FAQ for a resident?» | [../СИНГУЛЯР_36_СЛОВАРЬ.html](../СИНГУЛЯР_36_СЛОВАРЬ.html) · [../СИНГУЛЯР_35_ВОПРОСЫ.html](../СИНГУЛЯР_35_ВОПРОСЫ.html) |
| «Everything in human form?» | [../ДОКУМЕНТАЦИЯ.html](../ДОКУМЕНТАЦИЯ.html) — the face of the documentation |

## 7. State as of the date of synthesis (facts)

- **The house**: hub + 31 doors; такт v10.59 «СИНТЕЗ»; cache v114; core manifest v1.20.0; 62 songs; 157 languages of the flagship; chronicle — 47 тактов.
- **The ПУЛЬТ**: 6 register views (ПОЛНЫЙ, РУЛЬ, ПЛИТКА, ⌘ КОМАНДА, ОМНИ — a 360° ring in honour of the speaker-organ, ЛИЦА — a bridge to 11 faces of one protocol); memory `kv.pult`/`kv.litsa`; all six reachable from the ВИД panel; roles lead/tech/guest/child.
- **Tracks merged**: ·39 ОРГАНИЗМ (genome of 7 genes), ·40 ГАРМОНИЯ (HARMONIA .harm/0.1), ·41 НАМЕРЕНИЕ, ·42 КОЛОНКА (OMNISPEAKER-1 v0.4.0: DAG orchestrator, Policy Gate with PIN, SHA-256 hash chain, VLAN matrix, IaC).
- **Малыш**: twin (handler v2 + LLM 0.5B), calm presence dot, streaming answers, rules 13–16, textbook — [МАЛЫШ.md](МАЛЫШ.md).

Numbers are not to be sworn on: the living truth is `data/versions.json` and the house's ЗДОРОВЬЕ (door ·38).

## 8. Where it is going (the path)

Nearest lines of the map — [ДОРОЖНАЯ_КАРТА.md](ДОРОЖНАЯ_КАРТА.md), «Priorities»:

- **Малыш autonomy**: translations of «Просто люби» — 228/732 pairs collected, next — parts and full 12-language sets, phoneme timings; the plan — `ДАННЫЕ/МАЛЫШ_ПЛАН.manifest.json`.
- **Hall ·17 P2P**: a live run of the dual screen (hall + remote) on real devices.
- **adapter-os bridge into ЛАДОМ** — the presence of the BRAIN in the hall without duplicating weights.
- **Thinking ПУЛЬТ** — «recent + hunches» from context (delivered in v10.60 «ЧУТЬЁ»).
- **Speaker hardware** — phases 0–5 from `КОЛОНКА/docs/07_DETAILED_ROADMAP.md` (when hands and BOM details arrive).
- **Generative action cards** — the house's handles as cards, each with «undo» (delivered in v10.62 «ЖЕСТ»).

A pain or a dream arrives — a line is opened in the map; a такт takes 1–3 lines and closes them with test and battle. That is how the house grows in лад — in harmony.

## Neighbours

- [ТЗ.md](ТЗ.md) · [ДОРОЖНАЯ_КАРТА.md](ДОРОЖНАЯ_КАРТА.md) · [АРХИТЕКТУРА.md](АРХИТЕКТУРА.md) · [РИТУАЛ_ТАКТА.md](РИТУАЛ_ТАКТА.md) · [МАЛЫШ.md](МАЛЫШ.md) · [llms.txt](llms.txt) · [../CHANGELOG.md](../CHANGELOG.md) · [../AGENTS.md](../AGENTS.md)
