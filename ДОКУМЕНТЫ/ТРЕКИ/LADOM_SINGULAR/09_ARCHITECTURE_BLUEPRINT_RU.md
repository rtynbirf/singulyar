# Архитектурный чертёж независимой layout-first системы

## Принцип
Модель рендера — сменный исполнитель. Долгоживущая ценность системы — открытая структура сцены, проверяемые ограничения, история изменений, адаптеры и контроль качества.

## Компоненты

1. **Intent Parser** — извлекает объекты, атрибуты, отношения, текст, формат и требования к сохранению.
2. **Scene Graph** — узлы объектов и отношения между ними. Проверяет противоречия до layout.
3. **Layout IR** — версионируемая структура; схема имеет собственную версию и миграции.
4. **Constraint Solver** — проверяет bbox, минимальные размеры, границы кадра, перекрытия, порядок слоёв, фиксированные элементы.
5. **Layout Editor** — drag/resize, текстовый JSON, undo/redo, diff, доступность с клавиатуры и screen reader.
6. **Provider Adapter** — преобразует собственный IR в конкретную схему Reve или локального renderer. Не смешивать внутреннюю модель с чужим API DTO.
7. **Renderer** — Reve API или локальная модель. Секреты только на сервере.
8. **Result Inspector** — OCR, object detection, segmentation, image similarity и проверки геометрии.
9. **Repair Planner** — определяет, какую область/сущность исправить, и выбирает повторный layout edit, masked inpainting или композитинг.
10. **Experiment Ledger** — append-only журнал входов, версии схемы, параметров, результатов, стоимости и verdict.
11. **Asset Store** — хранит изображения и ссылки; граф хранит ссылки/ID, не огромные base64 blobs.
12. **Policy & Budget Gate** — подтверждение платных операций, лимит бюджета, rate limiting, защита от повторного расходования кредитов.

## Интерфейсы

- `parseIntent(prompt, references) -> SceneGraph`
- `buildLayout(SceneGraph, constraints) -> LayoutIR`
- `validateLayout(LayoutIR) -> ValidationReport`
- `diffLayout(old, new) -> LayoutDiff`
- `render(LayoutIR, references, providerConfig) -> RenderResult`
- `inspect(RenderResult, LayoutIR, requirements) -> QAReport`
- `planRepair(QAReport, LayoutIR) -> RepairPlan`
- `recordExperiment(inputs, outputs, verdict) -> LedgerEntry`

Эти интерфейсы являются нашим проектным контрактом, не Reve API.

## Безопасность и надёжность
- API-ключ только в серверном окружении.
- Авторизация приложения, лимит частоты, лимит расхода, защита от публичного прокси.
- Валидация MIME, размера и числа референсов; проверка ответа API и content-violation.
- Таймауты, retry только для безопасных/идемпотентных операций; перед повтором платного вызова учитывать риск повторного списания.
- Все операции редактирования транзакционны: не заменять последнюю валидную версию невалидным JSON.
- Экспортировать проект вместе с layout, изображениями/ссылками, версиями адаптеров и отчётом QA.

## Приоритет реализации
P0: Layout IR + validator + editor + JSON import/export + history.  
P1: Reve adapter + secure backend + cost ledger.  
P2: OCR/object QA + deterministic test corpus.  
P3: local open-model adapter (например, layout-conditioned baseline на открытом diffusion stack).  
P4: masked repair, multimodal references, batch experiments и agentic repair planner.

## Условие готовности P0
Пользователь может создать сцену, добавить/удалить/переместить/изменить объект, увидеть ошибки геометрии, сравнить версии, экспортировать валидный JSON и восстановить проект без API-ключа и сетевого соединения. Ни одна операция не должна молча уничтожать исходную версию.
