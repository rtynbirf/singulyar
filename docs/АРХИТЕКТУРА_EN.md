# ARCHITECTURE of the СИНГУЛЯР house — the dresser: drawers → bridges → things

> **Status:** ✅ Current · **English translation of** [АРХИТЕКТУРА.md](АРХИТЕКТУРА.md) — Translation of docs/АРХИТЕКТУРА.md (v10.75) · canonical RU version wins (original in Russian, такт v10.59 «СИНТЕЗ») · **Translated and adopted:** v10.80 «ХВОСТЫ» · **Updated:** 2026-10-12
> The «why it is built this way». Step-by-step actions — in [РИТУАЛ_ТАКТА.md](РИТУАЛ_ТАКТА.md); dry facts about the doors — in `data/versions.json`. See also: [adr/](adr/) — why every decision was adopted.

## The main idea

The house is a single website with no build step, no server, no dependencies. All logic lives in the resident's browser. So that dozens of rooms (HTML faces) do not bite each other over globals, the house is built as a **dresser (комод)**: every family of functions gets its own **drawer (ящик)**, the family faces outward through a **bridge (мост)**, and in the room its things lie as ordinary globals.

```
drawer (isolated script block) ──bridge──▶ thing (window.__Х)
   С23 синхро·пульс·синхрон                  delete window.X
   С24 голос·микрофон                        Object.defineProperty(window, X,
   С25 ЛАБ·виз·движение                         {value, writable:false})
   С26 сцена·свет
   С27 склад·сканер
   С28 пульт·сообщения      bridges = things (living numbers — in the house КАЗНА, ПУЛЬТ → passport)
   С29 ЛАДОМ (пульт вечера)
   С30 слово·профиль (__ХАРМ, __ПРОФИЛЬ)
   С39 колонка·трек (window.КОЛОНКА)
   __КОМОД — the shared wardrobe on window
```

The **bridge** (`delete` + `defineProperty`) does three things: erases the old copy of the global, pins the new one as immutable (writable:false), and keeps the order of moving in — not a single line of house logic was rewritten, every family moved in as is. The bridge logic is verified by the test [ИНСТРУМЕНТЫ/test_bridge_logic.js](../ИНСТРУМЕНТЫ/test_bridge_logic.js).

## The faces of the house

- **Hub ·00** (`index.html`) — the crystal on the pedestal: a living canvas (WebGL, zero images), shard-doors, нить Ариадны (the thread of Ariadne: all doors of the registry — 31), the АРИАДНА search (an intent in words → a door, Levenshtein), the «Я сам» (I myself) intent, the house menu.
- **31 doors** (`СИНГУЛЯР_NN_ИМЯ.html`) — rooms: choir (·15–·18), the human (·19–·21), connection and autonomy (·22–·26), rails (·27–·30), hall and stage (·31–·34), help (·35–·37), health and organism (·38–·39), brother-tracks (·40 ГАРМОНИЯ, ·41 НАМЕРЕНИЕ, ·42 КОЛОНКА).
- **The core manifest** (`singulyar-modules.js`, `SNG.модуль`, v1.20.0) — the single source of truth about doors and threads: hub + 31 doors, connections are symmetric.
- **The chronicle** (`data/versions.json`) — the version, the такт, the date, counters, doors, AI models.

## The core and the engines

- `singulyar-modules.js` — the SNG core: crystal, shards, the living thread (door connections + path memory), the map.
- `singulyar-ux-engine-v9.js` — the UX engine: hover references, the house menu (full navigation over the doors, rebuilt at every opening), drag-and-drop, accessibility, the axes sound/voice/theme/roles.
- `singulyar-design-v3.css` — the design system: void #0A0A0C + glass + canonical gold #D4AF37 (warm #A67C00 on light); themes; `prefers-reduced-motion`.
- `sw15.js` — the service worker: cache-first, generation `s15-orkestrator-vNN`, a cache ceiling, the offline core untouchable under eviction, a safety shell (navigation without cache → index.html).
- `cord.js` — the safety КОРД (the rope): the thread snapped — the house holds (the «Нить порвалась» panel, a failure journal, the quiet mode).

