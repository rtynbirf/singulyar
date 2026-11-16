#!/usr/bin/env python3
"""ПРОГОННАЯ ПАЛАТА (Ф-О · волна-19; волна-20: + районные сценарии Х-065…Х-067).
Судья детерминированный: assert / grep / sha256. Статусы по ст. 68:
ВЫПОЛНЕНО / ЗАЯВЛЕНО / НЕ ПРОВЕРЕНО. Не входит в pytest-коллекцию стенда.

Запуск:
  python3 palata.py --journal <файл или папка журнала> --tree <корень дерева>
  python3 palata.py --district <клон index> <клон .github>   # волна-20, районные сценарии
Без аргументов — самопрогон палаты в текущей папке репо (журнал и tmp ищутся по умолчанию).
"""
import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile

from datetime import datetime, timezone

TAKT_DATE = os.environ.get("PALATA_TAKT_DATE", datetime.now(timezone.utc).strftime("%Y-%m-%d"))
TOKEN_RE = re.compile(r"ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}")

STATUS_DONE = "ВЫПОЛНЕНО"
STATUS_CLAIMED = "ЗАЯВЛЕНО"
STATUS_UNCHECKED = "НЕ ПРОВЕРЕНО"


def _walk(root):
    for cur, _dirs, files in os.walk(root):
        for f in files:
            yield os.path.join(cur, f)


def kh061_rule_of_record(journal):
    """Х-061: такт оставил журнальную запись — в журнале есть строка с датой такта."""
    if not journal or not os.path.exists(journal):
        return STATUS_UNCHECKED, "журнал не найден"
    hits = []
    for path in ([journal] if os.path.isfile(journal) else _walk(journal)):
        try:
            with open(path, encoding="utf-8", errors="ignore") as fh:
                for i, line in enumerate(fh, 1):
                    if TAKT_DATE in line and re.search(r"(волна|такт|ВХОД|ДЕЛО|ПЛОМБА|Покой|ПОКОЙ|wave)", line, re.I):
                        hits.append(f"{path}:{i}")
        except OSError:
            continue
    if hits:
        return STATUS_DONE, f"запись такта есть: {hits[0]} (+{len(hits)-1} ещё)"
    return STATUS_CLAIMED, f"строки с датой такта {TAKT_DATE} в журнале нет"


def kh062_rule_of_secret(tree):
    """Х-062: правило секрета — ноль следов токена в дереве."""
    if not tree or not os.path.isdir(tree):
        return STATUS_UNCHECKED, "дерево не найдено"
    hits = []
    for path in _walk(tree):
        base = os.path.basename(path)
        if base in (".git",) or "/.git/" in path.replace(os.sep, "/"):
            continue
        if os.path.getsize(path) > 2_000_000:
            continue
        try:
            with open(path, "rb") as fh:
                data = fh.read()
        except OSError:
            continue
        if TOKEN_RE.search(data.decode("utf-8", errors="ignore")):
            hits.append(path)
    if not hits:
        return STATUS_DONE, "grep-след токена = 0"
    return STATUS_CLAIMED, "СЛЕДЫ ТОКЕНА: " + ", ".join(hits[:3])


def kh063_seal_p2(tree):
    """Х-063: пломба П2 — MANIFEST.sha256 есть и сверка проходит."""
    if not tree or not os.path.isdir(tree):
        return STATUS_UNCHECKED, "дерево не найдено"
    manifest = os.path.join(tree, "MANIFEST.sha256")
    if not os.path.exists(manifest):
        return STATUS_UNCHECKED, "MANIFEST.sha256 в корне нет (П2 не заявлена здесь)"
    proc = subprocess.run(
        ["sha256sum", "-c", "MANIFEST.sha256"],
        cwd=tree, capture_output=True, text=True,
    )
    if proc.returncode == 0:
        ok_lines = [l for l in proc.stdout.splitlines() if l.endswith(": OK")]
        return STATUS_DONE, f"сверка пройдена: {len(ok_lines)} позиций"
    return STATUS_CLAIMED, "сверка не прошла: " + (proc.stderr.strip().splitlines() or ["?"])[-1]


