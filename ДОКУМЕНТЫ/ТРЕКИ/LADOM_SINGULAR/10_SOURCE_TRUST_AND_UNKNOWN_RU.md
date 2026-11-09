# Реестр достоверности источников и неизвестных

## CLAIM → EVIDENCE → LIMIT → VERDICT

| Claim | Evidence | Limit | Verdict |
|---|---|---|---|
| Reve 2.0 использует layout как промежуточное представление | Официальный блог The Layout Bet | Описание продукта, не полный технический отчёт | Подтверждено как публично заявленная архитектурная идея |
| Layout содержит положение, размер, локальное описание и дополнительные атрибуты | Официальный блог | Не полная схема всех полей | Подтверждено на уровне концепции |
| Reve обучала пространственное рассуждение на LLM | Официальный блог сообщает continued pretraining/post-training open-source LLM | Нет checkpoint/полного рецепта | Подтверждено как заявление компании |
| Датапайплайн охватывает миллиарды изображений | Официальный блог | Не опубликован полный состав и лицензии корпуса | Заявление компании; независимая верификация UNKNOWN |
| Внутренний рендерер — конкретно DiT / U-Net / latent diffusion / flow matching | Общие научные методы | Нет достаточного публичного доказательства конкретной реализации | UNKNOWN |
| Reve использует Qwen как базовую layout-модель | Сторонний одноимённый GitHub README | Не является подтверждённым официальным источником Reve | Не принимать как факт; UNKNOWN |
| Native 4K | Официальный анонс | Нет независимого теста полного pipeline и критериев «native» | Публичное заявление компании; тестировать результат |
| Изменение одного объекта гарантированно оставляет все остальные пиксели неизменными | Маркетинговое описание редактирования | Перерендер может изменить контекст; API-контракт не гарантирует bitwise locality | Не считать гарантией без эксперимента |
| Layout-first может улучшать геометрию композиции | Научные работы LayoutDiffusion, GLIGEN, ControlNet, BoxDiff; официальный тезис Reve | Качество зависит от модели и задачи | Сильное обоснование подхода, измерять на своём benchmark |

## Официальные/научные ссылки
- https://blog.reve.com/posts/the-layout-bet/
- https://blog.reve.com/posts/announcing-reve-2.0/
- https://github.com/reve-ai/reve-sdk
- https://github.com/reve-ai/reve-sdk/tree/main/examples/nodes
- https://openaccess.thecvf.com/content/CVPR2023/html/Zheng_LayoutDiffusion_Controllable_Diffusion_Model_for_Layout-to-Image_Generation_CVPR_2023_paper.html
- https://arxiv.org/abs/2301.07093
- https://arxiv.org/abs/2302.05543
- https://arxiv.org/abs/2307.10816
- https://arxiv.org/abs/2212.09748
- https://arxiv.org/abs/2210.02747
- https://arxiv.org/abs/2403.04692
- https://arxiv.org/abs/2311.03054
