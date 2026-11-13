# WAVE W3 REAR «EXTERNAL ACTIONS» — reconnaissance and landing map

> **Status:** ✅ Launch field ready · **Recon:** 2026-11-14 · **Base:** `rumu` = `b5a792c5c8cf` (CI rear patch)
> This dossier does not close the W3 line — the wave itself closes it per [ДОРОЖНАЯ_КАРТА_АГЕНТОВ.md](ДОРОЖНАЯ_КАРТА_АГЕНТОВ.md).
> The dossier gives the wave everything at hand: verbatim TZ, house basis, landing map, base measurements, world practices, open questions and the DoD checklist.

---

## 1. Verbatim TZ (docs/ТЗ_АГЕНТАМ_EN.md — source of truth)

> **Wave W3 — «External actions» (Phase 2: ·47 Device Flow, ·48 providers, ·54 invite/TTL/revoke, ·42 PIN)**
>
> **Task.** Unified states of external actions + capability badges; F-012 statuses distributed to ·33/·49; `ГОТОВНОСТЬ.manifest` → a live status registry (F-011), linked with ·55 «Single Window» and door cards.
>
> **Acceptance.** Every external action has a state and a journal; revocation of a right is visible to the human immediately.

---

## 2. Launch field (recon measurement 2026-11-14)

