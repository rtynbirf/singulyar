#!/usr/bin/env python3
# Межустройственный тест ·22 СВЯЗЬ (v1.24): два ИЗОЛИРОВАННЫХ контекста браузера
# (BroadcastChannel между контекстами не ходит — проверяется пробой) через РЕАЛЬНЫЕ
# публичные Nostr-релеи (trystero, тот же транспорт зала ·18): приветствия, полный
# цикл звонка ring → accept → разговор → end, медиа WebRTC между контекстами,
# отклон, факты call.signal в журналах обеих сторон, дедуп провода, 0 ошибок
# консоли (сбои отдельных wss-релеев — штатная деградация транспорта redundancy=2
# и в ошибки не считаются; всё остальное — считается).
# Запуск: python3 ИНСТРУМЕНТЫ/test_s22_device.py
import subprocess, time, sys, os, json
from playwright.sync_api import sync_playwright

РЕПО = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(os.environ.get('S22_PORT_DEV', '8928'))
БАЗА = f'http://127.0.0.1:{PORT}'
КОД = 'D3V1C'

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

# личность ·19 создаётся ровно так, как её создаёт ·19 ЧЕЛОВЕК
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

# проба изоляции: BroadcastChannel одного контекста не слышен другому
JS_ПРОБА_А = """() => {
  window.__пинг = [];
  const ч = new BroadcastChannel('s22-device-probe');
  ч.onmessage = (е) => window.__пинг.push(String(е.data));
  ч.postMessage('сам-себе');
}"""
JS_ПРОБА_Б = """() => {
  const ч = new BroadcastChannel('s22-device-probe');
  ч.postMessage('из-другого-контекста');
}"""

