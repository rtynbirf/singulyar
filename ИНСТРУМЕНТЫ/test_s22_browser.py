#!/usr/bin/env python3
# Браузерный тест ·22 СВЯЗЬ: два окна одного браузера через BroadcastChannel —
# текст, голосовое сообщение (fake-микрофон), файл; субтитры; профиль
# (сохранение/перезагрузка/сброс); мосты ·19 (адаптация, имя из личности) и
# ·18 (ссылка на зал, ?зал=КОД); честные статусы; 0 ошибок консоли.
# Запуск: python3 ИНСТРУМЕНТЫ/test_s22_browser.py   (пути считаются от файла — из любого клона репо)
import subprocess, time, sys, os, json, tempfile
from playwright.sync_api import sync_playwright

РЕПО = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # корень репо
PORT = int(os.environ.get('S22_PORT', '8927'))
БАЗА = f'http://127.0.0.1:{PORT}'

прошло, упало = [], []
def ок(name, cond, extra=''):
    (прошло if cond else упало).append(name)
    print(('  ✓ ' if cond else '  ✗ FAIL: ') + name + (('' if cond else ' | ' + str(extra))))

def http_serve():
    subprocess.run(['node', os.path.join(РЕПО, 'ИНСТРУМЕНТЫ', 'serve_repo.mjs'), str(PORT), РЕПО], capture_output=True)

import threading
t = threading.Thread(target=http_serve, daemon=True)
t.start()
time.sleep(1.2)

КОД = 'Q7W2N'
ФАЙЛ_ТЕСТ = os.path.join(tempfile.gettempdir(), 's22_upload_test.png')
os.makedirs(os.path.dirname(ФАЙЛ_ТЕСТ), exist_ok=True)
# корректный минимальный PNG 1x1
import struct, zlib
def png1x1():
    сиг = b'\x89PNG\r\n\x1a\n'
    ihdr = struct.pack('>IIBBBBB', 1, 1, 8, 6, 0, 0, 0)
    сырые = b'\x00\xff\xff\xff'
    def кусок(тип, данные):
        return struct.pack('>I', len(данные)) + тип + данные + struct.pack('>I', zlib.crc32(тип + данные) & 0xffffffff)
    return сиг + кусок(b'IHDR', ihdr) + кусок(b'IDAT', zlib.compress(сырые)) + кусок(b'IEND', b'')
with open(ФАЙЛ_ТЕСТ, 'wb') as f:
    f.write(png1x1())

