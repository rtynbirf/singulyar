# 03 · МАТРИЦА ФУНКЦИОНАЛЬНОСТИ (FEATURE MATRIX)

Классификация возможностей по приоритетам:
- **M (MVP / Must Have):** Базовый функционал первого релиза.
- **S (Should Have):** Расширенный функционал второго этапа.
- **C (Could Have):** Экспериментальные возможности.
- **X (Out of Scope):** Запрещенные/ограниченные регулятором действия.

---

| Категория | Функция | Статус | Примечание / Ограничение |
|---|---|---|---|
| **Акустика** | 360° Omnidirectional Sound | **M** | Акустический конус 45° |
| **Акустика** | Hardware AEC / Beamforming | **M** | XMOS XU316 DSP |
| **Акустика** | Multiroom Audio Sync | **S** | Snapcast / AirPlay 2 |
| **Голос** | Local Wake-Word | **M** | «Эй, Омни», задержка <200мс |
| **Голос** | Offline ASR & TTS | **M** | Faster-Whisper + Piper |
| **ИИ-Агент** | Local Intent Router | **M** | SLM 1.5B на NPU |
| **ИИ-Агент** | ReAct / DAG Planner | **M** | Валидация через Policy Engine |
| **ИИ-Агент** | Hash-Chain Audit Log | **M** | SHA-256 цепочка блоков |
| **Умный дом** | Matter 1.6 Controller | **M** | Включая HEMS и EVSE профили |
| **Умный дом** | Thread Border Router | **M** | nRF52840 RCP |
| **Сенсоры** | mmWave Fall Detection | **S** | Алгоритм верификации 20 сек |
| **Приватность** | Physical Mic Cutoff | **M** | 2-полюсный микропереключатель |
| **Приватность** | Camera Physical Shutter | **M** | Механическая шторка PETG |
| **Медицина** | Клиническая диагностика | **X** | Запрещено EU AI Act без лицензии |
