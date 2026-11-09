# THE HUMAN'S SHIELD — the doctrine of the SINGULAR home

> **Status:** ✅ Current · **Tact:** v11.30 «ЩИТ» («THE SHIELD») · **Updated:** 2026-10-14 (C108, PAT №28; the parallel walks ПОСАДКА (C106) and КОНТУР (C107) accepted whole — renumbered honestly)
> The owner's umbrella goal (verbatim, trace `1a13a189d3c1818d`, the evening of Oct 14, 2026): «KEEP INTEGRATING EVERYTHING INTO THE PROJECT. THE TASK IS TO **PROTECT THE HUMAN FROM ALL „CORPORATIONS, STATES, BENEFACTORS, GOOD UNCLE-PROTECTORS“ AND OTHER CHARLATANS AND SWINDLERS OF EVERY DEGREE OF SEVERITY**».
> This document is how the home executes the order. Not a mood manifesto: every line has an address in the home's code and a checkable probe.

## 1 · WHAT «PROTECT» MEANS

A human is made dependent in four ways, and the home answers each one with engineering, not words.

**Corporations** tame with convenience: an account, a cloud, a «free» service paid in data. The home has no accounts and no cloud: all of the human's data — songs, records, dictionaries, wallet, mail — lives in their browser (IndexedDB, OPFS, localStorage), and the phonogram storage is pinned against eviction (Storage Persistence, the `opfs-core/0.1` canon). A service that knows nothing about a human cannot sell anything of theirs.

**States** tame with the channel: every connection is an observation point. The home is offline by construction: after the first load the PWA lives entirely without the network (the `sw15.js` service worker, cache-first, the cache generation grows honestly with every tact); network calls are allowed only by the human's explicit action and never in the background. CSP posture А (zero external scripts, zero external fonts, zero telemetry) stands on all the faces of the home.

**Charlatans and swindlers** tame by pocketing the truth: faking numbers, promises, history. The home holds the truth mechanically: the single source of numbers `data/versions.json` (the live registry `js/sg-registry.js` carries it into all door badges — the «number-lies» class is extinct), the append-only chronicle (a history record is never rewritten), facts in one place each (the CHANGELOG), every edit passing gates and STOP-HORN. A fabrication is caught by a test, not by a scandal.

**Quiet leaks** tame by small things: analytics, prefetch to foreign hosts, «anonymous» statistics. The home is honestly poor in outbound traffic: the audit shows zero external requests on the live faces; the communication channels (·17↔·44) are built air-gapped (QR handshakes without routers), the mail ·24 is encrypted with WebCrypto, the journal ·25 converges by Lamport CRDT clocks, the node ·42 wears an ECDSA passport anyone can verify.

## 2 · THE THREAT MAP × THE SHIELDS (every shield has an address)

| Threat | The home's shield | Where it lives |
|---|---|---|
| Data collection on the human | 0 telemetry, 0 analytics, 0 external scripts; CSP posture А | the CSP meta of all 42 faces; the C94/C97 audit |
| The cloud as a hostage | local-only data: IndexedDB / OPFS / localStorage | ·16 records, ·15 funds, ·25 wallet, opfs-core/0.1 |
| Browser data eviction | Storage Persistence by explicit action | js/opfs-core.js (ПВ1) |
| Network surveillance | fully offline mode; the network — only by explicit action | sw15.js; the canon laws (И-01) |
| Truth substitution by numbers | `data-реестр` on the door badges; the single source `data/versions.json` | js/sg-registry.js (Н5, v11.21) |
| History rewriting | append-only chronicle; «one fact — one place» | data/versions.json; CHANGELOG.md |
| False promises | tests and the live ЭП-06 verification before publication | docs/РИТУАЛ_ТАКТА.md |
| Communication interception | air-gapped QR channels; E2EE mail; journal signing | ·17/·44 (the ПВ4 donor), ·24, ·25 |
| Node substitution | ECDSA node passports (WebCrypto) | ·42/·51 (iac v3) |
| Vendor lock-in of a button/font/CDN | zero external hosts; system fonts; zero bundler | the whole home; AGENTS.md §3 |
| Truth decay in AI overviews | honest JSON-LD/meta from the registry; llms docs | ·35 JSON-LD, docs/llms.txt |
| Silence on failure | honest Russian refusals instead of «error» | every canon of the home (opfs-core, yin-core, mesh-core…) |

## 3 · INVARIANTS (never step back)

1. **The human's data never leaves the device** — no tact adds a send-out without an explicit action promised by a button's words.
2. **Zero network on import and render** — the network by explicit action (the precedents: mesh-wire/0.1, opfs-core/0.1, yin-core/0.1).
3. **The truth is append-only** — history is not rewritten; a mistake is marked, not erased.
4. **Numbers — from the registry only** — hardcoded numbers on live faces are forbidden (Н5).
5. **An honest refusal over a fabrication** — every function answers with a Russian reason, not a silent lie.
6. **The choice belongs to the human** — engines, roles, data: nothing without an explicit action (microphone, persist, network).
7. **The colleagues' bytes are not touched** — someone else's move is accepted whole, one's own goes on top (the STOP-HORN discipline).

## 4 · THE HONESTY BOUNDARY (what the shield CANNOT do)

The home does not protect from physical access to an unlocked device, from a compromised machine, or from a human voluntarily publishing their own data. These are the boundaries of any local sovereignty — the home does not lie about them (the law «an honest refusal over a fabrication»). Recommendations to the owner: a device password, disk encryption, not leaving an unlocked browser with the home open.

## 5 · HOW TO CHECK THE SHIELD (probes, not slogans)

- Open any door with DevTools → Network: after the first load — 0 external hosts.
- The console: `window.SG_РЕЕСТР` — the truth of numbers came from `data/versions.json`; the door badge shows the same numbers.
- The repository's `git log`: the chronicle of tacts is monotone, history not rewritten (no force-push).
- A local stand without the network (`python -m http.server` + Wi-Fi off): the home lives entirely — doors, karaoke, dictionaries.
- Door ·45 ДОКУМЕНТАЦИЯ: the In-Browser Test Suite self-diagnostics (AudioWorklet/OPFS/WebCrypto/WebRTC/SW).

## 6 · NEIGHBORS

[ПОЛИМАТ_ПРОТОКОЛ.md](ПОЛИМАТ_ПРОТОКОЛ.md) · [ИНСТРУМЕНТАРИЙ_ВЭБ.md](ИНСТРУМЕНТАРИЙ_ВЭБ.md) · [ЛУЧШИЕ_ПРАКТИКИ.md](ЛУЧШИЕ_ПРАКТИКИ.md) · [../AGENTS.md](../AGENTS.md) · [../docs/РИТУАЛ_ТАКТА.md](РИТУАЛ_ТАКТА.md)

---

*Semantic translation: tact v11.30 «ЩИТ» («THE SHIELD») (2026-10-14). The Russian canon rules: [ЩИТ_ЧЕЛОВЕКА.md](ЩИТ_ЧЕЛОВЕКА.md).*
