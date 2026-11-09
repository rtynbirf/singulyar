#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""АУДИТ РУМ v1.40.0 «РЕВИЗИЯ» — карта: декларация vs рабочий инструмент.
Метрики на каждую страницу СИНГУЛЯР_NN:
  - размер и доля base64-блобов (растр в коде = косяк «ПОРНАГРАФИЮ СЛЕПИЛ»)
  - innerHTML присвоения (закон дома: ноль)
  - document.write / eval (косяки)
  - внешние http-ресурсы (нарушение офлайн-закона)
  - заглушки (TODO/FIXME/СКОРО/В РАЗРАБОТКЕ/lorem)
  - ПОД КАПОТ (<details> — спойлеры, приказ владельца)
  - версия сборки (sng-build), маркер нити (SNG.карта)
"""
import os, re, glob, json, sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
pages = sorted(glob.glob(os.path.join(ROOT, 'СИНГУЛЯР_*.html'))) + \
        [os.path.join(ROOT, 'index.html')]
rows = []
for p in pages:
    name = os.path.basename(p)
    raw = open(p, 'rb').read()
    size = len(raw)
    # base64 блобы: data:image/...;base64,XXXX
    blobs = re.findall(rb'data:image/[a-z+]+;base64,', raw)
    # суммарная длина base64-строк
    b64len = sum(len(m.group(0)) for m in re.finditer(rb'data:image/[a-z+]+;base64,[A-Za-z0-9+/=]{100,}', raw))
    svg = len(re.findall(rb'<svg', raw))
    txt = raw.decode('utf-8', 'ignore')
    inner = len(re.findall(r'innerHTML\s*=', txt))
    dwrite = len(re.findall(r'document\.write', txt))
    ev = len(re.findall(r'\beval\s*\(', txt))
    ext = len(re.findall(r'(?:src|href)\s*=\s*["\']https?://', txt))
    stubs = len(re.findall(r'TODO|FIXME|lorem|СКОРО|В РАЗРАБОТКЕ|заглушк', txt, re.I))
    details = len(re.findall(r'<details', txt, re.I))
    build = re.search(r'sng-build" content="v([\d.]+)', txt)
    thread = 'SNG.карта' in txt or 'sng' in txt and 'нить' in txt.lower()
    rows.append({
        'файл': name, 'КБ': round(size/1024), 'растр_КБ': round(b64len/1024), 'блобов': len(blobs),
        'svg': svg, 'innerHTML': inner, 'doc_write': dwrite, 'eval': ev, 'внешних': ext,
        'заглушек': stubs, 'details': details, 'версия': build.group(1) if build else '—',
        'нить': 'да' if thread else '—'
    })

print(f"{'файл':52} {'КБ':>7} {'растрКБ':>8} {'блоб':>5} {'svg':>5} {'inHTML':>6} {'dwrt':>4} {'eval':>4} {'ext':>4} {'загл':>4} {'detl':>4} {'версия':>8} нить")
for r in rows:
    print(f"{r['файл']:52} {r['КБ']:>7} {r['растр_КБ']:>8} {r['блобов']:>5} {r['svg']:>5} {r['innerHTML']:>6} {r['doc_write']:>4} {r['eval']:>4} {r['внешних']:>4} {r['заглушек']:>4} {r['details']:>4} {r['версия']:>8} {r['нить']}")
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'rooms_audit.json')
json.dump(rows, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print("\nСохранено: rooms_audit.json")
