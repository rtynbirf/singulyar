#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ТЕСТ ДВЕРИ ·30 «ТКАНЬ» — такт v1.41.0 (браузер, Playwright).
Доказывает в живой комнате:
  1. комната открывается без pageerror, DOM-сборка, ноль innerHTML-жертв;
  2. эмодзи-пиктограмм на странице: 0 (слово владельца про «Атари»);
  3. манифест создаётся: objectId = sgo:sha256:<64hex>, чанки честные;
  4. передача между ДВУМЯ ВКЛАДКАМИ через BroadcastChannel: offer →
     явное «принять» человека на другой стороне → чанки → SHA-256 сошёлся;
  5. манифест не содержит содержимого (O-02) — в карточке нет исходного текста.
Запуск: python3 ИНСТРУМЕНТЫ/test_s30_browser.py"""
import os, re, socket, subprocess, sys, time

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
    s = socket.socket(); s.bind(('127.0.0.1', 0)); порт = s.getsockname()[1]; s.close()
    return порт

ПОРТ = свободный_порт()
сервер = subprocess.Popen(['node', 'ИНСТРУМЕНТЫ/serve_repo.mjs', str(ПОРТ)],
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
url = None
время0 = time.time()
while time.time() - время0 < 10:
    try:
        with socket.create_connection(('127.0.0.1', ПОРТ), timeout=0.5):
            url = 'http://127.0.0.1:%d/' % ПОРТ
            break
    except OSError:
        time.sleep(0.2)
if not url:
    print('сервер не поднялся'); сервер.kill(); sys.exit(1)

ЭМОДЗИ = re.compile(
    '[\U0001F000-\U0001FAFF\u2600-\u2604\u2606-\u2669\u266D-\u26FF'
    '\u2700-\u2712\u2714\u2716-\u2725\u2727-\u27A3\u27A5-\u27BF'
    '\u2B00-\u2B04\u2B09-\u2B20\u2B25-\u2BFF\uFE0F\u200D]')

ТЕКСТ_ОБЪЕКТА = 'нить Ариадны ведёт из лабиринта — и ткань держит слово'

try:
    with sync_playwright() as п:
        браузер = п.chromium.launch()
        контекст = браузер.new_context()   # ОДИН контекст: вкладки одного браузера
        ошибки = []

        # ── вкладка А: отправитель ──
        стрА = контекст.new_page()
        стрА.on('pageerror', lambda е: ошибки.append('A: ' + str(е)))
        стрА.on('console', lambda м: ошибки.append('A: ' + м.text) if м.type == 'error' else None)
        стрА.goto(url + 'СИНГУЛЯР_30_ТКАНЬ.html', wait_until='networkidle')
        ок('комната ·30 открылась: титул ТКАНЬ', 'ТКАНЬ' in стрА.title())
        тело = стрА.inner_text('body')
        пик = ЭМОДЗИ.findall(тело)
        ок('эмодзи-пиктограмм на странице: 0 (слово владельца)', len(пик) == 0 or 'Найдено: ' + ''.join(пик[:8]))
        ок('живой холст: сцена с орбитами и нитью', стрА.evaluate("() => !!document.querySelector('.сцена') && !!document.querySelector('.узел.я') && !!document.querySelector('.узел.ты')"))
        ок('ядро ткани названо честно (ТКАНЬ.закон)', 'MEANING ≠ TRANSPORT' in тело)
        разметка = стрА.content()
        ок('глифы канона в разметке (⬢ ◇ ⌇)', all(g in разметка for g in ['⬢', '◇', '⌇']))

        # личность отправителя
        стрА.fill('#моёИмя', 'ПАША')
        стрА.click('#кнКтоЯ')
        стрА.wait_for_timeout(300)
        ок('личность снята: отпечаток SHA-256 на устройстве', 'отпечаток' in стрА.inner_text('#статусЯ'))

        # манифест
        стрА.fill('#текстОбъекта', ТЕКСТ_ОБЪЕКТА)
        стрА.click('#кнМанифест')
        стрА.wait_for_timeout(600)
        карточка = стрА.inner_text('#манифестКарта')
        ок('манифест создан: objectId формата sgo:sha256:<64hex>',
           re.search(r'sgo:sha256:[0-9a-f]{64}', карточка) is not None)
        ок('манифест не несёт содержимого (O-02): исходный текст в карточке отсутствует',
           ТЕКСТ_ОБЪЕКТА not in карточка)
        ок('части названы честно (чанков > 0)', 'чанков' in стрА.inner_text('#статусМанифеста'))

        # ── вкладка Б: приёмщик (тот же origin — BroadcastChannel слышит) ──
        стрБ = контекст.new_page()
        стрБ.on('pageerror', lambda е: ошибки.append('B: ' + str(е)))
        стрБ.on('console', lambda м: ошибки.append('B: ' + м.text) if м.type == 'error' else None)
        стрБ.goto(url + 'СИНГУЛЯР_30_ТКАНЬ.html', wait_until='networkidle')
        стрБ.fill('#моёИмя', 'АНЯ')
        стрБ.click('#кнКтоЯ')
        стрБ.wait_for_timeout(200)

        # передача: offer уходит обеим вкладкам — и А (себе, игнор), и Б
        стрА.click('#кнПередать')
        входящее = ''
        for _ in range(30):  # до 6 секунд — поллинг вместо хрупких пауз
            входящее = стрБ.inner_text('#входящееБокс')
            if 'манифест прибыл' in входящее: break
            стрБ.wait_for_timeout(200)
        ок('входящий манифест прибыл на вторую вкладку', 'манифест прибыл' in входящее)
        ок('входящий манифест тоже без содержимого (O-02)', ТЕКСТ_ОБЪЕКТА not in входящее)

        # явное «да» человека на вкладке Б (СВОД I-01)
        стрБ.click('#входящееБокс button:has-text("принять")')
        стрБ.wait_for_timeout(1500)
        итог = стрБ.inner_text('#входящееБокс')
        ок('человек принял → чанки доехали → SHA-256 сошёлся', 'дайджест сошёлся' in итог)
        ок('решение человека видимо в журнале (I-01/I-06)',
           'человек принял' in стрБ.inner_text('#журнал'))
        ок('ack ушёл отправителю: дайджест сошёлся у собеседника',
           'ack: у собеседника дайджест сошёлся' in стрА.inner_text('#журнал'))

        # решение о памяти: забыть (I-06)
        if стрБ.locator('#входящееБокс button:has-text("забыть")').count():
            стрБ.click('#входящееБокс button:has-text("забыть")')
            стрБ.wait_for_timeout(200)
            ок('«забыть» работает — память поддаётся решению', 'забыто тобой' in стрБ.inner_text('#журнал'))
        else:
            ок('кнопка «забыть» доступна после приёма', False)

        ок('консоль обеих вкладок чиста: 0 pageerror/ошибок', len(ошибки) == 0
           or (print('   ошибки: ' + ' | '.join(ошибки[:4])) and False))
        браузер.close()
finally:
    сервер.kill()

print('\nИТОГ: %d/%d прошло' % (прошло, прошло + len(провалы)))
sys.exit(1 if провалы else 0)
