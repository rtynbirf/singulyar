# Public Singulyar source review — 2026-10-14

This is a **read-only source review of GitHub's rendered `main` branch**, not a test run on a pinned checkout.

## Confirmed from the public source

- Repository: https://github.com/rtynbirf/singulyar
- README describes existing ·21 ОБЩЕНИЕ as the meaning-to-representation router and ·22 СВЯЗЬ as the communication channel layer with fallback to text. Source: https://github.com/rtynbirf/singulyar (README section “Что в репозитории”).
- ·21 source page identifies an “Adapter OS v0.2” bridge, imports `bootAdapterOS`, and has an adapter registry including `output.21-брайль` and `tool.21-маршрутизация`. Source: https://github.com/rtynbirf/singulyar/blob/main/%D0%A1%D0%98%D0%9D%D0%93%D0%A3%D0%9B%D0%AF%D0%A0_21_%D0%9E%D0%91%D0%A9%D0%95%D0%9D%D0%98%D0%95.html (rendered lines 3231–3267 at review time).
- ·22 source contains an explicit `S22:CORE-BEGIN`/`S22:CORE-END` block, a channel registry and a fallback graph that terminates in text. It describes a person-selected channel as an override and documents actual transport boundaries. Source: https://github.com/rtynbirf/singulyar/blob/main/%D0%A1%D0%98%D0%9D%D0%93%D0%A3%D0%9B%D0%AF%D0%A0_22_%D0%A1%D0%92%D0%AF%D0%97%D0%AC.html (rendered lines 2853–2927 and 3042–3053 at review time).

## Regression implications

1. Do not register the composer as a new numbered module or replace ·21/·22.
2. Integrate the composition UI behind the existing intent/representation flow, with explicit adapter capability checks.
3. Preserve ·22's deterministic fallback to text and explicit user override; never label a proposal as delivery.
4. Preserve the documented transport/privacy boundaries and test against the actual files before deployment.

## Pinning status

The GitHub `main` branch was inspected through the public web view on 2026-10-14, but the rendered pages did not expose the full commit SHA. A local `git ls-remote https://github.com/rtynbirf/singulyar.git HEAD` failed because this execution environment could not resolve `github.com`. Therefore `main` is a moving reference, **not a reproducible commit pin**. No SHA has been guessed. The original prototype ZIP is separately pinned by its SHA-256 in `docs/13_BASELINE_HASH.txt`.

## Not established

No live source files were modified. No test suite was run against the live repository checkout, no deployment was performed, and no GitHub Pages regression is claimed. The Chromium browser-flow tests in this package test this package's UI code, not the live ·21/·22 pages.
