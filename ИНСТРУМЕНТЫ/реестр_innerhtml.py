# -*- coding: utf-8 -*-
# РЕЕСТР innerHTML (ТЗ-5 аудита владельца 2026-10-14; такт v11.47 «СЛОЙ», С125).
# Статический обход всех .html дома: классификация присваиваний .innerHTML =
#   «литерал»   — справа только строковый литерал (пользовательских данных нет);
#   «переменные» — справа выражение (потенциальный путь данных — требует ревью;
#                  замена на textContent/DOM — Волна 2 по реестру).
# Итог печатается в stdout (JSON), полный список — в файл рядом (аргумент 2).
# Запуск: python3 ИНСТРУМЕНТЫ/реестр_innerhtml.py [корень] [выход.json]
import os, re, json, sys

root = sys.argv[1] if len(sys.argv) > 1 else "."
out = sys.argv[2] if len(sys.argv) > 2 else None
rows = []
for r, ds, fs in os.walk(root):
    ds[:] = [x for x in ds if x not in (".git", "node_modules", "minus")]
    for f in sorted(fs):
        if not f.endswith(".html"): continue
        p = os.path.join(r, f)
        s = open(p, encoding="utf-8", errors="replace").read()
        for m in re.finditer(r"\.innerHTML\s*=\s*([^;\n]{1,140})", s):
            rhs = m.group(1).strip()
            line = s[:m.start()].count("\n") + 1
            lit = bool(re.fullmatch(r"""(['"]).*\1""", rhs, re.S)) or rhs in ("''", '""', '')
            rows.append({"файл": os.path.relpath(p, root), "строка": line,
                         "тип": "литерал" if lit else "переменные", "справа": rhs[:110]})
итог = {"всего": len(rows),
        "литерал": sum(1 for x in rows if x["тип"] == "литерал"),
        "переменные": sum(1 for x in rows if x["тип"] == "переменные"),
        "файлов": len({x["файл"] for x in rows})}
print(json.dumps(итог, ensure_ascii=False))
if out:
    with open(out, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=1)
