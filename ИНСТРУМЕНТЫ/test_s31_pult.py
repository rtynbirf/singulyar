# -*- coding: utf-8 -*-
"""Тест SNG-ПУЛЬТ v1 (такт v1.51.0 «АДАПТ»): один язык для всех пультов.
Эмуляция ТВ-пультов: Samsung (10009/цвета/медиа), LG (461), браузер, цифры, CH±, VOL.
Проверка: фокус-движок, кольцо на КРАФТ, слои BACK, двухшаговый выход (и сам выход).
Запуск: python3 ИНСТРУМЕНТЫ/test_s31_pult.py   (из корня дома)"""
import io, os, sys
from playwright.sync_api import sync_playwright

окружение = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
import subprocess, time, atexit
порт = int(os.environ.get('ПРОГОН_ПОРТ', '8968'))
serve = subprocess.Popen(['node', os.path.join(окружение, 'ИНСТРУМЕНТЫ', 'serve_repo.mjs'), str(порт), окружение],
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
atexit.register(lambda: serve.terminate())
time.sleep(1.5)
дверь = f'http://127.0.0.1:{порт}/СИНГУЛЯР_31_ЛАДОМ.html'  # v11.47: file:// режет fetch/CORS — легитимные ошибки консоли

шаги = []
def ок(имя, условие):
    шаги.append((имя, bool(условие)))
    print(('  OK  ' if условие else '  FAIL') + ' ' + имя, flush=True)
    return bool(условие)

JS_КЛЮЧ = "([kc,key])=>{document.body.dispatchEvent(new KeyboardEvent('keydown',{keyCode:kc,key:key,bubbles:true,cancelable:true}));}"

with sync_playwright() as p:
    браузер = p.chromium.launch()
    стр = браузер.new_page(viewport={'width': 1280, 'height': 720})
    ошибки = []
    url404 = []  # v11.51: URL ответов 4xx/5xx — чтобы отличить средовый 404 (minus/ в спарс-клоне) от кода дома
    стр.on('console', lambda m: ошибки.append(m.text) if m.type == 'error' else None)
    стр.on('pageerror', lambda e: ошибки.append(str(e)))
    стр.on('response', lambda r: url404.append(r.url) if r.status >= 400 else None)
    стр.goto(дверь)
    стр.wait_for_timeout(900)

    # 1. сон на десктопе (I-01)
    ок('на десктопе ядро спит (I-01): data-rc нет', стр.evaluate("document.documentElement.getAttribute('data-rc')") is None)

    # 2. жёлтая: ТВ-режим + подача
    стр.evaluate(JS_КЛЮЧ, [405, 'ColorF2Yellow']); стр.wait_for_timeout(150)
    ок('жёлтая кнопка будит ТВ-режим (data-rc=1)', стр.evaluate("document.documentElement.getAttribute('data-rc')") == '1')
    ок('жёлтая = следующая подача (стало ' + str(стр.evaluate("document.body.dataset.theme||'warm'")) + ')',
       стр.evaluate("document.body.dataset.theme||'warm'") == 'neon')

    # 3. красная/зелёная
    свет0 = стр.evaluate("document.getElementById('btnLight').classList.contains('on')")
    стр.evaluate(JS_КЛЮЧ, [403, 'ColorF0Red']); стр.wait_for_timeout(150)
    ок('красная = свет сцены переключился', стр.evaluate("document.getElementById('btnLight').classList.contains('on')") != свет0)
    суб0 = стр.evaluate("document.body.classList.contains('nosub')")
    стр.evaluate(JS_КЛЮЧ, [404, 'ColorF1Green']); стр.wait_for_timeout(150)
    ок('зелёная = субтитры переключились', стр.evaluate("document.body.classList.contains('nosub')") != суб0)

    # 4. синяя = ПУЛЬТ; BACK 10009 закрывает и возвращает фокус
    стр.evaluate(JS_КЛЮЧ, [406, 'ColorF3Blue']); стр.wait_for_timeout(250)
    ок('синяя = ПУЛЬТ открыт', стр.evaluate("document.getElementById('panel').open"))
    ок('фокус в ПУЛЬТе встал на вкладку', стр.evaluate("(document.activeElement.getAttribute('role')||'')") == 'tab')
    стр.evaluate(JS_КЛЮЧ, [10009, 'GoBack']); стр.wait_for_timeout(250)
    ок('BACK (Samsung 10009) закрыл ПУЛЬТ', not стр.evaluate("document.getElementById('panel').open"))
    ок('фокус вернулся на главное', стр.evaluate("document.activeElement.id") in ('btnStart', 'btnPlay', 'btnAgain'))

    # 5. стрелка с пустого фокуса будит seed
    стр.evaluate("document.activeElement && document.activeElement.blur(); document.body.focus();")
    стр.evaluate(JS_КЛЮЧ, [40, 'ArrowDown']); стр.wait_for_timeout(200)
    ок('стрелка будит фокус: селся на главный ряд', стр.evaluate("document.activeElement.id") in ('btnStart', 'btnPlay', 'btnAgain'))

    # 6. СКВОЗЬ-цифры честными клавишами (закон v11.51 «СКВОЗЬ» С148: цифры 1–9 = сквозная навигация
    #    по группам ПУЛЬТА с любого слоя, ТОЛЬКО isTrusted — синтетику модуль честно игнорирует;
    #    темы подачи — YELLOW и ВИД; ТВ-цифра темы больше не тема)
    стр.keyboard.press('5'); стр.wait_for_timeout(500)
    ок('цифра 5 = СКВОЗЬ: ПУЛЬТ открыт', стр.evaluate("document.getElementById('panel').open"))
    ок('цифра 5 = СКВОЗЬ: группа ЛЮДИ раскрыта', стр.evaluate("(function(){var g=document.querySelector('.p-tabs .pgroup.open button[data-pt]');return g?g.getAttribute('data-pt'):null;})()") == 'people')
    ок('цифra 5 = фокус на заголовке группы (не чип)', стр.evaluate("document.activeElement.id") == 'ptab-people')
    стр.keyboard.press('1'); стр.wait_for_timeout(400)
    ок('цифра 1 = СКВОЗЬ: группа ВИД раскрыта', стр.evaluate("(function(){var g=document.querySelector('.p-tabs .pgroup.open button[data-pt]');return g?g.getAttribute('data-pt'):null;})()") == 'look')
    стр.click('#themeChips [data-theme-k="kraft"]'); стр.wait_for_timeout(700)  # честный клик по чипу темы; ждём конца CSS-перехода — цвет читаем устоявшийся (v10.7)
    ок('ВИД: чип КРАФТ сменил подачу (тема — YELLOW и ВИД, v11.51)', стр.evaluate("document.body.dataset.theme") == 'kraft')
    кольцо = стр.evaluate("getComputedStyle(document.activeElement).outlineColor")
    ок('на КРАФТ кольцо золотым рядом (палитра-закон v10.83: #8C6D1F)', кольцо == 'rgb(140, 109, 31)')  # var(--rc-ring) КРАФТ
    стр.keyboard.press('2'); стр.wait_for_timeout(400)
    ок('цифра 2 = СКВОЗЬ: группа ТЕКСТ раскрыта', стр.evaluate("(function(){var g=document.querySelector('.p-tabs .pgroup.open button[data-pt]');return g?g.getAttribute('data-pt'):null;})()") == 'text')
    стр.keyboard.press('0'); стр.wait_for_timeout(400)
    ок('цифра 0 = ПУЛЬТ закрыт, вернулись в зал (v11.51)', not стр.evaluate("document.getElementById('panel').open"))
    ок('фокус вернулся на главный ряд', стр.evaluate("document.activeElement.id") in ('btnStart', 'btnPlay', 'btnAgain'))

    # 7. CH± текст
    р0 = int(стр.evaluate("document.getElementById('lyrSlider').value"))
    стр.evaluate(JS_КЛЮЧ, [427, 'ChannelUp']); стр.wait_for_timeout(150)
    р1 = int(стр.evaluate("document.getElementById('lyrSlider').value"))
    ок('CH+ увеличил текст (' + str(р0) + ' → ' + str(р1) + ')', р1 > р0)

    # 8. легенда по i; BACK закрывает
    стр.evaluate(JS_КЛЮЧ, [457, 'Info']); стр.wait_for_timeout(250)
    ок('i = легенда открыта', стр.evaluate("document.getElementById('rcHelp').open"))
    стр.evaluate(JS_КЛЮЧ, [10009, 'GoBack']); стр.wait_for_timeout(250)
    ок('BACK закрыл легенду', not стр.evaluate("document.getElementById('rcHelp').open"))

    # 9. громкость и медиа (после — экран может смениться, это честно)
    vol0 = стр.evaluate("window.__VOL.get()")
    стр.evaluate(JS_КЛЮЧ, [448, 'VolumeDown']); стр.wait_for_timeout(150)
    vol1 = стр.evaluate("window.__VOL.get()")
    ок('VOL− убрал громкость (' + str(vol0) + ' → ' + str(vol1) + ')', vol1 < vol0)
    стр.evaluate(JS_КЛЮЧ, [415, 'MediaPlay']); стр.wait_for_timeout(300)
    ок('медиа-ПУСК не роняет страницу', 'ЛАДОМ' in стр.title() or 'СИНГУЛЯР' in стр.title())

    # 10. двухшаговый выход: предупреждение, снятие взвода, и сам выход
    стр.evaluate(JS_КЛЮЧ, [10009, 'GoBack']); стр.wait_for_timeout(200)
    тост = стр.evaluate("(document.getElementById('rcToast')||{textContent:''}).textContent")
    ок('первый BACK на сцене предупреждает: «' + тост[:26] + '»', 'ДОМ' in тост)
    стр.evaluate(JS_КЛЮЧ, [405, 'ColorF2Yellow']); стр.wait_for_timeout(150)   # чужая клавиша снимает взвод
    стр.evaluate(JS_КЛЮЧ, [10009, 'GoBack']); стр.wait_for_timeout(200)
    ок('чужая клавиша сняла взвод — снова предупреждение, дом на месте', 'index.html' not in стр.url)
    стр.wait_for_timeout(5300)
    стр.evaluate(JS_КЛЮЧ, [10009, 'GoBack']); стр.wait_for_timeout(200)        # взвод
    стр.evaluate(JS_КЛЮЧ, [10009, 'GoBack']); стр.wait_for_timeout(700)        # выход
    ок('второй BACK подряд ведёт в ДОМ', 'index.html' in стр.url)

    # 11. нормализатор знает все платформы (вернулись на дверь)
    стр.goto(дверь); стр.wait_for_timeout(900)
    ок('нормализатор: 227=RW, LG 461=BACK, ColorF3Blue=BLUE, Tizen 10252=PLAYPAUSE',
       стр.evaluate("SNGRC.norm({keyCode:227})") == 'RW'
       and стр.evaluate("SNGRC.norm({keyCode:461})") == 'BACK'
       and стр.evaluate("SNGRC.norm({key:'ColorF3Blue'})") == 'BLUE'
       and стр.evaluate("SNGRC.norm({keyCode:10252})") == 'PLAYPAUSE')

    # 12. консоль чиста (v11.47: политика жеста браузера navigator.vibrate при синтетическом пульте — не код дома;
    #     v11.51: 404 на /minus/ — среда спарс-клона (minus/ ≈2 ГБ не выкачан), в полном доме и на Pages файл есть)
    minus404 = len([u for u in url404 if '/minus/' in u])
    коды = [о for о in ошибки if 'navigator.vibrate' not in о]
    if minus404:
        убрано = 0; чисто = []
        for о in коды:
            if убрано < minus404 and 'Failed to load resource' in о and '404' in о:
                убрано += 1; continue
            чисто.append(о)
        коды = чисто
        print('  (прощено средовых 404 /minus/: %d — спарс-клон)' % убрано, flush=True)
    ок('консоль чиста: ' + str(len(коды)) + ' кодовых ошибок', len(коды) == 0)
    if ошибки:
        print('ОШИБКИ:', ошибки[:5], flush=True)

    браузер.close()

печ = 0
for имя, р in шаги:
    печ += 1 if р else 0
print()
print('ПРОГОН test_s31_pult: ' + str(печ) + '/' + str(len(шаги)) + ' OK')
print('VERDICT: ' + ('PASS — SNG-ПУЛЬТ v1 доказан' if печ == len(шаги) else 'FAIL — править'))
sys.exit(0 if печ == len(шаги) else 1)
