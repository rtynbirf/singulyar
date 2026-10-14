# WEB TOOLKIT — the three hands of the SINGULAR home agent

> **Status:** ✅ Live-verified · **Tact:** v11.24 «МНОГОУЧЕНЫЙ» · **Updated:** 2026-10-14
> Semantic translation of [ИНСТРУМЕНТАРИЙ_ВЭБ.md](ИНСТРУМЕНТАРИЙ_ВЭБ.md) — sense over letters. The owner's input: «**ВЭБ=ИНТЕРНЕТ+ПЕСОЧНИЦА+ПАЙТОН=ТВОИ ИНСТРУМЕНТЫ**» — "WEB = INTERNET + SANDBOX + PYTHON = YOUR TOOLS". Live verification: [ИНСТРУМЕНТЫ/поверка_инструментария.py](../ИНСТРУМЕНТЫ/поверка_инструментария.py), 8/8 probes green (2026-10-14). See also: [ПОЛИМАТ_ПРОТОКОЛ](ПОЛИМАТ_ПРОТОКОЛ_EN.md) — the method; [ЛУЧШИЕ_ПРАКТИКИ](ЛУЧШИЕ_ПРАКТИКИ_EN.md) — the advisors.

## Decoding the owner's formula

The owner folded three words into one formula: **WEB is not "web pages" — it is the agent's three instruments**. INTERNET — eyes and ears (access to the world's knowledge); SANDBOX — the ground underfoot (a local environment where everything can be tested); PYTHON — the language joining hands to head (pipelines, patchers, probes). The formula is honest: lacking any of the three hands, the polymath is blind, paralyzed or mute.

## The three instruments

| Instrument | What it is | What it does | Laws |
|---|---|---|---|
| **INTERNET** | HTTPS eyes: GitHub API (dossier, Git Data API pusher), raw.githubusercontent (push verification), page reading/search (world verification) | tact dossier; blob push; fact-checking; anti-hallucination | no paid services (law I-13 "OWN MECHANISM"); the key lives only in `.git/config`, exactly one; web sessions for pushing are forbidden (the risk engine reverts); any fact from the net is either verified or marked "UNVERIFIED" |
| **SANDBOX** | local ground: bash, git, node, `http.server` stands, filesystem, disk headroom | stands and probes; patchers; byte checks; the pre-tact dossier | patchers are idempotent (a second run breaks nothing, guard markers); STOP-HORN on every gate; colleagues' bytes untouched; everything lives under `/home/z/my-project/` |
| **PYTHON** | pipeline language: patchers, Git Data API pusher, counters, `test_*.py` suites | tact assembly; JSON registries; tool verification; corpus pipelines | scripts live as files (not heredocs — edit, don't recreate); stdlib before dependencies; tokens are never printed; honest Russian refusals |

## Live verification — 2026-10-14, 8/8 green

The verifying tool: [ИНСТРУМЕНТЫ/поверка_инструментария.py](../ИНСТРУМЕНТЫ/поверка_инструментария.py) — stdlib-only, zero secrets, idempotent; exit code 0 = all hands alive, 1 = STOP-HORN for the tact. The actual run of this tact:

```text
PYTHON — the pipeline language:
  [OK  ] interpreter: Python 3.12.15 (CPython)
  [OK  ] stdlib json+hashlib+pathlib: json reads registries, sha256 gives 54cbb3d90eb12b50…
SANDBOX — the local ground:
  [OK  ] git: git version 2.47.3
  [OK  ] node: v24.21.0
  [OK  ] bash: alive
  [OK  ] ground and write access: cwd singulyar: 7.6 GB free, write/delete passed
INTERNET — HTTPS eyes (public endpoints only, no key):
  [OK  ] HTTPS round trip to GitHub API: 110 ms; HTTP 403 — the network is alive,
         the server answered a refusal over the public quota (the home's key heals it)
  [OK  ] the home's raw (README.md): HTTP 200 in 392 ms, first 2048 B read
VERDICT: 8/8 probes green — ALL INSTRUMENTS ALIVE
```

A note on the 403: the shared public quota of api.github.com is exhausted for shared addresses — **this is not a dead internet**: the server's response itself proves the network is alive (DNS+TLS+HTTP round trip done in 110 ms). Authorized calls with the home's key pass (the tact dossier: GET /user → HTTP 200). raw.githubusercontent is not quota-throttled — push verification runs over it.

## Traps already caught by verification (don't catch twice)

- **No Cyrillic in HTTP headers**: `User-Agent: сингуляр-поверка` drops the request (`latin-1 codec can't encode`) — headers are ASCII only (`singulyar-poverka/0.1`). Verification caught it live, Oct 14 2026.
- **Tell "network dead" from "server refused"**: a timeout/DNS failure means the instrument is dead (STOP-HORN); HTTP 403/429 means the network is alive and the quota is spent (an honest note; the cure is the key or waiting). Mixing these up gives either false alarms or blindness.

## How to extend the verification

A new instrument (a new language, a new access, a new stand) receives a probe in `поверка_инструментария.py`: a name, an honest fact, a refusal in Russian. Without a probe in the verification the instrument "does not exist" for a tact. A dead probe — STOP-HORN: the tact does not begin until the hand is healed.

## See also

[ПОЛИМАТ_ПРОТОКОЛ](ПОЛИМАТ_ПРОТОКОЛ_EN.md) · [ЛУЧШИЕ_ПРАКТИКИ](ЛУЧШИЕ_ПРАКТИКИ_EN.md) · [РИТУАЛ_ТАКТА.md](РИТУАЛ_ТАКТА_EN.md) · [../AGENTS.md](../AGENTS_EN.md)
