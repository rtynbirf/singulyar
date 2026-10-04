#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Браузерный smoke КРИПТЫ (Playwright): тёрки зала остаются в зале.
Три вкладки одного контекста:
  А и Б открыли зал С ОДНОЙ фразой зала → тексты запечатаны (AES-GCM);
  В открыл тот же зал БЕЗ фразы — «вся Европа»: видит честное «запечатано».
Проверки: на проводе нет plaintext; в durable журнале кристалла нет
plaintext; участник с фразой читает; снiffer видит только шифровку;
доставка/ACK/дедуп не сломаны; консоль чистая.
Наблюдение только через window.__КРИСТ22 (инкапсуляция не вскрывается).
Запуск: python3 ИНСТРУМЕНТЫ/test_crypto_browser.py"""
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

КОД = 'KRYP'
ФРАЗА = 'гутарим только в комнате'
СЕКРЕТ = 'тёрка про кошелёк бабушки остаётся в зале'

try:
    with sync_playwright() as п:
        браузер = п.chromium.launch()
        контекст = браузер.new_context()
        ошибки = {'А': [], 'Б': [], 'В': []}

        def вкладка(имя):
            стр = контекст.new_page()
            стр.on('console', lambda м, н=имя: ошибки[н].append(м.text) if м.type == 'error' else None)
            стр.on('pageerror', lambda е, н=имя: ошибки[н].append(str(е)))
            стр.goto(url + 'СИНГУЛЯР_22_СВЯЗЬ.html')
            стр.wait_for_timeout(700)
            return стр

        А = вкладка('А'); Б = вкладка('Б'); В = вкладка('В')

        ок('А: ядро КРИСТАЛЛ + крипта-слой загрузились',
           А.evaluate('() => window.__КРИСТ22.готов') is True
           and А.evaluate('() => window.__КРИСТ22.крипта.доступно') is True)

        # ── 1. А и Б открывают зал с одной фразой; В — без фразы ──
        for стр in (А, Б):
            стр.fill('#inCode', КОД)
            стр.fill('#inPass', ФРАЗА)
            стр.click('#btnOpen')
            стр.wait_for_function('() => (document.getElementById("stКрипта").textContent || "").includes("вкл")', timeout=8000)
        В.fill('#inCode', КОД)
        В.click('#btnOpen')
        В.wait_for_timeout(400)

        ок('А: крипта включена, отпечаток kid 16 hex',
           А.evaluate('() => window.__КРИСТ22.крипта.вкл') is True
           and len(А.evaluate('() => window.__КРИСТ22.крипта.kid')) == 16)
        ок('Б: ключ тот же (kid совпал) — одна фраза = один ключ',
           А.evaluate('() => window.__КРИСТ22.крипта.kid') == Б.evaluate('() => window.__КРИСТ22.крипта.kid'))
        ок('В («Европа»): крипта выкл — фразы нет',
           В.evaluate('() => window.__КРИСТ22.крипта.вкл') is False)
        К1 = А.evaluate('() => window.__КРИСТ22.крипта.kid')

        # ── 2. Сниффер провода: слушает сырой BroadcastChannel как «Европа» ──
        В.evaluate("""(код) => {
          const с = new BroadcastChannel('singular-svyaz-v1-' + код);
          window.__СНИФ = [];
          с.onmessage = (е) => window.__СНИФ.push(JSON.parse(JSON.stringify(е.data)));
        }""", КОД)

        # ── 3. А гутарит секрет → Б читает, В видит замок ──
        А.fill('#inMsg', СЕКРЕТ)
        А.click('#btnSend')
        Б.wait_for_function('(с) => document.getElementById("journal").innerText.includes(с)', arg=СЕКРЕТ, timeout=8000)
        В.wait_for_timeout(800)

        ок('Б: участник с фразой читает тёрку (вскрыто у получателя)',
           СЕКРЕТ in (Б.locator('#journal').inner_text() or ''))
        ок('В: без фразы — честное «запечатано», не пустота',
           'запечатано' in (В.locator('#journal').inner_text() or '') and СЕКРЕТ not in (В.locator('#journal').inner_text() or ''))

        сниф = В.evaluate('() => window.__СНИФ || []')
        текстовые = [с for с in сниф if isinstance(с, dict) and с.get('вид') == 'текст']
        ок('Сниффер: пакет пойман на проводе', len(текстовые) >= 1)
        все_шифровки = bool(текстовые) and all(
            с.get('текст', 'НЕПУСТО') == '' and isinstance(с.get('шф'), dict) and bool(с['шф'].get('ct'))
            for с in текстовые)
        ок('Сниффер («Европа»): plaintext НЕТ на проводе, есть шифровка (шф)', все_шифровки)

        # ── 4. durable журнал кристалла: только шифровка ──
        б_события = Б.evaluate('() => window.__КРИСТ22.события()')
        ок('Б: запечатанное событие в durable журнале', len(б_события) >= 1)
        сыр = Б.evaluate('() => window.__КРИСТ22.события().then(с => JSON.stringify(с))')
        ок('Б: plaintext НЕТ в журнале кристалла', СЕКРЕТ not in сыр)
        ок('Б: событие помечено «запечатано», вложение kind:sealed',
           'запечатано' in сыр and '"kind":"sealed"' in сыр.replace(' ', ''))

        # ── 5. доставка не сломана: SENT→DELIVERED, ACK ──
        ид = б_события[0]['idempotencyKey'] if б_события else ''
        Б.wait_for_function('(ид) => window.__КРИСТ22.доставка("кр-" + ид).then(з => !!з)', arg=ид, timeout=5000)
        ок('Б: доставка DELIVERED при запечатанном событии',
           Б.evaluate('(ид) => window.__КРИСТ22.доставка("кр-" + ид).then(з => з && з.state)', ид) == 'DELIVERED')

        # ── 6. дедуп переживает шифровку: повтор отброшен ──
        было = Б.evaluate('() => window.__КРИСТ22.количество()')
        А.evaluate("""([ид, кр]) => {
          const ч = new BroadcastChannel('singular-svyaz-v1-KRYP');
          ч.postMessage({ v: 1, t: Date.now(), от: 'Человек', вид: 'текст',
            текст: '', шф: { v: 1, alg: 'A256GCM', iv: 'AAAA', ct: 'BBBB', kid: 'ff' }, имяФайла: '', размер: 0, длительность: 0, ид: ид, кр: кр });
          ч.close(); }""", [ид, б_события[0]])
        Б.wait_for_function('() => window.__КРИСТ22.отброшено >= 1', timeout=5000)
        ок('Б: дубликат шифровки отброшен durable-ключом', было == Б.evaluate('() => window.__КРИСТ22.количество()'))

        # ── 6а. v2: ротация эпох ──
        ок('v2: у А эпоха 1, карта эпох [1]',
           А.evaluate('() => window.__КРИСТ22.крипта.эпоха') == 1
           and А.evaluate('() => window.__КРИСТ22.крипта.эпохиВпамяти') == [1])
        А.click('#btnEpo')
        А.wait_for_function('() => window.__КРИСТ22.крипта.эпоха === 2', timeout=10000)
        ок('v2: А в эпохе 2, ключей в памяти [1, 2]',
           А.evaluate('() => window.__КРИСТ22.крипта.эпоха') == 2
           and А.evaluate('() => window.__КРИСТ22.крипта.эпохиВпамяти') == [1, 2])
        ок('v2: отпечаток эпохи 2 ≠ эпохи 1 (ротация реальна)',
           А.evaluate('() => window.__КРИСТ22.крипта.kid') != К1)

        # А шлёт в эпохе 2 → Б (ещё эпоха 1, та же ФРАЗА) ЧИТАЕТ: v1.25.1 выводит
        # ключ чужой эпохи из фразы (фраза — корень, ручная синхронизация эпох больше
        # не нужна). Честная граница та же: у кого фразы нет — тот не читает.
        А.fill('#inMsg', 'текст новой эпохи')
        А.click('#btnSend')
        Б.wait_for_function('(с) => document.getElementById("journal").innerText.includes(с)', arg='текст новой эпохи', timeout=8000)
        ок('v1.25.1: Б с той же фразой читает новую эпоху БЕЗ ручной синхронизации (деривация по фразе)', True)

        # «Европа» (крипта выкл — фразы нет) по-прежнему видит честный замок
        # (проверено выше: «В: без фразы — честное запечатано»)

        # Б объявляет эпоху 2 (та же фраза → тот же ключ эпохи 2) — тоже читает
        Б.click('#btnEpo')
        Б.wait_for_function('() => window.__КРИСТ22.крипта.эпоха === 2', timeout=10000)
        А.fill('#inMsg', 'эпоха два читаемо')
        А.click('#btnSend')
        Б.wait_for_function('(с) => document.getElementById("journal").innerText.includes(с)', arg='эпоха два читаемо', timeout=8000)
        ок('v2: Б догнал эпоху 2 той же фразой — новое сообщение вскрывается', True)

        # durable журнал: вложение sealed несёт ep:2
        сыр2 = Б.evaluate('() => window.__КРИСТ22.события().then(с => JSON.stringify(с))')
        ок('v2: в журнале кристалла вложение sealed с ep:2', '"ep":2' in сыр2)
        ок('v2: plaintext новых эпох НЕТ в журнале', 'эпоха два читаемо' not in сыр2)

        # стирание прошлого: остаётся только текущая эпоха
        Б.click('#btnWipe')
        ок('v2: стирание — в памяти Б только эпоха 2',
           Б.evaluate('() => window.__КРИСТ22.крипта.эпохиВпамяти') == [2])
        ок('v2: статус стирания честно говорит «не форвард-секретность»',
           'не форвард-секретность' in (Б.locator('#stEpo').inner_text() or ''))

        # ── 6б. v2: верификация ·19 (в этом контексте личности нет — честный вердикт) ──
        ок('v2: приветствие без ·19 — «БЕЗ подписи», имя не подтверждено',
           'БЕЗ подписи' in (Б.locator('#stVer').inner_text() or ''))

        # ── 7. консоль чистая ×3 ──
        ок('А: консоль чистая', len(чистые_ошибки(ошибки['А'])) == 0)
        ок('Б: консоль чистая', len(чистые_ошибки(ошибки['Б'])) == 0)
        ок('В: консоль чистая', len(чистые_ошибки(ошибки['В'])) == 0)
        if чистые_ошибки(ошибки['А']) + чистые_ошибки(ошибки['Б']) + чистые_ошибки(ошибки['В']):
            print('   ошибки:', (чистые_ошибки(ошибки['А']) + чистые_ошибки(ошибки['Б']) + чистые_ошибки(ошибки['В']))[:5])

        браузер.close()
finally:
    сервер.kill()

print()
print('ИТОГ: %d OK / %d FAIL' % (прошло, len(провалы)))
sys.exit(1 if провалы else 0)
