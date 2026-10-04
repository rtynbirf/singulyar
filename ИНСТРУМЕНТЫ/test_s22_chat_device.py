#!/usr/bin/env python3
# Межустройственный тест ТЕКСТА ·22 СВЯЗЬ (v1.25): два ИЗОЛИРОВАННЫХ контекста
# браузера (BroadcastChannel между контекстами не ходит) через РЕАЛЬНЫЕ публичные
# Nostr-релеи (trystero, СВОЁ пространство singular-svyaz-chat-v1 — залы текста
# не смешаны с залами звонка и залами ·18): ЗАПЕЧАТАННЫЙ текст ходит между
# устройствами (вскрытие по карте эпох готовой крипты v2), реле видит только
# шифровку — контекст БЕЗ фразы получает «запечатано» (Европа видит шум),
# открытый текст между устройствами НЕ ездит (релеи публичные), дедуп провода
# не дублирует, 0 ошибок консоли (сбои отдельных wss-релеев — штатная
# деградация redundancy=2 и в ошибки не считаются).
# Запуск: python3 ИНСТРУМЕНТЫ/test_s22_chat_device.py
import subprocess, time, sys, os, json
from playwright.sync_api import sync_playwright

РЕПО = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(os.environ.get('S22_PORT_CHAT', '8929'))
БАЗА = f'http://127.0.0.1:{PORT}'
КОД = 'CH4T1'
ФРАЗА = 'горная-тишина-2026'

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

