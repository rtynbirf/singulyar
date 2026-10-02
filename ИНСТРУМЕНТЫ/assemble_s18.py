#!/usr/bin/env python3
# Сборка СИНГУЛЯР_18_СОБЫТИЕ.html из parts + инъекция каталога.
import json, os

P = '/home/z/my-project/scripts/s18_parts'
REPO = '/home/z/my-project/repo_check'

def read(name):
    with open(os.path.join(P, name), encoding='utf-8') as f:
        return f.read()

part1 = read('part1_head.html')
part2 = read('part2_body.html')
js = '\n'.join(read(n) for n in ('part3_qr.js', 'part4_core.js', 'part5_engine.js', 'part6_ui.js', 'part7_room.js', 'part8_boot.js'))

# инъекция каталога
cat = json.load(open('/home/z/my-project/scripts/s18_catalog.json', encoding='utf-8'))
js = js.replace('/*КАТАЛОГ_JSON*/[]', json.dumps(cat, ensure_ascii=False))

html = part1 + '\n' + part2 + '\n<script>\n' + js + '\n</script>\n<script defer src="./singulyar-ux-engine-v8.js" data-hotkeys="off"></script>\n</body>\n</html>\n'

out = os.path.join(REPO, 'СИНГУЛЯР_18_СОБЫТИЕ.html')
with open(out, 'w', encoding='utf-8') as f:
    f.write(html)

# контроль: 0 innerHTML, нет «.End of», маркер каталога заменён
assert '/*КАТАЛОГ_JSON*/' not in html, 'каталог не вшит'
assert '.innerHTML' not in html and 'innerHTML =' not in html, 'innerHTML обнаружен'
print('OK:', out)
print('размер:', len(html.encode('utf-8')), 'Б')
with open('/home/z/my-project/scripts/s18_parts/_assembled.js', 'w', encoding='utf-8') as f:
    f.write(js)
print('js для проверки:', len(js.encode('utf-8')), 'Б')
