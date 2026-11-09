#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/ort_wasm_dupes.py — П52-II: детектор дубликатов ort-wasm (issue #64).

Факт: `vendor/ort/ort-wasm-simd-threaded.jsep.wasm` (21 596 019 Б) и
`...jsep.mjs` (44 484 Б) лежат байт-в-байт одинаковыми копиями в двух деревьях:
singulyar (rumu) и rtynbirf/rtynbirf.github.io (main). Экономия от дедупа —
21 640 503 Б ≈ 21,6 МБ.

Режимы:
  (по умолчанию) отчёт: инвентарь локальных ort-wasm файлов (git) + сверка
                 blob sha с деревом rtynbirf/rtynbirf.github.io (API);
  --check        rc=2, пока дубликат существует (гейт будущей волны дедупа);
  --selftest     детерминированный самотест на фикстурах, без сети (rc=0/1).

Политика: docs/ORT-WASM-DEDUP.md — одна каноническая копия, склейка сборкой,
АГЕНТЫ НЕ УДАЛЯЮТ чужие бинари (удаление — решение владельца в чужом репо).
Только stdlib.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
REMOTE_REPO = os.environ.get("ORT_REMOTE_REPO", "rtynbirf/rtynbirf.github.io")
REMOTE_REF = os.environ.get("ORT_REMOTE_REF", "main")
PATTERN = "ort-wasm"

# ── Фикстуры самотеста ─────────────────────────────────────────────────────
FIX_LOCAL = [
    ("vendor/ort/ort-wasm-simd-threaded.jsep.wasm", 21596019,
     "b05d1adc8304011b9a1110ca33dbf79c168d0b54"),
    ("vendor/ort/ort-wasm-simd-threaded.jsep.mjs", 44484,
     "fd68c6339d617918f1d3113c5757301312971353"),
]
FIX_REMOTE = [
    ("vendor/ort/ort-wasm-simd-threaded.jsep.wasm", 21596019,
     "b05d1adc8304011b9a1110ca33dbf79c168d0b54"),
    ("vendor/ort/ort-wasm-simd-threaded.jsep.mjs", 44484,
     "fd68c6339d617918f1d3113c5757301312971353"),
    ("vendor/ort/ort-wasm-simd-threaded.jsep.wasm.backend", 1000,
     "0000000000000000000000000000000000000000000000000000000000000000"),
]
FIX_REMOTE_CLEAN = [
    ("vendor/ort/ort-wasm-simd-threaded.jsep.wasm.backend", 1000,
     "0000000000000000000000000000000000000000000000000000000000000000"),
]


# ── Ядро (чистые функции — тестируются на фикстурах) ──────────────────────
def find_duplicates(local: list[tuple], remote: list[tuple]) -> list[dict]:
    """Дубликаты: одинаковый blob sha в обоих деревьях (путь может отличаться)."""
    remote_by_sha: dict[str, list[tuple]] = {}
    for path, size, sha in remote:
        remote_by_sha.setdefault(sha, []).append((path, size))
    dups = []
    for path, size, sha in local:
        for rpath, rsize in remote_by_sha.get(sha, []):
            dups.append({"local_path": path, "remote_path": rpath,
                         "size": size, "sha": sha,
                         "size_match": size == rsize})
    return dups


def saving_bytes(dups: list[dict]) -> int:
    """Экономия = суммарный вес дублирующих копий, которые можно снять с
    дерева (каждый дубликат — отдельная копия в другом репо)."""
    return sum(d["size"] for d in dups)


def human(n: int) -> str:
    return f"{n:,}".replace(",", " ") + " Б"


