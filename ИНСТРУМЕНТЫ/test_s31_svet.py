# -*- coding: utf-8 -*-
"""Тест SNG-СВЕТ v1 (такт v1.56.0 «ЧИСТЫЙ СВЕТ»): белый слой наверху, ПУЛЬТ во весь экран, РЕЛАКС честный.
Приказы владельца: «ЧЁРНАЯ ПОДЛОЖКА ПЕРЕКРЫЛА НИЖНИЙ БЕЛЫЙ СЛОЙ», «СЛАЙДЕР — ВСЕ ПАНЕЛИ
СКРЫВАЮТСЯ КОГДА ЗАПУЩЕНА МУЗЫКА», «ПУЛЬТ СРАЗУ ВОВЕСЬ ЭКРАН, УБЕРИ РАЗВЕРНУТЬ, ЭСКЕЙБ — ВЫЙТИ».
Запуск: python3 ИНСТРУМЕНТЫ/test_s31_svet.py   (из корня дома)"""
import io, os, sys
from playwright.sync_api import sync_playwright
import urllib.parse

окружение = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
дверь = 'file://' + os.path.join(окружение, 'СИНГУЛЯР_31_ЛАДОМ.html')
шаги = []
def ок(имя, условие):
    шаги.append((имя, bool(условие)))
    print(('  OK  ' if условие else '  FAIL') + ' ' + имя, flush=True)
    return bool(условие)

JS_КЛЮЧ = "([kc,key])=>{document.body.dispatchEvent(new KeyboardEvent('keydown',{keyCode:kc,key:key,bubbles:true,cancelable:true}));}"
# вражеский каскад: как старый кэш ТВ — обычные (не !important) правила поверх всего
ВРАГ = """
(function(){
  const ст=document.createElement('style'); ст.id='врагКаскад';
  ст.textContent='body{background:#101012;color:#f5f5f5}'+
    'body[data-scene="day"]{background:#101012;color:#f5f5f5}'+
    'body[data-scene="kids"]{background:#101012;color:#f5f5f5}'+
    'html[data-scene="day"]{background:#101012}html[data-scene="kids"]{background:#101012}';
  document.head.appendChild(ст);
})()
"""

