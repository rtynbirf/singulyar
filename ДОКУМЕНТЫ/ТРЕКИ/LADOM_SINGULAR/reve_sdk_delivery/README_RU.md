# Reve SDK — инженерный комплект (продолжение предыдущей работы)

Дата комплекта: 2026-10-12. Статус: документация и локальный прототип; удалённые вызовы Reve и интеграционные тесты с реальным API не выполнялись.

## Состав
- `01_AUDIT_RU.md` — аудит открытого SDK, границы доказанного.
- `02_CLAIM_CODE_TEST_VERDICT.md` — реестр утверждений по схеме CLAIM → CODE → OFFICIAL SPEC → TEST → VERDICT.
- `03_TZ_IMPLEMENTATION.md` — ТЗ для инженера, включая безопасность и критерии приёмки.
- `04_LAYOUT_EXAMPLE.json` — пример независимого локального описания композиции; не обещает совместимость с конкретной версией схемы API без проверки.
- `05_ACCEPTANCE_TESTS.md` — воспроизводимые ручные/автоматизированные сценарии.
- `ladom-composition-studio.html` — автономный редактор прямоугольных регионов композиции; работает локально, не вызывает Reve API.
- `SHA256SUMS.txt` — контрольные суммы файлов комплекта.

## Быстрый старт
Откройте `ladom-composition-studio.html` в браузере. Добавляйте регионы, выбирайте и перетаскивайте их мышью, меняйте размеры за нижний правый маркер, редактируйте метку и prompt, экспортируйте/импортируйте JSON. Это прототип структуры/UX, а не клиент Reve и не генератор изображения.

## Источники, исследованные в предыдущем ходе
- https://github.com/reve-ai/reve-sdk
- https://raw.githubusercontent.com/reve-ai/reve-sdk/main/python/README.md
- https://raw.githubusercontent.com/reve-ai/reve-sdk/main/skills/reve-image/SKILL.md
- https://raw.githubusercontent.com/reve-ai/reve-sdk/main/python/examples/v2_layout_pipeline.py
- https://raw.githubusercontent.com/reve-ai/reve-sdk/main/web-sdk/README.md
- https://raw.githubusercontent.com/reve-ai/reve-sdk/main/examples/nodes/README.md

## Важное ограничение
Открытый SDK раскрывает публичные операции и формат рабочего процесса, но не раскрывает полностью внутренности обученной модели: веса, архитектуру обучения, датасет, функцию потерь и внутренний sampler/denoising pipeline. Нельзя достоверно восстановить их по одному SDK. Для вызовов API требуется собственный токен; токен в комплект не включён.
