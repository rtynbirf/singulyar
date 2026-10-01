# -*- coding: utf-8 -*-
"""V3: полный архив проекта СИНГУЛЯР — ВСЕ рабочие файлы без исключений."""
import zipfile, os

BASE = "/home/z/my-project"
OUT = os.path.join(BASE, "download", "СИНГУЛЯР_ПРОЕКТ_ПОЛНЫЙ_АРХИВ.zip")

items = []  # (src|BOM:имя, arcname)

def add(src, arc):
    assert os.path.exists(src), f"нет файла: {src}"
    items.append((src, arc))

# ---- 00 · короткие отчёт и инструкция (BOM — блокнот Windows) ----
for name in ("00_ОТЧЁТ_КОРОТКО.txt", "00_ИНСТРУКЦИЯ_КОРОТКО.txt"):
    items.append((f"BOM:{name}", name))

def payload(src):
    if src.startswith("BOM:"):
        with open(f"{BASE}/scripts/handoff/{src[4:]}", "rb") as f:
            return b"\xef\xbb\xbf" + f.read()
    with open(src, "rb") as f:
        return f.read()

# ---- журнал ----
add(f"{BASE}/worklog.md", "worklog.md")

# ---- 01 · источник: zip + извлечённый организм + исходная задача ----
add(f"{BASE}/upload/SINGULYAR_01_TASK_FILES.zip",
    "01_источник_СИНГУЛЯР_01/SINGULYAR_01_TASK_FILES.zip")
add(f"{BASE}/upload/SINGULYAR_01_extracted/СИНГУЛЯР_01_Когда_теряем_157_голосов.html",
    "01_источник_СИНГУЛЯР_01/СИНГУЛЯР_01_Когда_теряем_157_голосов.html")
add(f"{BASE}/upload/Pasted Content_1790842883902.txt",
    "01_источник_СИНГУЛЯР_01/ЗАДАЧА_вставка_пользователя.txt")

# ---- 02 · деливераблы ----
d = f"{BASE}/download"
add(f"{d}/СИНГУЛЯР_02_РЕЗОНАНС_Когда_теряем_157_голосов.html",
    "02_деливераблы/СИНГУЛЯР_02_РЕЗОНАНС_Когда_теряем_157_голосов.html")
add(f"{d}/organism-living-prototype.html", "02_деливераблы/organism-living-prototype.html")
add(f"{d}/СИНГУЛЯР_02_превью_колесо.png", "02_деливераблы/превью/СИНГУЛЯР_02_колесо.png")
add(f"{d}/СИНГУЛЯР_02_превью_резонанс.png", "02_деливераблы/превью/СИНГУЛЯР_02_резонанс.png")
add(f"{BASE}/scripts/proto_top.png", "02_деливераблы/превью/ORGANISM_hero.png")
add(f"{BASE}/scripts/proto_plan.png", "02_деливераблы/превью/ORGANISM_генплан.png")

# ---- 03 · сборка: ВСЁ целиком, включая промежуточные ядра ----
s = f"{BASE}/scripts"
for f in ["extract_data.py", "assemble_02.py", "inspect_html.py",
          "make_archive.py", "test_build.html", "v11_core.js", "s02_core_check.js"]:
    add(f"{s}/{f}", f"03_сборка/{f}")
for f in sorted(os.listdir(f"{s}/parts")):
    add(f"{s}/parts/{f}", f"03_сборка/СИНГУЛЯР_02_parts/{f}")
for f in ["p1_head.html", "p2_body.html", "p3_js.html"]:
    add(f"{s}/{f}", f"03_сборка/ORGANISM_parts/{f}")
for f in sorted(os.listdir(f"{s}/data")):
    add(f"{s}/data/{f}", f"03_сборка/data/{f}")

# ---- 04 · варианты организма (все присланные версии) ----
for f in ["singulyar-02-fabrika.html", "SINGULAR_03_RUNTIME.html",
          "SINGULAR_04_GENOME.html", "SINGULAR_05_SANDBOX.html",
          "SINGULAR_06_CONTRACT.html", "SINGULAR_07_SWARM.html"]:
    add(f"{BASE}/upload/{f}", f"04_варианты/{f}")

README = """СИНГУЛЯР · ПОЛНЫЙ АРХИВ (V3) · 2026-10-02
Все рабочие файлы — полностью, без исключений.

00_ОТЧЁТ_КОРОТКО.txt       — состояние проекта в 4 строках
00_ИНСТРУКЦИЯ_КОРОТКО.txt  — как открыть, проверить, пересобрать

01_источник_СИНГУЛЯР_01/  — исходный zip, извлечённый организм v1.1,
                             исходная текстовая задача
02_деливераблы/           — СИНГУЛЯР·02 РЕЗОНАНС (главный), ORGANISM v0.9,
                             превью-снимки
03_сборка/                — полная система сборки: parts/, data/, скрипты,
                             промежуточные ядра (v11_core.js, s02_core_check.js),
                             test_build.html
04_варианты/              — все прочие версии организма (fabrika, runtime,
                             genome, sandbox, contract, swarm)
worklog.md                — журнал работ

Все организмы автономны: офлайн, ноль внешних запросов.
"""

with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    z.writestr("README.txt", README)
    for src, arc in items:
        z.writestr(arc, payload(src))

with zipfile.ZipFile(OUT) as z:
    bad = z.testzip()
    n = len(z.namelist())
    total_unc = sum(i.file_size for i in z.infolist())

print(f"ФАЙЛОВ: {n} | bad={bad}")
print(f"АРХИВ: {os.path.getsize(OUT)/1048576:.2f} МБ | распаковано: {total_unc/1048576:.2f} МБ")
