# TZ — the living technical specification (техзадание) of the СИНГУЛЯР house

> **Status:** ✅ Current · **English translation of** [ТЗ.md](ТЗ.md) (original in Russian, такт v10.59 «СИНТЕЗ») · **Translated:** v10.76 «СВЯЗКА» · **Updated:** 2026-10-12
> This is a living specification: not dead formalism, but the house's promises to the human, each with a checkable criterion. A checkbox is only unticked by a check, never by a declaration. House documents are written in Russian (the house speaks to its people in their language); this translation opens the door for non-Russian readers. See also: [ДОРОЖНАЯ_КАРТА.md](ДОРОЖНАЯ_КАРТА.md) — what is already done; [АРХИТЕКТУРА.md](АРХИТЕКТУРА.md) — how it is built.

## The law of the house (above priorities — not among them)

**THE LAW OF СИНГУЛЯР:** ergonomics, privacy, confidentiality and usability stand at the head of the corner. The project serves the human and does not test them with discomfort. Every user story below is read only through this law: if a feature wins and the human loses — the feature is rejected.

## US-01 · The house lives offline
**As** a resident, **I want** to open the house without internet, **so that** I can sing and live in it anywhere.

**Acceptance criteria:**
- [x] The first load puts the house core into the service worker pre-cache (`sw15.js`)
- [x] A cold start without network opens the face of the house with all doors
- [x] The cache is generational: `s15-orkestrator-vNN` — a new такт = a new generation, the old one is evicted whole
- [x] The offline core is untouchable during eviction (doc «СТАЛЬ_НИТИ_И_ЯДРО.md»)
- [x] A safety КОРД lives on every page: if the thread breaks, the house still holds

## US-02 · Privacy without exceptions
**As** a resident, **I want** to know my data never leaves the device, **so that** I can trust the house.

**Acceptance criteria:**
- [x] Zero external counters, trackers, analytics — the house does not watch you
- [x] Малыш's brain (Qwen2.5-0.5B) runs locally (wllama, wasm) — words do not go to the cloud
- [x] Hearing (Whisper) — on the device; fund keys are born and die in the browser
- [x] The ПУЛЬТ carries a golden shield «данные не покидают дом» (data never leaves the house) — the promise is visible, not hidden
- [x] CSP is alive on every face of the house (posture А of the canon, resurrected in v10.54) — the policy is enforced, not decorative
- [x] The public repository contains only what can be shown to the world

## US-03 · Navigation: intent → door
**As** a resident, **I want** to say or type what I want, **so that** the house opens the door itself.

**Acceptance criteria:**
- [x] The thread of Ariadne on the face: every door of the register is visible from a cold load
- [x] The АРИАДНА search: intent in words → door (62 fund songs + documents in the index)
- [x] Typos are forgiven (Levenshtein); honest emptiness instead of garbage
- [x] The house menu in the top-right corner of every room carries full door navigation
- [x] Door threads are symmetric: from A to B and from B to A
- [x] No room is a dead end (такт v10.52 pulled out ПУЛЬС ·38)

## US-04 · Karaoke: from backing track to score
**As** a singer, **I want** to pick a song and get a stage, **so that** I sing with support and a score.

**Acceptance criteria:**
- [x] 62 local fund backing tracks (folder `minus/`) — zero network
- [x] Lyrics are built in; word-wipe by weights; ТЭП score (ИДЕАЛ/ТОЧНО/combo/record)
- [x] Tempo/offset/volume are reversible (law I-11)
- [x] ·16 СУФЛЁР: microphone→MIDI→score; ·20 ФОНЕТИКА: offline romanization of any script
- [x] 157 languages of one song — «КОГДА ТЕРЯЕМ» (When We Lose): from Kazakh to Swahili
- [x] The СИНГУЛЯР conveyor: «КОГДА ТЕРЯЕМ» — 197 languages (groups 1–2), «ГДЕ НАСТОЯЩЕЕ» (Where the Real Is) — 223 languages (groups 1–7); the owner's goal — 200 per song.

## US-05 · Малыш (the Kid): the voice of the house
**As** a resident, **I want** to ask the house by voice and get a living answer, **so that** I walk the house without a remote.

