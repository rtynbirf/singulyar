#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Тест СИСТЕМАТИЗАЦИИ v1.20: каталог вселенной на главной жив и честен.
Часть 1 (файл-система): ВСЕ локальные ссылки index.html существуют на диске
— мёртвая ссылка = провал (урок «Караоке-ЛАБ»).
Часть 2 (Playwright): раздел «Каталог вселенной» отрисован, классы К0–К9 на
месте, статус ДЕНЬГИ ·25 честный (✓ работает + ○ внешние рельсы не подключены),
версия v1.20.0, ссылка на канонический каталог отвечает 200, консоль чистая.
Запуск: python3 ИНСТРУМЕНТЫ/test_catalog_index.py"""
import re, subprocess, time, socket, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

from playwright.sync_api import sync_playwright

прошло = 0
провалы = []
def ок(имя, условие):
    global прошло
    if условие:
        прошло += 1
        print('  ✓ ' + имя)
    else:
        провалы.append(имя)
        print('  ✗ ПРОВАЛ: ' + имя)

def свободный_порт():
    s = socket.socket()
    s.bind(('127.0.0.1', 0))
    порт = s.getsockname()[1]
    s.close()
    return порт

# ---------- ЧАСТЬ 1: все локальные ссылки существуют на диске ----------
print('Часть 1 — мёртвые ссылки index.html')
х = open('index.html', encoding='utf-8').read()
цели = set(re.findall(r'(?:href|src)="([^"#]+)"', х))
лок = [ц for ц in цели if not ц.startswith(('http://', 'https://', 'mailto:', 'releases/'))
       and not ц.endswith('.css')]
битые = [ц for ц in sorted(лок) if not os.path.exists(os.path.join(ROOT, ц))]
ок('локальных ссылок/целей найдено: %d' % len(лок), len(лок) >= 40)
ок('мёртвых ссылок: 0 (было 1 — Караоке-ЛАБ, убрана)',
   len(битые) == 0 or (print('   битые: ' + ', '.join(битые)) and False))
ок('канонический каталог существует: ДОКУМЕНТЫ/СИСТЕМАТИЗАЦИЯ_ВСЕЛЕННОЙ.md',
   os.path.isfile('ДОКУМЕНТЫ/СИСТЕМАТИЗАЦИЯ_ВСЕЛЕННОЙ.md'))
канон = open('ДОКУМЕНТЫ/СИСТЕМАТИЗАЦИЯ_ВСЕЛЕННОЙ.md', encoding='utf-8').read()
ок('каталог сходится арифметикой: 4+12+7+30+9+384+56+16+121+8 = 647',
   '= **647**' in канон and '4+12+7+30+9+384+56+16+121+8' in канон)
ок('статус ДЕНЬГИ в каталоге: внешние рельсы честно НЕ подключены',
   'не подключены' in канон and 'Cashu' in канон)

# ---------- ЧАСТЬ 2: браузерный смоук ----------
print('Часть 2 — браузер (Playwright)')
ПОРТ = свободный_порт()
сервер = subprocess.Popen(['node', 'ИНСТРУМЕНТЫ/serve_repo.mjs', str(ПОРТ)],
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
время0 = time.time()
url = None
while time.time() - время0 < 10:
    try:
        with socket.create_connection(('127.0.0.1', ПОРТ), timeout=0.5):
            url = 'http://127.0.0.1:%d/' % ПОРТ
            break
    except OSError:
        time.sleep(0.2)
if not url:
    print('сервер не поднялся'); сервер.kill(); sys.exit(1)

try:
    with sync_playwright() as п:
        браузер = п.chromium.launch()
        стр = браузер.new_page()
        ошибки = []
        стр.on('console', lambda м: ошибки.append(м.text) if м.type == 'error' else None)
        стр.on('pageerror', lambda е: ошибки.append(str(е)))
        стр.goto(url, wait_until='networkidle')
        ок('главная открылась: титул СИНГУЛЯР', 'СИНГУЛЯР' in (стр.title() + стр.content()))
        тело = стр.inner_text('body')
        ок('раздел «Каталог вселенной» отрисован', 'Каталог вселенной' in тело)
        for класс in ['К0', 'К1', 'К2', 'К3', 'К4', 'К5', 'К6', 'К7', 'К8', 'К9']:
            if класс not in тело:
                ок('класс %s на месте' % класс, False)
                break
        else:
            ок('классы К0–К9 все на месте', True)
        ок('647 файлов заявлено честно', '647' in тело)
        ок('синтез на главной: ссылка СИНТЕЗ_HUMAN_RUNTIME', 'СИНТЕЗ_HUMAN_RUNTIME' in тело)
        ок('провенанс на главной: ГОТОВНОСТЬ.manifest.json', 'ГОТОВНОСТЬ.manifest.json' in тело)
        ок('статус ДЕНЬГИ ·25 показан', 'ДЕНЬГИ ·25' in тело and 'ВЕБ МАНИ' in тело)
        ок('честное ○: внешние рельсы не подключены', 'НЕ подключены' in тело)
        ок('бейдж версии v1.21.0', 'v1.21.0' in тело)
        # канонический каталог открывается по ссылке
        resp = стр.request.get(url + 'ДОКУМЕНТЫ/СИСТЕМАТИЗАЦИЯ_ВСЕЛЕННОЙ.md')
        ок('СИСТЕМАТИЗАЦИЯ_ВСЕЛЕННОЙ.md отвечает 200', resp.ok)
        resp2 = стр.request.get(url + 'ДОКУМЕНТЫ/СИНТЕЗ_HUMAN_RUNTIME.md')
        ок('СИНТЕЗ_HUMAN_RUNTIME.md отвечает 200', resp2.ok)
        resp3 = стр.request.get(url + 'ГОТОВНОСТЬ.manifest.json')
        ок('ГОТОВНОСТЬ.manifest.json отвечает 200', resp3.ok)
        чистые = [о for о in ошибки if 'favicon' not in о.lower()]
        ок('консоль чистая (0 ошибок), шум: %d' % len(чистые), len(чистые) == 0
           or (print('   ошибки: ' + ' | '.join(чистые[:3])) and False))
        браузер.close()
finally:
    сервер.kill()

print('\nИТОГ: %d/%d прошло' % (прошло, прошло + len(провалы)))
sys.exit(1 if провалы else 0)
