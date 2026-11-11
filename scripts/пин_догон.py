#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""пин_догон.py — догон пина клетки singulyar в геноме cell-swarm (ЛАТКА 2026-11-11).

Обычай дома: после коммита в rumu пин клетки singulyar в rtynbirf/cell-swarm
должен указывать на новый SHA (иначе оракул краснеет «ПИН УСТАРЕЛ»).
Скрипт делает ровно то, что агент делает руками (make pins --write):
  1) читает swarm.json из cell-swarm@main;
  2) меняет pin у клетки singulyar на SHA из argv;
  3) коммитит через Git Data API (blobs → tree → commit → ref, закон AGENTS §5).

СТАТУС 2026-11-11: геном cell-swarm ЗААРХИВИРОВАН (read-only) — догон невозможен
ни этим скриптом, ни руками; оракул «ПИН УСТАРЕЛ» на любом новом коммите rumu —
родная рана дома (см. KNOWN_ISSUES.md). Воркфлоу «Дислокация» потому и не
коммитит в rumu (ветка данных «данные-дислокация»), чтобы не красить гейт.
Скрипт оставлен волно́й как инструмент на случай разморозки генома.

Запуск: python3 scripts/пин_догон.py <sha>   (токен в env ПИН_ТОКЕН/PIN_TOKEN)
Честность: любая ошибка — печатаем факт и выходим с кодом 1.
"""
import base64
import json
import os
import sys
import urllib.request
import urllib.error

РЕПО_ГЕНОМ = "rtynbirf/cell-swarm"
ВЕТКА = "main"
КЛЕТКА = "singulyar"


def запрос(url, метод="GET", тело=None, токен=None):
    заг = {"Accept": "application/vnd.github+json", "User-Agent": "dislokaciya-avtomat",
           "Content-Type": "application/json"}
    if токен:
        заг["Authorization"] = f"token {токен}"
    данные = json.dumps(тело).encode() if тело is not None else None
    з = urllib.request.Request(url, data=данные, headers=заг, method=метод)
    try:
        with urllib.request.urlopen(з, timeout=30) as о:
            return json.loads(о.read().decode() or "{}")
    except urllib.error.HTTPError as е:
        print(f"пин_догон: HTTP {е.code} на {метод} {url}")
        print("тело ответа:", е.read().decode()[:400])
        raise


def главное():
    sha = sys.argv[1] if len(sys.argv) > 1 else ""
    токен = (os.environ.get("ПИН_ТОКЕН") or os.environ.get("PIN_TOKEN") or "").strip()
    if not sha or len(sha) < 40:
        print("пин_догон: нет SHA — выхожу")
        return 1
    if not токен:
        print("пин_догон: нет токена — выхожу")
        return 1

    ф_стар = запрос(f"https://api.github.com/repos/{РЕПО_ГЕНОМ}/contents/swarm.json?ref={ВЕТКА}", токен=токен)
    геном = json.loads(base64.b64decode(ф_стар["content"]).decode("utf-8"))
    клетки = геном.get("cells", [])
    цель = [к for к in клетки if к.get("name") == КЛЕТКА]
    if not цель:
        print(f"пин_догон: клетка {КЛЕТКА} не найдена в геноме — честно отказываюсь")
        return 1
    старый = цель[0].get("pin")
    if старый == sha:
        print(f"пин уже на месте: {sha}")
        return 0
    цель[0]["pin"] = sha

    новое_содержимое = json.dumps(геном, ensure_ascii=False, indent=1) + "\n"

    ref = запрос(f"https://api.github.com/repos/{РЕПО_ГЕНОМ}/git/ref/heads/{ВЕТКА}", токен=токен)
    стар_ша = ref["object"]["sha"]
    коммит = запрос(f"https://api.github.com/repos/{РЕПО_ГЕНОМ}/git/commits/{стар_ша}", токен=токен)
    баз_дерево = коммит["tree"]["sha"]

    blob = запрос(f"https://api.github.com/repos/{РЕПО_ГЕНОМ}/git/blobs", "POST",
                  {"content": новое_содержимое, "encoding": "utf-8"}, токен=токен)
    дерево = запрос(f"https://api.github.com/repos/{РЕПО_ГЕНОМ}/git/trees", "POST",
                    {"base_tree": баз_дерево, "tree": [
                        {"path": "swarm.json", "mode": "100644", "type": "blob", "sha": blob["sha"]}]},
                    токен=токен)
    новый_коммит = запрос(f"https://api.github.com/repos/{РЕПО_ГЕНОМ}/git/commits", "POST",
                          {"message": f"пин клетки {КЛЕТКА}: догон за {sha[:12]} (дислокация-автомат)",
                           "tree": дерево["sha"], "parents": [стар_ша]}, токен=токен)
    запрос(f"https://api.github.com/repos/{РЕПО_ГЕНОМ}/git/refs/heads/{ВЕТКА}", "PATCH",
           {"sha": новый_коммит["sha"], "force": False}, токен=токен)
    print(f"пин догнан: {старый} → {sha}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(главное())
    except Exception as е:
        print("пин_догон: ошибка:", str(е)[:300])
        sys.exit(1)
