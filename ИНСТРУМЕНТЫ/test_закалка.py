#!/usr/bin/env python3
# Браузерный тест такта v1.42.0 «ЗАКАЛКА» — страховочный КОРД дома.
# Приказ владельца: «ИСПРАВЛЯЙ КОСЯЧКИ БАГИ ПРИБИВАЙ, ЧТОБ У ЧЕЛОВЕКА НЕ ВЫЛЕЗ
# СИНИЙ (СЕЙЧАС ЧЁРНЫЙ =)) ЭКРАН СМЕРТИ И УСТРОЙСТВО НЕ СТАЛО КИРПИЧЁМ».
# Проверяется: корд первым скриптом; краш → панель (не тишина); журнал;
# квота-setItem не бросает; битый JSON → null; BroadcastChannel-заглушка;
# тихий режим; кнопки-решения человека; глоток-ромб; ·23 жива с кордом;
# ноль innerHTML в корде (канон).
# Запуск: python3 ИНСТРУМЕНТЫ/test_закалка.py
import subprocess, time, sys, os
from playwright.sync_api import sync_playwright

РЕПО = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(os.environ.get('ЗАК_PORT', '8952'))
URL = f'http://127.0.0.1:{PORT}/index.html'

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

# канон: в корде нет innerHTML — панель собирается DOM-сборкой
источник_корда = open(os.path.join(РЕПО, 'БИБЛИОТЕКИ', 'корд', 'корд.js'), encoding='utf-8').read()
ок('канон: в корде ноль innerHTML', 'innerHTML' not in источник_корда)

