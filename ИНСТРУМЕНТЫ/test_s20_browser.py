#!/usr/bin/env python3
# Браузерный тест ·20 ФОНЕТИКА: загрузка бандла, чипы-слоги по образцам,
# ручной ввод, тап по чипу без голосов, мост ·16 (BroadcastChannel STATE →
# большое слово + романизация + «далее»), фильтр мусора, 0 ошибок консоли.
# Запуск: python3 ИНСТРУМЕНТЫ/test_s20_browser.py   (пути считаются от файла — из любого клона репо)
import subprocess, time, sys, os, json
from playwright.sync_api import sync_playwright

РЕПО = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # корень репо
PORT = int(os.environ.get('S20_PORT', '8923'))
URL = f'http://127.0.0.1:{PORT}/СИНГУЛЯР_20_ФОНЕТИКА.html'

прошло = []
упало = []
def ок(name, cond, extra=''):
    (прошло if cond else упало).append(name)
    print(('  ✓ ' if cond else '  ✗ FAIL: ') + name + (('' if cond else ' | ' + str(extra))))

def http_serve():
    # python3 -m http.server в этой песочнице виснет (мёртвый пайп при capture_output)
    # → статический сервер на node: ИНСТРУМЕНТЫ/serve_repo.mjs
    subprocess.run(['node', os.path.join(РЕПО, 'ИНСТРУМЕНТЫ', 'serve_repo.mjs'), str(PORT), РЕПО],
                   capture_output=True)

import threading
t = threading.Thread(target=http_serve, daemon=True)
t.start()
time.sleep(1.2)

def послать_стейт(page, word, nxt, song='Тестовая песня'):
    page.evaluate('''([w, n, s]) => {
        const bc = new BroadcastChannel('singulyar-hall');
        bc.postMessage({ver:1, t:'STATE', src:'stage-test1', seq:1, ts:Date.now(),
            d:{song:s, playing:true, pos:1.5, dur:200, score:0, combo:0, rating:'',
               pitch:null, word:w, next:n, notes:[]}});
        bc.close();
    }''', [word, nxt, song])

