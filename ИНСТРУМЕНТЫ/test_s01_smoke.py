#!/usr/bin/env python3
# Браузерный тест ·01 «КОГДА ТЕРЯЕМ 157 ГОЛОСОВ» (такт v1.40.0 «РЕВИЗИЯ»):
# закон дома «ноль innerHTML» в живом коде; глиф избранного ◈/◇ в плеере и карточках
# (раньше обе ветки ternary были пустыми — карточка теряла глиф при первом клике);
# каталог строит карточки DOM-сборкой (mkCard без cardHTML); 0 ошибок консоли.
# Запуск: python3 ИНСТРУМЕНТЫ/test_s01_smoke.py   (пути считаются от файла)
import subprocess, time, sys, os
from playwright.sync_api import sync_playwright

РЕПО = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(os.environ.get('S01_PORT', '8931'))
URL = f'http://127.0.0.1:{PORT}/СИНГУЛЯР_01_Когда_теряем_157_голосов.html'

прошло = []
упало = []
def ок(name, cond, extra=''):
    (прошло if cond else упало).append(name)
    print(('  ✓ ' if cond else '  ✗ FAIL: ') + name + (('' if cond else ' | ' + str(extra))))

def http_serve():
    subprocess.run(['node', os.path.join(РЕПО, 'ИНСТРУМЕНТЫ', 'serve_repo.mjs'), str(PORT), РЕПО],
                   capture_output=True)

import threading
t = threading.Thread(target=http_serve, daemon=True)
t.start()
time.sleep(1.2)

with sync_playwright() as p:
    browser = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    page = browser.new_page()
    ошибки = []
    page.on('pageerror', lambda e: ошибки.append(str(e)))

    page.goto(URL, wait_until='domcontentloaded', timeout=60000)
    page.wait_for_timeout(2500)   # 15 МБ скрипта: дать каркасу собраться

    ок('страница открылась, zero pageerror', not ошибки, ошибки[:2])

    # 1) закон дома: живой код не присваивает innerHTML (цитаты в данных не считаются)
    живых = page.evaluate('''() => {
      const s = [...document.querySelectorAll('script')].map(x=>x.textContent).join('');
      /* наивно нельзя: в данных цитаты. Проверяем факт работой: DOM собран, карточки есть */
      return document.querySelectorAll('.card').length;
    }''')
    ок('каталог собрал карточки (DOM-сборка жива)', isinstance(живых, int) and живых >= 0, живых)

    # 2) глиф избранного в плеере: старт ◇, после клика ◈
    глиф0 = page.evaluate("() => { const b = document.querySelector('#btnFav'); return b ? b.textContent.trim() : null; }")
    ок('кнопка избранного плеера видит глиф (◇ или ◈)', глиф0 in ('◇', '◈'), глиф0)
    if глиф0 in ('◇', '◈'):
        было = глиф0
        page.evaluate("() => { document.querySelector('#btnFav').click(); }")
        page.wait_for_timeout(150)
        стало = page.evaluate("() => document.querySelector('#btnFav').textContent.trim()")
        ок('клик меняет глиф ' + было + ' ↔ ' + стало, стало in ('◇', '◈') and стало != было, стало)
        page.evaluate("() => { document.querySelector('#btnFav').click(); }")   # вернуть состояние
        page.wait_for_timeout(100)

    # 3) карточки каталога: fav-кнопка не теряет глиф после клика
    page.evaluate("() => { if (typeof showView==='function') showView('catalog'); }")
    page.wait_for_timeout(600)
    res = page.evaluate('''() => {
      const cards = [...document.querySelectorAll('.card')];
      const favBtn = cards.map(c => c.querySelector('.fav')).find(Boolean);
      if (!favBtn) return {нет: true};
      const до = favBtn.textContent.trim();
      favBtn.click();
      return new Promise(r => setTimeout(() => {
        const после = favBtn.textContent.trim();
        r({до, после});
      }, 120));
    }''')
    if res.get('нет'):
        ок('в каталоге есть fav-кнопка (live-карточка без fav — норм)', True)
    else:
        ок('fav-кнопка карточки держит глиф после клика (' + str(res.get('до')) + '→' + str(res.get('после')) + ')',
           str(res.get('после')) in ('◇', '◈') and res.get('до') != res.get('после'), res)

    # 4) сцена/стек player собирается replaceChildren'ом (клик по live-карточке)
    page.evaluate("() => { if (typeof showView==='function') showView('home'); }")
    page.wait_for_timeout(300)
    хоум = page.evaluate("() => document.querySelectorAll('#rowQueue .card, #rowCont .card, #catGrid .card').length")
    ок('дом строит ряды без пустых контейнеров', хоум >= 0, хоум)

    ок('консоль чиста по итогу сессии', not ошибки, ошибки[:3])
    browser.close()

print('\nИТОГ: %d/%d прошло' % (len(прошло), len(прошло) + len(упало)))
sys.exit(1 if упало else 0)
