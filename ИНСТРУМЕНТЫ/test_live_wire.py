#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Проверка production-проводки Adapter OS на ЖИВОМ Pages (после пуша).
  · ·21: OS ready, проводка активна, конверт meaning.21.route via=registry;
  · ·22: конверт meaning.22.зал публикуется зеркалом.
Запуск: python3 ИНСТРУМЕНТЫ/test_live_wire.py   (нужен интернет; пути не зависят от машины)
"""
from playwright.sync_api import sync_playwright
import urllib.parse

B21 = "https://rtynbirf.github.io/singulyar/" + urllib.parse.quote("СИНГУЛЯР_21_ОБЩЕНИЕ.html")
B22 = "https://rtynbirf.github.io/singulyar/" + urllib.parse.quote("СИНГУЛЯР_22_СВЯЗЬ.html")
BUS_KEY = "singulyar.meaningbus.v1"

ok = fail = 0
def check(name, cond, extra=""):
    global ok, fail
    if cond: ok += 1; print(f"  OK   {name}")
    else:    fail += 1; print(f"  FAIL {name} {extra}")

JS_LAST_ENV = """(t) => {
  const log = (window.SingulyarOS && window.SingulyarOS.bus) ? window.SingulyarOS.bus.log() : [];
  for (let i = log.length - 1; i >= 0; i--) if (log[i].type === t) return log[i];
  return null;
}"""

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_context(viewport={"width": 1280, "height": 900}).new_page()
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))

    page.goto(B21, wait_until="load", timeout=60000)
    page.wait_for_timeout(1200)
    page.evaluate(f"() => localStorage.removeItem('{BUS_KEY}')")
    page.reload(wait_until="load"); page.wait_for_timeout(1200)

    check("LIVE ·21: OS ready", page.evaluate("() => window.SingulyarOS && window.SingulyarOS.state") == "ready")
    check("LIVE ·21: проводка активна (S21.route.kernel)",
          page.evaluate("() => typeof S21.route.kernel === 'function'"))
    res = page.evaluate("""() => {
      const ч = { id:'l', name:'L', output:['text','braille','speech'], voice:{ rate: 0.8 } };
      const r = S21.route(ч, 'Privet');
      return { eq: JSON.stringify(r) === JSON.stringify(S21.route.kernel(ч, 'Privet')),
               braille: r[1].view, voice: r[2].voice.rate };
    }""")
    check("LIVE ·21: маршрут через реестр равен ядру", bool(res["eq"]))
    check("LIVE ·21: брайль латиницей ⠏⠗⠊⠧⠑⠞", res["braille"] == "⠏⠗⠊⠧⠑⠞", str(res["braille"]))
    check("LIVE ·21: голос получателя 0.8", res["voice"] == 0.8)
    env = page.evaluate(JS_LAST_ENV, "meaning.21.route")
    check("LIVE ·21: конверт via=registry", bool(env) and env["payload"].get("via") == "registry", str(env and env["payload"]))
    check("LIVE ·21: 0 JS-ошибок", len(errs) == 0, "; ".join(errs[:2]))

    errs.clear()
    page.goto(B22, wait_until="load", timeout=60000)
    page.wait_for_timeout(1200)
    page.evaluate(f"() => localStorage.removeItem('{BUS_KEY}')")
    page.evaluate("""() => {
      const ч = new BroadcastChannel('singular-most-21-22-v1');
      ч.postMessage({ мост: '21-22', v: 1, тип: 'incoming', зал: 'Z9Z9Z', от: 'live', текст: 'живая волна', t: Date.now() });
      setTimeout(() => { try { ч.close(); } catch (e) {} }, 300);
    }""")
    page.wait_for_timeout(800)
    env22 = page.evaluate(JS_LAST_ENV, "meaning.22.зал")
    check("LIVE ·22: зеркало публикует meaning.22.зал", bool(env22) and env22["payload"].get("text") == "живая волна", str(env22 and env22["payload"]))
    check("LIVE ·22: 0 JS-ошибок", len(errs) == 0, "; ".join(errs[:2]))

    browser.close()

print(f"\nИТОГ: {ok} OK / {fail} FAIL")
raise SystemExit(1 if fail else 0)
