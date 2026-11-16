#!/usr/bin/env python3
"""ПРОГОННАЯ ПАЛАТА (Ф-О · волна-19) — сценарные прогоны поведения агента.
Судья детерминированный: assert / grep / sha256. Статусы по ст. 68:
ВЫПОЛНЕНО / ЗАЯВЛЕНО / НЕ ПРОВЕРЕНО. Не входит в pytest-коллекцию стенда.

Запуск:
  python3 palata.py --journal <файл или папка журнала> --tree <корень дерева>
Без аргументов — самопрогон палаты в текущей папке репо (журнал и tmp ищутся по умолчанию).
"""
import argparse
import hashlib
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
