#!/usr/bin/env python3
"""Inspect СИНГУЛЯР_01 HTML: print line ranges with long lines truncated."""
import sys

SRC = "/home/z/my-project/upload/SINGULYAR_01_extracted/СИНГУЛЯР_01_Когда_теряем_157_голосов.html"
MAXW = 180

start = int(sys.argv[1]) if len(sys.argv) > 1 else 1
end = int(sys.argv[2]) if len(sys.argv) > 2 else 900

with open(SRC, encoding="utf-8") as f:
    lines = f.readlines()

for i in range(start - 1, min(end, len(lines))):
    s = lines[i].rstrip("\n")
    if len(s) > MAXW:
        s = s[:MAXW] + f" …«+{len(s)-MAXW} chars»"
    print(f"{i+1}: {s}")