**Acceptance criteria:**
- [x] Малыш is double: handler v2 in ЛАДОМ ·31 + LLM Qwen2.5-0.5B in ОБЩЕНИЕ ·21
- [x] Works offline on the device; rules learn upstream from `rtynbirf/singulyar-llm`
- [x] Rule 13 «ЗНАНИЕ ДОМА» (knowledge of the house): knows the door map by heart, never invents doors
- [x] Rule 14 «ЗАКОН ДОМА» (law of the house): honestly says what does not exist and shows the door where it lives
- [x] Rule 15 «ДОКУМЕНТАЦИЯ ДОМА» (documentation of the house): guides through docs/ and answers with facts from data/versions.json
- [x] Token streaming of answers (aria-live + a «Стоп» button) — done in v10.55 «ПОТОК», battle-tested
- [x] Calm-tech presence dot in the hall (a quiet breathing dot, silent by default) — done in v10.55, registered in the КАЗНА and ЗДОРОВЬЕ
- [x] Малыш's action cards in the calm map: 6–8 generative actions by context, each explains its «why», reversible ones carry an honest «↩» undo — done in v10.61 «РУЧКИ», ЗДОРОВЬЕ probe 26

## US-06 · ПУЛЬТ: one remote — many faces
**As** the host of the evening, **I want** to run the house from one remote, **so that** I lead the evening without extra words.

**Acceptance criteria:**
- [x] Six register views: ПОЛНЫЙ (full), РУЛЬ (wheel), ПЛИТКА (tiles), ⌘ КОМАНДА (command), ОМНИ (a 360° ring in honor of the column-organ, door ·42), ЛИЦА (faces) — a bridge to 11 faces of one protocol; all six are chips in the VIEW panel (memory kv.pult/kv.litsa); the КОМАНДА palette — Ctrl+K, 52+ commands
- [x] КОМАНДА palette: Ctrl+K / Cmd+K / Ctrl+Л, search, arrows, Enter, Esc
- [x] The house remembers the last view (`kv.pult`) and the last 5 commands (`kv.pult.команда`)
- [x] Roles: host / technician / guest / child — the house adapts without cutting functions (I-11)
- [x] Everything is reversible; the phone remote ЛАДОМ_ПУЛЬТ_ТЕЛЕФОН.html — control from a pocket

## US-07 · The human in the center
**As** a human with my own abilities, **I want** the house to adapt to me, **so that** I am the master, not a guest.

**Acceptance criteria:**
- [x] ·19 ЧЕЛОВЕК (human): adaptation by ability, «invite to sing», identity without leaking keys
- [x] ·21 ОБЩЕНИЕ (communication): one meaning — different representations (text/Braille/speech/vibration), voice is the receiver's setting
- [x] `prefers-reduced-motion` stills movement across the whole house
- [x] WCAG 2.2 audit inside the house (·29 СВОБОДА); tooltips on hover instead of echoes
- [x] A human does not «grow» — a human fills up; the house adapts to the word

## US-08 · Knowledge is open
**As** a reader of the repository, **I want** to take any part of the house and understand it, **so that** I can verify, learn and build my own.

**Acceptance criteria:**
- [x] Code carries detailed comments in Russian
- [x] `docs/` — the map, TZ, roadmap, architecture, ritual, Малыш's instructions
- [x] `CHANGELOG.md` — every такт by Keep a Changelog
- [x] `AGENTS.md` + `llms.txt` — the house is readable not only by humans but by machines
- [x] 157 flagship languages are open in `ДАННЫЕ/флагман_157_языков/`
- [x] Documentation is written in plain words, no bureaucratic sludge

## US-09 · The fund: quiet help
**As** a helper, **I want** to support the house with one motion, **so that** my help stays mine — quiet and protected.

**Acceptance criteria:**
- [x] ·33 ФОНД (fund): an open-chain counter in one click (multi-node)
- [x] The «ОДНА КНОПКА» (one button) counting master: BIP39/BIP32/BIP84 in pure JS, keys never leave the device
- [x] Anonymity first; chronicle only by choice
- [x] ·34 ДОМ ФОНДА (fund house): charter, ten rights of the donor, honest glass of independence
- [x] Fund counter reconciliation — done in v10.55: the «⌗ сверка счётчиков» button in ФОНД (registry of versions vs door array vs manifest, both truths about songs — in words)