с_playwright = sync_playwright()
with с_playwright as p:
    браузер = p.chromium.launch(args=[
        '--use-fake-device-for-media-stream',
        '--use-fake-ui-for-media-stream',
        '--autoplay-policy=no-user-gesture-required'])
    ctxA = браузер.new_context()
    ctxB = браузер.new_context()
    ошибки = []

    print('— ИЗОЛЯЦИЯ КОНТЕКСТОВ (предпосылка межустройства)')
    A = ctxA.new_page()
    A.on('console', lambda m: ошибки.append('A: ' + m.text) if m.type == 'error' else None)
    A.on('pageerror', lambda e: ошибки.append('A: ' + str(e)))
    A.goto(БАЗА + '/СИНГУЛЯР_22_СВЯЗЬ.html')
    A.wait_for_selector('.chan-grid button', timeout=10000)
    B = ctxB.new_page()
    B.on('console', lambda m: ошибки.append('B: ' + m.text) if m.type == 'error' else None)
    B.on('pageerror', lambda e: ошибки.append('B: ' + str(e)))
    B.goto(БАЗА + '/СИНГУЛЯР_22_СВЯЗЬ.html')
    B.wait_for_selector('.chan-grid button', timeout=10000)
    A.evaluate(JS_ПРОБА_А)
    B.evaluate(JS_ПРОБА_Б)
    time.sleep(1.5)
    пинги = A.evaluate('window.__пинг')
    # BroadcastChannel не доставляет сообщение самому отправителю («сам-себе» не
    # вернётся — это норма канала). Изоляция доказана тем, что ЧУЖОЙ пинг из
    # другого контекста НЕ пришёл: межконтекстного моста нет.
    ок('BroadcastChannel не ходит между контекстами (честная изоляция «устройств»)', 'из-другого-контекста' not in пинги, пинги)
    ок('хранилища контекстов раздельны', A.evaluate("localStorage.getItem('singulyar.svyaz.v1')") is None and B.evaluate("localStorage.getItem('singulyar.svyaz.v1')") is None)

    print('— ЛИЧНОСТИ ·19 НА «ДВУХ УСТРОЙСТВАХ»')
    ок('личность Алисы создана (контекст A)', bool(A.evaluate(JS_ЛИЧ, ['ид-A-0101', 'Алиса·19'])))
    ок('личность Бориса создана (контекст B, своя база)', bool(B.evaluate(JS_ЛИЧ, ['ид-B-0202', 'Борис·19'])))
    A.reload(); A.wait_for_selector('.chan-grid button', timeout=10000)
    B.reload(); B.wait_for_selector('.chan-grid button', timeout=10000)
    ок('имя A из личности ·19', 'Алиса·19' in A.input_value('#inName'))
    ок('имя B из личности ·19', 'Борис·19' in B.input_value('#inName'))

    print('— ЗАЛ НА «ДВУХ УСТРОЙСТВАХ» ЧЕРЕЗ ПУБЛИЧНЫЕ РЕЛЕИ')
    A.fill('#inCode', КОД); A.click('#btnOpen')
    B.fill('#inCode', КОД); B.click('#btnOpen')
    ок('v1.24: статус межустройства появился (stRelay)', 'межустройство' in A.text_content('#stRelay'))
    try:
        A.wait_for_function("window.__КРИСТ22.транспорт && window.__КРИСТ22.транспорт.готов", timeout=30000)
        ок('ретранслятор поднялся (релеи ответили A)', True)
    except Exception:
        ок('ретранслятор поднялся (релеи ответили A)', False, A.text_content('#stRelay'))
    B.wait_for_function("window.__КРИСТ22.транспорт && window.__КРИСТ22.транспорт.готов", timeout=30000)
    ок('ретранслятор поднялся (релеи ответили B)', True)

    # приветствия через реле:contexts изолированы, другого провода нет
    try:
        A.wait_for_function("document.getElementById('stVer').textContent.includes('СОШЛАСЬ')", timeout=90000)
        ок('приветствие B доехало до A ЧЕРЕЗ РЕЛЕЙ и подпись ·19 СОШЛАСЬ', True)
    except Exception:
        ок('приветствие B доехало до A ЧЕРЕЗ РЕЛЕЙ и подпись ·19 СОШЛАСЬ', False, A.text_content('#stVer') + ' | ' + A.text_content('#stRelay'))
    try:
        B.wait_for_function("document.getElementById('stVer').textContent.includes('СОШЛАСЬ')", timeout=90000)
        ок('эхо-приветствие A доехало до B ЧЕРЕЗ РЕЛЕЙ, верифицировано', True)
    except Exception:
        ок('эхо-приветствие A доехало до B ЧЕРЕЗ РЕЛЕЙ, верифицировано', False, B.text_content('#stVer'))
    try:
        A.wait_for_function("window.__КРИСТ22.транспорт && window.__КРИСТ22.транспорт.пиров >= 1", timeout=30000)
        ок('ретранслятор видит другое «устройство» (пиров ≥ 1)', A.evaluate("window.__КРИСТ22.транспорт.пиров") >= 1)
    except Exception:
        ок('ретранслятор видит другое «устройство» (пиров ≥ 1)', False, A.evaluate("JSON.stringify(window.__КРИСТ22.транспорт)"))
    ок('v1.24: список звонимых на A собран из приветствия по релею', 'звук · Борис·19' in A.text_content('#callList'), A.text_content('#callList'))
    ок('v1.24: список звонимых на B: Алиса', 'звук · Алиса·19' in B.text_content('#callList'))

    print('— ЗВОНОК МЕЖДУ «УСТРОЙСТВАМИ»: ring → accept → разговор → end')
    A.click('#callList button:has-text("звук · Борис·19")')
    A.wait_for_function("document.getElementById('stCall').textContent.includes('звоню')", timeout=5000)
    ок('A звонит — статус «звоню»', True)
    try:
        B.wait_for_function("document.getElementById('stCall').textContent.includes('ВХОДЯЩИЙ ЗВОНОК')", timeout=30000)
        ок('ring доехал до другого устройства — ВХОДЯЩИЙ ЗВОНОК у B', True)
    except Exception:
        ок('ring доехал до другого устройства — ВХОДЯЩИЙ ЗВОНОК у B', False, B.text_content('#stCall'))
    try:
        B.wait_for_function("document.getElementById('stCall').textContent.includes('СОШЛАСЬ')", timeout=30000)
        ок('вердикт подписи звонка у B: СОШЛАСЬ', True)
    except Exception:
        ок('вердикт подписи звонка у B: СОШЛАСЬ', False, B.text_content('#stCall'))
    B.click('#btnAccept')
    A.wait_for_function("document.getElementById('stCall').textContent.includes('разговор')", timeout=30000)
    ок('accept доехал по релею — разговор (A)', True)
    B.wait_for_function("document.getElementById('stCall').textContent.includes('разговор')", timeout=15000)
    ок('разговор (B)', True)
    try:
        A.wait_for_function("document.getElementById('vidRem').classList.contains('live')", timeout=20000)
        ок('медиа WebRTC соединилось МЕЖДУ КОНТЕКСТАМИ (vidRem live у A)', True)
    except Exception:
        дам = {'A': A.evaluate("window.__КРИСТ22.звонок"), 'B': B.evaluate("window.__КРИСТ22.звонок")}
        ок('медиа WebRTC соединилось МЕЖДУ КОНТЕКСТАМИ (vidRem live у A)', False, json.dumps(дам, ensure_ascii=False))
    A.click('#btnEnd')
    B.wait_for_function("document.getElementById('stCall').textContent.includes('завершён')", timeout=30000)
    ок('end доехал — B увидел «завершён»', True)
    A.wait_for_function("document.getElementById('stCall').textContent.includes('завершён')", timeout=15000)
    ок('A видит свой «завершён»', True)

    факты_A = A.evaluate("async () => { const все = await window.__КРИСТ22.события(); return все.filter(e => e.conversation === 'call.signal').map(e => e.semantic.attachments[0].действие + ':' + e.semantic.attachments[0].от.имя); }")
    ок('журнал A: факты ring(Алиса) и accept(Борис) меж устройств', 'ring:Алиса·19' in факты_A and 'accept:Борис·19' in факты_A, факты_A)
    ок('дедуп провода: каждый факт в журнале A один раз', len(факты_A) == len(set(факты_A)), факты_A)
    факты_B = B.evaluate("async () => { const все = await window.__КРИСТ22.события(); return все.filter(e => e.conversation === 'call.signal').map(e => e.semantic.attachments[0].действие + ':' + e.semantic.attachments[0].от.имя); }")
    ок('журнал B (другое «устройство») ведёт те же факты', 'ring:Алиса·19' in факты_B and 'accept:Борис·19' in факты_B, факты_B)
    ок('дедуп журнала B: факты без копий', len(факты_B) == len(set(факты_B)), факты_B)

    print('— ОТКЛОН МЕЖДУ «УСТРОЙСТВАМИ»')
    A.click('#callList button:has-text("звук · Борис·19")')
    B.wait_for_function("document.getElementById('stCall').textContent.includes('ВХОДЯЩИЙ ЗВОНОК')", timeout=30000)
    B.click('#btnDecline')
    A.wait_for_function("document.getElementById('stCall').textContent.includes('отклонён')", timeout=30000)
    ок('decline доехал по релею — A честно видит «отклонён»', True)

    print('— ОШИБКИ КОНСОЛИ (сбои отдельных wss-релеев — штатная деградация redundancy=2)')
    важные = [о for о in ошибки if 'favicon' not in о and 'WebSocket connection' not in о and 'wss://' not in о]
    ок('0 ошибок консоли помимо релейных сбоев сети', not важные, важные[:4])

    браузер.close()

print(f'\nИТОГ: {len(прошло)}/{len(прошло) + len(упало)}')
if упало:
    print('УПАЛИ:', упало)
sys.exit(0 if not упало else 1)
