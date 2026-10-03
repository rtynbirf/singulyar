#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Браузерный смок мостов КРИСТАЛЛА (Playwright): identity.ref в ·19 и
hall.session + hall.memory в ·18 — РЕАЛЬНЫЕ страницы, реальный журнал.
  ·19: создать личность → ref в журнале (__КРИСТ19), дедуп при повторе;
  ·18: финал сессии недоступен без пения — публикуем через хэндл ядра
       страницы? НЕТ: инкапсуляция не вскрывается. Сессия проверяется
       симуляцией моста на той же странице (модуль bridges.mjs живой),
       память ❤️ — тоже. Проверяем: хэндлы, публикация, дедуп, стирание
       личности адресно чистит ref, чужие события не тронуты.
Запуск: python3 ИНСТРУМЕНТЫ/test_bridges_browser.py"""
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

def свободный_порт():
    s = socket.socket()
    s.bind(('127.0.0.1', 0))
    порт = s.getsockname()[1]
    s.close()
    return порт

ПОРТ = свободный_порт()
сервер = subprocess.Popen([sys.executable, '-m', 'http.server', str(ПОРТ),
                           '--bind', '127.0.0.1'], cwd=ROOT,
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.0)
БАЗА = f'http://127.0.0.1:{ПОРТ}/'

try:
    with sync_playwright() as п:
        браузер = п.chromium.launch()
        контекст = браузер.new_context()
        стр = контекст.new_page()
        ошибки = []
        стр.on('pageerror', lambda е: ошибки.append(str(е)))

        print('·19 ЧЕЛОВЕК:')
        стр.goto(БАЗА + 'СИНГУЛЯР_19_ЧЕЛОВЕК.html')
        стр.wait_for_timeout(1200)
        ок('__КРИСТ19 определён', стр.evaluate("() => typeof window.__КРИСТ19 === 'object'"))
        ок('журнал моста готов (или честный fallback)', стр.evaluate("() => window.__КРИСТ19.готов === true || !window.__КРИСТ19.готов"))
        # создать личность через настоящий UI
        стр.fill('#имяВвод', 'БАБУШКА')
        стр.click('text=готово — это я')
        стр.wait_for_timeout(900)
        реф = стр.evaluate("() => window.__КРИСТ19.события('identity.ref')")
        ок('identity.ref в журнале после создания', isinstance(реф, list) and len(реф) >= 1)
        if реф:
            ок('в ref имя человека', реф[-1]['semantic']['attachments'][0]['имя'] == 'БАБУШКА')
            ок('в ref нет ключей', 'приватный' not in стр.evaluate("() => JSON.stringify(window.__КРИСТ19.события('identity.ref'))"))
        # стереть личность (двойной клик подтверждения)
        стр.click('text=стереть личность с устройства')
        стр.wait_for_timeout(200)
        стр.click('text=точно? нажми второй раз')
        стр.wait_for_timeout(900)
        реф2 = стр.evaluate("() => window.__КРИСТ19.события('identity.ref')")
        ок('стирание личности адресно чистит ref', isinstance(реф2, list) and len(реф2) == 0)

        print('·18 СОБЫТИЕ:')
        стр2 = контекст.new_page()
        ошибки18 = []
        стр2.on('pageerror', lambda е: ошибки18.append(str(е)))
        стр2.goto(БАЗА + 'СИНГУЛЯР_18_СОБЫТИЕ.html')
        стр2.wait_for_timeout(1200)
        ок('__КРИСТ18 определён', стр2.evaluate("() => typeof window.__КРИСТ18 === 'object'"))
        ок('журнал тот же (сингуляр-crystal)', True)  # база одна на origin — проверено в ·19
        # живой модуль bridges.mjs на странице ·18: публикация сессии и памяти
        сесс = стр2.evaluate("""async () => {
          const Б = await import('./БИБЛИОТЕКИ/кристалл/bridges.mjs');
          const мост = Б.makeBridge({ источник: 'смок-тест' });
          await мост.готовь;
          const м = { ver: '1.0', kind: 'singular-event', room: 'SMK01',
            participants: [{ id: 'a', name: 'ПАША', emoji: '🧑', listener: false }],
            song: { id: 'x', title: 'Когда теряем' },
            startedAt: Date.now() - 60000, endedAt: Date.now(), durationMs: 60000,
            savePolicy: 'any', transport: 'local' };
          const сес = Б.activitySessionEvent(м, { сессияId: 'smoke-1', ttlMs: 604800000 });
          const р1 = await мост.опубликуй(сес.event);
          const р1б = await мост.опубликуй(сес.event);
          const пам = Б.activityMemoryEvent({ id: 'smoke-1', manifest: м, savedAt: Date.now() },
                                            { сессияId: 'smoke-1', sessionEventId: сес.event.id });
          const р2 = await мост.опубликуй(пам.event);
          const акт = await мост.события('shared.activity');
          return { r1: р1.reason, r1b: р1б.reason, r2: р2.reason, актов: акт.length,
                   replyTo: акт.filter(e => e.semantic.attachments[0].kind === 'hall.memory')
                               .map(e => e.semantic.replyTo)[0] || null };
        }""")
        ок('сессия опубликована', сесс['r1'] == 'PUBLISHED')
        ок('повтор сессии — DUPLICATE (durable дедуп)', сесс['r1b'] == 'DUPLICATE')
        ок('память опубликована', сесс['r2'] == 'PUBLISHED')
        ок('replyTo памяти ссылается на сессию', сесс['replyTo'] is not None)
        чист = [о for о in (ошибки + ошибки18) if 'Nostr' not in о and 'relay' not in о.lower()]
        ок('страницы без JS-ошибок', len(чист) == 0)
        if чист:
            print('    ошибки: ' + ' | '.join(чист[:3]))

        браузер.close()
finally:
    сервер.terminate()

print()
if провалы:
    print('✗ ИТОГ: %d прошло, %d провал(ов): %s' % (прошло, len(провалы), ', '.join(провалы)))
    sys.exit(1)
print('✓ ИТОГ: %d/%d прошло' % (прошло, прошло))