## US-10 · Tracks — brothers, not strangers
**As** a track author (СИНГУЛЯР_01/02 and others), **I want** my works to be full doors of the house, **so that** the universe grows in harmony, not in scatter.

**Acceptance criteria:**
- [x] Tracks are self-sufficient: one file = the whole platform
- [x] Track doors stand in АРИАДНА and in the door chronicle
- [x] The горн-protocol of integration: track bytes are accepted/rejected with an honest chronicle
- [x] Zero images where everything is drawn by code — the house canon

## How to read this TZ

- ✅ — the promise is fulfilled and verified (vm-test and/or the live ЭП-06 check);
- [ ] an unticked checkbox — the promise lives on, taken by the nearest такт;
- A new story is added by the logic of newly opened circumstances: the owner's voice, a resident's pain, a world trend proven by practice.
- Related: [СВОД_ЗАКОНОВ.md](../ДОКУМЕНТЫ/СВОД_ЗАКОНОВ.md) — invariants I-01..I-10 proven by test; [ИНЖЕНЕРНЫЙ_ПАРАМЕТР.md](../ДОКУМЕНТЫ/ИНЖЕНЕРНЫЙ_ПАРАМЕТР.md) — law I-11.

## US-11 · Door ·42 КОЛОНКА (column) — the autonomous smart speaker of the track
**As** a resident, **I want** a smart speaker in the house that listens, thinks and acts strictly locally, **so that** the house cares for me without a cloud and never tests me with discomfort.

**Acceptance criteria:**
- [x] Door ·42 КОЛОНКА (`СИНГУЛЯР_39_КОЛОНКА.html`) is open from the hub; the house threads are symmetric (hub ⇄ ·41 ⇄ ·42 ⇄ hub)
- [x] The DAG orchestrator is alive: a goal in words → a plan of steps with risks; the Policy Engine stops medium/high (button confirmation) and critical (PIN); a tool outside policy_rules.json is honestly rejected (default_action: deny)
- [x] Hash-Chain audit — real SHA-256 (`crypto.subtle`); the chain is copied and erased with buttons; «Стоп» honestly tears the conveyor
- [x] Hardware privacy: the microphone de-energizes the «ear» (LED + badge + audit entry), a mechanical shutter moves the camera; the VLAN matrix explains every rule in words
- [x] The Network·IaC tab shows the real files of the КОЛОНКА/ distribution (compose, policy, nftables, terraform, ansible) with copy-on-click
- [x] ЗДОРОВЬЕ probes: 10 organs alive (organism test 47/47 — every button answers with an observable response); 0 console errors; mobile 390px without overflows
- [x] The house remembers the human's choice (tab, goal, switches, case parameters) and can forget it with one button
- [x] Service worker: door ·42 is in the core pre-cache (generation v113)
- [ ] The track hardware is assembled and the ПСИ passed (phases 0–5 of the map — when hands and parts reach it per the BOM)

## US-13 · Hands of the house · ПУЛЬТ — action cards with honest undo
**As** a resident, **I want** the ПУЛЬТ to offer typical evening gestures as cards and to keep an honest «↩ undo» after each press, **so that** I act with one touch and always have a way back. (The hall's calm map — Малыш's hands — was closed in v10.61 «РУЧКИ»; the ПУЛЬТ is the second host of the same line.)

