#!/usr/bin/env python3
# Каталог песен для ·18 СОБЫТИЕ: ID минусовки → название.
# Источник названий: ДАННЫЕ/ИНДЕКС_МУЛЬТИЯЗЫК.md; истина множества: minus/*.mp3.
import json, re, os

REPO = '/home/z/my-project/repo_check'
minus = {f[:-4] for f in os.listdir(os.path.join(REPO, 'minus')) if f.endswith('.mp3')}

pairs = {}
pat = re.compile(r'`([A-Za-z0-9_-]{11})`\s+(.+?)\s+—\s+\d+/\d+')
with open(os.path.join(REPO, 'ДАННЫЕ', 'ИНДЕКС_МУЛЬТИЯЗЫК.md'), encoding='utf-8') as f:
    for line in f:
        m = pat.search(line)
        if m:
            vid, title = m.group(1), m.group(2).strip()
            # чистка усечённых названий индекса
            title = re.split(r'\s+\(', title)[0]           # «(Official…» откусить
            title = re.sub(r'^RUVSON\s*[—-]\s*', '', title)  # префикс канала
            title = re.sub(r'\s*-\s*Трек.*$', '', title)     # «- Трек который…»
            title = re.sub(r'\s*-\s*Песня.*$', '', title)    # «- Песня о…»
            title = title.strip(' -—')
            if title:
                pairs[vid] = title

cat = []
ОТРУЧНЫЕ_НАЗВАНИЯ = {'rWpYxmFjm9g': 'Когда теряем (флагман ★)'}   # флагман вне мультиязык-индекса
for vid in sorted(minus):
    if vid in pairs:
        cat.append([vid, pairs[vid]])
    elif vid in ОТРУЧНЫЕ_НАЗВАНИЯ:
        cat.append([vid, ОТРУЧНЫЕ_НАЗВАНИЯ[vid]])
    else:
        cat.append([vid, vid])   # без названия в индексе — честный ID

# дизамбигуация повторов названий (например, оригинал vs Remix)
counted = {}
for vid, t in cat:
    counted[t] = counted.get(t, 0) + 1
for i, (vid, t) in enumerate(cat):
    if counted[t] > 1 and t != vid:
        cat[i][1] = t + ' ·' + vid[-4:]

out = json.dumps(cat, ensure_ascii=False, separators=(',', ':'))
with open('/home/z/my-project/scripts/s18_catalog.json', 'w', encoding='utf-8') as f:
    f.write(out)

print('minus файлов:', len(minus))
print('с названиями:', sum(1 for v, t in cat if t != v))
print('записей:', len(cat))
print('размер JSON:', len(out.encode('utf-8')), 'Б')
print('примеры:', cat[:3], '...', cat[-2:])
