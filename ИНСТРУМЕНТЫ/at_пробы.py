#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""at_пробы.py — машинные пробы AT-матрицы волны W5 «Реальная доступность» (ТЗ §5).

Честные границы (закон дома «заявление ≠ факт»):
  · пробы исполняются в Chromium (Playwright, headless) на локальной копии дома;
  · клавиатура/switch-субстрат/ARIA-семантика — измеряются машиной [ИЗМЕРЕНО];
  · Брайль — канон дома READY (стражи adapter-os 16/16), физический дисплей — вне
    контракта (канон v11.00 «БРАЙЛЬ») → строка 👤;
  · NVDA/VoiceOver/TalkBack — живые экранники, в песочнице Linux НЕ исполняются:
    дом измеряет их СУБСТРАТ (ARIA-дерево/accname/live-регионы) и честно оставляет
    живой прогон 👤 владельцу — результатов, которых нет, не заявляем.

Запуск: python3 ИНСТРУМЕНТЫ/at_пробы.py [--стенд http://127.0.0.1:8917]
Стенд: python3 -m http.server 8917 (из корня дома).
Выход: /tmp/w5_пробы.json — сырые замеры; протокол собирает волна.
Лица: хаб index.html, ·01 КОГДА ТЕРЯЕМ, ·31 ЛАДОМ, ·35 ВОПРОСЫ, ·38 ПУЛЬС (ТЗ §5).
"""
import json
import subprocess
import sys
import time
import urllib.request
from playwright.sync_api import sync_playwright

ПОРТ = 8917
ЛИЦА = [
    ("хаб", "index.html"),
    ("·01 КОГДА ТЕРЯЕМ", "СИНГУЛЯР_01_Когда_теряем_157_голосов.html"),
    ("·31 ЛАДОМ", "СИНГУЛЯР_31_ЛАДОМ.html"),
    ("·35 ВОПРОСЫ", "СИНГУЛЯР_35_ВОПРОСЫ.html"),
    ("·38 ПУЛЬС", "СИНГУЛЯР_38_ПУЛЬС.html"),
]
СТОП_ПЛАТОК = 140  # честный потолок обхода Tab


def дождаться_стенда(попыток=40):
    for _ in range(попыток):
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{ПОРТ}/", timeout=2)
            return True
        except Exception:
            time.sleep(0.5)
    return False


def имя_доступное(элем):
    return элем.evaluate("""e => {
      const прям = (e.getAttribute && (e.getAttribute('aria-label') || e.getAttribute('aria-labelledby')));
      if (прям) return прям;
      const т = (e.innerText || e.textContent || '').trim();
      if (т) return т.slice(0, 60);
      const а = e.querySelector && e.querySelector('img[alt]');
      if (а) return а.alt.slice(0, 60);
      return '';
    }""")


def проба_лица(стр, base, файл):
    р = {"лицо": файл, "ошибки_страницы": [], "средовые_404": 0}
    конс = []
    стр.on("pageerror", lambda е: р["ошибки_страницы"].append(str(е)[:160]))
    стр.on("console", lambda м: конс.append(м) if м.type == "error" else None)
    стр.goto(f"{base}/{__import__('urllib.parse', fromlist=['quote']).quote(файл)}",
             wait_until="domcontentloaded", timeout=60000)
    стр.wait_for_timeout(1200)
    р["средовые_404"] = sum(1 for м in конс if "404" in м.text or "Failed to load resource" in м.text)
    р["кодовых_ошибок_консоли"] = sum(1 for м in конс if "404" not in м.text and "Failed to load resource" not in м.text)

    # ── ARIA-субстрат экранников (что съедят NVDA/VoiceOver/TalkBack) ──────
    р["aria"] = стр.evaluate("""() => {
      const изм = (s) => document.querySelector(s) ? 1 : 0;
      const h = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
        .map(x => +x.tagName[1]);
      let пропуск = 0;
      for (let i = 1; i < h.length; i++) if (h[i] - h[i-1] > 1) пропуск++;
      /* канон accname (spec: aria-label > aria-labelledby > содержимое > title > img[alt]);
         скрытые (display:none/hidden) вне a11y-дерева — их имена не требуются */
      const интерактив = [...document.querySelectorAll('a[href],button,input,select,textarea,[tabindex="0"]')]
        .filter(e => e.offsetParent !== null || e.getAttribute('aria-hidden') === 'false');
      const без_имени = интерактив.filter(e => {
        const т = (e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') ||
                   (e.innerText || e.textContent || '').trim() || (e.getAttribute('title') || '') ||
                   (e.querySelector && e.querySelector('img[alt]') ? e.querySelector('img[alt]').alt : ''));
        return !т;
      }).length;
      const мышь_только = [...document.querySelectorAll('*')].filter(e =>
        (e.getAttribute('onclick') && !e.closest('a,button')) &&
        e.getAttribute('tabindex') === null &&
        !['A','BUTTON','INPUT','SELECT','TEXTAREA'].includes(e.tagName)).length;
      return {
        lang: изм('html[lang]'),
        title: (document.title || '').length,
        h1: h.filter(x => x === 1).length,
        пропуск_заголовков: пропуск,
        img_без_alt: [...document.querySelectorAll('img')].filter(i => i.alt === '' && !i.getAttribute('aria-hidden') && !i.getAttribute('role')).length,
        интерактив: интерактив.length,
        интерактив_без_имени: без_имени,
        мышь_только: мышь_только,
        aria_live: document.querySelectorAll('[aria-live]').length
      };
    }""")

    # ── клавиатура / switch-субстрат: обход Tab, видимость фокуса, ловушки ──
    стр.keyboard.press("Tab")
    остановки = []
    видим_сбоев = 0
    for i in range(СТОП_ПЛАТОК):
        э = стр.evaluate("""() => {
          const a = document.activeElement;
          if (!a || a === document.body) return null;
          const ст = getComputedStyle(a);
          const вид = ст.outlineStyle !== 'none' || parseFloat(ст.outlineWidth) > 0 ||
            ст.boxShadow !== 'none' || (a.matches(':focus-visible'));
          return { тег: a.tagName, ид: a.id || '', имя: (a.innerText || a.textContent || a.getAttribute('aria-label') || '').trim().slice(0, 40), вид: вид, href: a.getAttribute && (a.getAttribute('href') || '') };
        }""")
        if э is None:
            break
        остановки.append(э)
        if not э["вид"]:
            видим_сбоев += 1
        стр.keyboard.press("Tab")
    р["kbd"] = {
        "остановок": len(остановки),
        "уникальных": len(set((x["тег"], x["ид"], x["имя"]) for x in остановки)),
        "фокус_невидим_раз": видим_сбоев,
        "первая_остановка": остановки[0] if остановки else None,
        "ловушка": len(set((x["тег"], x["ид"], x["имя"]) for x in остановки)) < max(1, len(остановки) // 2),
    }

    # skip-ссылка: есть? фокус после клика реально уходит в цель (WCAG 2.4.1)?
    skip = стр.evaluate("""() => {
      const с = document.querySelector('a.skip-link, .skip-link');
      if (!с) return { есть: false };
      const href = с.getAttribute('href') || '';
      с.focus();
      с.click();
      const цель = href.startsWith('#') ? document.getElementById(href.slice(1)) : null;
      const а = document.activeElement;
      const фокус_в_цели = !!(цель && а && (а === цель || (цель.contains && цель.contains(а))));
      return { есть: true, href, фокус_в_цели, где: (а && а.tagName) || '' };
    }""")
    р["skip"] = skip

    # Enter/Space на первой интерактивной остановке: клик доходит?
    флаг = стр.evaluate("""() => { window.__атКлик = 0;
      document.addEventListener('click', () => { window.__атКлик++; }, true); return 1; }""")
    стр.evaluate("""() => {
      const цель = document.querySelector('main a[href], main button, a[href], button');
      if (цель) цель.focus();
    }""")
    before = стр.evaluate("() => window.__атКлик")
    стр.keyboard.press("Enter")
    стр.wait_for_timeout(400)
    after = стр.evaluate("() => window.__атКлик")
    р["enter"] = {"активация": (after > before), "было": before, "стало": after}
    return р


def главное():
    base = f"http://127.0.0.1:{ПОРТ}"
    if not дождаться_стенда():
        print("at_пробы: стенд не поднялся — честно выхожу")
        return 1
    сервер = subprocess.Popen(["python3", "-m", "http.server", str(ПОРТ), "--bind", "127.0.0.1"],
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) if not дождаться_стенда() else None
    замеры = []
    with sync_playwright() as п:
        браузер = п.chromium.launch()
        конт = браузер.new_context(viewport={"width": 1280, "height": 720})
        стр = конт.new_page()
        for имя, файл in ЛИЦА:
            try:
                м = проба_лица(стр, base, файл)
                м["имя"] = имя
                замеры.append(м)
                к = м["kbd"]
                print(f"[ИЗМЕРЕНО] {имя}: Tab-остановок {к['остановок']} (уник {к['уникальных']}), "
                      f"фокус-невидим {к['фокус_невидим_раз']}, ловушка {к['ловушка']}, "
                      f"skip {м['skip']['есть']}, Enter {м['enter']['активация']}, "
                      f"pageerror {len(м['ошибки_страницы'])}, h1={м['aria']['h1']}, "
                      f"без_имени {м['aria']['интерактив_без_имени']}/{м['aria']['интерактив']}")
            except Exception as е:
                замеры.append({"лицо": файл, "имя": имя, "паника": str(е)[:200]})
                print(f"[ОТКАЗ] {имя}: {str(е)[:120]}")
        браузер.close()
    with open("/tmp/w5_пробы.json", "w", encoding="utf-8") as ф:
        json.dump({"дата": "2026-11-14", "среда": "Playwright Chromium headless 1280×720, локальная копия дома",
                   "замеры": замеры}, ф, ensure_ascii=False, indent=1)
    print("замеры → /tmp/w5_пробы.json")
    return 0


if __name__ == "__main__":
    sys.exit(главное())
