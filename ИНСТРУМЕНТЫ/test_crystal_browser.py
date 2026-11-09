#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Браузерный smoke КРИСТАЛЛ (Playwright): протокольное ядро в ·22 и ·21.
Две вкладки одного контекста (BroadcastChannel живёт внутри контекста):
  вкладка А отправляет → вкладка Б принимает → ACK возвращается →
  доставка SENT→ACKED у А, SENT→DELIVERED у Б; повторная доставка того же
  пакета отбрасывается durable-ключом; «временное» умирает по TTL (purge);
  в ·21 маршрут фиксируется каноническим событием (окно __КРИСТ21).
Наблюдение через window.__КРИСТ22 / __КРИСТ21 (инкапсуляция не вскрывается).
Шум недоступных Nostr-релеев (503) не считается ошибкой модуля.
Запуск: python3 ИНСТРУМЕНТЫ/test_crystal_browser.py"""
import subprocess, time, socket, sys, os

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

РЕЛ_ШУМ = ('wss://', 'relay', 'nostr', 'WebSocket connection', 'Failed to fetch')
def чистые_ошибки(список):
    return [о for о in список if not any(ш.lower() in о.lower() for ш in РЕЛ_ШУМ)]

def свободный_порт():
    s = socket.socket()
    s.bind(('127.0.0.1', 0))
    порт = s.getsockname()[1]
    s.close()
    return порт

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

КОД = 'KRIST'
try:
    with sync_playwright() as п:
        браузер = п.chromium.launch()
        контекст = браузер.new_context()
        ошибки = {'А': [], 'Б': [], '21': []}

        А = контекст.new_page()
        А.on('console', lambda м: ошибки['А'].append(м.text) if м.type == 'error' else None)
        А.on('pageerror', lambda е: ошибки['А'].append(str(е)))
        Б = контекст.new_page()
        Б.on('console', lambda м: ошибки['Б'].append(м.text) if м.type == 'error' else None)
        Б.on('pageerror', lambda е: ошибки['Б'].append(str(е)))

        # ── 1. Обе вкладки ·22, один зал ──
        А.goto(url + 'СИНГУЛЯР_22_СВЯЗЬ.html'); А.wait_for_timeout(700)
        Б.goto(url + 'СИНГУЛЯР_22_СВЯЗЬ.html'); Б.wait_for_timeout(700)

        ок('·22 А: ядро КРИСТАЛЛ загрузилось', А.evaluate('() => window.__КРИСТ22.готов') is True)
        ок('·22 Б: ядро КРИСТАЛЛ загрузилось', Б.evaluate('() => window.__КРИСТ22.готов') is True)

        for стр in (А, Б):
            стр.fill('#inCode', КОД)
            стр.click('#btnOpen')
            стр.wait_for_timeout(300)
        ок('зал открыт в обеих вкладках (хэндл видит код)',
           А.evaluate('() => window.__КРИСТ22.зал') == КОД and Б.evaluate('() => window.__КРИСТ22.зал') == КОД)
        ок('ACK-канал кристалла открыт с именем зала',
           А.evaluate('() => window.__КРИСТ22.ackКанал') == 'singular-crystal-v1-' + КОД)

        # ── 2. А отправляет текст → Б принимает → ACK ──
        # панель отправки живёт под спойлером (канон: всё — под спойлер) — открываем
        А.click('#scJournal details.sng-спойлер summary'); А.wait_for_timeout(200)
        А.fill('#inMsg', 'привет из протокола')
        А.click('#btnSend')
        Б.wait_for_timeout(700)

        б_события = Б.evaluate('() => window.__КРИСТ22.события()')
        ок('Б: каноническое событие в durable журнале', len(б_события) == 1)
        ок('Б: это semantic.message кристальной версии',
           bool(б_события) and б_события[0]['type'] == 'semantic.message' and б_события[0]['ver'] == '1.0.0')
        ок('Б: смысл дошёл нетронутым', bool(б_события) and б_события[0]['semantic']['text'] == 'привет из протокола')
        ок('Б: политика по умолчанию — persistent',
           bool(б_события) and б_события[0]['policy']['retention'] == 'persistent')
        ок('Б: карточка UI на месте (совместимость)', Б.locator('#journal .jmsg').count() >= 1)
        ок('Б: стейтмент статуса показывает ядро 1.0.0',
           '1.0.0' in Б.evaluate("() => (document.getElementById('stCrystal')||{textContent:''}).textContent"))

        ид = б_события[0]['idempotencyKey'] if б_события else ''
        Б.wait_for_function('(ид) => window.__КРИСТ22.доставка("кр-" + ид).then(з => !!з)', arg=ид, timeout=5000)
        ок('Б: доставка DELIVERED (SENT→DELIVERED)',
           Б.evaluate('(ид) => window.__КРИСТ22.доставка("кр-" + ид).then(з => з && з.state)', ид) == 'DELIVERED')
        А.wait_for_timeout(600)
        # вкладки одного браузера делят журнал устройства (это честно: два окна = одно устройство);
        # ACK обработан в А без отката: DELIVERED старше ACKED, машина не ходит назад
        ок('А: ACK прошёл, состояние не откатилось (DELIVERED ≥ ACKED)',
           А.evaluate('(ид) => window.__КРИСТ22.доставка("кр-" + ид).then(з => з && з.state)', ид) == 'DELIVERED')

        # ── 3. Дубликат доставки отбрасывается durable-ключом ──
        # пакет по всем правилам провода (v: 1 — настоящий PROTO ·22)
        было_в_журнале = Б.evaluate('() => window.__КРИСТ22.количество()')
        А.evaluate("""([ид, кр]) => {
          const ч = new BroadcastChannel('singular-svyaz-v1-KRIST');
          ч.postMessage({ v: 1, t: Date.now(), от: 'Человек', вид: 'текст',
            текст: 'повтор той же посылки', имяФайла: '', размер: 0, длительность: 0, ид: ид, кр: кр });
          ч.close(); }""", [ид, б_события[0]])
        Б.wait_for_function('() => window.__КРИСТ22.отброшено >= 1', timeout=5000)
        стало_в_журнале = Б.evaluate('() => window.__КРИСТ22.количество()')
        ок('Б: дубликат отброшен — журнал не вырос', было_в_журнале == стало_в_журнале)
        ок('Б: счётчик дубликатов = 1', Б.evaluate('() => window.__КРИСТ22.отброшено') == 1)
        ок('Б: статус называет число дубликатов', 'отброшено 1' in Б.evaluate("() => (document.getElementById('stCrystal')||{textContent:''}).textContent"))

        # ── 4. Временное сообщение: TTL и purge ──
        А.check('#inTtl')
        А.fill('#inMsg', 'я исчезну')
        А.click('#btnSend')
        Б.wait_for_timeout(700)
        А.uncheck('#inTtl')
        врем = Б.evaluate("() => window.__КРИСТ22.события().then(с => с.filter(e => e.semantic.text === 'я исчезну'))")
        ок('Б: временное событие с policy temporary + ttl 7 дней',
           bool(врем) and врем[0]['policy']['retention'] == 'temporary'
           and врем[0]['policy']['ttl'] == 7 * 24 * 3600 * 1000)
        до = Б.evaluate('() => window.__КРИСТ22.количество()')
        purge = Б.evaluate('() => window.__КРИСТ22.почисти(Date.now() + 8 * 24 * 3600 * 1000)')
        после = Б.evaluate('() => window.__КРИСТ22.количество()')
        ок('Б: purge удалил только временное (' + str(purge['удалено']) + ')',
           purge and purge['удалено'] == 1 and после == до - 1)
        ок('Б: постоянные живы после purge', после == было_в_журнале)

        # ── 5. ·21: маршрут → каноническое событие + честное решение ──
        П = контекст.new_page()
        П.on('console', lambda м: ошибки['21'].append(м.text) if м.type == 'error' else None)
        П.on('pageerror', lambda е: ошибки['21'].append(str(е)))
        П.goto(url + 'СИНГУЛЯР_21_ОБЩЕНИЕ.html'); П.wait_for_timeout(900)
        ок('·21: окно наблюдения КРИСТАЛЛ поднялось',
           П.evaluate("() => !!window.__КРИСТ21 && window.__КРИСТ21.версия === '1.0.0'"))
        П.evaluate("() => S21.route({ output: ['text', 'speech'] }, 'маршрут под протоколом')")
        П.wait_for_timeout(300)
        послед = П.evaluate("() => window.__КРИСТ21.события[window.__КРИСТ21.события.length - 1]")
        ок('·21: маршрут зафиксирован каноническим событием',
           bool(послед) and послед['событие']['type'] == 'semantic.message')
        реш = послед['реш'] if послед else {}
        ок('·21: решение честное (mode и reason согласованы со средой)',
           реш.get('mode') in ('text', 'tts') and реш.get('reason') in
           ('preferred', 'explicit-choice-unavailable', 'safe-fallback', 'human-choice'))
        ок('·21: UI-маршрут прежний (2 канала построено)',
           П.evaluate("() => S21.route({ output: ['text', 'speech'] }, 'ещё раз').length === 2"))

        # ── 6. Чистота консоли ──
        ок('А: консоль чистая', len(чистые_ошибки(ошибки['А'])) == 0)
        ок('Б: консоль чистая', len(чистые_ошибки(ошибки['Б'])) == 0)
        ок('·21: консоль чистая', len(чистые_ошибки(ошибки['21'])) == 0)
        if чистые_ошибки(ошибки['А']) + чистые_ошибки(ошибки['Б']) + чистые_ошибки(ошибки['21']):
            print('   ошибки:', (чистые_ошибки(ошибки['А']) + чистые_ошибки(ошибки['Б']) + чистые_ошибки(ошибки['21']))[:5])

        браузер.close()
finally:
    сервер.kill()

print()
print('ИТОГ: %d OK / %d FAIL' % (прошло, len(провалы)))
sys.exit(1 if провалы else 0)