with sync_playwright() as p:
    browser = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    ctx = browser.new_context()
    ошибки = []
    A = ctx.new_page()
    A.on('console', lambda m: ошибки.append(m.text) if m.type == 'error' else None)
    A.on('pageerror', lambda e: ошибки.append(str(e)))

    print('— ЗАГРУЗКА')
    A.goto(URL)
    A.wait_for_function('!document.getElementById("btnRoma").disabled', timeout=15000)
    ок('бандл any-ascii загружен (кнопка активна)', True)
    ок('тег ядра честный', 'ISC' in A.text_content('#coreTag') or 'any-ascii' in A.text_content('#coreTag'))
    ок('языков в селекте ≥ 35', A.evaluate('document.querySelectorAll("#selLang option").length') >= 35)
    ок('образцов 8 письменностей', A.evaluate('document.querySelectorAll("#samples button").length') == 8)

    print('— ОБРАЗЕЦ zh: хань по слогам')
    A.click('#samples button[data-lang="zh"]')
    A.wait_for_selector('#chips:not([hidden])')
    n = A.evaluate('document.querySelectorAll("#chips .chip").length')
    ок('当我们失去彼此的时候 → 10 слог-чипов', n == 10, n)
    r0 = A.text_content('#chips .chip:nth-child(1) .r')
    ок('первый слог «dang»', r0 == 'dang', r0)
    ок('статус: язык zh', 'язык TTS: zh' in A.text_content('#status'))

    print('— ОБРАЗЕЦ ru: слова целиком')
    A.click('#samples button[data-lang="ru"]')
    A.wait_for_function('document.querySelectorAll("#chips .chip").length === 2')
    ок('Когда теряем → 2 чипа', True)
    r1 = A.text_content('#chips .chip:nth-child(1) .r')
    r2 = A.text_content('#chips .chip:nth-child(2) .r')
    ок('романизация Kogda/teryaem', r1 == 'Kogda' and r2 == 'teryaem', r1 + '/' + r2)
    ок('статус: язык ru', 'язык TTS: ru' in A.text_content('#status'))

    print('— РУЧНОЙ ВВОД: hangul')
    A.fill('#txtIn', '우리가 잃을 때')
    A.click('#btnRoma')
    A.wait_for_function('document.querySelectorAll("#chips .chip").length === 6')
    ок('우리가 잃을 때 → 6 слог-чипов', True)
    a0 = A.get_attribute('#chips .chip:nth-child(1)', 'aria-label')
    ок('aria-label чипа описывает слово', 'u' in a0 and 'произнести' in a0, a0)

    print('— TAP ПО ЧИПУ без голосов: не должно падать')
    A.click('#chips .chip:nth-child(2)')
    A.wait_for_timeout(300)
    ок('тап не уронил страницу', A.evaluate('document.querySelectorAll("#chips .chip").length') == 6)

    print('— ПРОИЗНЕСТИ ВСЁ (headless без голосов — честный статус)')
    A.click('#btnSpeak')
    A.wait_for_timeout(300)
    ст = A.text_content('#status')
    ок('статус честный (голос по умолчанию или TTS-нет)', ('голос' in ст) or ('TTS' in ст), ст)

    print('— МОСТ ·16: живой STATE')
    послать_стейт(A, 'теряем', ['всё', 'сразу'])
    A.wait_for_selector('#bwBox:not([hidden])')
    ок('блок слова показан', True)
    ок('слово «теряем»', A.text_content('#bwOrig').strip() == 'теряем')
    ок('романизация «teryaem»', A.text_content('#bwRoma').strip() == 'teryaem')
    ок('песня подписана', 'Тестовая песня' in A.text_content('#bwSong'))
    ок('точка live', 'live' in A.get_attribute('#bwdot', 'class'))
    nxt = A.evaluate('Array.from(document.querySelectorAll("#bwNext .chip .o")).map(e=>e.textContent)')
    ок('«далее»: всё, сразу', nxt == ['всё', 'сразу'], nxt)
    nroma = A.evaluate('Array.from(document.querySelectorAll("#bwNext .chip .r")).map(e=>e.textContent)')
    ок('«далее» романизировано', nroma == ['vse', 'srazu'], nroma)
    ок('aria-live обновлён', 'teryaem' in A.text_content('#bwLive'))

    print('— МОСТ: смена слова')
    послать_стейт(A, 'когда', [], 'Вторая песня')
    A.wait_for_function('document.getElementById("bwOrig").textContent.trim() === "когда"')
    ок('слово сменилось', True)
    ок('романизация «kogda»', A.text_content('#bwRoma').strip() == 'kogda')
    ок('«далее» пусто → чипы скрыты', A.evaluate('document.getElementById("bwNext").hidden'))

    print('— МОСТ: фильтр мусора')
    было = A.text_content('#bwOrig').strip()
    A.evaluate('''() => {
        const bc = new BroadcastChannel('singulyar-hall');
        bc.postMessage({ver:1, t:'CMD', src:'stage-test1', seq:2, cmd:'seek', v:5});
        bc.postMessage({ver:2, t:'STATE', src:'stage-test1', seq:3, d:{word:'МУСОР', next:[]}});
        bc.postMessage({ver:1, t:'STATE', src:'stage-test1', seq:4, d:{song:'x', next:[]}});
        bc.close();
    }''')
    A.wait_for_timeout(400)
    ок('CMD/ver2/STATE-без-word проигнорированы', A.text_content('#bwOrig').strip() == было)

    print('— МЕДЛЕННО + ручной язык')
    A.check('#chkSlow')
    A.select_option('#selLang', 'ja')
    A.click('#samples button[data-lang="ru"]')
    A.wait_for_function('document.querySelectorAll("#chips .chip").length === 2')
    ок('ручной override ja не ломает романизацию', A.text_content('#chips .chip:nth-child(1) .r') == 'Kogda')
    A.select_option('#selLang', '')

    print('— 0 ОШИБОК КОНСОЛИ')
    ок('консоль чистая', len(ошибки) == 0, ошибки[:5])

    browser.close()

print()
print(f'ИТОГО: {len(прошло)} OK / {len(упало)} FAIL')
sys.exit(1 if упало else 0)