with sync_playwright() as p:
    browser = p.chromium.launch()

    # ── БЛОК 1: индекс без травм ──
    ctx = browser.new_context()
    page = ctx.new_page()
    ошибки = []
    page.on('pageerror', lambda e: ошибки.append(str(e)))
    page.goto(URL, wait_until='domcontentloaded', timeout=60000)
    page.wait_for_timeout(1200)

    ок('index открылся, zero pageerror', not ошибки, ошибки[:2])
    ок('корд жив: SNG_КОРД_ЖУРНАЛ() — функция',
       page.evaluate("() => typeof window.SNG_КОРД_ЖУРНАЛ === 'function'"))
    первый = page.evaluate("""() => {
      const с = document.querySelector('script');
      return с ? с.textContent.slice(0, 200) : '';
    }""")
    ок('корд — ПЕРВЫЙ скрипт страницы', 'СИНГУЛЯР·КОРД v1.42.0' in первый, первый[:80])

    # ── БЛОК 2: краш → панель, не тишина ──
    page.evaluate("() => { setTimeout(() => { window.__бинт = несуществуетОчевидно; }, 50); }")
    page.wait_for_timeout(800)
    панель = page.evaluate("""() => {
      const р = document.querySelector('[role="alertdialog"]');
      return р ? р.textContent : '';
    }""")
    ок('краш показал панель «НИТЬ ПОРВАЛАСЬ — ДОМ ДЕРЖИТ»', 'НИТЬ ПОРВАЛАСЬ' in панель, панель[:80])
    ок('панель в каноне: ноль эмодзи', not any(ord(ch) > 0x27BF and ord(ch) < 0x1F000 for ch in панель))
    журнал = page.evaluate("() => window.SNG_КОРД_ЖУРНАЛ()")
    ок('журнал сбоев записал падение', isinstance(журнал, list) and len(журнал) >= 1, журнал)
    кнопки = page.evaluate("""() => {
      const р = document.querySelector('[role="alertdialog"]');
      return р ? [...р.querySelectorAll('button')].map(b => b.textContent) : [];
    }""")
    ок('кнопки-решения человека на месте',
       all(any(k in б for б in кнопки) for k in ('ПЕРЕЗАПУСТИТЬ', 'ТИХИЙ РЕЖИМ', 'ПОД КАПОТ', 'СВЕРНУТЬ')), кнопки)

    # под капот: стек виден
    page.evaluate("""() => {
      const р = document.querySelector('[role="alertdialog"]');
      const кн = [...р.querySelectorAll('button')].find(b => b.textContent === 'ПОД КАПОТ');
      кн.click();
    }""")
    под_капотом = page.evaluate("() => document.querySelector('[role=alertdialog] pre') ? document.querySelector('[role=alertdialog] pre').textContent : ''")
    ок('ПОД КАПОТ показывает стек и журнал', 'СТЕК' in под_капотом and 'ЖУРНАЛ ДОМА' in под_капотом)

    # свернуть → глоток-ромб
    page.evaluate("""() => {
      const р = document.querySelector('[role="alertdialog"]');
      [...р.querySelectorAll('button')].find(b => b.textContent === 'СВЕРНУТЬ').click();
    }""")
    page.wait_for_timeout(200)
    ок('после «СВЕРНУТЬ» остался глоток-ромб',
       page.evaluate("() => !!document.getElementById('снг-корд-глоток')"))
    ctx.close()

    # ── БЛОК 3: квота-setItem не бросает + журнал знает ──
    ctx3 = browser.new_context()
    page = ctx3.new_page()
    page.add_init_script("""
      const исх = Storage.prototype.setItem;
      Storage.prototype.setItem = function(...а){
        if (String(а[0]).includes('проба-квота')) throw new DOMException('квота-имитация','QuotaExceededError');
        return исх.apply(this, а);
      };
    """)
    page.goto(URL, wait_until='domcontentloaded', timeout=60000)
    page.wait_for_timeout(1000)
    бросок = page.evaluate("""() => {
      try { localStorage.setItem('sng-проба-квота','1'); return false; }
      catch(e){ return true; }
    }""")
    ок('квота: setItem НЕ бросает вызывающему (гард держит)', бросок == False)
    жквота = page.evaluate("() => window.SNG_КОРД_ЖУРНАЛ().some(з => String(з.что||'').includes('квота'))")
    ок('квота: журнал честно записал отказ', жквота)

    # ── БЛОК 4: битый JSON → null, не смерть ──
    битый = page.evaluate("""() => {
      try { return String(JSON.parse('{битый-обрыв')); }
      catch(e){ return 'БРОСОК: ' + e.message; }
    }""")
    ок('битый JSON даёт null (гард), не SyntaxError', битый == 'null', битый)
    жjson = page.evaluate("() => window.SNG_КОРД_ЖУРНАЛ().some(з => з.откуда === 'JSON')")
    ок('битый JSON записан в журнал', жjson)
    ctx3.close()

    # ── БЛОК 5: BroadcastChannel-заглушка ──
    ctx5 = browser.new_context()
    page = ctx5.new_page()
    page.add_init_script("delete window.BroadcastChannel;")
    page.goto(URL, wait_until='domcontentloaded', timeout=60000)
    page.wait_for_timeout(800)
    шина = page.evaluate("""() => {
      try {
        const ш = new BroadcastChannel('проба');
        ш.postMessage({ж:1}); ш.close();
        return typeof BroadcastChannel === 'function';
      } catch(e){ return false; }
    }""")
    ок('BroadcastChannel-заглушка: старый браузер не роняет конструктор', шина == True)
    ctx5.close()

    # ── БЛОК 6: ТИХИЙ РЕЖИМ ──
    ctx6 = browser.new_context()
    page = ctx6.new_page()
    page.add_init_script("try{sessionStorage.setItem('sng-тихий','1')}catch(e){}")
    page.goto(URL, wait_until='domcontentloaded', timeout=60000)
    page.wait_for_timeout(800)
    ок('тихий режим: window.SNG_ТИХО === "1"',
       page.evaluate("() => window.SNG_ТИХО === '1'"))
    ок('тихий режим: CSS-убийца анимаций вставлен',
       page.evaluate("""() => {
         const ст = [...document.querySelectorAll('style')];
         return ст.some(s => (s.textContent||'').includes('animation-duration:0s'));
       }"""))
    ctx6.close()

    # ── БЛОК 7: тяжёлая комната ·23 с кордом жива ──
    ctx7 = browser.new_context()
    page = ctx7.new_page()
    ош23 = []
    page.on('pageerror', lambda e: ош23.append(str(e)))
    page.goto(f'http://127.0.0.1:{PORT}/СИНГУЛЯР_23_КРУГ.html', wait_until='domcontentloaded', timeout=60000)
    page.wait_for_timeout(1500)
    ок('·23 КРУГ открылась с кордом, zero pageerror', not ош23, ош23[:2])
    ок('·23: корд — первый скрипт',
       'СИНГУЛЯР·КОРД v1.42.0' in page.evaluate("() => (document.querySelector('script')||{}).textContent || ''"))
    ctx7.close()

    # ── БЛОК 8: ·19 — честный crypto-гард вшит ──
    стр19 = open(os.path.join(РЕПО, 'СИНГУЛЯР_19_ЧЕЛОВЕК.html'), encoding='utf-8').read()
    ок('·19: гард crypto.subtle вшит (честный отказ)',
       стр19.count('crypto.subtle недоступен') == 1 and 'crypto.subtle (https или свежий браузер)' in стр19)

    browser.close()

print()
print('ИТОГО: прошло %d, упало %d' % (len(прошло), len(упало)))
if упало:
    print('ПАЛО:', ' | '.join(упало))
    sys.exit(1)