def kh064_cleanup(tmpdir):
    """Х-064: уборка — tmp такта пуст."""
    if not tmpdir or not os.path.isdir(tmpdir):
        return STATUS_UNCHECKED, "tmp не найден"
    leftover = [p for p in os.listdir(tmpdir) if not p.startswith(".")]
    if not leftover:
        return STATUS_DONE, "tmp пуст"
    return STATUS_CLAIMED, "в tmp остались: " + ", ".join(leftover[:5])


def kh065_memory_fresh(index_dir):
    """Х-065: память дома (index/agents/memory/MEMORY.md) существует и датирована."""
    if not index_dir or not os.path.isdir(index_dir):
        return STATUS_UNCHECKED, "клон index не найден"
    mem = os.path.join(index_dir, "agents", "memory", "MEMORY.md")
    if not os.path.exists(mem):
        return STATUS_CLAIMED, "MEMORY.md в index/agents/memory нет"
    try:
        with open(mem, encoding="utf-8") as fh:
            head = fh.read(2000)
    except OSError as e:
        return STATUS_UNCHECKED, f"чтение не удалось: {e}"
    m = re.search(r"Обновлено:\s*(\d{4}-\d{2}-\d{2})", head)
    if not m:
        return STATUS_CLAIMED, "страница есть, но без даты «Обновлено»"
    upd = datetime.strptime(m.group(1), "%Y-%m-%d").date()
    stale = (datetime.now(timezone.utc).date() - upd).days
    if stale > 14:
        return STATUS_CLAIMED, f"память молчит {stale} дней (обновлено {upd})"
    return STATUS_DONE, f"память датирована {upd} (свежесть {stale} дн.)"


def _skill_files(hub_dir):
    sk = os.path.join(hub_dir, "skills")
    if not os.path.isdir(sk):
        return None
    out = []
    for name in sorted(os.listdir(sk)):
        p = os.path.join(sk, name, "SKILL.md")
        if os.path.isfile(p):
            out.append(p)
    return out


def kh066_skills_and_passport(hub_dir):
    """Х-066: навыки дома валидны (frontmatter name+description); паспорт района, если есть, читается."""
    if not hub_dir or not os.path.isdir(hub_dir):
        return STATUS_UNCHECKED, "клон .github не найден"
    files = _skill_files(hub_dir)
    if files is None:
        return STATUS_CLAIMED, "skills/ в хабе нет"
    bad, good = [], 0
    for p in files:
        try:
            head = open(p, encoding="utf-8").read(1000)
        except OSError:
            bad.append(os.path.basename(os.path.dirname(p)))
            continue
        fm = re.match(r"^---\s*\n(.*?)\n---", head, re.S)
        if fm and re.search(r"^name:\s*\S", fm.group(1), re.M) and re.search(r"^description:\s*\S", fm.group(1), re.M):
            good += 1
        else:
            bad.append(os.path.basename(os.path.dirname(p)))
    passport = os.path.join(hub_dir, "docs", "AGENT-TRUST-PASSPORT-Z-AI.json")
    pp = "паспорт района не найден (не заявлен)"
    if os.path.exists(passport):
        try:
            d = json.load(open(passport, encoding="utf-8"))
            pp = f"паспорт района читается как JSON (ключей: {len(d)})"
        except Exception as e:
            pp = f"паспорт не читается как JSON: {e}"
    if bad:
        return STATUS_CLAIMED, f"навыки без валидного frontmatter: {', '.join(bad)}; {pp}"
    return STATUS_DONE, f"навыки валидны: {good} SKILL.md; {pp}"


