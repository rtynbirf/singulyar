# SWARM REVIEW: colleague's «DOOR ZERO» — recommendations checked against the house laws (EN mirror)

> **Status:** ✅ Review complete · **Date:** 2026-11-13 · RU original: [РАЗБОР_ДВЕРЬ_НОЛЬ.md](РАЗБОР_ДВЕРЬ_НОЛЬ.md)
> The colleague's package is accepted verbatim: [ПАКЕТ_КОЛЛЕГИ_2026-11-13.md](ПАКЕТ_КОЛЛЕГИ_2026-11-13.md).
> Owner's word: "this is NOT a directive to act, these are recommendations" — so this move is ONLY acceptance + review + registration. Phases 0–5 wait for a separate owner's word.

## 1. What resonates with the house (already held by other bytes)

- **F-04/C-02 zero telemetry, zero analytics** — the house already lives this: ·38 honest boundaries ("zero analytics, zero forms, zero requests to foreign servers without your click"); I-01 "the human decides".
- **"Honest emptiness"** — precedent of the fund: "until the address is baked in, the house honestly shows emptiness"; 404.html as the honest dead-end face (ЛКГ-1).
- **F-05 removal breaks boot** — house discipline: mandatory worker core (ЛКГ-1: mandatory failure = rejected install, `test_sw15_приёмка.mjs`).
- **"Nothing to improve" as the success criterion** — the agents map literally lists "what is NOT done" (rule 5); freeze = a map row, not a server stub.
- **N-01 offline without CDNs, N-03 no frameworks** — house law: zero external dependencies, server without npm (RFC 6455 by hand).
- **N-04 docs RU+EN** — Directive 1 of the swarm: EN mirrors of key documents in the same wave.

## 2. Honest collisions with house laws (owner decides)

1. **Numbering.** The colleague's "Door 53" is taken: ·53 СВЯЗЬ ЧЕЛОВЕКА lives in the house (52 doors + hub, plus ·54 and ·55). Door Zero is by its nature OUTSIDE the content registry, so it touches no counters if never registered. The honest name is beyond numbering (e.g. "door ∅ / PID 0"); the number is the owner's word.
2. **204/403 Void are server semantics.** The house stands on GitHub Pages: static, no server. Honest static translation: an emptiness page (zero weight, CSP posture A, noindex, not in navigation/search) + a boot guard in CI; the full 204/403 contract needs a separate server repo (the colleague's `rtynbirf/door-zero` sketch) — owner's call.
3. **C-03 "has no owner".** The house has exactly one Host — the Human; no door "belongs" to an agent. House phrasing: Door Zero has no agent-in-charge, but the house always has a Host.
4. **"Assign no one" vs Directive 1.** Compatible: the fact of appearance is written into the map; the door itself is not in the swarm's service scope.
5. **Phase 5 freeze "any PR → 403 Void"** — in the house a freeze lives as a "what is NOT done" row in the agents map + a guard, not as server code.
6. **The `door-zero.yml` sketch** uses bare `actions/checkout@v4` — house law С128 requires SHA pins (v7.0.1/v7.1.0). If adopted, pins per С128 are mandatory.

## 3. Done in this move (per owner's word "bring it in")

- Package accepted byte-for-byte; this review (RU + EN); registration: fact in `docs/ДОРОЖНАЯ_КАРТА.md` (3а.44 docs-only move), CHANGELOG entry, documents into the worker pre-cache per the new-assets law (pattern: W1 EN mirrors).

## 4. NOT done in this move (honest boundary)

- No `door-zero/init` branch; no `rtynbirf/door-zero` repo; no stub server, Makefile, or door-zero.yml; Door Zero NOT added to the versions.json doors registry (52/53 counters untouched, T-073), NOT added to navigation or search. 52 doors, 64 songs, 200 languages — untouched.

## 5. If the owner says "execute" (wave candidate, not now)

1. House path (inside `singulyar`): emptiness page in house canon + boot guard `ИНСТРУМЕНТЫ/test_дверь_ноль.mjs` (present = green; removed = red) + a "what is NOT done" map row + `DOOR_ZERO: present` in the status registry — without server semantics.
2. Repo path (separately, per the colleague's sketch): server ≤1 KB (GET→204, POST→403 Void), CI with С128 SHA pins, boot-check present/removed.
3. Both paths do not interfere with W2 "Fund readiness" — it proceeds independently.

## 6. Verdict

The colleague's package is a strong systemic recommendation in the house's own spirit: emptiness as a load-bearing structure, honesty without telemetry, "nothing to improve" as the state of maturity. The house accepts it into the chronicle verbatim; execution waits for the owner's separate word. The colleague's failure criterion ("someone wants to put something in there") the house states honestly: as long as nobody has put anything in — the emptiness is healthy.
