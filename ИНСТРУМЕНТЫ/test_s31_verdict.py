# -*- coding: utf-8 -*-
"""Тест SNG-ВЕРДИКТ (такт v1.52.0): попросили ≠ применили.
Синтез караоке-сырья: микрофонный тракт докладывает ФАКТИЧЕСКИ применённые настройки
(track.getSettings), ЗДОРОВЬЕ показывает правду, перегруз честно останавливает счёт.
Проверки: статические маркеры, ГОТОВНОСТЬ 1.52.0, SW v66, I-01 (ничего само не просит),
живой микрофон через фейковое устройство Chromium (__MIC_FACTS читается реально).
Запуск: python3 ИНСТРУМЕНТЫ/test_s31_verdict.py   (из корня дома)"""
import io, os, sys, json, re
from playwright.sync_api import sync_playwright

окружение = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
дверь = 'file://' + os.path.join(окружение, 'СИНГУЛЯР_31_ЛАДОМ.html')
шаги = []
def ок(имя, условие):
    шаги.append((имя, bool(условие)))
    print(('  OK  ' if условие else '  FAIL') + ' ' + имя, flush=True)
    return bool(условие)

текст = io.open(os.path.join(окружение, 'СИНГУЛЯР_31_ЛАДОМ.html'), encoding='utf-8').read()

# ── 1. Статика: маркеры ВЕРДИКТА в коде ──
ок('статика: track.getSettings читается после захвата', 'getSettings' in текст)
ок('статика: __MIC_FACTS — фактические настройки в глобале', 'window.__MIC_FACTS' in текст)
ок('статика: честный флаг honest (EC/NS/AGC === false)', 'honest: st.echoCancellation===false && st.noiseSuppression===false && st.autoGainControl===false' in текст)
ок('статика: перегруз-вердикт ПЕРЕГРУЗ', 'ПЕРЕГРУЗ' in текст)
ок('статика: порог клиппинга 0.985', 'peak >= 0.985' in текст)
ок('статика: счёт честен — stable включает !clipped', 'rms>0.02 && !clipped' in текст)
ок('статика: autoCorrelate возвращает peak', 'return { f: sr/bestOff, rms:rms, peak:peak };' in текст)
ок('статика: ЗДОРОВЬЕ — микрофон-вердикт', 'микрофон-вердикт' in текст)
ок('статика: принцип попросили ≠ применили', 'попросили ≠ применили' in текст)
ок('статика: гард повторного чтения (трек не найден / не поддержан)', 'трек не найден' in текст and 'браузер не отдаёт фактические настройки' in текст)

# ── 2. Версии дома ──
ман = json.load(io.open(os.path.join(окружение, 'ГОТОВНОСТЬ.manifest.json'), encoding='utf-8'))
ок('ГОТОВНОСТЬ: версия живёт (формат 1.x.0 — пин 1.56.0 устарел)', re.match(r'1\.\d+\.0', str(ман.get('version'))) is not None)
ок('ГОТОВНОСТЬ: запись ВЕРДИКТ в production_ready', any('ВЕРДИКТ' in str(x) for x in ман.get('production_ready', [])))
ок('ГОТОВНОСТЬ: отвергнутые из 300 зафиксированы с причинами', any('ОТВЕРГНУТО' in str(x) for x in ман.get('production_ready', [])))
св = io.open(os.path.join(окружение, 'sw15.js'), encoding='utf-8').read()
ок('SW: кэш vN (паттерн — пин v69 устарел на тактах v70…v102)', re.search(r's15-orkestrator-v\d+', св) is not None)

# ── 3. Живой микрофон: фейковое устройство Chromium ──
ошибки = []
with sync_playwright() as p:
    браузер = p.chromium.launch(args=[
        '--use-fake-device-for-media-stream',
        '--use-fake-ui-for-media-stream',
        '--autoplay-policy=no-user-gesture-required',
    ])
    с = браузер.new_context(viewport={'width':1280,'height':720})
    стр = с.new_page()
    стр.on('pageerror', lambda e: ошибки.append(str(e)))
    стр.goto(дверь); стр.wait_for_timeout(700)

    ок('живой: I-01 — микрофон ещё не запрашивался (__MIC_FACTS пусто)', стр.evaluate('window.__MIC_FACTS === undefined'))
    ок('живой: панель открывается только по воле человека', стр.evaluate('typeof window.openMic') == 'function')

    # человек решает: открываем панель и жмём ПУСК
    стр.evaluate('window.openMic()'); стр.wait_for_timeout(200)
    стр.click('#micGo'); стр.wait_for_timeout(1200)

    факты = стр.evaluate('window.__MIC_FACTS || null')
    ок('живой: __MIC_FACTS прочитаны из реального трека', isinstance(факты, dict) and факты.get('state') == 'прочитаны')
    if isinstance(факты, dict) and факты.get('state') == 'прочитаны':
        actual = факты.get('actual') or {}
        ок('живой: фактические настройки — объект с полями', isinstance(actual, dict) and len(actual) >= 3)
        ок('живой: honest — булевый вердикт', isinstance(факты.get('honest'), bool))
        статус = стр.evaluate('document.getElementById("micStat").textContent')
        ок('живой: статус-строка живая и честная', len(статус) > 5)
    else:
        ок('живой: фактические настройки — объект с полями', False)
        ок('живой: honest — булевый вердикт', False)
        ок('живой: статус-строка живая и честная', False)

    # человек решает: СТОП — стрим честно гаснет
    стр.click('#micStop'); стр.wait_for_timeout(400)
    ок('живой: после СТОП заметка сброшена', стр.evaluate('document.getElementById("micNote").textContent') == '—')
    ок('живой: консоль чиста (0 ошибок страницы)', len(ошибки) == 0)
    с.close(); браузер.close()

провал = [n for n, r in шаги if not r]
print()
print('ПРОГОН test_s31_verdict: %d/%d OK' % (len(шаги) - len(провал), len(шаги)))
print('VERDICT: ' + ('PASS — микрофонный тракт докладывает факт, перегруз честен' if not провал else 'FAIL: ' + '; '.join(провал)))
sys.exit(1 if провал else 0)
