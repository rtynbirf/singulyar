#!/usr/bin/env python3
# ИСТОРИЧЕСКИЙ инструмент одноразовой сборки СИНГУЛЯР_18_СОБЫТИЕ.html из parts
# + инъекция каталога. Исходные parts (part1_head.html … part8_boot.js) в репо
# НЕ входят; живая страница эволюционировала после сборки — ПЕРЕСБОРКА НЕ
# КАНОНИЧНА и перезапишет живой файл. Сохранён для истории сборки.
# Запуск: python3 ИНСТРУМЕНТЫ/assemble_s18.py   (честно откажется, если parts нет)
import json, os, sys

ЗДЕСЬ = os.path.dirname(os.path.abspath(__file__))
РЕПО = os.path.dirname(ЗДЕСЬ)
P = os.path.join(ЗДЕСЬ, 's18_parts')

ЧАСТИ = ['part1_head.html', 'part2_body.html', 'part3_qr.js', 'part4_core.js',
         'part5_engine.js', 'part6_ui.js', 'part7_room.js', 'part8_boot.js']
нет = [n for n in ЧАСТИ if not os.path.isfile(os.path.join(P, n))]
if нет:
    print('HONEST STOP: parts одноразовой сборки в репо не входят и отсутствуют:')
    print('  ' + ', '.join(нет))
    print('Живой СИНГУЛЯР_18_СОБЫТИЕ.html каноничен; этот инструмент — история.')
    sys.exit(1)

def read(name):
    with open(os.path.join(P, name), encoding='utf-8') as f:
        return f.read()

part1 = read('part1_head.html')
part2 = read('part2_body.html')
js = '\n'.join(read(n) for n in ЧАСТИ[2:])

# инъекция каталога
cat = json.load(open(os.path.join(ЗДЕСЬ, 's18_catalog.json'), encoding='utf-8'))
js = js.replace('/*КАТАЛОГ_JSON*/[]', json.dumps(cat, ensure_ascii=False))

html = part1 + '\n' + part2 + '\n<script>\n' + js + '\n</script>\n<script defer src="./singulyar-ux-engine-v8.js" data-hotkeys="off"></script>\n</body>\n</html>\n'

out = os.path.join(РЕПО, 'СИНГУЛЯР_18_СОБЫТИЕ.html')
with open(out, 'w', encoding='utf-8') as f:
    f.write(html)

# контроль: 0 innerHTML, нет «.End of», маркер каталога заменён
assert '/*КАТАЛОГ_JSON*/' not in html, 'каталог не вшит'
assert '.innerHTML' not in html and 'innerHTML =' not in html, 'innerHTML обнаружен'
print('OK:', out)
print('размер:', len(html.encode('utf-8')), 'Б')
with open(os.path.join(P, '_assembled.js'), 'w', encoding='utf-8') as f:
    f.write(js)
print('js для проверки:', len(js.encode('utf-8')), 'Б')