def render_report(local: list[tuple], remote: list[tuple] | None,
                  remote_name: str) -> str:
    dups = find_duplicates(local, remote) if remote is not None else []
    lines = ["# ort-wasm · инвентарь и дубликаты", ""]
    lines.append(f"## Локальное дерево ({len(local)} ort-wasm файлов)")
    for path, size, sha in local:
        lines.append(f"- `{path}` — {human(size)} · blob {sha[:12]}…")
    if remote is None:
        lines += ["", f"## Сверка с {remote_name}",
                  "- нет данных (нет GITHUB_TOKEN или API недоступен) — "
                  "дубликаты не проверены"]
        return "\n".join(lines) + "\n"
    lines += ["", f"## Сверка с {remote_name} ({len(remote)} ort-wasm файлов)"]
    if dups:
        lines.append(f"- ДУБЛИКАТЫ: {len(dups)} (байт-в-байт по blob sha):")
        for d in dups:
            lines.append(f"  - `{d['local_path']}` ≡ `{d['remote_path']}` "
                         f"— {human(d['size'])} (sha {d['sha'][:12]}…)")
        lines += ["", f"- **Экономия от дедупа: {human(saving_bytes(dups))} "
                      f"(≈ {saving_bytes(dups) / 1_000_000:.1f} МБ) на дерево GitHub.**",
                  "- Политика: docs/ORT-WASM-DEDUP.md — одна каноническая копия, "
                  "вторая площадка получает файл склейкой сборки. Удаление из "
                  "чужого репо — решение владельца, агенты не удаляют."]
    else:
        lines.append("- дубликатов нет — детектор спокоен")
    return "\n".join(lines) + "\n"


# ── Живые источники ────────────────────────────────────────────────────────
def local_inventory() -> list[tuple]:
    out = subprocess.run(["git", "ls-files", "-s"], cwd=REPO_ROOT,
                         capture_output=True, text=True).stdout
    inv = []
    for line in out.splitlines():
        parts = line.split()
        if len(parts) >= 4 and PATTERN in parts[3]:
            path = REPO_ROOT / parts[3]
            try:
                size = path.stat().st_size
            except OSError:
                continue
            inv.append((parts[3], size, parts[1]))
    return inv


def remote_tree() -> list[tuple] | None:
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if not token:
        return None
    url = (f"https://api.github.com/repos/{REMOTE_REPO}/git/trees/"
           f"{REMOTE_REF}?recursive=1")
    req = urllib.request.Request(url, headers={
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "ort-wasm-dupes",
    })
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            tree = json.loads(resp.read().decode("utf-8")).get("tree", [])
    except Exception as err:  # noqa: BLE001
        print(f"WARN  API {REMOTE_REPO}: {err}", file=sys.stderr)
        return None
    return [(t["path"], t.get("size", 0), t["sha"])
            for t in tree if PATTERN in t["path"] and t.get("type") == "blob"]


def main() -> int:
    if "--selftest" in sys.argv:
        red = 0
        dups = find_duplicates(FIX_LOCAL, FIX_REMOTE)
        ok = len(dups) == 2 and all(d["size_match"] for d in dups)
        red += not ok
        print(f"{'PASS' if ok else 'RED'}  фикстуры: 2 байт-в-байт дубликата "
              f"найдены, размеры сходятся")
        ok = saving_bytes(dups) == 21596019 + 44484
        red += not ok
        print(f"{'PASS' if ok else 'RED'}  экономия = "
              f"{human(saving_bytes(dups))}")
        ok = find_duplicates(FIX_LOCAL, FIX_REMOTE_CLEAN) == []
        red += not ok
        print(f"{'PASS' if ok else 'RED'}  без совпадающих sha — дубликатов нет")
        r1 = render_report(FIX_LOCAL, FIX_REMOTE, "remote-fix")
        r2 = render_report(FIX_LOCAL, FIX_REMOTE, "remote-fix")
        ok = r1 == r2 and "21 640 503" in r1 and "не удаляют" in r1
        red += not ok
        print(f"{'PASS' if ok else 'RED'}  отчёт детерминирован, "
              f"содержит экономию и политику")
        ok = "нет данных" in render_report(FIX_LOCAL, None, "remote-fix")
        red += not ok
        print(f"{'PASS' if ok else 'RED'}  без API — отчёт честно говорит "
              f"«дубликаты не проверены»")
        print(f"# Result: {5 - red} passed, {red} failed (of 5)")
        return 0 if red == 0 else 1

    local = local_inventory()
    remote = remote_tree()
    sys.stdout.write(render_report(local, remote, REMOTE_REPO))
    if "--check" in sys.argv:
        if remote is None:
            print("FAIL  нет данных о чужом дереве — гейт не может быть "
                  "зелёным по вере")
            return 3
        dups = find_duplicates(local, remote)
        if dups:
            print(f"FAIL  дубликатов: {len(dups)}, "
                  f"экономия {human(saving_bytes(dups))} — дедуп не исполнен")
            return 2
        print("PASS  дубликатов нет — дедуп исполнен")
        return 0
    return 0


if __name__ == "__main__":
    sys.exit(main())