## Memory

All state lives in `localStorage` under `kv.*` keys: the resident's roles, the last look of the remote (`kv.pult`), recent commands (`kv.pult.команда`), visits, wishes. The storage is fenced by a guard (a spoiled JSON does not fell the house). Encryption keys and biometrics never leave the device.

## Brains on the device (privacy in hardware)

- **Малыш-LLM** (·21 ОБЩЕНИЕ): Qwen2.5-0.5B-Instruct q4_k_m through wllama (wasm), 6 cache parts `singular-llm-parts-v1`, rules keep learning from upstream `rtynbirf/singulyar-llm` (cache `singular-llm-rules-v1`). The resident's words never go to the network.
- **Hearing**: Whisper (tiny/base/small) through @huggingface/transformers — also local; the default warm-up is tiny.

## Cache generations (why the number is mandatory)

The service worker lives cache-first: if new code ships and the generation `s15-orkestrator-vNN` is not raised, the resident sees the old house — and reports «the fix does not work». The canon of a такт: **every такт that touches sw15.js raises the generation** (v108 → v109 in «АТЛАС»); new assets join the pre-cache; `data/versions.json` receives a такт entry.

## CSP and inline scripts (the scars of v10.52 and v10.54)

A `<meta Content-Security-Policy>` without `'unsafe-inline'` silently kills every inline script of the page; the console does not complain, half of the house «does not click» (scar v10.52). The diagnosis is made by the `securitypolicyviolation` event; the meta is edited as a whole text, never by regex pieces. **Scar v10.54 added two more silent CSP killers**, found by a vm-test across all 38 faces of the house:

1. **Text outside a comment inside `<head>`** (for example «страховочный корд…») — any non-empty text pushes the parser from head into body; the CSP meta, charset and og-tags end up in body, and the browser silently IGNORES the whole policy. 31 faces suffered.
2. **A hash without quotes** (`sha256-…` instead of `'sha256-…'`) — by CSP3 grammar it is an invalid source; the policy is «alive», but the hashes do not work and inline blocks get blocked.

**The canon of posture А** (as on the hub and ЛАДОМ): `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob:` + external hosts when needed; no hashes — pinning would require re-hashing on every inline edit and silently breaks the face (the road will return hashes only with an auto-stamp in the такт workshop). `'wasm-unsafe-eval'` is mandatory: the brains of Малыш (wllama) and hearing (transformers.js) live on WASM. The result of v10.54: CSP alive and identical on every face of the house. More: [adr/0002-мост-delete-defineproperty.md](adr/0002-мост-delete-defineproperty.md), the chronicle of тактов v10.52/v10.54.

## Tracks — brothers

СИНГУЛЯР_01/02 (and the tracks that followed) — self-sufficient single-file platforms, entering the house as full-right doors through АРИАДНА. The horn protocol: the bytes of a track are accepted or cut off, the decision is recorded in the chronicle. Zero images where everything is drawn by code.

## Neighbours

- [ТЗ.md](ТЗ.md) · [ДОРОЖНАЯ_КАРТА.md](ДОРОЖНАЯ_КАРТА.md) · [РИТУАЛ_ТАКТА.md](РИТУАЛ_ТАКТА.md) · [МАЛЫШ.md](МАЛЫШ.md) · [adr/](adr/) · [ДОКУМЕНТЫ/АРХИТЕКТУРА_МОДУЛЕЙ.md](../ДОКУМЕНТЫ/АРХИТЕКТУРА_МОДУЛЕЙ.md) — the map of modules of the early era · [ДОКУМЕНТЫ/СВОД_ЗАКОНОВ.md](../ДОКУМЕНТЫ/СВОД_ЗАКОНОВ.md)

---

Canonical source: [АРХИТЕКТУРА.md](АРХИТЕКТУРА.md) — Russian original is authoritative.
