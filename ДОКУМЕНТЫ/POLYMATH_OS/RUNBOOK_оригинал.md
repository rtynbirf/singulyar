# RUNBOOK — Polymath OS

> Operational runbook: что делать, когда что-то упало.

---

## Quick reference

| Что случилось | Первое действие | Где документация |
|---|---|---|
| Production 500 errors | Sentry → trace → check deploy | §Incident response |
| CI red on main | `act -W` локально → investigate | §CI recovery |
| Vault sync stopped | Check obsidian-git status | §Vault recovery |
| Agent degraded | Langfuse traces → eval regression | §Agent recovery |
| IaC apply failed | `tofu plan` на локальной машине | §IaC recovery |

---

## Incident response

### Severity levels

- **P0 (Critical):** production down, data loss risk. Rollback immediately.
- **P1 (High):** major feature broken. Rollback если не фиксится за 30 мин.
- **P2 (Medium):** minor feature broken, workaround exists. Fix в следующий deploy.
- **P3 (Low):** cosmetic, non-urgent.

### P0/P1 rollback procedure

```bash
# 1. Идентифицировать последний зелёный release
gh release list --limit 5

# 2. Rollback через ArgoCD (GitOps) или helm
helm rollback polymath-os-prod <previous-revision>
# ИЛИ
argocd app rollback polymath-os-prod <previous-revision>

# 3. Verify
curl https://api.example.com/health
# OTel: check Grafana Tempo → trace в новом deployment

# 4. Postmortem
# - Создать GitHub Issue с меткой `incident`
# - Заполнить шаблон: timeline, root cause, action items
# - Добавить в docs/adr/ если меняется архитектура
```

---

## CI recovery

### Symptoms
- `main` красный после merge PR
- CI timeout
- Flaky test

### Steps
```bash
# 1. Воспроизвести локально
act -W .github/workflows/ci.yml -j ci

# 2. Если локально зелёно — инфраструктурная проблема
#    - Кэш переполнен? `gh cache list` → delete oldest
#    - Runner image updated? Pin to older

# 3. Если локально тоже красно — фикс в коде
git checkout -b fix/ci-<issue>
# fix...
pnpm turbo run lint typecheck test
git commit -m "fix(ci): <description>"
gh pr create

# 4. PR merge → merge queue → main зелёный
```

---

## Vault recovery

### Symptoms
- Obsidian не пушит в git
- Conflicts в `vault/00-daily/`
- Smart Connections индекс сломан

### Steps
```bash
cd vault/

# 1. Проверить статус
git status

# 2. Если conflicts — resolution
git pull --rebase
# resolve conflicts manually
git add .
# obsidian-git: push

# 3. Если индекс Smart Connections сломан
rm -rf .smart-env/
# → Smart Connections переиндексирует при следующем запуске

# 4. Anti-fragility check (если vault не открывается в Obsidian)
# → открыть в VSCode + Foam (или `less`)
# → должно работать
```

---

## Agent recovery

### Symptoms
- Production agent даёт некорректные ответы
- Eval регрессия в promptfoo
- Cost spike в OpenRouter

### Steps
```bash
# 1. Langfuse traces → найти где agent пошёл не туда
# https://langfuse.your-domain.com

# 2. promptfoo regression
cd tooling/agents/<name>
promptfoo eval

# 3. Если регрессия после смены модели/промпта — rollback
git log --oneline tooling/agents/<name>/
git checkout <previous-commit> -- tooling/agents/<name>/

# 4. Если cost spike — check cache-hit-ratio
# Langfuse: per-agent cache-hit metric
# Если <50% — refactor prompts для лучшего cache-hit

# 5. Если упал MCP-сервер — fallback на ad-hoc function definitions
# (см. ADR-0004)
```

---

## IaC recovery

### Symptoms
- `tofu apply` failed
- State drift
- Resource не удаляется

### Steps
```bash
cd infra/tofu/environments/personal

# 1. Check state
tofu plan
tofu state list

# 2. Если drift — import существующие ресурсы
tofu import <resource-type>.<name> <id>

# 3. Если apply упал на одном ресурсе — target
tofu apply -target=<resource-type>.<name>

# 4. Если совсем плохо — destroy and rebuild
tofu destroy  # ОСТОРОЖНО: только non-prod
tofu apply

# 5. State lock застрял
tofu force-unlock <lock-id>
```

---

## On-call rotation

- Solo: monitoring через BetterStack → alerts на email/Telegram
- Если расширится до команды → rotation через OpsGenie (free tier) или BetterStack Pro

## Backup & DR

| Что | Где | Частота | Recovery test |
|---|---|---|---|
| Git репо | GitHub + local clone | Real-time (git push) | Quarterly: `git clone` на чистую VM |
| Vault | GitHub private repo + local | 10 min auto-backup | Quarterly: `git clone vault` → открыть в Foam |
| Database | S3 + WAL archive | Daily snapshot, 7-day retention | Quarterly: restore-test |
| Secrets | 1Password (primary) + age-key (offline) | Real-time | Quarterly: rotate age-key |

## Contacts

- Self: `<fill-in-on-init>`
- Hosting: Hetzner / Cloudflare / GitHub
- Status page: `<status-url>`
