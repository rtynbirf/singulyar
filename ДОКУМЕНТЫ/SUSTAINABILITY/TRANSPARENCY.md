# TRANSPARENCY PROTOCOL — правила публикации финансов

## Source of truth

Внешняя финансовая платформа остаётся источником платёжной транзакции. Репозиторный ledger — публичный audit view / reconciliation layer.

**Нельзя выдавать demo ledger за реальный.**

## Entry schema

Каждая опубликованная запись содержит:

`id` · `date` · `type` · `amount` · `currency` · `category` · `status` · `public_note` · `evidence` · `prev_hash` · `hash`

## Append-only

Нельзя молча редактировать опубликованную запись. Исправление делается **новой записью типа `correction`**, которая ссылается на исходную. Это тот же закон неизменяемости фактов, что и в кристалле и в ·25 Кошельке.

## Privacy

Публичная запись минимизирует персональные данные. `anonymous` — нормальный публичный статус.

## Evidence levels

| Уровень | Смысл |
|---|---|
| DEMO | демонстрационный пример |
| SELF_REPORTED | заявлено владельцем проекта, не независимо подтверждено |
| PLATFORM | подтверждается платёжной платформой |
| RECEIPT | есть подтверждающий документ |
| AUDITED | прошло независимую проверку |

**SELF_REPORTED ≠ EVIDENCE** — уровень заявленного не считается уровнем подтверждённого.

## Monthly report

Каждый месяц желательно публиковать:

- opening balance;
- contributions;
- expenses;
- closing balance;
- funded outcomes;
- unfinished outcomes;
- material conflicts;
- largest-source share (см. GOVERNANCE §3).