| What | Fact |
|---|---|
| HEAD `rumu` | `b5a792c5c8cf` — «CI rear patch…» (rasterizer to v245, pages.yml build→deploy split), 2026-11-13T18:24:19Z |
| CI on HEAD | Push on rumu 🟢 · House oracles 🟢 · Takt-gate 🟢 (test_цех_правды 3/3) · Deploy Pages 🟢 · OpenSSF Scorecard 🟢 |
| cell-swarm pin | `b5a792c5c8cf` = HEAD — synchronized; no red «ПИН УСТАРЕЛ» (the bees caught up on their own move) |
| Wave map | W1 ✅ · W2 ✅ (2026-11-13, latches ×5, evenings live) · W6 ✅ (issue #68) · **W3 ⬜ — next in order** |
| Worker | `S15_CACHE = s15-orkestrator-v245` · `S15_CORE` = **186 entries** |
| Media in core | same 2 mp3 exceptions (`./minus/prosto-lubi.mp3` chassis, `./звуки/тон-тест.mp3` tone test) + `wllama.wasm` (Malysz's brain — not media); the «media out of precache» law holds |
| Counters dictionary | **14 definitions** (8 base + 6 from W2: `готовность_ядра`, `готовность_песен`, `готовность_моделей`, `готовность_p2p`, `аудио_в_хранилище`, `песня_недоступна`) — new W3 states enter only here |
| KRU files 20–28 | not in the repo (the revision came as a package); Phase 2 is known verbatim from TZ §3 — the wave creates its own guards (TZ §8.3 rule) |

---

## 3. Basis already standing in the house (do not rebuild)

### 3.1 · W3 door map (door number ≠ file number — «one fact — one place»)

| Door | File | What lives today (measured) | What W3 must add |
|---|---|---|---|
| ·47 HOUSE INSTRUCTION | `ИНСТРУКЦИЯ_ДОМА.html` | human's GitHub authorization instruction: `https://github.com/login/device`, code from chat → Continue → Authorize | authorization states (code issued/waiting/accepted/expired) and a journal on the face |
| ·48 SCREEN PROTOCOL | `ПРОТОКОЛ_ВЫВОДА_НА_ЭКРАН.html` | file output scheme: К1 GitHub Pages (AUTH Device Flow → PUSH → VERIFY 200, `VERIFIED` badge), К2 Release assets, К3 filebin (~7 days), К4 attachment; AUTH section with Device Flow (curl `login/device/code`); rule «no token harvesting via own forms — official Device Flow only»; fallback «no network → honest UNKNOWN» | unified К1–К4 states + capability badges read from the registry, not from scheme text |
| ·49 SUPPORT | `ДОКУМЕНТЫ/ПОДДЕРЖАТЬ.html` | support tiers — «configuration of the future, not a working till»; promise of an honest provider; mirror of `ДОКУМЕНТЫ/SUSTAINABILITY/funding.json` with a layer test | provider statuses (F-012): «rails not connected» is a legal registry state |
| ·33 FUND | `СИНГУЛЯР_33_ФОНД.html` | the open chain counter polls external explorer nodes: blockcypher, blockchain.info, blockstream, mempool.space (+ a «my-node» stub) | an «external providers» card with live node states (alive/failed) and a poll journal |
| ·42 SPEAKER | `СИНГУЛЯР_39_КОЛОНКА.html` | Policy Engine: `policy_rules.json` (risk table), medium/high → button confirmation, **critical → PIN modal** «Critical step: confirmation»; badges as UI element | honest PIN mechanics (hash verification, attempt back-off), tool capability badges from the registry |
| ·54 FEAST | `СИНГУЛЯР_54_ПИР.html` + `js/pir-core.js` | network room (trystero-nostr) + **deaf mode**: invite = self-describing JSON (type+sdp), codes by hand | **no TTL/revocation in pir-core invites** (measured: TTL 0, revocation 0, expire 0 in the pir-core/0.1 canon) — W3's main gap |
| ·55 SINGLE WINDOW | `СИНГУЛЯР_43_ЕДИНОЕ_ОКНО_КОММУНИКАЦИИ.html` | additive routing layer over ·18–·26 (thread s55), guard `test_nit_s55_mosty.mjs` | link with the live status registry + door cards |
| (manifest) | `ГОТОВНОСТЬ.manifest.json` | static production_ready manifest (v1.60.0) — a seal, not a registry | F-011: a live status registry readable by faces |

### 3.2 · The ready live-registry pattern — sg-registry

`js/sg-registry.js` already holds the law «truth is re-read»: `data/versions.json` and `data/дислокация.json` are read live with a cache-buster (5 min, fallback — precache). The W3 live status registry uses the same technique — no new mechanisms.

### 3.3 · Counters dictionary (F-020, T-073)

`data/versions.json → счётчики.словарь` — 14 definitions; after W2 the audio counter comes from `__ОПФС.список()`, readiness — from the worker acceptance. All new W3 states enter here with a definition — a hand-written number on a face = red CI.

### 3.4 · The house canon for external actions (already in laws)

- И-01 (zero network at import; network — by explicit action) and ЩИТ_ЧЕЛОВЕКА: external requests only by the owner's explicit word;
- tokens never enter the repo or files (AGENTS.md «Never»); a token exposed in a chat is subject to revocation;
- ЧЕЛОВЕК = ACCOUNT = PID 1 — the single source of will; an agent/device is not the master.

---

## 4. W3 landing map (reconnaissance proposal — the wave decides)

1. **External action states dictionary** — one canon: `not ready / ready / alive / denied / expired / revoked` (names finalized by the wave). Each — in `счётчики.словарь` with a definition (T-073).
2. **External action journal** — an append-only journal on the human's device (kv/stash keys, no telemetry): *when · what · where (provider/node) · state · by what revoked*. The «journal» definition follows world practice: records of consequential actions from which a human reconstructs «what happened, who initiated, what was affected» (§5, saasframe).
3. **Capability badges** — a badge = a capability (what is allowed, where, whether revoked), reads state from the registry, not by hand: ·48 К1–К4, ·42 Policy Engine tools, ·53 contour, ·54 invites.
4. **·54 invite/TTL/revoke** — the pir-core invite canon: a lifetime is embedded into the JSON code at issue (fields «issued»/«expires»); code acceptance checks the receiver's clock; revocation — a local revocation list at the issuer; the receiver in deaf mode sees an honest window, not a promise. The guard must prove: an expired code is rejected, a revoked one is rejected.
5. **·42 PIN** — verification without plaintext (SubtleCrypto/PBKDF2), attempt limits with an honest local back-off (no self-lockout), revocation of a confirmation visible in the journal and by badge immediately.
6. **F-012 statuses → ·33/·49** — an «external providers» card: ·33 chain nodes (alive/failed/delayed) and the ·49 till (legal «rails not connected») read from the status registry; a node failure is explainable in UI (W2 SONG_UNAVAILABLE continuity).
7. **ГОТОВНОСТЬ.manifest → live status registry (F-011)** — productions move into `data/статусы.json` (name finalized by the wave), sg-registry re-reads; door cards and ·55 read from there; `ГОТОВНОСТЬ.manifest.json` remains an archival seal or is retired — decided with the truth shop (open question №4).
8. **·47/·48 Device Flow — states** — faces show honest authorization states (code issued / waiting / accepted / expired / revoked) and a journal; intervals and lifetimes follow RFC 8628 (code ~15 min, polling from 5 s); the house does not spawn an OAuth server: it only displays and journals honestly.
9. **Wave guard** — `ИНСТРУМЕНТЫ/test_внешние_действия.mjs` (name finalized by the wave): the journal is append-only and never rewritten; expired/revoked is rejected; badges come from the registry; the counters dictionary is complete; CSP untouched; `node --check` of all edited JS.
10. **sw15.js** — if the wave adds precache assets: bump `S15_CACHE` v245→v246; no media or models; otherwise the worker is untouched (the W2-rear docs-move precedent).

---

## 5. World practices 2025–2026 (research-first, sources open)

| Practice | Source | How it lands in W3 |
|---|---|---|
| Device Authorization Grant — the flow canon (device_code/user_code, interval, lifetime) | RFC 8628 — https://www.rfc-editor.org/info/rfc8628 · https://oauth.net/2/grant-types/device-code | ·47/·48 authorization states follow the flow canon |
| Cross-device flow threats and mitigations (2025) | draft-ietf-oauth-cross-device-security-10 — https://datatracker.ietf.org/doc/html/draft-ietf-oauth-cross-device-security-10 | The house case «code from chat → entered at github.com/login/device» is exactly cross-device; a badge separates «code entered» from «right granted» |
| Phishing resistance: the code is entered only on a trusted domain | WorkOS (2025-05) — https://workos.com/blog/oauth-device-authorization-grant | The ·47 instruction keeps «enter only at github.com/login/device» |
| GitHub lifetimes: user code ~15 min, expiring tokens 8 h / refresh 6 mo | docs.github.com — https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps · dev.to (2025-05) — https://dev.to/ddebajyati/integrate-github-login-with-oauth-device-flow-in-your-js-cli-28fk | State TTLs and the honest «expired» text in the journal |
| Capability = «an unforgeable token granting the right to operate on a resource» | Wikipedia — https://en.wikipedia.org/wiki/Capability-based_security · OneUptime (2026-01) — https://oneuptime.com/blog/post/2026-01-30-capability-based-security/view | The house's capability-badge definition: a badge shows a right, not a «ticked box» |
| Least privilege: request the minimum scopes | Google consent guide (2026-09) — https://developers.google.com/workspace/guides/configure-oauth-consent · Obsidian Security (2026-02) — https://www.obsidiansecurity.com/blog/oauth-scopes-permissions-security-best-practices | ·48 channel badges = minimal rights per channel |
| Revocation ≠ expiration; revocation is an operation visible to the human | Curity (2025-03) — https://curity.io/resources/learn/oauth-revoke · Duende (2026-02) — https://duendesoftware.com/learn/best-practices-managing-token-expiration-refresh-revocation-in-web-apis · Okta — https://developer.okta.com/docs/concepts/token-lifecycles | The W3 acceptance «revocation visible immediately» — `revoked` as a separate fact |
| Journal = records of consequential actions | SaaS patterns — https://www.saasframe.io/patterns/audit-log | The house's external-action journal format (§4 p.2) |
| Tokens in localStorage are unsafe (XSS); primitives — Web Crypto | MDN — https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API · thesecurityvault.com/auth-token-in-localstorage | PIN/secrets — hash verification, no plaintext, no localStorage life |
| Attempt limiting: exponential back-off without self-DoS | Zuplo (2025-03) — https://zuplo.com/learning-center/token-expiry-best-practices · Port — https://docs.port.io/api-reference/rate-limits/rate-limit-best-practices | ·42 PIN back-off — local and honest |
| Offline-first honest states: continue without network and say so | Titan Web Studios (2026-08) — https://titanwebstudios.com/blog-details.php?slug=offline-first-web-app-design-9-proven-patterns · CodeAtlas — https://ui.codeatlas.com.br/atlas/offline-first-ui | Registry states work offline: last known state + an honest measurement date |

---

## 6. Open questions of wave W3 (solved inside the wave)

1. **TZ numbering vs the house map.** «·47 Device Flow» — Device Flow lives both in ·47 (the human instruction) and in ·48 (channels К1/К2); «providers» are the ·48 output channels and the ·49 till. The wave records the note in its report and does not move door bytes (З.5: do not touch others' moves).
2. **«Revocation visible immediately» on static without a server.** Revocation is a local revocation list at the right holder; a receiver without network learns of it later. The face wording must separate «capability» from «connection» — W2 continuity (`P2P_READY` ≠ a connection).
3. **Where the journal lives.** localStorage vs OPFS vs both; retention; export/import; zero outbound telemetry (house law). Recon recommendation: append-only in kv with a cap and an honest export — the wave decides.
4. **`ГОТОВНОСТЬ.manifest.json` — seal or source.** F-011 demands a «live» registry; moving into `data/статусы.json` changes the v1.60.0 face — a truth-shop pass is mandatory within the wave.
5. **·42 PIN mechanics.** Opened by the wave; if PIN verifies plaintext or without attempt limits — the latch is inside the wave, no separate road.
6. **Deaf-mode clocks.** TTL is checked against the receiver's clock; without network, clock drift makes the window imprecise — an honest UI caveat (the sample — the content-length caveats of the ·38 cache table).

---

## 7. DoD checklist (TZ §9) — before the wave journal

- [ ] Oracles green (CI + locally per files); `node --check` of all edited JS.
- [ ] Truth shop: «ДРЕЙФ НЕТ»; counters and badges — from the registry, zero hand-written numbers on faces.
- [ ] Every external action has a state and a journal (TZ §3 acceptance): ·47/·48 authorization, ·48 К1–К4, ·33 nodes, ·49 till, ·42 PIN, ·54 invites.
- [ ] Revocation of a right is visible to the human immediately (TZ §3 acceptance): `revoked` — a separate fact of journal and badge.
- [ ] TTL: an expired invite is rejected; a revoked one is rejected (guard).
- [ ] Live verification ЭП-06 with a checklist and screenshots (branches: issued/expired/revoked + external node failure).
- [ ] Летопись/CHANGELOG/ДОРОЖНАЯ_КАРТА_АГЕНТОВ appended; the W3 line closed by the wave.
- [ ] EN mirrors of key documents — in the same wave (Directive 1 of the swarm).
- [ ] Clean-trace checklist ([КАНОН_НАДЗОРА.md §4](КАНОН_НАДЗОРА.md)) closed.
- [ ] `sw15.js` edit = `S15_CACHE` bump; mandatory failure = rejection; LKG not wiped; skipWaiting only by `S15_ВХОД_В_ТАКТ`.