с_playwright = sync_playwright()
with с_playwright as p:
    браузер = p.chromium.launch(args=[
        '--use-fake-device-for-media-stream',
        '--use-fake-ui-for-media-stream',
        '--autoplay-policy=no-user-gesture-required'])
    ctxA = браузер.new_context()
    ctxB = браузер.new_context()
    ctxC = браузер.new_context()   # «Европа»: тот же зал, БЕЗ фразы
    ошибки = []

    def открыть(стр, фраза):
        стр.fill('#inCode', КОД)
        стр.fill('#inPass', фраза or '')   # пустая фраза — тоже явный выбор (иначе старая фраза остаётся в поле)
        стр.click('#btnOpen')

    print('— ИЗОЛЯЦИЯ И ЛИЧНОСТИ ·19')
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
    ок('личность Алисы создана (контекст A)', bool(A.evaluate(JS_ЛИЧ, ['ид-A-0303', 'Алиса·19'])))
    ок('личность Бориса создана (контекст B, своя база)', bool(B.evaluate(JS_ЛИЧ, ['ид-B-0404', 'Борис·19'])))
    A.reload(); A.wait_for_selector('.chan-grid button', timeout=10000)
    B.reload(); B.wait_for_selector('.chan-grid button', timeout=10000)

    print('— ЗАЛ С ФРАЗОЙ НА «ДВУХ УСТРОЙСТВАХ» (текст-машина)')
    открыть(A, ФРАЗА)
    открыть(B, ФРАЗА)
    ок('v1.25: статус межустройства появился (stRelay)', 'межустройство' in A.text_content('#stRelay'))
    try:
        A.wait_for_function("window.__КРИСТ22.текстТранспорт && window.__КРИСТ22.текстТранспорт.готов", timeout=30000)
        ок('текст-ретранслятор поднялся (релеи ответили A)', True)
    except Exception:
        ок('текст-ретранслятор поднялся (релеи ответили A)', False, A.text_content('#stRelay'))
    try:
        B.wait_for_function("window.__КРИСТ22.текстТранспорт && window.__КРИСТ22.текстТранспорт.готов", timeout=30000)
        ок('текст-ретранслятор поднялся (релеи ответили B)', True)
    except Exception:
        ок('текст-ретранслятор поднялся (релеи ответили B)', False, B.text_content('#stRelay'))
    try:
        A.wait_for_function("window.__КРИСТ22.текстТранспорт && window.__КРИСТ22.текстТранспорт.пиров >= 1", timeout=60000)
        ок('текст-машина видит другое «устройство» (пиров ≥ 1)', A.evaluate("window.__КРИСТ22.текстТранспорт.пиров") >= 1)
    except Exception:
        ок('текст-машина видит другое «устройство» (пиров ≥ 1)', False, A.evaluate("JSON.stringify(window.__КРИСТ22.текстТранспорт)") + ' | ' + A.text_content('#stRelay'))
    ок('крипта включена честно (эпоха 1)', 'вкл' in A.text_content('#stКрипта') and 'эпоха 1' in A.text_content('#stКрипта'), A.text_content('#stКрипта'))

    print('— ЗАПЕЧАТАННЫЙ ТЕКСТ МЕЖДУ «УСТРОЙСТВАМИ» ЧЕРЕЗ РЕЛЕЙ')
    A.fill('#inMsg', 'привал на перевале'); A.click('#btnSend')
    try:
        B.wait_for_function("document.getElementById('journal').textContent.includes('привал на перевале')", timeout=60000)
        ок('запечатанный текст A доехал до B ЧЕРЕЗ РЕЛЕЙ и вскрылся картой эпох', True)
    except Exception:
        ок('запечатанный текст A доехал до B ЧЕРЕЗ РЕЛЕЙ и вскрылся картой эпох', False, B.text_content('#stRelay'))
    ок('отправитель подписан по имени у B', 'Алиса·19' in B.text_content('#journal'), B.text_content('#journal')[-300:])
    ок('субтитры у B показали вскрытое входящее', 'привал на перевале' in B.text_content('#subNow'), B.text_content('#subNow'))
    B.fill('#inMsg', 'принял, ветрено'); B.click('#btnSend')
    try:
        A.wait_for_function("document.getElementById('journal').textContent.includes('принял, ветрено')", timeout=60000)
        ок('ответ B доехал до A ЧЕРЕЗ РЕЛЕЙ', True)
    except Exception:
        ок('ответ B доехал до A ЧЕРЕЗ РЕЛЕЙ', False, A.text_content('#stRelay'))

    print('— «ЕВРОПА ВИДИТ ШУМ»: тот же зал, БЕЗ фразы')
    C = ctxC.new_page()
    C.on('console', lambda m: ошибки.append('C: ' + m.text) if m.type == 'error' else None)
    C.on('pageerror', lambda e: ошибки.append('C: ' + str(e)))
    C.goto(БАЗА + '/СИНГУЛЯР_22_СВЯЗЬ.html')
    C.wait_for_selector('.chan-grid button', timeout=10000)
    открыть(C, '')   # вошёл в зал, но фразы не знает
    try:
        C.wait_for_function("window.__КРИСТ22.текстТранспорт && window.__КРИСТ22.текстТранспорт.готов", timeout=30000)
        ок('Европа вошла в зал текста (реле ответил)', True)
    except Exception:
        ок('Европа вошла в зал текста (реле ответил)', False, C.text_content('#stRelay'))
    # честная точка синхронизации: у A должны быть подключены ОБА пира (B и C) —
    # вход в зал ≠ установленная связь (урок перегритинга v1.24, с той стороны)
    try:
        A.wait_for_function("window.__КРИСТ22.текстТранспорт && window.__КРИСТ22.текстТранспорт.пиров >= 2", timeout=60000)
        ок('у A подключены оба пира (B и C)', True)
    except Exception:
        ок('у A подключены оба пира (B и C)', False, A.evaluate("JSON.stringify(window.__КРИСТ22.текстТранспорт)"))
    A.fill('#inMsg', 'секретная поляна'); A.click('#btnSend')
    try:
        C.wait_for_function("document.getElementById('journal').textContent.includes('запечатано')", timeout=60000)
        ок('Европа получила ШИФРОВКУ и видит честное «запечатано»', True)
    except Exception:
        ок('Европа получила ШИФРОВКУ и видит честное «запечатано»', False, C.text_content('#journal')[-300:])
    ок('Европа НЕ видит открытый текст', 'секретная поляна' not in C.text_content('#journal'))
    ок('B тем временем вскрыл то же сообщение (фраза та же)', 'секретная поляна' in B.text_content('#journal'))

    print('— ОТКРЫТЫЙ ТЕКСТ МЕЖДУ УСТРОЙСТВАМИ НЕ ЕЗДИТ (честная граница)')
    # A переоткрывает зал БЕЗ фразы: крипта выкл → открытый текст по реле не идёт
    A.click('#btnClose'); A.wait_for_timeout(500)
    открыть(A, '')
    A.wait_for_function("document.getElementById('stКрипта').textContent.includes('выкл')", timeout=10000)
    A.fill('#inMsg', 'открытая речь в открытую степь'); A.click('#btnSend')
    time.sleep(12)   # время, за которое шифровка доезжала бы, если бы ехала
    ок('B не получил открытый текст (по реле не ездит)', 'открытая речь в открытую степь' not in B.text_content('#journal'))
    ок('A видит своё слово в своём журнале (не потерялось)', 'открытая речь в открытую степь' in A.text_content('#journal'))
    # и возврат честности: снова с фразой — доставка работает
    A.click('#btnClose'); A.wait_for_timeout(500)
    открыть(A, ФРАЗА)
    A.wait_for_function("window.__КРИСТ22.текстТранспорт && window.__КРИСТ22.текстТранспорт.готов", timeout=30000)
    A.fill('#inMsg', 'связь восстановлена'); A.click('#btnSend')
    try:
        B.wait_for_function("document.getElementById('journal').textContent.includes('связь восстановлена')", timeout=60000)
        ок('после возврата фразы доставка меж устройств жива', True)
    except Exception:
        ок('после возврата фразы доставка меж устройств жива', False, A.text_content('#stRelay'))

    print('— ДЕДУП И ЖУРНАЛ')
    ид_B = B.evaluate("async () => { const все = await window.__КРИСТ22.события(); return все.filter(e => e.conversation === 'зал-" + КОД + "').map(e => e.idempotencyKey); }")
    ок('дедуп кристалла: сообщения в журнале B без копий', len(ид_B) == len(set(ид_B)), ид_B[-6:])

    print('— ОШИБКИ КОНСОЛИ (сбои отдельных wss-релеев — штатная деградация redundancy=2)')
    важные = [о for о in ошибки if 'favicon' not in о and 'WebSocket connection' not in о and 'wss://' not in о]
    ок('0 ошибок консоли помимо релейных сбоев сети', not важные, важные[:4])

    браузер.close()

print(f'\nИТОГ: {len(прошло)}/{len(прошло) + len(упало)}')
if упало:
    print('УПАЛИ:', упало)
sys.exit(0 if not упало else 1)
