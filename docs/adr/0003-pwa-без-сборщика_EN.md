# ADR-0003: PWA without a bundler and without dependencies

**Status:** ✅ Accepted (2026-10) · **Updated:** 2026-10-11

## Context

The House promises: download it — open it — sing; it works offline; one file = the whole platform (the tracks) and a light hub for the House. The world offers bundlers (Vite/webpack) and frameworks — but every build step grows the surface of failure and tears the source away from the artefact.

## Decision

Zero build: the sources = the artefact. The service worker `sw15.js` keeps the pre-cache of the core by hand, with the generation `s15-orkestrator-vNN`; the PWA manifest + the icons are our own; the heavy brains (Qwen2.5-0.5B) live on a foreign CDN at the `singulyar-llm` repo with a protected cache (`singular-llm-parts-v1`), not in the bundle. The local tests are `node --test` over `ИНСТРУМЕНТЫ/`, without CI dependencies.

## Consequences

- ✅ The source can be read like a book — it IS the site.
- ✅ Offline from the first visit; the cache generation guarantees freshness (the scar «the edit doesn't work» is closed by the tact canon).
- ⚠️ The pre-cache discipline rests on the human/agent, not on a bundler: the tact checklist is mandatory.
- ⚠️ A dependency update (wllama, transformers.js) — a separate tact line with a test.
- ⚠️ Files >10 MB (the tracks) are excluded from the pre-cache — they are cached lazily on navigation.

> Semantic translation of [0003-pwa-без-сборщика.md](0003-pwa-без-сборщика.md) — sense over letters (law of the 200-language track: «carry the meaning»).
