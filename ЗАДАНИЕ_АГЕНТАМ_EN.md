# TASK FOR AGENTS — the eternal assignment of every wave

> **Owner's order:** November 9, 2026.
> **To:** every wave of agents entering the `rtynbirf/singulyar` repository — coding agents, auditors, pipelines, future you.
> **Status:** ⚡ permanently in force · cannot be cancelled · only the owner may extend it.
> RU original (source of truth): [ЗАДАНИЕ_АГЕНТАМ.md](ЗАДАНИЕ_АГЕНТАМ.md).

You have entered someone else's working house. The House sings to people without a network, keeps its offline promise, and lives faster than your session. Three eternal duties apply to you — read them before your first edit.

## Duty 1 — WATCH THE STATE OF THE HOUSE

Before you touch a single byte, take the House's readings (supervision panel — full ritual in [docs/КАНОН_НАДЗОРА_EN.md](КАНОН_НАДЗОРА_EN.md)):

1. `data/versions.json` — takt, cache generation, counters (numbers are read ONLY from here; the counter dictionary explains each one).
2. The live site `https://rtynbirf.github.io/singulyar/` — hub footer ≡ meta ≡ registry (guard: `node --test ИНСТРУМЕНТЫ/test_лица_правды.mjs`).
3. `KNOWN_ISSUES.md`, `TODO.md`, `PULSE.md` — reds, tails, the pulse of previous waves.
4. CI oracles: «Оракулы дома зелёные» (House oracles green), «Такт-гейт» (Takt gate), Lighthouse, main↔rumu drift.
5. The pin quirk: after any push to `rumu` the «ПИН УСТАРЕЛ» (PIN STALE) gate turns red by design — cured by the `make pins --write` follow-up in `cell-swarm` (someone else's repo — only with permission), never by faking the gate.

Readings go into the takt dossier (stage 1 of the [ritual](РИТУАЛ_ТАКТА.md)). No readings — no touching the House.

## Duty 2 — KEEP THE HOUSE IN PROPER CONDITION, ACCORDING TO THE CANON

- The machine-reader canon is [AGENTS.md](AGENTS.md) (immutable items 1–7). The swarm canon is [docs/ПОЛИМАТ_МУЛЬТИАГЕНТ.md](ПОЛИМАТ_МУЛЬТИАГЕНТ.md) (eight laws, STOP-HORN, append-only).
- Releases go only through the 8 stages of the [takt ritual](РИТУАЛ_ТАКТА.md). Latkas (small patches) are minor moves without a takt number, but with the same checklist and a `S15_CACHE` bump on any worker edit.
- The truth about numbers: `data/versions.json` → `счётчики` (counters, + dictionary with definitions). Faces (footer, meta, README, JSON-LD, descriptions) come only from it; a hand-edited number = red CI («Лица ≡ реестру» / Faces ≡ registry). Truth pass: `python3 ИНСТРУМЕНТЫ/цех_правды.py --apply`; a dry run must show «ДРЕЙФ НЕТ» (NO DRIFT) before a push.
- The worker: a mandatory core file failing = rejected install; the old cache (last-known-good) survives activation; a new takt activates only on acceptance ∧ human consent (`S15_ВХОД_В_ТАКТ`), aggressive `skipWaiting` is forbidden (the law of updates). Guard: `node --test ИНСТРУМЕНТЫ/test_sw15_приёмка.mjs`.
- The chronicle (`data/versions.json` → `летопись`, CHANGELOG) is append-only: other people's entries stay intact byte for byte.

## Duty 3 — CLEAN UP ALL YOUR NOTIFICATIONS

Arrive quietly — leave clean. The full list lives in [docs/КАНОН_НАДЗОРА_EN.md § The clean-trail rule](КАНОН_НАДЗОРА_EN.md); in short:

- **Issues:** the wave's seal is ONE comment in the existing tracker (#62/#64); do not spawn new threads for the sake of a checkbox; threads you opened — you close, or hand over with an honest status.
- **CI:** a red run born of your push — fix it with a follow-up in the same wave, or record it in `KNOWN_ISSUES.md` with the run link and the cause. Leaving a red unrecorded is an abandoned trail.
- **Temporaries:** junk files, flag-latkas, debug banners, draft branches after landing — the same wave that created them removes them.
- **Notifications to people:** no silent tails for the owner — every open "did/didn't" must be visible in the wave journal.

## Where to enter (reading order)

1. [AGENTS.md](AGENTS.md) — the repo rules.
2. This file — the three duties.
3. [docs/КАНОН_НАДЗОРА_EN.md](КАНОН_НАДЗОРА_EN.md) — supervision and the clean trail.
4. [docs/ТЗ_АГЕНТАМ_EN.md](ТЗ_АГЕНТАМ_EN.md) — the technical assignment of waves (what to build).
5. [docs/ДОРОЖНАЯ_КАРТА_АГЕНТОВ_EN.md](ДОРОЖНАЯ_КАРТА_АГЕНТОВ_EN.md) — the road (in what order).
6. [docs/ПАКЕТ_ДОКУМЕНТОВ_АГЕНТАМ_EN.md](ПАКЕТ_ДОКУМЕНТОВ_АГЕНТАМ_EN.md) — the map of all House documents.
7. [docs/РИТУАЛ_ТАКТА.md](РИТУАЛ_ТАКТА.md) + [docs/ПОЛИМАТ_МУЛЬТИАГЕНТ.md](ПОЛИМАТ_МУЛЬТИАГЕНТ.md) — how a release happens and how the swarm moves (RU originals).
8. [docs/КРУГ_ВОПРОСОВ_EN.md](КРУГ_ВОПРОСОВ_EN.md) — the common circle of questions and the role of the HUMAN in the noosphere: three scales (an individual / communities / the HUMAN as a whole); the circle is a frame about the HUMAN, not a majority agenda and not a sum of interests; the HUMAN creates the environment and new possibilities of existence.

## Who this file answers to

The owner only. A wave has no right to delete, weaken or "temporarily suspend" the duties. Any violation of the canon found is recorded honestly — even if you are the one who violated it.
