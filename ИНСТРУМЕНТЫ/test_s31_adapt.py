# -*- coding: utf-8 -*-
"""Тест SNG-АДАПТ v1 (такт v1.51.0 «АДАПТ»): одна квартира для всех экранов и всех сред.
Эмуляция сред: ТВ (Tizen UA, 1920x1080), телефон (iPhone 13), планшет (iPad Pro 11), стол (ПК).
Проверка: детектор среды по возможностям, safe-кадр ТВ (панели не под кантом),
fluid-размеры без clamp (пол/рост/потолок), классы окна MD3, цели >=48px, I-01 на столе.
Запуск: python3 ИНСТРУМЕНТЫ/test_s31_adapt.py   (из корня дома)"""
import io, os, sys
from playwright.sync_api import sync_playwright

окружение = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
дверь = 'file://' + os.path.join(окружение, 'СИНГУЛЯР_31_ЛАДОМ.html')
шаги = []
def ок(имя, условие):
    шаги.append((имя, bool(условие)))
    print(('  OK  ' if условие else '  FAIL') + ' ' + имя, flush=True)
    return bool(условие)

TIZEN_UA = 'Mozilla/5.0 (SMART-TV; Linux; Tizen 6.5; SmartHub; SMART-TV; SmartTV; U) AppleWebKit/537.36 (KHTML, like Gecko) 76.0.3809.146/6.5 TV Safari/537.36'

