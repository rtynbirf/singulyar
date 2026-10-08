# -*- coding: utf-8 -*-
"""Тест SNG-ПУЛЬТ v1 (такт v1.51.0 «АДАПТ»): один язык для всех пультов.
Эмуляция ТВ-пультов: Samsung (10009/цвета/медиа), LG (461), браузер, цифры, CH±, VOL.
Проверка: фокус-движок, кольцо на КРАФТ, слои BACK, двухшаговый выход (и сам выход).
Запуск: python3 ИНСТРУМЕНТЫ/test_s31_pult.py   (из корня дома)"""
import io, os, sys
from playwright.sync_api import sync_playwright

окружение = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
дверь = 'file://' + os.path.join(окружение, 'СИНГУЛЯР_31_КВАРТИРНИК.html')
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
    стр.on('console', lambda m: ошибки.append(m.text) if m.type == 'error' else None)
    стр.on('pageerror', lambda e: ошибки.append(str(e)))
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

    # 6. цифры и кольцо на КРАФТ
    стр.evaluate(JS_КЛЮЧ, [53, '5']); стр.wait_for_timeout(900)  # v10.7: ждём конца CSS-перехода темы — цвет читаем устоявшийся, не анимационный
    ок('цифра 5 = подача КРАФТ', стр.evaluate("document.body.dataset.theme") == 'kraft')
    ок('фокус на главном после цифры', стр.evaluate("document.activeElement.id") in ('btnStart', 'btnPlay', 'btnAgain'))
    кольцо = стр.evaluate("getComputedStyle(document.activeElement).outlineColor")
    ок('на КРАФТ кольцо чернилами, не янтарь (' + кольцо + ')', кольцо == 'rgb(122, 74, 18)')  # var(--rc-ring) КРАФТ: #7A4A12
    стр.evaluate(JS_КЛЮЧ, [48, '0']); стр.wait_for_timeout(200)
    ок('цифра 0 = подача ТЕПЛО', стр.evaluate("document.body.dataset.theme||'warm'") == 'warm')

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
    ок('медиа-ПУСК не роняет страницу', 'КВАРТИРНИК' in стр.title() or 'СИНГУЛЯР' in стр.title())

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

    # 12. консоль чиста
    ок('консоль чиста: ' + str(len(ошибки)) + ' ошибок', len(ошибки) == 0)
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
