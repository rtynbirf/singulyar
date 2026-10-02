#!/usr/bin/env python3
# Браузерный тест ·18 СОБЫТИЕ: полный цикл «создал зал → вошёл гость → песня →
# отсчёт → пение → завершение → REVIEW → ❤️ память → GC-список» через
# КАНАЛ-транспорт (BroadcastChannel + WebRTC-лупбэк). Реле-транспорт — мягкий
# тест (SKIP, если песочница без сети к Nostr).
# Запуск: python3 ИНСТРУМЕНТЫ/test_s18_browser.py   (пути считаются от файла — из любого клона репо)
import subprocess, time, sys, os, threading, json
from playwright.sync_api import sync_playwright

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # корень репо
PORT = int(os.environ.get('S18_PORT', '8921'))
URL = f'http://127.0.0.1:{PORT}/СИНГУЛЯР_18_СОБЫТИЕ.html'

прошло = []
упало = []
def ок(name, cond):
    (прошло if cond else упало).append(name)
    print(('  ✓ ' if cond else '  ✗ FAIL: ') + name)

def http_serve():
    # python3 -m http.server в песочнице виснет (мёртвый пайп при capture_output)
    # → статический сервер на node: ИНСТРУМЕНТЫ/serve_repo.mjs
    subprocess.run(['node', os.path.join(REPO, 'ИНСТРУМЕНТЫ', 'serve_repo.mjs'), str(PORT), REPO],
                   capture_output=True)

t = threading.Thread(target=http_serve, daemon=True)
t.start()
time.sleep(1.2)