**Acceptance criteria:**
- [x] The «РУКИ ДОМА · КАРТОЧКИ» (hands of the house · cards) strip in the ПУЛЬТ assembles cards from the living context (no duplication of чутьё and hall hands): song playing → «⏸ ПАУЗА», «◻ ТИШИНА» (silence), «⏪/⏩ 10 С», «СВЕТ: …» (light), «СЦЕНА · СВЕТ (слой)» — «open the door», «⌂ ЗАКРЫТЬ ПУЛЬТ» (close the remote); pause → «▶ ПРОДОЛЖИТЬ» (continue); silence → «↩ ЗВУК ОБРАТНО» (sound back); personal branch → «ЛИЦО ПУЛЬТА: ДАЛЬШЕ», «ЛЮДИ · ЗАЛ»; at start the hands stay honestly silent
- [x] After a press the card holds «✓ done» and an honest «↩ undo» (law I-11) wherever the way back is reachable: pause/silence — a twin hand; bounces — a delta at the moment of undo (exact return even for a playing song); scene — return to the current one; layers — «close the whole remote»; «⌂ ЗАКРЫТЬ ПУЛЬТ» leaves together with the remote — zero promises without deeds
- [x] Role-guard: the unknown is not shown (the РОЛИ canon); branch-guard: the hall — the common wheel, face and people — the personal one
- [x] Cards honestly regenerate from context (no kv memory); execution goes through the single bus of intents (`src` «жест»/«жест-откат»), no double state
- [x] The gestures ЗДОРОВЬЕ probe is green; mobile 390px: targets ≥44px; the live console is clean
- [x] The ПУЛЬТ passport carries the gestures line (under the hands line [10.61])

## US-12 · The ПУЛЬТ's чутьё (sensing) — the house guesses the next step
**As** a resident, **I want** the remote to guess my next action from the context of the evening and honestly explain the guess, **so that** I steer with one button without searching through tabs and without being tested by discomfort.

**Acceptance criteria:**
- [x] The «ЧУТЬЁ» strip in the ПУЛЬТ shows предчувствия (presentiments) by context (start → «▶ НАЧАТЬ ВЕЧЕР» (begin the evening); song playing → «⏸ ПАУЗА», «◻ ТИШИНА»; pause → «▶ ПРОДОЛЖИТЬ»; scene N → the next one) — each with an explanation of «why»
- [x] «Недавние» (recent) remember the last actions (up to 8, `kv.pult.чутьё`); silence and calibration carry an honest «↩» undo; where undo would be dishonest — there is no button (law I-11)
- [x] The branch ◉ ОБЩИЙ РУЛЬ (common wheel) / ◈ ЛИЧНЫЙ (personal) is remembered (`kv.pult.ветка`) and opens by default; the filter of recent and presentiments is honest
- [x] Role refusals and unrecognized intents do not enter memory; privacy: everything in `kv.*` of this browser, zero network
- [x] Role-guard: the unknown is not offered (the РОЛИ canon)
- [x] The чутьё ЗДОРОВЬЕ probe is green; mobile 390px: targets ≥44px, zero overflows; vm-test 19/19, console clean
- [x] The ПУЛЬТ passport carries the чутьё line (the door ·42 line — the «СИНТЕЗ» move)

## US-16 · НАВИГАТОР — a step back and all doors on every page
**As** a resident, **I want** to see ⌂ ДОМ (home), ↑ НАЗАД (back) and ☰ ВСЕ ДВЕРИ (all doors) on every page of the house, **so that** I never get stuck: the first menu has exits, submenus have exits, sub-submenus have exits, and a step back is always possible.

**Acceptance criteria:**
- [x] The НАВИГАТОР (thread ⌂ · ↑ · ☰) stands on 41 pages of the house; the «ВСЕ ДВЕРИ» menu opens all doors + the hub in groups, works without JS (`<details>`) and hides in print
- [x] «↑ НАЗАД» is honest: if there is history — a browser-history step back; no history — a fallback to the parent (for sub-submenus — ·45 ДОКУМЕНТАЦИЯ and ·42 КОЛОНКА)
- [x] Zero dead ends: the rasterizer, adapter-os and the column prototype (formerly 0 internal exits) received the thread; a graph audit of 43 pages — every page is reachable from the hub and has exits
- [x] The 10 doors ·43–·52 are sewn into the МОДУЛИ manifest, versions.json (counter 41), the АРИАДНА search and the static doors of the hub (the full house is visible without JS)
- [x] ЛАДОМ: «· ВСЕ ДВЕРИ» in the header and a remote command; the 404 page carries the full menu by absolute paths
- [x] Cache v120; vm-probe: the core syntax is clean, the repeated graph audit is green
