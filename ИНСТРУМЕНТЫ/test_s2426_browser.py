#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Браузерный smoke ·24/·25/·26 (Playwright).
Симуляция ДВУХ УСТРОЙСТВ в одном контексте (BroadcastChannel живёт только
внутри одного контекста): «второму устройству» задаётся уникальный deviceId
через add_init_script — так фильтр «свои пакеты не брать» (как в ·23) честно
проходит. Шум недоступных Nostr-релеев (503) не считается ошибкой модуля.
Запуск: python3 ИНСТРУМЕНТЫ/test_s2426_browser.py"""
import subprocess, time, socket, sys, os, signal

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
url_осн = None
while time.time() - время0 < 10:
    try:
        with socket.create_connection(('127.0.0.1', ПОРТ), timeout=0.5):
            url_осн = 'http://127.0.0.1:%d/' % ПОРТ
            break
    except OSError:
        time.sleep(0.2)
if not url_осн:
    print('сервер не поднялся'); сервер.kill(); sys.exit(1)

try:
    def выбери_личность(стр, имя):
        """Если оверлей закрыт (устройство помнит личность) — открыть принудительно."""
        стр.evaluate("() => { if (!document.getElementById('идентОвер').classList.contains('on')) открытьИдентОвер(); }")
        стр.evaluate("(имя) => [...document.querySelectorAll('#идентСетка .идент-карт')].find(к=>к.textContent.includes(имя)).click()", имя)
        стр.click('#идентГотово')
        стр.wait_for_timeout(400)

    with sync_playwright() as p:
        браузер = p.chromium.launch()
        контекст = браузер.new_context()   # один контекст = живой BroadcastChannel

        # ── ·24 ПОЧТА: устройство A (ПАША) + устройство B (АНЯ), письмо B → A ──
        print('\n— ·24 ПОЧТА (два устройства)')
        ошибки24 = []
        а = контекст.new_page()
        а.on('console', lambda м: ошибки24.append(м.text) if м.type == 'error' else None)
        а.goto(url_осн + 'СИНГУЛЯР_24_ПОЧТА.html')
        а.wait_for_timeout(700)
        ок('K24 на месте', а.evaluate('!!window.K24'))
        ок('оверлей «кто ты» открылся сам', а.evaluate("document.getElementById('идентОвер').classList.contains('on')"))
        ок('16 карт в сетке', а.evaluate("document.querySelectorAll('#идентСетка .идент-карт').length") == 16)
        а.evaluate("document.querySelector('#идентСетка .идент-карт').click()")
        а.click('#идентГотово')
        а.wait_for_timeout(400)
        ок('адрес ПАШИ создан', (а.evaluate('window.K24.я()') or {}).get('адрес') == 'pasha@singulyar')

        б = контекст.new_page()
        б.add_init_script("try{localStorage.setItem('singular.mail.v1.deviceId','mail-юнит-b')}catch(e){}")
        ошибки_б = []
        б.on('console', lambda м: ошибки_б.append(м.text) if м.type == 'error' else None)
        б.goto(url_осн + 'СИНГУЛЯР_24_ПОЧТА.html')
        б.wait_for_timeout(700)
        выбери_личность(б, 'АНЯ')
        ок('у «устройства B» свой deviceId', б.evaluate('window.K24.я().адрес') == 'anya@singulyar')

        б.click('#tab-compose')
        б.fill('#полеКому', 'ПАША')
        б.fill('#полеТема', 'привет из ·24')
        б.fill('#полеТекст', 'бабушка передала привет и пирожок')
        б.click('#btnОтправить')
        б.wait_for_timeout(1500)
        ок('письмо подписано ECDSA у отправителя', б.evaluate("window.K24.письма().some(п=>п.тема==='привет из ·24' && п.подписано)"))
        письмо_а = а.evaluate("(window.K24.письма().find(п=>п.тема==='привет из ·24')||{})")
        ок('ПАША получил письмо (межвкладочная шина)', письмо_а.get('папка') == 'входящие' and письмо_а.get('от') == 'anya@singulyar')
        ок('у письма ПАШИ непрочитано', а.evaluate("window.K24.письма().some(п=>п.тема==='привет из ·24' && п.папка==='входящие' && !п.прочитано)"))
        ок('·24: 0 ошибок консоли (без шума релеев)', not чистые_ошибки(ошибки24) and not чистые_ошибки(ошибки_б))

        # ── ·25 КОШЕЛЁК: бабушкин сценарий на двух устройствах ──
        print('\n— ·25 КОШЕЛЁК (бабушка → внучка, два устройства)')
        ошибки25 = []
        в = контекст.new_page()
        в.on('console', lambda м: ошибки25.append(м.text) if м.type == 'error' else None)
        в.goto(url_осн + 'СИНГУЛЯР_25_КОШЕЛЁК.html')
        в.wait_for_timeout(700)
        ок('K25 на месте', в.evaluate('!!window.K25'))
        выбери_личность(в, 'АНЯ')
        ок('баланс АНИ стартует с 0', в.evaluate('window.K25.баланс()') == 0)
        в.on('dialog', lambda d: d.accept('500'))
        в.click('#btnПополнить')
        в.wait_for_timeout(600)
        ок('пополнение +500 → баланс 500', в.evaluate('window.K25.баланс()') == 500)

        г = контекст.new_page()
        г.add_init_script("try{localStorage.setItem('singular.wallet.v1.deviceId','wal-юнит-g')}catch(e){}")
        ошибки25_2 = []
        г.on('console', lambda м: ошибки25_2.append(м.text) if м.type == 'error' else None)
        г.goto(url_осн + 'СИНГУЛЯР_25_КОШЕЛЁК.html')
        г.wait_for_timeout(700)
        выбери_личность(г, 'ЖЕНЯ')
        г.click('#tab-wishes')
        г.fill('#хотелЧто', 'пирожок в школе')
        г.fill('#хотелСколько', '50')
        г.click('#btnДобавитьХотелку')
        г.wait_for_timeout(700)
        ок('хотелка ЖЕНИ заявлена у неё', г.evaluate("window.K25.хотелки().some(х=>х.что==='пирожок в школе' && х.статус==='ждёт')"))
        в.click('#tab-wishes')
        в.wait_for_timeout(700)
        ок('хотелка ЖЕНИ видна бабушке (шина)', в.evaluate("[...document.querySelectorAll('#чужиеХотелки button')].some(б=>б.textContent.includes('закрыть молча'))"))
        в.evaluate("[...document.querySelectorAll('#чужиеХотелки button')].find(б=>б.textContent.includes('закрыть молча')).click()")
        в.wait_for_timeout(900)
        ок('бабушка закрыла молча: 500 → 450 (−50, ни одного вопроса)', в.evaluate('window.K25.баланс()') == 450)
        ок('у ЖЕНИ хотелка закрыта и баланс +50 (шина, второе устройство)',
           г.evaluate("window.K25.хотелки().some(х=>х.что==='пирожок в школе' && х.статус==='закрыта')") and г.evaluate('window.K25.баланс()') == 50)
        ок('·25: 0 ошибок консоли (без шума релеев)', not чистые_ошибки(ошибки25) and not чистые_ошибки(ошибки25_2))

        # ── ·26 ЛИНИЯ: SMS 02 → 04 и OTP-контур ──
        print('\n— ·26 ЛИНИЯ')
        ошибки26 = []
        д = контекст.new_page()
        д.on('console', lambda м: ошибки26.append(м.text) if м.type == 'error' else None)
        д.goto(url_осн + 'СИНГУЛЯР_26_ЛИНИЯ.html')
        д.wait_for_timeout(700)
        ок('K26 на месте', д.evaluate('!!window.K26'))
        выбери_личность(д, 'АНЯ')
        ок('номер АНИ = 02·АНЯ', д.evaluate("document.getElementById('мойНомерЭл').textContent") == '02·АНЯ')

        е = контекст.new_page()
        е.add_init_script("try{localStorage.setItem('singular.line.v1.deviceId','lin-юнит-e')}catch(e){}")
        ошибки26_2 = []
        е.on('console', lambda м: ошибки26_2.append(м.text) if м.type == 'error' else None)
        е.goto(url_осн + 'СИНГУЛЯР_26_ЛИНИЯ.html')
        е.wait_for_timeout(700)
        выбери_личность(е, 'ЖЕНЯ')
        ок('номер ЖЕНИ = 04·ЖЕНЯ', е.evaluate("document.getElementById('мойНомерЭл').textContent") == '04·ЖЕНЯ')

        д.click('#tab-sms')
        д.click('#btnНовыйСмс')
        д.fill('#новСмсКому', 'ЖЕНЯ')
        д.click('#новСмсГотово')
        д.wait_for_timeout(300)
        д.fill('#смсПоле', 'пирожок оплачен — беги на перемене')
        д.click('#смсПослать')
        д.wait_for_timeout(700)
        ок('SMS доставлено ЖЕНЕ (шина)', е.evaluate('window.K26.смс()') >= 1)
        ок('диалог у ЖЕНИ от номера 02', '02' in е.evaluate('window.K26.диалоги().join(",")'))
        ок('бейдж непрочитанных у ЖЕНИ горит', е.evaluate("document.getElementById('бейджСмс').hidden") == False)
        д.click('#смсНазад')
        д.click('#tab-otp')
        д.fill('#otpКому', 'ЖЕНЯ')
        д.click('#otpВыдать')
        д.wait_for_timeout(300)
        код = д.evaluate("document.getElementById('otpКодЭл').textContent")
        ок('код 6 цифр показан', len(код) == 6 and код.isdigit())
        д.fill('#otpВвод', код)
        д.click('#otpПроверить')
        д.wait_for_timeout(200)
        ок('код подтверждён (статус ok)', д.evaluate("document.getElementById('otpСтатус').className").strip() == 'status ok')
        д.fill('#otpВвод', код)
        д.click('#otpПроверить')
        ок('повтор того же кода честно отклонён', 'одноразовый' in д.evaluate("document.getElementById('otpСтатус').textContent"))
        ок('·26: 0 ошибок консоли (без шума релеев)', not чистые_ошибки(ошибки26) and not чистые_ошибки(ошибки26_2))

        # ── index.html (v1.31.0 «НИТЬ АРИАДНЫ»: титул-минимализм, двери под нитью) ──
        print('\n— index.html')
        ошибки_idx = []
        ж = контекст.new_page()
        ж.on('console', lambda м: ошибки_idx.append(м.text) if м.type == 'error' else None)
        ж.goto(url_осн + 'index.html')
        ж.wait_for_timeout(500)
        ж.click('.нить summary')
        ж.wait_for_timeout(300)
        ок('дверь ·24 ПОЧТА живёт под нитью', ж.locator('#двери a[href*="СИНГУЛЯР_24_ПОЧТА"]').count() == 1)
        ок('дверь ·25 КОШЕЛЁК живёт под нитью', ж.locator('#двери a[href*="СИНГУЛЯР_25_КОШЕЛЁК"]').count() == 1)
        ок('дверь ·26 ЛИНИЯ живёт под нитью', ж.locator('#двери a[href*="СИНГУЛЯР_26_ЛИНИЯ"]').count() == 1)
        ок('index: 0 ошибок консоли', not чистые_ошибки(ошибки_idx))

        браузер.close()
finally:
    сервер.send_signal(signal.SIGTERM)
    try: сервер.wait(timeout=3)
    except Exception: сервер.kill()

print('\n═══ БРАУЗЕРНЫЙ SMOKE: ' + str(прошло) + ' прошло, провалов: ' + str(len(провалы)) + ' ═══')
if провалы:
    print('Провалы:'); [print(' - ' + п) for п in провалы]
sys.exit(0 if not провалы else 1)