def kh067_agent_cards(index_dir):
    """Х-067: карточки деятелей (index/agents/*.json) — JSON с обязательными полями."""
    if not index_dir or not os.path.isdir(index_dir):
        return STATUS_UNCHECKED, "клон index не найден"
    ag = os.path.join(index_dir, "agents")
    if not os.path.isdir(ag):
        return STATUS_CLAIMED, "agents/ в index нет"
    cards = [f for f in os.listdir(ag) if f.endswith(".json")]
    if not cards:
        return STATUS_CLAIMED, "карточек (.json) в agents/ нет"
    need = {"name", "kind", "capabilities", "boundaries", "verification", "mandate"}
    bad = []
    for c in cards:
        try:
            d = json.load(open(os.path.join(ag, c), encoding="utf-8"))
        except Exception as e:
            bad.append(f"{c}: {e}")
            continue
        miss = need - set(d)
        if miss:
            bad.append(f"{c}: нет {', '.join(sorted(miss))}")
    if bad:
        return STATUS_CLAIMED, "карточки не валидны: " + "; ".join(bad[:3])
    return STATUS_DONE, f"карточки валидны: {len(cards)} шт. (JSON + 6 полей)"


def self_probe(tmpdir):
    """Самопрогон: кладёт в tmp файл-след, проверяет Х-062 и Х-064 на собственном материале, убирает за собой."""
    report = []
    probe = os.path.join(tmpdir, "palata_selfprobe.txt")
    with open(probe, "w", encoding="utf-8") as fh:
        fh.write(f"проба палаты {TAKT_DATE}\n")
    st, note = kh064_cleanup(tmpdir)
    report.append(("Х-064(самопроба до уборки)", st, note))
    os.remove(probe)
    st, note = kh064_cleanup(tmpdir)
    report.append(("Х-064(самопроба после уборки)", st, note))
    return report


def main():
    ap = argparse.ArgumentParser(description="Прогонная палата: сценарии Х-061…Х-064")
    ap.add_argument("--journal", default=None, help="файл или папка журнала тактов")
    ap.add_argument("--tree", default=os.getcwd(), help="корень дерева проекта")
    ap.add_argument("--tmp", default=None, help="папка tmp такта")
    ap.add_argument("--takt-date", default=None, help="дата такта (YYYY-MM-DD)")
    ap.add_argument("--self", action="store_true", help="самопрогон на собственном tmp")
    ap.add_argument("--district", nargs=2, metavar=("INDEX_DIR", "HUB_DIR"),
                    help="районные сценарии волны-20: Х-065…Х-067 по клонам index и .github")
    args = ap.parse_args()

    if args.takt_date:
        global TAKT_DATE
        TAKT_DATE = args.takt_date
    tree = os.path.abspath(args.tree)
    tmpdir = os.path.abspath(args.tmp) if args.tmp else os.path.join(tree, "tmp")

    results = [
        ("Х-061 правило записи", *kh061_rule_of_record(args.journal)),
        ("Х-062 правило секрета", *kh062_rule_of_secret(tree)),
        ("Х-063 пломба П2", *kh063_seal_p2(tree)),
        ("Х-064 уборка", *kh064_cleanup(tmpdir)),
    ]
    if args.district:
        results += [
            ("Х-065 память дома", *kh065_memory_fresh(args.district[0])),
            ("Х-066 навыки+паспорт", *kh066_skills_and_passport(args.district[1])),
            ("Х-067 карточки деятелей", *kh067_agent_cards(args.district[0])),
        ]
    if args.self:
        os.makedirs(tmpdir, exist_ok=True)
        results += self_probe(tmpdir)

    print(f"ПРОГОННАЯ ПАЛАТА · такт {TAKT_DATE} · судья детерминированный")
    for name, st, note in results:
        print(f"  [{st}] {name}: {note}")
    failed = any(st == STATUS_CLAIMED for _n, st, _note in results)
    print("ИТОГ:", "есть ЗАЯВЛЕНО — приговор по ст. 68 выносит Хозяин" if failed else "все исполнимые пробы ВЫПОЛНЕНО")
    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())
