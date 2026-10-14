# Срез публичного Singulyar на 2026-10-14

Источники просмотрены в браузере: live hub, GitHub README, `docs/СИНТЕЗ.md`, `docs/ТЗ.md`, `docs/ДОРОЖНАЯ_КАРТА.md`, `СИНГУЛЯР_21_ОБЩЕНИЕ.html`, `СИНГУЛЯР_22_СВЯЗЬ.html`.

- Hub: https://rtynbirf.github.io/singulyar/
- Repository: https://github.com/rtynbirf/singulyar
- README: https://github.com/rtynbirf/singulyar/blob/main/README.md
- Synthesis: https://github.com/rtynbirf/singulyar/blob/main/docs/%D0%A1%D0%98%D0%9D%D0%A2%D0%95%D0%97.md
- Specification: https://github.com/rtynbirf/singulyar/blob/main/docs/%D0%A2%D0%97.md
- Roadmap: https://github.com/rtynbirf/singulyar/blob/main/docs/%D0%94%D0%9E%D0%A0%D0%9E%D0%96%D0%9D%D0%90%D0%AF_%D0%9A%D0%90%D0%A0%D0%A2%D0%90.md
- ·21 ОБЩЕНИЕ: https://github.com/rtynbirf/singulyar/blob/main/%D0%A1%D0%98%D0%9D%D0%93%D0%A3%D0%9B%D0%AF%D0%A0_21_%D0%9E%D0%91%D0%A9%D0%95%D0%9D%D0%98%D0%95.html
- ·22 СВЯЗЬ: https://github.com/rtynbirf/singulyar/blob/main/%D0%A1%D0%98%D0%9D%D0%93%D0%A3%D0%9B%D0%AF%D0%A0_22_%D0%A1%D0%92%D0%AF%D0%97%D0%AC.html

## Прямо подтверждённые архитектурные факты

1. Hub already has an intent field (“одно намерение — своими словами”) and Ariadne navigation. Therefore the prototype must not invent a competing second hub entry point; it should become a capability-aware composition layer behind the existing intent route.
2. The current hub lists 43 doors and includes ·41 НАМЕРЕНИЕ, ·42 КОЛОНКА, ·53 СВЯЗЬ ЧЕЛОВЕКА, ·54 ПИР, as well as ·15 ОРКЕСТРАТОР, ·17 ЗАЛ, ·18 СОБЫТИЕ, ·19 ЧЕЛОВЕК, ·20 ФОНЕТИКА, ·21 ОБЩЕНИЕ, ·22 СВЯЗЬ, ·23 КРУГ, ·24 ПОЧТА, ·25 КОШЕЛЁК, ·26 ЛИНИЯ, ·29 СВОБОДА, ·30 ТКАНЬ, and ·02 ФАБРИКА.
3. `·21 ОБЩЕНИЕ` already has a semantic principle: meaning is kept, representation adapts to recipient preferences/capabilities. Its declared modalities include text, speech, Braille, AAC symbols, manual sign adapter contract, and haptic signal. Its code documents that the Braille display is Unicode characters, not a physical refreshable Braille device; actual tactile/vibration support must not be overstated.
4. `·21 ОБЩЕНИЕ` has a BroadcastChannel bridge to `·22 СВЯЗЬ` under channel name `singular-most-21-22-v1`; its documented reach is open tabs in one browser, not persistent cross-device delivery. It also imports Adapter OS and Crystal modules on a best-effort basis.
5. `·22 СВЯЗЬ` declares nine channel types: text, file, captions, voice message, TTS, audio call, video call, screen, and shared singing. It has a fallback graph that ends in text, and states that human choice overrides automation.
6. The live repo README and live hub show a newer state than `docs/СИНТЕЗ.md`: live hub describes v11.32 “ПИР”; README snippet reports v11.33 “ГЕРМЕТИЧНО”; synthesis doc reports v10.61 “РУЧКИ” updated 2026-10-11. This is a documentation consistency defect. Truth should be derived from the repository’s canonical version manifest (`data/versions.json`) and actual loaded files, not old prose.
7. `·29 СВОБОДА` is described by README as a live UI over Composition Engine: intention → primitives → proposal → human decision, and `·30 ТКАНЬ` as P2P Human Information Fabric with MEANING ≠ TRANSPORT. The proposed architecture should compose with these, not duplicate their role.
8. Current repository already has the 43-door count. **Do not register this prototype as a new `·43` door.** The old filename `legacy-proposal-43.html` is preserved only as an earlier artifact, not a proposed door number.

## Evidence boundary

This is a public web-source inspection of the current hub, README and relevant files, not a complete local checkout, execution, or audit of every repository file. The integration patch must still be validated against a pinned commit, actual `data/versions.json`, `singulyar-modules.js`, current adapters, and regression tests. The earlier attempt to clone GitHub from the execution container failed because that container had no DNS/network access; browser-based inspection did work.
