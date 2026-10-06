#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ТЕСТ «ИНСТРУКЦИЯ БЕЗ АВТОРА» (срез 3).

Принцип проекта: автор не строит памятник себе — он делает так, чтобы его
инструкция была понятна ЛЮБОМУ БЕЗ НЕГО. Этот тест машинально проверяет
главное следствие принципа: репо самодостаточно. Чужой человек клонирует
репо и может понять и проверить всё, не спрашивая автора:

  1. ядро ·21 вырезается по маркерам-комментариям S21:CORE-BEGIN/END (контракт
     проверяем байт-в-байт без автора);
  2. index.html честно говорит, что работает (версия, Adapter OS v0.2 в ·19/·21/·22);
  3. документы ссылаются только на существующие файлы репо (никаких
     «scripts/…» с уровня ИНСТРУМЕНТЫ);
  4. в ИНСТРУМЕНТАХ ноль путей машины автора (скан на характерные литералы —
     сам тест их не содержит даже в этом докстринге, паттерн собирается в рантайме);
  5. у каждого инструмента есть шапка «что это», у каждого теста — «Запуск»;
  6. все python-тесты компилируются, все js/mjs проходят синтакс-чек;
  7. ключевые зависимости (adapter-os, каталог ·18, минусовки) в репо;
  8. wire-тесты среза 2 лежат В РЕПО, а не на машине автора.