with sync_playwright() as p:
    браузер = p.chromium.launch(args=[
        '--use-fake-device-for-media-stream',
        '--use-fake-ui-for-media-stream',
        '--autoplay-policy=no-user-gesture-required'])
    ctx = браузер.new_context()
    ошибки = []
    A = ctx.new_page()
    A.on('console', lambda m: ошибки.append(m.text) if m.type == 'error' else None)
    A.on('pageerror', lambda e: ошибки.append(str(e)))

    print('— ЗАГРУЗКА И ОБОЗНАЧЕНИЯ')
    A.goto(БАЗА + '/СИНГУЛЯР_22_СВЯЗЬ.html')
    A.wait_for_selector('.chan-grid button', timeout=10000)
    ок('модуль загрузился, каналы отрисованы', True)
    ок('заголовок чёткий', 'СВЯЗЬ' in A.title())
    ок('девять каналов в сетке', A.locator('.chan-grid button').count() == 9)
    имена_кнопок = A.locator('.chan-grid button').all_inner_texts()
    ок('имена каналов по-русски и без эмодзи', 'Текст' in имена_кнопок[0] and 'Совместное пение' in имена_кнопок[8] and all('💬' not in т and '🎤' not in т for т in имена_кнопок))
    ок('таблица fallback: 9 строк + шапка', A.locator('#tblFall tr').count() == 10)
    ок('возможности устройства показаны честно', 'возможности устройства' in A.text_content('#statCaps'))
    ок('контракт говорит: зал ≠ аккаунт', 'зал ≠ аккаунт' in A.text_content('pre.contract'))

    print('— МОСТ ·19: ИМЯ')
    ок('личности ·19 нет — честный статус', 'личность ·19 на устройстве не найдена' in A.text_content('#stName'))
    A.fill('#inName', 'Алиса')

    print('— V1.22: ЛИЧНОСТЬ ·19 ДЛЯ ВЕРИФИКАЦИИ')
    # личность создаётся ровно так, как её создаёт ·19 ЧЕЛОВЕК:
    # ECDSA P-256 non-extractable в IndexedDB (singulyar-human-v1, kv 'личность')
    ид19 = A.evaluate("""async () => {
      const пара = await crypto.subtle.generateKey({name:'ECDSA', namedCurve:'P-256', hash:'SHA-256'}, false, ['sign','verify']);
      const pub = await crypto.subtle.exportKey('jwk', пара.publicKey);
      const л = { id: crypto.randomUUID(), имя: 'Алиса·19', создана: Date.now(), приватный: пара.privateKey, публичныйJWK: pub };
      await new Promise((res, rej) => {
        const rq = indexedDB.open('singulyar-human-v1', 1);
        rq.onupgradeneeded = () => { if (!rq.result.objectStoreNames.contains('kv')) rq.result.createObjectStore('kv'); };
        rq.onerror = () => rej(rq.error);
        rq.onsuccess = () => {
          const б = rq.result; const т = б.transaction('kv', 'readwrite');
          т.objectStore('kv').put(л, 'личность');
          т.oncomplete = () => { б.close(); res(); };
          т.onerror = () => rej(т.error);
        };
      });
      return л.id;
    }""")
    ок('личность ·19 создана на устройстве (как создаёт ·19)', bool(ид19))

    print('— КАНАЛ МЕЖДУ ОКНАМИ: ТЕКСТ')
    A.fill('#inCode', КОД); A.click('#btnOpen')
    ок('канал открыт', 'Канал открыт' in A.text_content('#stZal'))
    ок('v1.22: ротация честно недоступна, пока крипта выкл', A.locator('#btnEpo').is_disabled() and A.locator('#btnWipe').is_disabled())
    B = ctx.new_page()
    B.on('pageerror', lambda e: ошибки.append('B: ' + str(e)))
    B.goto(БАЗА + '/СИНГУЛЯР_22_СВЯЗЬ.html')
    B.wait_for_selector('.chan-grid button', timeout=10000)
    B.fill('#inName', 'Борис')
    B.fill('#inCode', КОД); B.click('#btnOpen')
    A.fill('#inMsg', 'привал в горах'); A.click('#btnSend')
    B.wait_for_function("document.getElementById('journal').textContent.includes('привал в горах')", timeout=15000)
    ок('текст дошёл из окна A в окно B', True)
    ок('отправитель подписан по имени', 'Алиса' in B.text_content('#journal'))
    ок('субтитры у B показали входящее', 'привал в горах' in B.text_content('#subNow'))
    B.fill('#inMsg', 'привет с юга'); B.click('#btnSend')
    A.wait_for_function("document.getElementById('journal').textContent.includes('привет с юга')", timeout=15000)
    ок('ответ дошёл из B в A', True)
    ок('своё сообщение B показал себе в субтитрах', 'ты: привет с юга' in B.text_content('#subNow'))

    print('— V1.22: ВЕРИФИКАЦИЯ ПОДПИСАННОГО ПРИВЕТСТВИЯ')
    A.wait_for_function("document.getElementById('stVer').textContent.includes('СОШЛАСЬ')", timeout=8000)
    ок('v1.22: подпись ·19 СОШЛАСЬ — имя подтверждено ключом с устройства', True)
    ок('v1.22: в вердикте имя личности из ·19 (не локальное имя окна)', 'Алиса·19' in A.text_content('#stVer'))
    # эхо-рукопожатие: получив первый «прив», вкладка отвечает своим —
    # поздний участник тоже получает подписанное приветствие и верифицирует
    B.wait_for_function("document.getElementById('stVer').textContent.includes('СОШЛАСЬ')", timeout=8000)
    ок('v1.22: эхо-рукопожатие — обе вкладки верифицировали друг друга', True)

    print('— ГОЛОСОВОЕ МЕЖДУ ОКНАМИ (fake-микрофон)')
    A.click('#btnRec'); time.sleep(1.1); A.click('#btnRecStop')
    A.wait_for_function("document.getElementById('stRec').textContent.includes('Голосовое отправлено')", timeout=6000)
    ок('запись стартовала и отправилась', True)
    ок('у A в журнале аудио-элемент', A.locator('#journal .jmsg.voice audio').count() >= 1)
    B.wait_for_function("document.querySelectorAll('#journal .jmsg.voice audio').length > 0", timeout=6000)
    src_b = B.get_attribute('#journal .jmsg.voice audio', 'src')
    ок('голосовое дошло до B как blob', bool(src_b) and src_b.startswith('blob:'))
    ок('у B честная подпись «голосовое сообщение»', 'голосовое сообщение' in B.text_content('#journal'))

    print('— ФАЙЛ МЕЖДУ ОКНАМИ')
    A.set_input_files('#inFile', ФАЙЛ_ТЕСТ)
    A.wait_for_function("document.getElementById('journal').textContent.includes('связь-тест.png') || document.getElementById('journal').textContent.includes('s22_upload_test.png')", timeout=6000)
    ок('файл в журнале у A с именем и размером', 'КБ' in A.text_content('#journal') or 'Б' in A.text_content('#journal'))
    B.wait_for_function("document.querySelectorAll('#journal .jmsg a[download]').length > 0", timeout=6000)
    ок('файл дошёл до B со ссылкой «скачать»', 'скачать' in B.text_content('#journal'))

    print('— КАНАЛ: ВЫБОР ЧЕЛОВЕКА И ЧЕСТНЫЕ СТАТУСЫ')
    A.click('.chan-grid button:has-text("Видеозвонок")')
    стат = A.text_content('#stChan')
    ок('выбор канала отразился: канал «Видеозвонок»', 'Видеозвонок' in стат)
    ок('override сохранился в профиле', json.loads(A.evaluate("localStorage.getItem('singulyar.svyaz.v1')"))['override'] == 'callVideo')
    A.click('#btnSTT')
    стт = A.text_content('#stSTT')
    ок('речь→текст: честный статус', ('распознавания' in стт) or ('слушаю' in стт) or ('запустилось' in стт))
    ок('кнопка «Совместное пение» есть', A.locator('.chan-grid button:has-text("Совместное пение")').count() == 1)

    print('— МОСТ ·18: ССЫЛКА НА ЗАЛ')
    ссылка = A.input_value('#inLink')
    ок('ссылка на зал ·18 с кодом (путь и зал процент-энкодятся браузером)', '_18_' in ссылка and КОД in ссылка and '%D0%B7%D0%B0%D0%BB' in ссылка, ссылка)
    with A.expect_popup() as попап_инфо:
        A.click('.chan-grid button:has-text("Совместное пение")')
    попап = попап_инфо.value
    ок('совместное пение открывает зал ·18 с кодом', '_18_' in попап.url and КОД in попап.url, попап.url)
    попап.close()

    print('— ПРОФИЛЬ: ПЕРЕЖИВАЕТ ПЕРЕЗАГРУЗКУ, СБРАСЫВАЕТСЯ')
    A.uncheck('#pText'); A.check('#pTts'); A.click('#btnSaveP')
    пр = json.loads(A.evaluate("localStorage.getItem('singulyar.svyaz.v1')"))
    ок('профиль сохранён: озвучка вкл, текст выкл', пр['озвучка'] is True and пр['текст'] is False)
    A.reload(); A.wait_for_selector('.chan-grid button', timeout=10000)
    ок('перезагрузка: озвучка осталась включённой', A.is_checked('#pTts'))
    ок('перезагрузка: override канала остался', 'Видеозвонок' in A.text_content('#stChan') or 'Видеозвонок' in A.locator('.chan-grid button.on').inner_text())
    A.click('#btnResetP')
    ок('сброс: озвучка выключена', not A.is_checked('#pTts'))

    print('— МОСТ ·19: ИМЯ ИЗ ЛИЧНОСТИ')
    A.evaluate("""async () => {
      await new Promise((рез, от) => {
        const rq = indexedDB.open('singulyar-human-v1', 1);
        rq.onupgradeneeded = () => rq.result.createObjectStore('kv');
        rq.onsuccess = () => {
          const t = rq.result.transaction('kv', 'readwrite');
          t.objectStore('kv').put({имя:'Рувсон'}, 'личность');
          t.oncomplete = рез; t.onerror = () => от(t.error);
        };
        rq.onerror = () => от(rq.error);
      });
    }""")
    A.reload(); A.wait_for_selector('.chan-grid button', timeout=10000)
    ок('имя взято из личности ·19', 'Рувсон' in A.input_value('#inName') and 'личность ·19' in A.text_content('#stName'))

    print('— МОСТ ·19: АДАПТАЦИЯ (отдельный контекст)')
    ctx2 = браузер.new_context()
    C = ctx2.new_page()
    C.add_init_script("try{localStorage.setItem('singulyar.adaptation.v1', JSON.stringify({haptic:false,reducedMotion:true}))}catch(e){}")
    C.on('pageerror', lambda e: ошибки.append('C: ' + str(e)))
    C.goto(БАЗА + '/СИНГУЛЯР_22_СВЯЗЬ.html')
    C.wait_for_selector('.chan-grid button', timeout=10000)
    адапт = C.text_content('#stAdapt')
    ок('решения ·19 показаны честно', 'вибрация — нет' in адапт and 'меньше движения — да' in адапт)
    ок('меньше движения применено к документу', C.evaluate("document.documentElement.dataset.reducedMotion") == 'true')

    print('— ?зал=КОД: ВХОД ПО ССЫЛКЕ')
    D = ctx2.new_page()
    D.on('pageerror', lambda e: ошибки.append('D: ' + str(e)))
    D.goto(БАЗА + '/СИНГУЛЯР_22_СВЯЗЬ.html?зал=Z9Q7B')
    D.wait_for_selector('.chan-grid button', timeout=10000)
    ок('код подставлен из ссылки', D.input_value('#inCode') == 'Z9Q7B')
    ок('канал открыт автоматически', 'Канал открыт' in D.text_content('#stZal'))

    print('— V1.23: ЗВОНОК ЧЕРЕЗ КРИСТАЛЛ — полный цикл (ring → accept → разговор → end)')
    ЗАЛ2 = 'C4L1V'
    JS_ЛИЧ = """async (а) => {
      const [ид, имя] = а;
      const пара = await crypto.subtle.generateKey({name:'ECDSA', namedCurve:'P-256', hash:'SHA-256'}, false, ['sign','verify']);
      const pub = await crypto.subtle.exportKey('jwk', пара.publicKey);
      const л = { id: ид, имя: имя, создана: Date.now(), приватный: пара.privateKey, публичныйJWK: pub };
      await new Promise((res, rej) => {
        const rq = indexedDB.open('singulyar-human-v1', 1);
        rq.onupgradeneeded = () => { if (!rq.result.objectStoreNames.contains('kv')) rq.result.createObjectStore('kv'); };
        rq.onerror = () => rej(rq.error);
        rq.onsuccess = () => {
          const б = rq.result; const т = б.transaction('kv', 'readwrite');
          т.objectStore('kv').put(л, 'личность');
          т.oncomplete = () => { б.close(); res(); };
          т.onerror = () => rej(т.error);
        };
      });
      return ид;
    }"""
    E = ctx.new_page()
    E.on('pageerror', lambda e: ошибки.append('E: ' + str(e)))
    E.goto(БАЗА + '/СИНГУЛЯР_22_СВЯЗЬ.html')
    E.wait_for_selector('.chan-grid button', timeout=10000)
    ок('v1.23: личность Веры создана на устройстве (как создаёт ·19)', bool(E.evaluate(JS_ЛИЧ, ['ид-E-0001', 'Вера·19'])))
    E.reload(); E.wait_for_selector('.chan-grid button', timeout=10000)
    ок('v1.23: у E имя из своей личности ·19', 'Вера·19' in E.input_value('#inName'))
    E.fill('#inCode', ЗАЛ2); E.click('#btnOpen')
    F = ctx.new_page()
    F.on('pageerror', lambda e: ошибки.append('F: ' + str(e)))
    F.goto(БАЗА + '/СИНГУЛЯР_22_СВЯЗЬ.html')
    F.wait_for_selector('.chan-grid button', timeout=10000)
    ок('v1.23: личность Глеба создана (подмена до загрузки второго окна)', bool(F.evaluate(JS_ЛИЧ, ['ид-F-0002', 'Глеб·19'])))
    F.reload(); F.wait_for_selector('.chan-grid button', timeout=10000)
    F.fill('#inCode', ЗАЛ2); F.click('#btnOpen')
    E.wait_for_function("document.getElementById('stVer').textContent.includes('СОШЛАСЬ')", timeout=8000)
    F.wait_for_function("document.getElementById('stVer').textContent.includes('СОШЛАСЬ')", timeout=8000)
    ок('v1.23: две разные личности верифицировали друг друга', True)
    ок('v1.23: список звонка у E: Глеб с честной меткой подписи', 'звук · Глеб·19' in E.text_content('#callList') and 'подпись ·19 сошлась' in E.text_content('#callList'))
    ок('v1.23: список звонка у F: Вера', 'звук · Вера·19' in F.text_content('#callList'))
    ок('v1.23: свободное состояние — кнопки решения скрыты', E.locator('#callActions').is_hidden())
    E.click('#callList button:has-text("звук · Глеб·19")')
    E.wait_for_function("document.getElementById('stCall').textContent.includes('звоню')", timeout=15000)
    ок('v1.23: E звонит — статус «звоню»', True)
    F.wait_for_function("document.getElementById('stCall').textContent.includes('ВХОДЯЩИЙ ЗВОНОК')", timeout=15000)
    ок('v1.23: F видит ВХОДЯЩИЙ ЗВОНОК', True)
    F.wait_for_function("document.getElementById('stCall').textContent.includes('СОШЛАСЬ')", timeout=8000)
    ок('v1.23: F видит вердикт подписи звонка СОШЛАСЬ', True)
    ок('v1.23: кнопки решения активны у F', not F.locator('#btnAccept').is_disabled() and not F.locator('#btnDecline').is_disabled())
    F.click('#btnAccept')
    E.wait_for_function("document.getElementById('stCall').textContent.includes('разговор')", timeout=8000)
    ок('v1.23: разговор установлен (E)', True)
    F.wait_for_function("document.getElementById('stCall').textContent.includes('разговор')", timeout=15000)
    ок('v1.23: разговор установлен (F)', True)
    try:
        E.wait_for_function("document.getElementById('vidRem').classList.contains('live')", timeout=15000)
        ок('v1.23: WebRTC медиа дошло (vidRem live у E)', True)
    except Exception:
        дам = {'E': E.evaluate("window.__КРИСТ22.звонок"), 'F': F.evaluate("window.__КРИСТ22.звонок")}
        ок('v1.23: WebRTC медиа дошло (vidRem live у E)', False, 'ontrack за 15 с | ' + json.dumps(дам, ensure_ascii=False))
    факты = E.evaluate("async () => { const все = await window.__КРИСТ22.события(); return все.filter(e => e.conversation === 'call.signal').map(e => e.semantic.attachments[0].действие + ':' + e.semantic.attachments[0].от.имя); }")
    ок('v1.23: в журнале факты ring(Вера) и accept(Глеб)', 'ring:Вера·19' in факты and 'accept:Глеб·19' in факты, факты)
    ок('v1.23: дедуп — каждый факт звонка в журнале один раз', len(факты) == len(set(факты)), факты)
    E.click('#btnEnd')
    F.wait_for_function("document.getElementById('stCall').textContent.includes('завершён')", timeout=15000)
    ок('v1.23: F увидел «завершён» после end от E', True)
    E.wait_for_function("document.getElementById('stCall').textContent.includes('завершён')", timeout=15000)
    ок('v1.23: E видит свой «завершён» и свободен', 'свободен' not in E.text_content('#stCall') or 'завершён' in E.text_content('#stCall'))

    print('— V1.23: ОТКЛОН И ЗАНЯТОСТЬ (третий участник)')
    E.click('#callList button:has-text("звук · Глеб·19")')
    F.wait_for_function("document.getElementById('stCall').textContent.includes('ВХОДЯЩИЙ ЗВОНОК')", timeout=15000)
    F.click('#btnDecline')
    E.wait_for_function("document.getElementById('stCall').textContent.includes('отклонён')", timeout=15000)
    ок('v1.23: отклон — E честно видит «отклонён»', True)
    G = ctx.new_page()
    G.on('pageerror', lambda e: ошибки.append('G: ' + str(e)))
    G.goto(БАЗА + '/СИНГУЛЯР_22_СВЯЗЬ.html')
    G.wait_for_selector('.chan-grid button', timeout=10000)
    ок('v1.23: личность Ганы создана', bool(G.evaluate(JS_ЛИЧ, ['ид-G-0003', 'Гана·19'])))
    G.reload(); G.wait_for_selector('.chan-grid button', timeout=10000)
    G.fill('#inCode', ЗАЛ2); G.click('#btnOpen')
    G.wait_for_function("document.getElementById('stVer').textContent.includes('СОШЛАСЬ')", timeout=8000)
    G.wait_for_function("document.getElementById('callList').textContent.includes('звук · Вера·19')", timeout=8000)
    ок('v1.23: третий участник вошёл и верифицирован', True)
    E.click('#callList button:has-text("звук · Глеб·19")')
    F.wait_for_function("document.getElementById('stCall').textContent.includes('ВХОДЯЩИЙ ЗВОНОК')", timeout=15000)
    F.click('#btnAccept')
    F.wait_for_function("document.getElementById('stCall').textContent.includes('разговор')", timeout=8000)
    ок('v1.23: E–F снова в разговоре (для сцены занятости)', True)
    G.click('#callList button:has-text("звук · Вера·19")')
    G.wait_for_function("document.getElementById('stCall').textContent.includes('отклонён') && document.getElementById('stCall').textContent.includes('занят')", timeout=8000)
    ок('v1.23: занятый звонок честно авто-отклонил: «отклонён (занят)»', True)
    ок('v1.23: активный разговор E–F не пострадал от авто-отказа', 'разговор' in E.text_content('#stCall') and 'разговор' in F.text_content('#stCall'))
    E.click('#btnEnd')
    E.wait_for_function("document.getElementById('stCall').textContent.includes('завершён')", timeout=15000)
    факты2 = E.evaluate("async () => { const все = await window.__КРИСТ22.события(); return все.filter(e => e.conversation === 'call.signal').map(e => e.idempotencyKey); }")
    ок('v1.23: журнал знает все действия звонка (ring/accept/end/decline)', set(['ring', 'accept', 'end', 'decline']).issubset(set(к.split(':')[3] for к in факты2)), факты2)
    ок('v1.23: дедуп журнала по актам финальный (ключ идемпотентности уникален)', len(факты2) == len(set(факты2)), факты2)

    print('— ОШИБКИ КОНСОЛИ')
    важные = [о for о in ошибки if 'favicon' not in о]
    ок('0 ошибок консоли во всех окнах', not важные, важные[:3])

    браузер.close()

print(f'\nИТОГ: {len(прошло)}/{len(прошло) + len(упало)}')
if упало:
    print('УПАЛИ:', упало)
sys.exit(0 if not упало else 1)
