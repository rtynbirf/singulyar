#!/usr/bin/env python3
"""Extract the DATA DNA from СИНГУЛЯР·01 v1.1 into reusable parts.

Lines (1-based) in the original:
  400: const AUDIO_B64='...';
  401: const COVER_B64='...';
  402: const LANGS={...};
  403: const PLACEHOLDERS=[...];
  404: const META={...};
  405: const TASKFILES={...};
  406: const TASKDATA={...};

b64 ones are kept as raw strings; JSON ones are parsed+reserialized (validation).
"""
import json
import os
import re

SRC = "/home/z/my-project/upload/SINGULYAR_01_extracted/СИНГУЛЯР_01_Когда_теряем_157_голосов.html"
OUT = "/home/z/my-project/scripts/data"
os.makedirs(OUT, exist_ok=True)

with open(SRC, encoding="utf-8") as f:
    lines = f.readlines()

def strip_const(s):
    m = re.match(r"^const\s+(\w+)\s*=\s*'(.*)'\s*;\s*$", s, re.S)  # single-quoted (b64)
    if m:
        return m.group(1), m.group(2)
    m = re.match(r"^const\s+(\w+)\s*=\s*", s)  # raw JSON possibly with trailing // comment
    if m:
        name = m.group(1)
        i = s.rfind(";")
        while i > 0 and s[i - 1] not in "}]":
            i = s.rfind(";", 0, i)
        if i <= 0:
            raise SystemExit(f"no closing ; found for {name}")
        return name, s[m.end():i]
    raise SystemExit(f"cannot parse const: {s[:80]}...")

report = []

for lineno, name in [(400, "AUDIO_B64"), (401, "COVER_B64")]:
    raw = lines[lineno - 1].rstrip("\n")
    cname, val = strip_const(raw)
    assert cname == name, f"line {lineno}: expected {name}, got {cname}"
    assert re.fullmatch(r"[A-Za-z0-9+/=]+", val), f"{name}: not pure base64"
    with open(f"{OUT}/{name}.txt", "w", encoding="utf-8") as f:
        f.write(val)
    report.append(f"{name}: {len(val)} chars, mod4={len(val)%4}")

for lineno, name in [(402, "LANGS"), (403, "PLACEHOLDERS"), (404, "META"),
                     (405, "TASKFILES"), (406, "TASKDATA")]:
    raw = lines[lineno - 1].rstrip("\n")
    cname, val = strip_const(raw)
    assert cname == name, f"line {lineno}: expected {name}, got {cname}"
    obj = json.loads(val)  # strict JSON validation
    with open(f"{OUT}/{name}.json", "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    if name == "LANGS":
        ru = obj.get("ru-orig", {})
        report.append(f"{name}: {len(obj)} langs, ru-orig lines={ru.get('lines')}, "
                      f"lrc={len(ru.get('lrc',''))} chars")
    elif name == "TASKFILES":
        groups = obj["groups"]
        n_items = sum(len(g["items"]) for g in groups)
        dl = sum(1 for g in groups for it in g["items"] if it.get("d"))
        report.append(f"{name}: built={obj['built']}, {len(groups)} groups, "
                      f"{n_items} items, {dl} downloadable")
    elif name == "TASKDATA":
        report.append(f"{name}: {len(obj)} payloads, keys={list(obj.keys())[:8]}...")
    else:
        report.append(f"{name}: {json.dumps(obj, ensure_ascii=False)[:100]}")

# sanity on fatal bugs in v1.1 (for the record)
bug1 = "if(lines].t<=t)" in lines[486]
bug2 = any("if(hl&&LANGSl])" in l for l in lines)
report.append(f"v1.1 fatal bug #1 findLine 'lines]': {bug1}")
report.append(f"v1.1 fatal bug #2 boot 'LANGSl]': {bug2}")

print("\n".join(report))