Запуск: python3 ИНСТРУМЕНТЫ/test_instruction_alone.py   (из любого клона репо)
"""
import os, re, sys, py_compile, subprocess, tempfile

ЗДЕСЬ = os.path.dirname(os.path.abspath(__file__))
РЕПО = os.path.dirname(ЗДЕСЬ)

ok = fail = 0
def check(имя, cond, extra=""):
    global ok, fail
    if cond: ok += 1; print(f"  OK   {имя}")
    else:    fail += 1; print(f"  FAIL {имя} {extra}")

def прочитай(отн):
    with open(os.path.join(РЕПО, отн), encoding="utf-8") as f:
        return f.read()

print("— 1. КОНТРАКТ ЯДРА ·21 (вырезка по маркерам без автора)")
т21 = прочитай("СИНГУЛЯР_21_ОБЩЕНИЕ.html")
# считаем только маркеры-КОММЕНТАРИИ ядра; упоминания в док-строках — не маркеры
begin = len(re.findall(r"/\*\s*S21:CORE-BEGIN\s*\*/", т21))
end = len(re.findall(r"/\*\s*S21:CORE-END\s*\*/", т21))
i1 = re.search(r"/\*\s*S21:CORE-BEGIN\s*\*/", т21).start()
i2 = re.search(r"/\*\s*S21:CORE-END\s*\*/", т21).start()
check("маркеры S21:CORE-BEGIN/END ровно по одному", begin == 1 and end == 1, f"begin={begin} end={end}")
check("BEGIN раньше END (вырезка ядра воспроизводима)", 0 <= i1 < i2)

print("— 2. ЧЕСТНЫЕ СТРОКИ index.html")
idx = прочитай("index.html")
check("версия платформы указана честно", re.search(r"v1\.\d+\.\d+", idx) is not None)
# v1.31.0 «НИТЬ АРИАДНЫ»: карточек на главной больше нет — Adapter OS
# проверяется в самих комнатах, где эта правда живёт в коде.
# Честно по коду: мосты ·21/·22 — v0.2; мост ·19 — v0.1 (не приукрашиваем)
для_комнат = {"СИНГУЛЯР_19_ЧЕЛОВЕК.html": ("ЧЕЛОВЕК ·19", "Adapter OS v0.1"),
              "СИНГУЛЯР_21_ОБЩЕНИЕ.html": ("ОБЩЕНИЕ ·21", "Adapter OS v0.2"),
              "СИНГУЛЯР_22_СВЯЗЬ.html": ("СВЯЗЬ ·22", "Adapter OS v0.2")}
for файл, (метка, что) in для_комнат.items():
    т = прочитай(файл)
    check(f"комната {метка} несёт мост ({что})", что in т)

print("— 3. ДОКУМЕНТЫ ССЫЛАЮТСЯ ТОЛЬКО НА СУЩЕСТВУЮЩЕЕ")
доки = [f for f in os.listdir(os.path.join(РЕПО, "ДОКУМЕНТЫ")) if f.endswith(".md")]
пат_путь = re.compile(r"(ИНСТРУМЕНТЫ|БИБЛИОТЕКИ|ДАННЫЕ|ДОКУМЕНТЫ|АРХИВ_V3|СКРИНШОТЫ|server)/[\w.\-а-яА-ЯёЁ]+(?:/[\w.\-а-яА-ЯёЁ]+)*")
битые = []
ложь_скриптс = []
for док in доки:
    текст = прочитай(os.path.join("ДОКУМЕНТЫ", док))
    for соотв in пат_путь.finditer(текст):
        путь = соотв.group(0).rstrip(".")
        if not os.path.exists(os.path.join(РЕПО, путь)):
            битые.append(f"{док}: {путь}")
    if re.search(r"\bscripts/", текст):
        ложь_скриптс.append(док)
check("все упомянутые пути документов существуют", not битые, "; ".join(битые[:4]))
check("нет ссылок на несуществующий уровень scripts/", not ложь_скриптс, str(ложь_скриптс))

print("— 4. НОЛЬ ПУТЕЙ МАШИНЫ АВТОРА В ИНСТРУМЕНТАХ")
# паттерн собираем конкатенацией, чтобы сам тест не нёс литералов автора
# (принцип применяется и к самому тесту)
авторские = re.compile("/" + "home/" + "z|" + "my" + "-project|repo_" + "check")
заражено = []
for корень, _, файлы in os.walk(ЗДЕСЬ):
    for ф in файлы:
        if not ф.endswith((".py", ".js", ".mjs")):
            continue
        п = os.path.join(корень, ф)
        с = open(п, encoding="utf-8", errors="replace").read()
        if авторские.search(с):
            заражено.append(os.path.relpath(п, РЕПО))
check("ни один инструмент не привязан к машине автора", not заражено, "; ".join(заражено[:4]))

print("— 5. ШАПКИ: «ЧТО ЭТО» У ВСЕХ, «ЗАПУСК» У ТЕСТОВ")
без_шапки, без_запуска = [], []
for ф in sorted(os.listdir(ЗДЕСЬ)):
    if not ф.endswith((".py", ".js", ".mjs")) or ф == os.path.basename(__file__):
        continue
    п = os.path.join(ЗДЕСЬ, ф)
    строки = open(п, encoding="utf-8", errors="replace").read().splitlines()[:15]
    шапка = any(s.strip().startswith(("#", "/*", "//", "*")) and len(s.strip()) > 12 for s in строки[:12])
    if ф.endswith(".user.js"):
        шапка = any("UserScript" in s for s in строки)
    if not шапка:
        без_шапки.append(ф)
    if ф.startswith("test_") and not any("Запуск" in s for s in строки):
        без_запуска.append(ф)
check("у каждого инструмента есть содержательная шапка", not без_шапки, str(без_шапки))
check("у каждого теста есть строка «Запуск»", not без_запуска, str(без_запуска))

print("— 6. СИНТАКСИС ВСЕГО ОТГРУЖАЕМОГО")
сломано = []
для_py = [f for f in sorted(os.listdir(ЗДЕСЬ)) if f.endswith(".py")]
for ф in для_py:
    try:
        py_compile.compile(os.path.join(ЗДЕСЬ, ф), doraise=True, cfile=os.path.join(tempfile.gettempdir(), ф + "c"))
    except Exception as e:
        сломано.append(f"{ф}: {e}")
для_js = [f for f in sorted(os.listdir(ЗДЕСЬ)) if f.endswith((".js", ".mjs")) and not f.endswith(".user.js")]
for ф in для_js:
    r = subprocess.run(["node", "--check", os.path.join(ЗДЕСЬ, ф)], capture_output=True, text=True)
    if r.returncode != 0:
        сломано.append(f"{ф}: {r.stderr.strip().splitlines()[0] if r.stderr else 'node --check FAIL'}")
check("python-тесты компилируются, js/mjs синтакс-чисты", not сломано, "; ".join(сломано[:4]))

print("— 7. КЛЮЧЕВЫЕ ЗАВИСИМОСТИ В РЕПО")
нужны = ["БИБЛИОТЕКИ/adapter-os/src/core.mjs", "БИБЛИОТЕКИ/adapter-os/bridge.mjs",
         "БИБЛИОТЕКИ/adapter-os/tests/run-tests.mjs", "ИНСТРУМЕНТЫ/serve_repo.mjs",
         "ИНСТРУМЕНТЫ/s18_catalog.json", "ДАННЫЕ/ИНДЕКС_МУЛЬТИЯЗЫК.md",
         "СИНГУЛЯР_18_СОБЫТИЕ.html", "СИНГУЛЯР_21_ОБЩЕНИЕ.html", "СИНГУЛЯР_22_СВЯЗЬ.html",
         "singulyar-ux-engine-v9.js", "minus"]
нет_в_репо = [п for п in нужны if not os.path.exists(os.path.join(РЕПО, п))]
check("зависимости инструментов лежат в репо", not нет_в_репо, str(нет_в_репо))
check("минусовки ·18 на месте (истина каталога)", os.path.isdir(os.path.join(РЕПО, "minus"))
      and len([f for f in os.listdir(os.path.join(РЕПО, "minus")) if f.endswith(".mp3")]) >= 55)

print("— 8. ДОКАЗАТЕЛЬСТВА СРЕЗА 2 — В РЕПО, НЕ НА МАШИНЕ")
check("wire-тест проводки лежит в репо", os.path.isfile(os.path.join(ЗДЕСЬ, "test_adapter_os_wire.py")))
check("live-тест прода лежит в репо", os.path.isfile(os.path.join(ЗДЕСЬ, "test_live_wire.py")))
wire_шапка = open(os.path.join(ЗДЕСЬ, "test_adapter_os_wire.py"), encoding="utf-8").read()
check("wire-тест отсчитывает пути от себя (работает в любом клоне)",
      ("/" + "home/z") not in wire_шапка and "__file__" in wire_шапка)

print(f"\nИТОГ: {ok} OK / {fail} FAIL")
print("Инструкция стоит без автора." if not fail else "Инструкция держится на авторе — СТРОИТЬ дальше.")
sys.exit(1 if fail else 0)
