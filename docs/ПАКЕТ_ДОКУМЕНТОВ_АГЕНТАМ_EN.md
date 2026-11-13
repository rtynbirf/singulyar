# AGENTS' DOCUMENT PACKAGE — the map and reading order

> **Status:** ✅ Current · **Assembled:** 2026-11-09 (the ЛКГ-1/ПРАВДА-2 latkas, the owner's order).
> Purpose: a new wave enters the House in one reading pass — without digging through history.
> RU original (source of truth): [ПАКЕТ_ДОКУМЕНТОВ_АГЕНТАМ.md](ПАКЕТ_ДОКУМЕНТОВ_АГЕНТАМ.md).

## The reading order (mandatory)

| Step | Document | What for |
|---|---|---|
| 1 | [AGENTS.md](../AGENTS.md) | the repo rules for machines: the immutable items 1–7, the file map, commands |
| 2 | [ЗАДАНИЕ_АГЕНТАМ_EN.md](../ЗАДАНИЕ_АГЕНТАМ_EN.md) | the three eternal duties: supervision, maintenance, clean trail |
| 3 | [docs/КАНОН_НАДЗОРА_EN.md](КАНОН_НАДЗОРА_EN.md) | the supervision panel (8 sensors), the wave cycle, the clean-trail rule, escalations |
| 4 | [docs/ТЗ_АГЕНТАМ_EN.md](ТЗ_АГЕНТАМ_EN.md) | what is already closed (do not redo), waves W1…W7 with acceptance, general requirements |
| 5 | [docs/ДОРОЖНАЯ_КАРТА_АГЕНТОВ_EN.md](ДОРОЖНАЯ_КАРТА_АГЕНТОВ_EN.md) | the order by risk, the crossing-out journal, the movement rules |
| 6 | [docs/РИТУАЛ_ТАКТА.md](РИТУАЛ_ТАКТА.md) | the 8 release stages — the only way to change the House (RU) |
| 7 | [docs/ПОЛИМАТ_МУЛЬТИАГЕНТ.md](ПОЛИМАТ_МУЛЬТИАГЕНТ.md) | the eight laws of the swarm: the key, directives, append-only, STOP-HORN (RU) |
| 8 | [docs/ВЫВОДЫ_АГЕНТАМ_EN.md](ВЫВОДЫ_АГЕНТАМ_EN.md) | the lessons register of the ЛКГ-1+ПРАВДА-2 wave (error → root → fix → guard): some agents dare not repeat, others gain; read it before your first wave and after every mess |
| 9 | [docs/КРУГ_ВОПРОСОВ_EN.md](КРУГ_ВОПРОСОВ_EN.md) | the frame of service: the common circle of questions — three scales (an individual / communities / the HUMAN as a whole), the circle is open, three directions (understand the existing / discover the possible / create what does not yet exist); the role of the HUMAN in the noosphere |

## The map of truth sources (short)

| Source | What it holds |
|---|---|
| `data/versions.json` | the truth about the House: takt, cache, counters (+dictionary with definitions), the chronicle |
| `data/фонд.json` | the ·02 fond queue (tracks/releases of the channel on the build day) |
| `sw15.js` | `S15_CACHE` (generation), the mandatory core, the laws of updating and acceptance |
| `ИНСТРУМЕНТЫ/цех_правды.py` | the truth generator: faces = the registry (a dry run = «ДРЕЙФ НЕТ») |
| `ИНСТРУМЕНТЫ/test_лица_правды.mjs` | the faces guard (T-071/T-072/T-073) |
| `ИНСТРУМЕНТЫ/test_sw15_приёмка.mjs` | the worker acceptance guard (T-010/T-070, LKG) |
| `KNOWN_ISSUES.md` / `TODO.md` / `PULSE.md` | reds, tails, the pulse |
| `CHANGELOG.md` | the chronicle of takts and latkas (append-only) |
| #62 / #64 (GitHub issues) | the live trackers of bugs and proposals — the waves' seals |

## The КРУ revisions (the history of findings)

The revision of 2026-11-09 lives outside the repo (the owner's package): **V1** (files 00–16 — subject-matter, no network) and **V2** (files 20–28 — live verification, findings F-019…F-024, tests T-070…T-078, road deltas). The findings' statuses are summarized in [docs/ТЗ_АГЕНТАМ_EN.md §0](ТЗ_АГЕНТАМ_EN.md). The wave that the owner hands the КРУ package to puts it into `ДОКУМЕНТЫ/КРУ_2026-11-09/` and places a link here.

## The package update rule

- The package documents are alive: the wave that closed a wave/finding crosses out the map rows and appends the journal in the same push.
- EN mirrors of the package (`*_EN.md`) — the first item of wave W1 (Directive 1 of the swarm). **Done 2026-11-09 by W1:** [ЗАДАНИЕ_АГЕНТАМ_EN.md](../ЗАДАНИЕ_АГЕНТАМ_EN.md), [КАНОН_НАДЗОРА_EN.md](КАНОН_НАДЗОРА_EN.md), [ТЗ_АГЕНТАМ_EN.md](ТЗ_АГЕНТАМ_EN.md), [ДОРОЖНАЯ_КАРТА_АГЕНТОВ_EN.md](ДОРОЖНАЯ_КАРТА_АГЕНТОВ_EN.md), this file's mirror.
- A contradiction of the package with AGENTS.md/the ritual — AGENTS.md/the ritual wins; the contradiction is reported to the owner the same day (silence is forbidden).