with sync_playwright() as p:
    браузер = p.chromium.launch()

    # ── 1. СТОЛ: 1280x720, обычный chromium ──
    с = браузер.new_context(viewport={'width':1280,'height':720})
    стр = с.new_page()
    ошибки = []
    стр.on('pageerror', lambda e: ошибки.append(str(e)))
    стр.goto(дверь); стр.wait_for_timeout(700)
    ок('стол: data-env="стол"', стр.evaluate("document.documentElement.getAttribute('data-env')") == 'стол')
    ок('стол: ядро пульта спит (I-01): data-rc нет', стр.evaluate("document.documentElement.getAttribute('data-rc')") is None)
    ок('стол: фокус не украден', стр.evaluate("document.activeElement===document.body||document.activeElement===document.documentElement"))
    ок('стол: окно широко (1280>=840)', стр.evaluate("document.documentElement.getAttribute('data-окно')") == 'широко')
    h1 = стр.evaluate("parseFloat(getComputedStyle(document.querySelector('#start h1')).fontSize)")
    ок('стол 1280x720: титул 58px (высота<=840 → потолок низкой шапки, как задумано)', abs(h1-58)<1)
    # ресайз: класс окна трансформируется (MD3)
    стр.set_viewport_size({'width':700,'height':700}); стр.wait_for_timeout(400)
    ок('ресайз 700: окно средне (600–840)', стр.evaluate("document.documentElement.getAttribute('data-окно')") == 'средне')
    стр.set_viewport_size({'width':500,'height':700}); стр.wait_for_timeout(400)
    ок('ресайз 500: окно компакт (<600)', стр.evaluate("document.documentElement.getAttribute('data-окно')") == 'компакт')
    с.close()

    # ── 2. ТВ: Tizen UA, 1920x1080, DPR 1 ──
    т = браузер.new_context(viewport={'width':1920,'height':1080}, device_scale_factor=1, user_agent=TIZEN_UA)
    стр = т.new_page()
    стр.on('pageerror', lambda e: ошибки.append(str(e)))
    стр.goto(дверь); стр.wait_for_timeout(700)
    ок('тв: data-env="тв"', стр.evaluate("document.documentElement.getAttribute('data-env')") == 'тв')
    ок('тв: пульт проснулся сам (Tizen UA → tvOn)', стр.evaluate("document.documentElement.getAttribute('data-rc')") == '1')
    # safe-кадр: шапка и док внутри 90% action-safe
    tp = стр.evaluate("parseFloat(getComputedStyle(document.querySelector('.topbar')).paddingTop)")
    ок('тв: шапка padding-top = 64px (10px + 5vh от 1080)', abs(tp-64)<1.5)
    dp = стр.evaluate("parseFloat(getComputedStyle(document.querySelector('.dock')).paddingBottom)")
    ок('тв: док padding-bottom = 68px (14px + 5vh)', abs(dp-68)<1.5)
    кадр = стр.evaluate("""(()=>{ const м1=0.04, м2=0.96;
      const н=[...document.querySelectorAll('.topbar .tbtn,.topbar .chip')].filter(e=>e.offsetParent!==null);
      const д=[...document.querySelectorAll('.dock button')].filter(e=>e.offsetParent!==null);
      let окей=true;
      for(const e of [...н,...д]){ const r=e.getBoundingClientRect();
        if(r.top<1080*м1||r.bottom>1080*м2||r.left<1920*м1||r.right>1920*м2)окей=false; }
      return окей; })()""")
    ок('тв: все кнопки шапки и дока внутри safe-кадра (4% запас)', кадр)
    sr = стр.evaluate("parseFloat(getComputedStyle(document.querySelector('#sceneRow')).top)")
    ок('тв: ряд сцен = 172px (12px+5vh+бирка 36+ТВ-шапка 10-foot), не под кантом', abs(sr-172)<2)
    h1 = стр.evaluate("parseFloat(getComputedStyle(document.querySelector('#start h1')).fontSize)")
    ок('тв 1920x1080: титул 92px (потолок clamp восстановлен)', abs(h1-92)<1)
    ln = стр.evaluate("parseFloat(getComputedStyle(document.querySelector('.line')).fontSize)")
    ок('тв: строка песни 58px (потолок fluid, lyrScale=1)', abs(ln-58)<1)
    tb = стр.evaluate("parseFloat(getComputedStyle(document.querySelector('.tbtn')).minHeight)")
    ок('тв: цель шапки >=52px (10-foot)', tb>=52)
    db = стр.evaluate("parseFloat(getComputedStyle(document.querySelector('.dock button')).minHeight)")
    ок('тв: цель дока >=56px (10-foot)', db>=56)
    т.close()

    # ── 3. ТЕЛЕФОН: iPhone 13 (coarse, hover:none, 390x844, DPR 3) ──
    try:
        айфон = p.devices['iPhone 13']
    except Exception:
        айфон = None
    if айфон:
        ф = браузер.new_context(**айфон)
        стр = ф.new_page()
        стр.on('pageerror', lambda e: ошибки.append(str(e)))
        стр.goto(дверь); стр.wait_for_timeout(700)
        ок('телефон: data-env="телефон"', стр.evaluate("document.documentElement.getAttribute('data-env')") == 'телефон')
        db = стр.evaluate("parseFloat(getComputedStyle(document.querySelector('.dock button')).minHeight)")
        ок('телефон: цель дока >=50px (MD3 48dp перекрыт)', db>=50)
        tb = стр.evaluate("parseFloat(getComputedStyle(document.querySelector('.tbtn')).minHeight)")
        ок('телефон: цель шапки >=48px', tb>=48)
        ок('телефон: пульт спит (I-01: палец не пульт)', стр.evaluate("document.documentElement.getAttribute('data-rc')") is None)
        ф.close()

    # ── 4. ПЛАНШЕТ: iPad Pro 11 (coarse, hover:none, 1194x834, DPR 2) — больше не ТВ! ──
    try:
        пад = p.devices['iPad Pro 11']
    except Exception:
        пад = None
    if пад:
        п = браузер.new_context(**пад)
        стр = п.new_page()
        стр.on('pageerror', lambda e: ошибки.append(str(e)))
        стр.goto(дверь); стр.wait_for_timeout(700)
        ок('планшет: data-env="планшет"', стр.evaluate("document.documentElement.getAttribute('data-env')") == 'планшет')
        ок('планшет: iPad Pro больше не спутан с ТВ (data-rc нет)', стр.evaluate("document.documentElement.getAttribute('data-rc')") is None)
        tb = стр.evaluate("parseFloat(getComputedStyle(document.querySelector('.tbtn')).minHeight)")
        ок('планшет: цель шапки >=48px', tb>=48)
        п.close()

    браузер.close()
    крит = [t for t in ошибки if 'favicon' not in t]
    ок('консоль чиста: 0 ошибок страниц', len(крит)==0)

вс = len(шаги); год = sum(1 for _,v in шаги if v)
print('ПРОГОН test_s31_adapt: %d/%d OK' % (год, вс))
print('VERDICT:', 'PASS — SNG-АДАПТ v1 доказан' if год==вс else 'FAIL')
sys.exit(0 if год==вс else 1)