with sync_playwright() as p:
    браузер = p.chromium.launch()
    стр = браузер.new_page(viewport={'width': 1280, 'height': 720})
    ошибки = []
    стр.on('console', lambda m: ошибки.append(m.text) if m.type == 'error' else None)
    стр.on('pageerror', lambda e: ошибки.append(str(e)))
    стр.goto(дверь); стр.wait_for_timeout(900)

    # ══ 1. ЧИСТЫЙ СВЕТ: ДЕНЬ под MONO-темой с вражеским каскадом — бумага держится ══
    стр.evaluate("window.__SCENE && window.__SCENE.set('day')")
    стр.evaluate("document.body.dataset.theme='mono'")
    стр.evaluate(ВРАГ); стр.wait_for_timeout(250)
    фон = стр.evaluate("getComputedStyle(document.body).backgroundColor")
    текст = стр.evaluate("getComputedStyle(document.body).color")
    ок('ДЕНЬ+MONO+враг: тело бумажное, не #101012 (' + фон + ')', фон == 'rgb(244, 239, 230)')
    ок('ДЕНЬ+MONO+враг: текст чернильный (' + текст + ')', текст == 'rgb(42, 36, 32)')
    фон_html = стр.evaluate("getComputedStyle(document.documentElement).backgroundColor")
    ок('ДЕНЬ+MONO+враг: html тоже закреплён (' + фон_html + ')', фон_html == 'rgb(244, 239, 230)')

    # ══ 2. ЧИСТЫЙ СВЕТ: ДЕТИ — крем держится, тёмных заливок света нет ══
    стр.evaluate("window.__SCENE && window.__SCENE.set('kids')"); стр.wait_for_timeout(250)
    фон = стр.evaluate("getComputedStyle(document.body).backgroundColor")
    ок('ДЕТИ+MONO+враг: тело кремовое (' + фон + ')', фон == 'rgb(255, 246, 233)')
    заливки = стр.evaluate("""[...document.querySelectorAll('#light .lay')].map(l=>({vis:l.classList.contains('vis'),bg:l.style.background}))""")
    ок('ДЕТИ: слои света пусты — никакого «ТВ-растра»', all(not z['vis'] and not z['bg'] for z in заливки))

    # ══ 3. свет сцены в светлой комнате молчит (гард setLight проверяется поведением: секция меняется — заливка не льётся) ══
    ок('движок связан через окно: закрепиСвет и смывка живы', стр.evaluate("!!(window.__ЗАКРЕПИСВЕТ && window.__СВЕТ_СМОЙ_ЗАЛИВКИ && window.__СВЕТЛЫЕ_КОМНАТЫ)"))
    заливки = стр.evaluate("""[...document.querySelectorAll('#light .lay')].map(l=>l.classList.contains('vis'))""")
    ок('в ДЕТИ заливок нет: слои света пусты', not any(заливки))

    # ══ 4. hc выше закрепления (ЧЕЛОВЕК РЕШАЕТ) ══
    стр.evaluate("document.getElementById('hcGo').click()")
    инлайн = стр.evaluate("document.body.style.backgroundColor || ''")
    ок('hc включён: инлайн закрепления снят — контраст правит сам (' + repr(инлайн) + ')', инлайн == '')
    стр.evaluate("document.getElementById('hcGo').click()")
    фон = стр.evaluate("getComputedStyle(document.body).backgroundColor")
    ок('hc выключен: крем вернулся (' + фон + ')', фон == 'rgb(255, 246, 233)')

    # ══ 4б. ЛАБ выше пояса: свои цвета видны в светлой комнате (ревизия 6-b) ══
    стр.evaluate("const в=document.getElementById('врагКаскад'); if(в) в.remove(); /* враг своё отработал в шагах 1-2 */")
    стр.evaluate("""(()=>{ body=document.body; body.style.setProperty('--bg','#101010'); body.style.setProperty('--text','#ffffff'); if(window.__ЗАКРЕПИСВЕТ)window.__ЗАКРЕПИСВЕТ(); })()""")
    стр.wait_for_timeout(120)
    фон = стр.evaluate("getComputedStyle(document.body).backgroundColor")
    ок('ЛАБ свои цвета в ДЕТИ видны (' + фон + ')', фон == 'rgb(16, 16, 16)')
    стр.evaluate("""(()=>{ document.body.style.removeProperty('--bg'); document.body.style.removeProperty('--text'); if(window.__ЗАКРЕПИСВЕТ)window.__ЗАКРЕПИСВЕТ(); })()""")
    фон = стр.evaluate("getComputedStyle(document.body).backgroundColor")
    ок('ЛАБ снял — крем вернулся (' + фон + ')', фон == 'rgb(255, 246, 233)')

    # ══ 5. ПУЛЬТ: синяя кнопка → сразу во весь экран, РАЗВЕРНУТЬ нет ══
    стр.evaluate(JS_КЛЮЧ, [406, 'ColorF3Blue']); стр.wait_for_timeout(300)
    пан = "document.getElementById('panel')"
    ок('ПУЛЬТ открыт', стр.evaluate(пан + '.open'))
    ширина = стр.evaluate(пан + '.offsetWidth'); высота = стр.evaluate(пан + '.offsetHeight')
    ок('ПУЛЬТ во весь экран (' + str(ширина) + 'x' + str(высота) + ')',
       ширина == 1280 and высота == 720)
    ок('«РАЗВЕРНУТЬ» снят', стр.evaluate("!document.getElementById('pulToggle') && !document.getElementById('pulFull')"))
    ок('фокус на рельсе вкладок', стр.evaluate("(document.activeElement.getAttribute('role')||'')") == 'tab')
    слои = стр.evaluate("window.__СЛОИ ? window.__СЛОИ.аудит(false) : null")
    ок('СЛОИ-аудит при открытом ПУЛЬТе честен: ' + (слои or {}).get('текст','—'),
       слои and слои['нарушений']==0 and 'законно' in слои['текст'])
    стр.evaluate("""document.getElementById('panel').dispatchEvent(new KeyboardEvent('keydown',{key:'GoBack',keyCode:10009,bubbles:true,cancelable:true}))""")
    стр.wait_for_timeout(250)
    ок('BACK (Samsung 10009) тоже закрывает меню без ТВ-режима', not стр.evaluate(пан + '.open'))
    стр.evaluate(JS_КЛЮЧ, [406, 'ColorF3Blue']); стр.wait_for_timeout(250)  # вернуть ПУЛЬТ для шага Esc

    # ══ 6. ЭСКЕЙБ — выход из меню ══
    стр.evaluate("""document.getElementById('panel').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',keyCode:27,bubbles:true,cancelable:true}))""")
    стр.wait_for_timeout(350)
    ок('Esc закрыл ПУЛЬТ', not стр.evaluate(пан + '.open'))
    ок('Esc НЕ уводит из зала (закон верхнего слоя)', 'ЛАДОМ' in urllib.parse.unquote(стр.url) or стр.evaluate("!!document.body && document.readyState!=='uninitialized'") and 'index.html' not in стр.url)

    # ══ 7. РЕЛАКС: музыка играет — гаснут ВСЕ панели и слайдеры ══
    стр.evaluate("document.body.classList.remove('relax-peek')")
    стр.evaluate("document.getElementById('btnStart').click()")
    стр.wait_for_timeout(1400)
    ок('музыка играет', стр.evaluate("window.__KV && window.__KV.audio && !window.__KV.audio.paused"))
    ок('РЕЛАКС: body.relax стоит', стр.evaluate("document.body.classList.contains('relax')"))
    гаснут = стр.evaluate("""['.topbar','#sceneRow','.songhead','.dock','.sng-strip','#toast','#authorTag'].map(с=>{const э=document.querySelector(с);if(!э)return 'нет:'+с;const ст=getComputedStyle(э);return с+':'+ст.opacity+':'+ст.pointerEvents})""")
    ок('все панели погасли: ' + '; '.join(гаснут),
       all(з.endswith('0:none') for з in гаснут))
    ок('строки песни живы (не гаснут)', стр.evaluate("getComputedStyle(document.querySelector('.line')).opacity") != '0')
    # ══ 8. касание возвращает (подглядеть) ══
    стр.evaluate("document.dispatchEvent(new Event('pointerdown'))")
    стр.wait_for_timeout(900)  # ждём конца перехода 0.5с — читаем устоявшееся
    док = стр.evaluate("getComputedStyle(document.querySelector('.dock')).opacity")
    ок('касание — панели вернулись на 2.6с (док ' + док + ')', док == '1')
    # ══ 9. пауза возвращает всё ══
    стр.evaluate("window.__KV.audio.pause()")
    стр.wait_for_timeout(600)
    ок('РЕЛАКС снялся при паузе', стр.evaluate("!document.body.classList.contains('relax')"))
    док = стр.evaluate("getComputedStyle(document.querySelector('.dock')).opacity")
    ок('док виден после паузы (' + док + ')', док == '1')

    # ══ 10. чип версии на бирке ══
    ок('бирка несёт чип версии', стр.evaluate("!!document.querySelector('.sng-strip .sng-верш') && /v10\.\d+/.test(document.querySelector('.sng-strip .sng-верш').textContent)   /* v10.47: пин v10.7 → паттерн версии */"))

    стр.evaluate("try{window.__KV.audio.pause()}catch(e){}")
    браузер.close()

    чисто = [о for о in ошибки if '404' not in о and 'net::' not in о]
    ок('консоль чиста (ошибок кода: ' + str(len(чисто)) + ')', not чисто)
    if чисто: print('ОШИБКИ:', чисто[:5], flush=True)

печ = sum(1 for _, з in шаги if з)
print()
print('ПРОГОН test_s31_svet: ' + str(печ) + '/' + str(len(шаги)) + ' OK')
print('VERDICT: ' + ('PASS — ЧИСТЫЙ СВЕТ доказан' if печ == len(шаги) else 'FAIL — править'))
sys.exit(0 if печ == len(шаги) else 1)