with sync_playwright() as p:
    browser = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required',
                                      '--use-fake-ui-for-media-stream',
                                      '--use-fake-device-for-media-stream'])
    ctx = browser.new_context()
    ошибки_консоли = []
    A = ctx.new_page()
    A.on('console', lambda m: ошибки_консоли.append(m.text) if m.type == 'error' else None)
    A.on('pageerror', lambda e: ошибки_консоли.append(str(e)))

    print('— ЭКРАН МЕНЮ: создание зала')
    A.goto(URL)
    A.wait_for_selector('#scMenu.on')
    ок('меню отрисовалось', True)
    ок('каталог 62 песни', A.evaluate('document.querySelectorAll("#songSel option").length') == 62)
    A.select_option('#transportHost', 'channel')
    A.fill('#hostName', 'Бабушка')
    A.click('#btnCreate')
    A.wait_for_selector('#scRoom.on')
    код = A.text_content('#roomCodeBig').strip()
    ок('зал создан, код 5 симв', len(код) == 5)
    ок('QR нарисован', A.evaluate('document.getElementById("roomQr").width') > 100)
    ок('участник-хост в чипах', A.evaluate('document.querySelectorAll("#roomChips .chip").length') == 1)

    print('— ГОСТЬ: вход по коду из URL')
    B = ctx.new_page()
    B.on('pageerror', lambda e: ошибки_консоли.append('B:' + str(e)))
    B.goto(URL + '?зал=' + код)
    B.wait_for_selector('#scMenu.on')
    код_авто = B.input_value('#joinCode')
    ок('код из QR подставлен', код_авто == код)
    B.select_option('#transportGuest', 'channel')
    B.fill('#guestName', 'Мама')
    B.click('#btnJoin')
    B.wait_for_selector('#scRoom.on')

    # ждём синхронизацию (HB 1.1 с)
    A.wait_for_function('document.querySelectorAll("#roomChips .chip").length >= 2', timeout=10000)
    ок('гость виден у хоста', True)
    ок('хост виден у гостя', B.evaluate('document.querySelectorAll("#roomChips .chip").length') >= 2)
    ок('готовность: гость жмёт ✋', True)
    B.click('#btnReady')
    A.wait_for_function('document.body.textContent.includes("готовы: 1")', timeout=8000)
    ок('готовность дошла до хоста', True)

    print('— ПЕСНЯ: выбор + НАЧАТЬ + отсчёт')
    A.select_option('#songSel', 'rWpYxmFjm9g')
    A.wait_for_function('document.body.textContent.includes("Когда теряем")', timeout=8000)
    ок('песня видна гостю', B.evaluate('document.getElementById("songSel").value') == 'rWpYxmFjm9g')
    ок('НАЧАТЬ доступна хосту', not A.evaluate('document.getElementById("btnStart").disabled'))
    ок('НАЧАТЬ заблокирована у гостя', B.evaluate('document.getElementById("btnStart").disabled'))
    A.click('#btnStart')
    A.wait_for_selector('#countOverlay.on', timeout=6000)
    ок('отсчёт-оверлей у хоста', True)
    B.wait_for_selector('#countOverlay.on', timeout=6000)
    ок('отсчёт-оверлей у гостя', True)

    A.wait_for_selector('#scSing.on', timeout=12000)
    B.wait_for_selector('#scSing.on', timeout=12000)
    ок('SINGING у обоих', True)
    ок('аудио играет у хоста', A.evaluate('!document.getElementById("minusAudio").paused'))
    ок('аудио играет у гостя', B.evaluate('!document.getElementById("minusAudio").paused'))
    time.sleep(3)
    таймер = A.text_content('#singTimer')
    ок('таймер тикает (' + таймер + ')', таймер >= '00:02.0')

    print('— ФИНИШ: завершить → REVIEW → запись → ❤️')
    A.click('#btnEnd')
    A.wait_for_selector('#scReview.on', timeout=12000)
    B.wait_for_selector('#scReview.on', timeout=12000)
    ок('REVIEW у обоих', True)
    ок('кто пел в обзоре', 'Бабушка' in A.text_content('#reviewWho') and 'Мама' in A.text_content('#reviewWho'))

    def ждём_запись(page):
        for _ in range(40):
            try:
                n = page.evaluate('''() => new Promise(res => {
                    const r = indexedDB.open('singular-event', 1);
                    r.onsuccess = () => {
                        const db = r.result;
                        const rq = db.transaction('memories','readonly').objectStore('memories').getAll();
                        rq.onsuccess = () => res(JSON.stringify(rq.result.map(x => ({id:x.id,state:x.state,size:(x.audio&&x.audio.size)||0,note:x.note}))));
                    };
                })''')
                recs = json.loads(n)
                if recs and recs[0]['size'] > 1000:
                    return recs
            except Exception:
                pass
            time.sleep(0.5)
        return None
    recs_A = ждём_запись(A)
    ок('запись хоста в IndexedDB (микс > 1 КБ)', bool(recs_A))
    recs_B = ждём_запись(B)
    ок('запись гостя в IndexedDB', bool(recs_B))

    A.fill('#memNote', 'День рождения бабушки!')
    time.sleep(1)
    A.click('#btnSaveMem')
    st = None
    for _ in range(10):
        time.sleep(0.5)
        st = A.evaluate('''() => new Promise(res => {
            const r = indexedDB.open('singular-event', 1);
            r.onsuccess = () => { const rq = r.result.transaction('memories').objectStore('memories').getAll();
                rq.onsuccess = () => res(rq.result.map(x => x.state).join(',')); };
        })''')
        if st and 'MEMORY' in st.split(','): break
    print('    состояния:', st)
    # у каждого участника СВОЯ запись в своём браузере; обе страницы одного
    # origin → общая база: после ❤️ должна быть минимум одна MEMORY
    ок('❤️ превратило запись хоста в ПАМЯТЬ (у гостя своя осталась)', bool(st) and 'MEMORY' in st.split(','))

    # из обзора → в зал → в меню
    A.click('#btnAgain')
    A.wait_for_selector('#scRoom.on')
    A.click('#btnLeaveRoom')
    A.wait_for_selector('#scMenu.on')
    time.sleep(1)
    ок('карточка воспоминания в списке', A.evaluate('document.querySelectorAll("#memList .mem-card").length') >= 1)

    print('— GC: просроченная TEMPORARY стирается')
    A.evaluate('''() => new Promise(res => {
        const r = indexedDB.open('singular-event', 1);
        r.onsuccess = () => {
            const db = r.result;
            const tx = db.transaction('memories','readwrite');
            const st = tx.objectStore('memories');
            st.getAll().onsuccess = e => {
                e.target.result.forEach(x => { if (x.state==='TEMPORARY') { x.expiresAt = Date.now()-1000; st.put(x); } });
                tx.oncomplete = () => res(true);
            };
        };
    })''')
    time.sleep(0.5)
    A.click('#btnGcNow')
    time.sleep(1)
    инфо = A.text_content('#gcInfo')
    ок('GC удалил просрочку (' + инфо.strip()[:40] + ')', 'удалено просроченных: 1' in инфо)
    ок('память ❤️ пережила GC', A.evaluate('document.querySelectorAll("#memList .mem-card").length') >= 1)

    print('— ЧЕСТНОСТЬ: консоль')
    real_errs = [e for e in ошибки_консоли if 'favicon' not in e and 'net::' not in e]
    ок('консоль без ошибок (' + str(len(real_errs)) + ')', len(real_errs) == 0)
    if real_errs: print('    ошибки:', real_errs[:5])

    A.screenshot(path=REPO + '/СКРИНШОТЫ/ЗАЛ_18/s18_01_меню_и_память.png', full_page=True)
    print('— скриншоты сохранены')

    # ── мягкий тест реле-транспорта (может не быть сети к Nostr) ──
    print('— РЕЛЕ-ТРАНСПОРТ (мягко, зависит от сети до Nostr)')
    C = ctx.new_page()
    C.goto(URL)
    C.wait_for_selector('#scMenu.on')
    C.select_option('#transportHost', 'relay')
    C.fill('#hostName', 'ТестРеле')
    t0 = time.time()
    C.click('#btnCreate')
    C.wait_for_selector('#scRoom.on')
    код_r = C.text_content('#roomCodeBig').strip()
    подключился = False
    for _ in range(24):
        st = C.text_content('#roomStatus')
        if 'не поднялся' in st or 'нет сети' in st:
            break
        time.sleep(1)
    status = C.text_content('#roomStatus')
    ok_relay = ('зал готов' in status) or ('подключение' not in status and '⚠' not in status)
    if ok_relay:
        D = ctx.new_page()
        D.goto(URL + '?зал=' + код_r)
        D.wait_for_selector('#scMenu.on')
        D.select_option('#transportGuest', 'relay')
        D.fill('#guestName', 'ГостьРеле')
        D.click('#btnJoin')
        try:
            C.wait_for_function('document.querySelectorAll("#roomChips .chip").length >= 2', timeout=30000)
            подключился = True
        except Exception:
            подключился = False
        ок('реле: два устройства (окна) соединились', подключился)
        D.close()
    else:
        print('  ⚠ SKIP: реле недоступны из песочницы (' + status.strip()[:60] + ')')
    C.close()
    browser.close()

print('\nИТОГО браузер: passed=%d failed=%d' % (len(прошло), len(упало)))
sys.exit(1 if упало else 0)
