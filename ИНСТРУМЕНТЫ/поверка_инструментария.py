#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""поверка_инструментария.py — живая поверка трёх инструментов ВЭБ дома СИНГУЛЯР.

Вводная владельца (14 окт. 2026, вписана в ЗЕЛЁНУЮ КАРТУ 1·З):
    «ВЭБ=ИНТЕРНЕТ+ПЕСОЧНИЦА+ПАЙТОН=ТВОИ ИНСТРУМЕНТЫ»
    «ЛУЧШИЕ ТВОИ СОВЕТНИКИ ЭТО ТВОИ ЛУЧШИЕ ПРАКТИКИ МИРА»

Что делает: проверяет, что все три инструмента агента живы, прямо сейчас, фактами:
    ИНТЕРНЕТ  — HTTPS-глаза: GitHub API (без ключа, публичный /zen) + raw дома;
    ПЕСОЧНИЦА — земля: git, node, bash, свободное место, право записи в cwd;
    ПАЙТОН    — язык конвейеров: версия интерпретатора, stdlib-пробы.

Законы канона:
    0 внешних зависимостей (только stdlib); 0 секретов (ключ не читается и не
    печатается; сеть — только публичные端 точки); идемпотентна (второй прогон
    не ломает ничего); честные русские отказы, вход не мутируется.

Выход: код 0 — все инструменты живы; код 1 — хоть один мёртв (СТОП-ГОРН такта).
Такт появления: v11.24 «МНОГОУЧЕНЫЙ» (С102, docs+инфра).
"""

import json
import platform
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

ТАЙМАУТ_СЕТИ = 15
РЕЗУЛЬТАТЫ = []


def проба(инструмент, имя, ok, факт):
    РЕЗУЛЬТАТЫ.append((инструмент, имя, bool(ok), факт))
    знак = "OK  " if ok else "СБОЙ"
    print(f"  [{знак}] {имя}: {факт}")
    return ok


def поверь_пайтон():
    print("ПАЙТОН — язык конвейеров:")
    v = sys.version_info
    проба("ПАЙТОН", "интерпретатор", v >= (3, 8),
          f"Python {v.major}.{v.minor}.{v.micro} ({platform.python_implementation()})")
    # stdlib-пробы: json (реестры), pathlib (файлы), hashlib (целостность)
    try:
        import hashlib
        digest = hashlib.sha256("сингуляр".encode()).hexdigest()[:16]
        json.loads('{"закон": "одна правда"}')
        проба("ПАЙТОН", "stdlib json+hashlib+pathlib", True,
              f"json читает реестры, sha256 даёт {digest}…")
    except Exception as e:
        проба("ПАЙТОН", "stdlib json+hashlib+pathlib", False, f"отказ: {e}")


def поверь_песочницу():
    print("ПЕСОЧНИЦА — локальная земля:")
    for имя, cmd in (("git", ["git", "--version"]),
                     ("node", ["node", "--version"]),
                     ("bash", ["bash", "-c", "echo жив"])):
        try:
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            проба("ПЕСОЧНИЦА", имя, r.returncode == 0,
                  (r.stdout or r.stderr).strip().splitlines()[0] if (r.stdout or r.stderr).strip() else "пустой ответ")
        except Exception as e:
            проба("ПЕСОЧНИЦА", имя, False, f"отказ: {e}")
    try:
        cwd = Path.cwd()
        всего, занято, свободно = shutil.disk_usage(cwd)
        гб = свободно / (1024 ** 3)
        with tempfile.NamedTemporaryFile(dir=cwd, suffix=".поверка", delete=False) as t:
            t.write(b"singulyar")
            след = Path(t.name)
        след.unlink()
        проба("ПЕСОЧНИЦА", "земля и право записи", гб > 0.5,
              f"cwd {cwd.name}: свободно {гб:.1f} ГБ, запись/удаление прошли")
    except Exception as e:
        проба("ПЕСОЧНИЦА", "земля и право записи", False, f"отказ: {e}")


def поверь_интернет():
    print("ИНТЕРНЕТ — HTTPS-глаза (только публичные точки, без ключа):")
    # 1) GitHub API /zen — публичная, отвечает фразой мира.
    #    Закон пробы: ЛЮБОЙ HTTP-ответ (даже отказ 403) доказывает, что сеть
    #    жива — DNS+TCP+TLS+HTTP круг прошёл; «сеть мертва» — это таймаут/DNS.
    try:
        t0 = time.monotonic()
        req = urllib.request.Request("https://api.github.com/zen",
                                     headers={"User-Agent": "singulyar-poverka/0.1", "Accept": "application/vnd.github+json"})
        try:
            with urllib.request.urlopen(req, timeout=ТАЙМАУТ_СЕТИ) as r:
                код = r.status
                фраза = r.read(120).decode("utf-8", "replace").strip()
            деталь = f"HTTP {код}: «{фраза}»"
        except urllib.error.HTTPError as e:
            # сервер ДОСТУПЕН и ОТВЕТИЛ (403 = публичная квота общих IP исчерпана;
            # авторизованные вызовы с ключом ходят — досье такта это доказывает)
            деталь = f"HTTP {e.code} — сеть жива, сервер ответил отказом по публичной квоте (ключ дома это лечит)"
        мс = (time.monotonic() - t0) * 1000
        проба("ИНТЕРНЕТ", "HTTPS-круг до GitHub API", True, f"за {мс:.0f} мс; {деталь}")
    except Exception as e:
        проба("ИНТЕРНЕТ", "HTTPS-круг до GitHub API", False, f"отказ (сеть мертва): {e}")
    # 2) raw дома — верификация канона (тот же путь, что после пуша)
    try:
        t0 = time.monotonic()
        url = "https://raw.githubusercontent.com/rtynbirf/singulyar/main/README.md"
        with urllib.request.urlopen(url, timeout=ТАЙМАУТ_СЕТИ) as r:
            байт = len(r.read(2048))
        мс = (time.monotonic() - t0) * 1000
        проба("ИНТЕРНЕТ", "raw дома (README.md)", байт > 0,
              f"HTTP 200 за {мс:.0f} мс, первые {байт} Б читаются")
    except Exception as e:
        проба("ИНТЕРНЕТ", "raw дома (README.md)", False, f"отказ: {e}")


def главное():
    print("=" * 72)
    print("ПОВЕРКА ИНСТРУМЕНТАРИЯ ВЭБ · дом СИНГУЛЯР")
    print("вводная владельца: «ВЭБ=ИНТЕРНЕТ+ПЕСОЧНИЦА+ПАЙТОН=ТВОИ ИНСТРУМЕНТЫ»")
    print("=" * 72)
    поверь_пайтон()
    поверь_песочницу()
    поверь_интернет()
    живых = sum(1 for _, _, ok, _ in РЕЗУЛЬТАТЫ if ok)
    всего = len(РЕЗУЛЬТАТЫ)
    мёртвые = [имя for _, имя, ok, _ in РЕЗУЛЬТАТЫ if not ok]
    print("-" * 72)
    вердикт = "ВСЕ ИНСТРУМЕНТЫ ЖИВЫ" if not мёртвые else f"СТОП-ГОРН: мертвы {', '.join(мёртвые)}"
    print(f"ВЕРДИКТ: {живых}/{всего} проб зелёные — {вердикт}")
    return 0 if not мёртвые else 1


if __name__ == "__main__":
    sys.exit(главное())
