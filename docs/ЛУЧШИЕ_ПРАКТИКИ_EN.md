# WORLD BEST PRACTICES — the codex of the SINGULAR home's advisors

> **Status:** ✅ Current · **Tact:** v11.24 «МНОГОУЧЕНЫЙ» · **Updated:** 2026-10-14
> Semantic translation of [ЛУЧШИЕ_ПРАКТИКИ.md](ЛУЧШИЕ_ПРАКТИКИ.md) — sense over letters. The owner's input: «**ЛУЧШИЕ ТВОИ СОВЕТНИКИ ЭТО ТВОИ ЛУЧШИЕ ПРАКТИКИ МИРА**» — "YOUR BEST ADVISORS ARE THE WORLD'S BEST PRACTICES". See also: [ПОЛИМАТ_ПРОТОКОЛ](ПОЛИМАТ_ПРОТОКОЛ_EN.md) — the method; [ИНСТРУМЕНТАРИЙ_ВЭБ](ИНСТРУМЕНТАРИЙ_ВЭБ_EN.md) — the hands; СВОД_ЗАКОНОВ — the home's laws.

## The law of the codex

The home's advisors are **practices, not tastes**. A practice enters the codex only by answering three requirements: (1) **a world canon** — a named methodology (a standard, a manifesto, a recognized discipline), not someone's opinion; (2) **the home already lives it** — a working precedent in the bytes, not a plan; (3) **a stretch named** — what the home will tighten when its turn comes. A practice without a canon is fashion; a canon without precedent is a dream; both without a stretch is complacency. The verified 2025–2026 trends (Виток 2, 3а.13) are the entry door for new rows.

## The codex: fourteen advisors

| № | Practice (world canon) | How the home already lives it | Stretch |
|---|---|---|---|
| 1 | **WCAG 2.2** (W3C) — accessibility: perceivable/operable/understandable/robust | the owner is blind — accessibility is not an option but the home's meaning: aria ×28 (the WALLET pin first), H1 ×6 doors, sr-only for hall-apps, honest Russian refusals, ·38 PULSE the a11y exemplar | keep the Lighthouse a11y 0.9 gate (CI alive, move С97); contrast and focus order — at the next face tacts |
| 2 | **Keep a Changelog + SemVer** — an explicit version chronicle: Added/Changed/Fixed; tact=MINOR, fix=PATCH | CHANGELOG.md — the tact chronicle (`[11.23]` on top); versions v11.NN monotone; contract breakers = MAJOR | keep "versions.json = CHANGELOG = map headers" aligned (the "one truth" law, Н5) |
| 3 | **Docs-as-code + llms.txt** — documentation in the repo next to code, a machine-readable index | docs/ — each type of knowledge its own file; llms.txt — the knowledge map; README maps RU/EN | llms.txt lagged the tacts — raised into rhythm (replenished by this tact) |
| 4 | **Append-only ledger / event sourcing** — history is never rewritten, events are added | versions.json chronicle (110 entries, append-only ≥100 — an oracle watches); 3а fact sections; "chronicle, not truth" (Н5) | keep the append-only oracle sacred; the home's historians are marked, never "updated" |
| 5 | **CSP / OWASP secure headers** — a strict security policy, zero foreign code | posture А without scars; CSP hermeticity 40/41 faces; zero external scripts in the whole home | 404.html — the only face without CSP (Виток 2 finding, awaits a tact packet) |
| 6 | **Service Worker: cache-first + version pinning** — offline first, caches by generations, the old dies by number | sw15.js: S15_CACHE generations (v175), protected AI caches, skipWaiting+claim, corpus pre-cache | do not bloat the pre-cache (the СИНХРОН law); zero dead pre-cache links (П.1 closed) |
| 7 | **Web Crypto API (W3C): ECDSA P-256 + SHA-256** — modern cryptography by the browser's hands, no heavyweight libraries | mail ·24 signatures, ledger ·25; generate_node_passport.py — an ECDSA node passport (OMNISPEAKER) | thread-Ariadne encryption and mesh signatures — the ПВ/М line |
| 8 | **Infrastructure as Code: idempotency and declarativity** — configuration is code, a second run breaks nothing | patchers with guard markers ("new contains old"); OMNISPEAKER IaC v3 (cloud-init, kiosk, nginx); поверка_инструментария.py | extend the guard discipline to every future pipeline |
| 9 | **CI quality gates** — the machine checks the human before publication | Lighthouse CI (perf 0.6/a11y 0.9/bp 0.85/seo 0.9); node --check on all touched JS; ·31 oracles and 66+ test files | keep "tests catch real bugs — fix the code, not the expectations" (the RITUAL) |
| 10 | **Single source of truth** — one place of truth, everything else reads from it | the data-registry on 33 faces (Н5 "ORGANISM"); sg-registry.js; "one truth" in the README | finish off the "lying numbers" class (Н5 closed the fifth line in a row — the class is extinct) |
| 11 | **RU/EN i18n mirroring** — one canon, translation by meaning (law Д7) | _EN mirrors of all docs/ files; 200 languages of one song (157 auto + 43 semantic per the MEANING protocol) | EN mirrors in step with the Russian canon (this tact — born with mirrors) |
| 12 | **Air-gapped / offline security** — the most honest channel is the one that does not exist; hand-carried, no radio | the home is offline, serverless; QR emulators (SDP handshake, fountain droplets, merkle proofs, fallback cascade); ultrasonic FSK pilot | live channels ·17↔·44 — the ПВ/Д line; transport without Wi-Fi — the TRANSPORT arsenal |
| 13 | **AI anti-hallucination: verifiability, honesty marks** — an AI answers with a source or stays silent with a mark | ANTI-HALLUCINATION mode (М8: "UNVERIFIED facts"); language law I-12; Малыш local (0 network — cannot lie about someone else's internet) | extend the "chronicle, not truth" / "UNVERIFIED" marks to every new face |
| 14 | **Graceful degradation / fallback cascade** — every hand has a second one; degradation is predictable | SCENE mp3 fallback (62 voices); home source fallback Pages→Release→local (М6); the fallback_cascade QR transport | degradation stages for OPFS playback files — on top of __ОПФС (ПВ1 laid the floor) |

## How to extend the codex

A new practice enters only through the triple check: the canon named → a precedent found in the home's bytes (or made by a tact) → the stretch recorded. The codex lives next to the [HOME LAWS](../ДОКУМЕНТЫ/СВОД_ЗАКОНОВ.md), but they differ: a **law** is a home rule with the force of a gate; a **practice** is a world advisor with the force of habit. Breaking a law — STOP-HORN; skipping a practice — conscience and the next tact.

## See also

[ПОЛИМАТ_ПРОТОКОЛ](ПОЛИМАТ_ПРОТОКОЛ_EN.md) · [ИНСТРУМЕНТАРИЙ_ВЭБ](ИНСТРУМЕНТАРИЙ_ВЭБ_EN.md) · [ДОРОЖНАЯ_КАРТА.md](ДОРОЖНАЯ_КАРТА_EN.md)
