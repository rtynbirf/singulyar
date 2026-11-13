# WAVE W3 «EXTERNAL ACTIONS» — wave breakdown (TZ §3)

> **Status:** ✅ Wave delivered · **Date:** 2026-11-14 · **Base:** `rumu` = `5683414e` (W3 тыл) → new cache generation `v246`
> The W3 roadmap row is closed by this wave per [ДОРОЖНАЯ_КАРТА_АГЕНТОВ.md](ДОРОЖНАЯ_КАРТА_АГЕНТОВ.md). The verbatim TZ §3 and the ×10 landing map live in [W3_ТЫЛ_ВНЕШНИЕ_ДЕЙСТВИЯ.md](W3_ТЫЛ_ВНЕШНИЕ_ДЕЙСТВИЯ.md) (the colleagues' launch field was adopted by the wave in full).
> RU source: [W3_ВНЕШНИЕ_ДЕЙСТВИЯ_РАЗБОР.md](W3_ВНЕШНИЕ_ДЕЙСТВИЯ_РАЗБОР.md) (Swarm Directive 1: EN mirrors).

## 1. TZ §3 acceptance — delivered line by line

**TZ: «Every external action has a state and a journal; a right revoked is visible to the human immediately.»**

| TZ line | Closed by | Guard |
|---|---|---|
| Unified states of external actions | canon of six states (`не готово/готово/живое/отказано/истекло/отозвано` = not ready / ready / live / denied / expired / revoked) — defined in `счётчики.словарь` (T-073, keys `внешнее_*`), canon names in `data/статусы.json.состояния`; the core holds the same canon (`ВД.СОСТОЯНИЯ`) | guard tests 1, 3 |
| Capability badges | badge = «right + place + state», reads the live registry (`SG_СТАТУСЫ`), overridden by the device fact (journal) — zero hand-written numbers on faces | guard test 3 |
| Journal | append-only journal on the human's device (kv, not telemetry) with a chain seal (FNV-1a — a local order-integrity seal, honestly named, not a signature; the house holds node-passport/0.1 for signatures) and an explicit-hand export; ceiling of the latest 400 records | guard test 3 (journal tampering is caught) |
| Statuses F-012 → ·33/·49 | «external providers» card on ·33 (node liveness is a recon fact in the journal; the blockchain.info CSP gap is named openly in the registry) and the ·49 till («rails not connected» is a legal state read from the registry) | guard test 6 |
| `ГОТОВНОСТЬ.manifest` → live registry (F-011) | created `data/статусы.json` (schema `статусы-внешних-действий/v0.1`, 13 actions × 7 doors); sg-registry re-reads it every 5 minutes with a cache-buster (the «truth is re-read» law); `ГОТОВНОСТЬ.manifest.json` stays an archival seal — demolition remains a decision of the truth-shop/owner (тыл open question #4, resolved honestly, not silently) | guard tests 2, 8 |
| Link with ·55 | external-actions panel on the ·55 face (registry + journal) | guard test 6 |
| Revocation visible immediately | ·54: revocation lives with the holder (revocation list in the core), the badge flips immediately, the journal writes «invitation revoked», completing a handshake with a revoked id refuses honestly; a peer without network learns at the next check — the static border is named on the face | guard tests 3, 6 |

## 2. Landing map ×10 — execution

1. **States dictionary** — 6 definitions in versions.json (above).
2. **External actions journal** — core `js/внешние-действия.js` (`внешние-действия/0.1`, ES2019, injectable deps per the opfs-core/0.1 canon): `журнал.добавить/список/печатиСходятся/экспорт`; record fields *when · door · action · target · state · note · seal* (the consequential-actions format per the landing map).
3. **Capability badges** — `ВД.бейдж.для(ид)`: registry state as base, device fact overrides; an honest source on every panel row (`title`).
4. **·54 invite/TTL/revoke** — `pir-core/0.1 → 0.2`: the lifetime is baked into the code at issuance (`ид/выдан/истекает`, default 30 minutes, `срокМс` overrides); acceptance checks the recipient's clock (expired — an honest refusal noting possible clock drift, RFC 8628 canon); the answer echoes the id (a foreign answer is heard); `идПоследнегоПриглашения()` gives the holder the id for journal and revocation. Rooms and appId `singulyar-pir-0.1` untouched — backward compatible.
5. **·42 PIN** — core `js/pin-core.js` (`пин-ядро/0.1`): PBKDF2-SHA256 310,000 iterations (SubtleCrypto, 16-byte salt), verification without plaintext (plaintext in storage is a taboo — the guard catches it), attempt back-off 30 s × 2^k with a 15-minute ceiling (no self-lockout); face ·39 moved from «any 4-digit is accepted» to the honest mechanics: the first confirmation sets the PIN, further confirmations verify it; status line `#статусПин`.
6. **Statuses F-012 → ·33/·49** — panels on both faces; ·33 writes the recon fact into the journal (`ВД.опр`: live node + the silent ones on the way).
7. **Live registry (F-011)** — `data/статусы.json` + sg-registry (`SG_СТАТУСЫ` + the `sg-статусы-готов` event, candidates going up the subfolder ladder).
8. **·47/·48 Device Flow — states** — panels on both faces; the house does not spawn an OAuth server: ·47 instructions keep «enter the code only on github.com/login/device», the registry holds «not ready» + the RFC 8628 canon; the journal catches device facts.
9. **Wave guard** — `ИНСТРУМЕНТЫ/test_внешние_действия.mjs`, 8 tests: dictionary; registry (the «every action has a state and a measurement» acceptance + door coverage + unique ids); ВД core (append-only, seals, tamper caught, badge merge, revocation); pir-core/0.2 (TTL unit + source); pin core (PBKDF2, back-off, ceiling); faces (×7 threads); worker (v246 ≡ registry, wave assets in the precache, the same 2 mp3 exceptions, zero new media); sg-registry + node --check.
10. **sw15.js** — bump `S15_CACHE` v245→v246 per the update law; precache +7 light assets (2 cores, the status registry, 4 wave docs — the new-assets law, the W1/W2 pattern); media and models stay out of the precache — the same 2 mp3 exceptions.

## 3. Wave faces

| Face | What landed |
|---|---|
| ·47 ИНСТРУКЦИЯ ДОМА | states/journal panel (door ·47) |
| ·48 ПРОТОКОЛ ВЫВОДА | K1–K4 panel from the registry; the static VERIFIED schema lines remain a record of the living verification (colleagues' bytes untouched, live badges alongside) |
| ·33 ФОНД | «external providers» panel + the recon journal (live node / silent on the way / all denied) |
| ·39 КОЛОНКА (·42) | honest PIN mechanics (pin core) + the critical-step journal + panel |
| ·49 ПОДДЕРЖАТЬ | till-status panel from the registry (F-012) |
| ·54 ПИР | TTL notice on the face; the issuance journal; revocation (panel button, completing with a revoked id refuses); pir-core/0.2 canon in the footer |
| ·55 ЕДИНОЕ ОКНО | link panel (registry + journal) |

## 4. World practices (research-first, open sources)

Base — the 11 тыл §5 rows (RFC 8628, cross-device draft, capability-based security, revocation ≠ expiry, audit log, Web Crypto, attempt back-off, offline-first). The wave added:

| Practice | Source | How it landed |
|---|---|---|
| PBKDF2 iterations 2025 | dev.to, Why 310000+ iterations with PBKDF2 (2025-10) — https://dev.to/securebitchat/why-you-should-use-310000-iterations-with-pbkdf2-in-2025-3o1e · Wikipedia PBKDF2 — https://en.wikipedia.org/wiki/PBKDF2 | 310,000 iterations in the pin core; an honest note about the small 4-digit PIN space |
| Append-only + hashing + verification | Mattermost, 18 Tips to Implement Tamper-Proof Audit Logs (2026-02) — https://mattermost.com/blog/compliance-by-design-18-tips-to-implement-tamper-proof-audit-logs | append-only journal + chain-seal recomputation on every panel |
| Hash chain vs signature | NousResearch/hermes-agent #486, Cryptographic Audit Trail (2026-03) — https://github.com/NousResearch/hermes-agent/issues/487 | the chain seal holds order integrity; signatures (who) belong to node-passport/0.1 — named honestly |
| TTL and revocation ≠ expiry | Duende (2026-02) — https://duendesoftware.com/learn/best-practices-managing-token-expiration-refresh-revocation-in-web-apis · Auth0 Token Best Practices — https://auth0.com/docs/secure/tokens/token-best-practices | «expired» and «revoked» are two separate canon states |

## 5. Open questions (resolved honestly, not silently)

1. **`ГОТОВНОСТЬ.manifest.json` — seal or source** — stays the seal; the live registry was built alongside (`data/статусы.json`); demolition is the owner's/truth-shop's word.
2. **Revocation for the peer** — visible to the holder immediately; a peer without network learns at the next check — the border is named on face ·54 (the P2P_READY ≠ connection continuity).
3. **blockchain.info in CSP** — the node is in the ·33 auto-order, but `connect-src` blocks it: recon shows an honest refusal, the registry keeps the gap open; a CSP patch is the owner's word.
4. **Deaf-mode clocks** — the TTL is checked by the recipient's clock; the clock-drift caveat is baked into the pir-core refusal.
5. **Living verification ЭП-06 (screenshots of issued/expired/revoked branches + a node refusal)** — belongs to the releasing wave/agent (the W2 precedent); the guard holds the canon of bytes.

## 6. DoD (TZ §9) — line by line

- [x] Oracles green locally on the full tree: **54 JS + 13 Python, 0 red**; `node --check` of the edited JS clean (guard test 8).
- [x] Truth shop: «ДРЕЙФ НЕТ» (the ·31 APP window, ×34 badges, the hub meta sng-build — on v246, idempotent).
- [x] Every external action has a state and a journal — guard tests 2, 3, 6.
- [x] A right revoked is visible to the human immediately — guard test 3 (the holder's badge flips immediately).
- [x] TTL: an expired invitation is refused; a revoked one is refused (guard tests 4, 3).
- [ ] Living verification ЭП-06 with a checklist and screenshots — belongs to the releasing wave (open question 5).
- [x] Chronicle/CHANGELOG/ДОРОЖНАЯ_КАРТА_АГЕНТОВ appended; the W3 row closed by the wave.
- [x] EN mirrors of the key documents — by this wave (breakdown ×2, synthesis ×2).
- [x] `sw15.js` edit = bump `S15_CACHE` v246; media outside the precache; LKG untouched; skipWaiting by `S15_ВХОД_В_ТАКТ`.
