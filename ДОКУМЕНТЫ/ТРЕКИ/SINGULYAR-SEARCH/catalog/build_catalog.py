#!/usr/bin/env python3
import csv, json
from pathlib import Path
ROOT = Path(__file__).parent
rows = list(csv.DictReader(open(ROOT / "catalog.csv", encoding="utf-8")))
json.dump(rows, open(ROOT / "catalog.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(f"Wrote {len(rows)} items")
