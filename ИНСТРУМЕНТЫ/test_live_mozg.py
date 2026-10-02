#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""LIVE-верификация МОЗГ v0.1 против прод-URL (как test_live_wire.py среза 2).
   Панель, статусы, правило-слой без модели и конверты — на живом Pages.
   Реальную генерацию модели здесь не качаем (469 МБ с raw.githubusercontent
   в headless — отдельный прогон test_llm_real.py на машине, где он нужен).
Запуск: python3 ИНСТРУМЕНТЫ/test_live_mozg.py   (пути от файла)"""
import functools, http.server, socketserver, threading, json, os, time, urllib.request, urllib.parse
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROD = "https://rtynbirf.github.io/singulyar/"
PORT = 8833

ok = fail = 0
def check(name, cond, extra=""):
    global ok, fail
    if cond: ok += 1; print(f"  OK   {name}")
    else:    fail += 1; print(f"  FAIL {name} {extra}")

# 1. Прод отдаёт всё нужное
for путь, имя in [("index.html", "индекс"), ("СИНГУЛЯР_21_ОБЩЕНИЕ.html", "·21"),
                  ("БИБЛИОТЕКИ/adapter-os/llm.mjs", "llm.mjs"),
                  ("БИБЛИОТЕКИ/wllama/index.js", "wllama esm"),
                  ("БИБЛИОТЕКИ/wllama/wasm/wllama.wasm", "wllama wasm"),
                  ("sw15.js", "sw")]:
    url = PROD + urllib.parse.quote(путь)
    try:
        код = urllib.request.urlopen(url, timeout=30).status
    except Exception as e:
        код = str(e)
    check(f"прод отдаёт {имя}", код == 200, str(код))

# 2. Репа singulyar-llm: правила и словарь v0.3 доступны с открытого CORS
правила = None
try:
    req = urllib.request.Request("https://raw.githubusercontent.com/rtynbirf/singulyar-llm/main/" + urllib.parse.quote("ОБУЧЕНИЕ/ПРАВИЛА_СИНГУЛЯРА.txt"))
    правила = urllib.request.urlopen(req, timeout=30).read().decode()
except Exception:
    pass
check("правила (обучающий слой) доступны из репы llm", bool(правила) and "9." in правила)
словарь = None
try:
    req = urllib.request.Request("https://raw.githubusercontent.com/rtynbirf/singulyar-llm/main/" + urllib.parse.quote("ОБУЧЕНИЕ/ПРИМЕРЫ_КОМАНД.jsonl"))
    словарь = urllib.request.urlopen(req, timeout=30).read().decode()
except Exception:
    pass
фраз = len([l for l in (словарь or "").strip().split("\n") if l.strip()])
check(f"словарь v0.3 в репе llm: 41 фраза (нашлось {фраз})", фраз == 41)

# 3. Живая страница ·21: МОЗГ работает (панель, статусы, команда без модели)
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
httpd = socketserver.TCPServer(("127.0.0.1", PORT), handler)
threading.Thread(target=httpd.serve_forever, daemon=True).start()

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    # прокидываем прод-страницу через локальный редирект нельзя — открываем прод напрямую
    page = browser.new_page()
    ошибки = []
    page.on("console", lambda m: ошибки.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: ошибки.append(str(e)))
    page.goto(PROD + urllib.parse.quote("СИНГУЛЯР_21_ОБЩЕНИЕ.html"))
    page.wait_for_timeout(2500)

    ст = page.evaluate("""() => {
      const os = window.SingulyarOS;
      if (!os || os.state !== 'ready') return null;
      const s = os.statuses();
      const pick = (id) => s.find(a => a.id === id) || null;
      return { llm: pick('llm.local'), речь: pick('input.speech') };
    }""")
    check("живой прод: llm.local в реестре честно UNAVAILABLE", ст and ст["llm"] and ст["llm"]["state"] == "UNAVAILABLE", str(ст and ст["llm"]))
    check("живой прод: input.speech честен о среде", ст and ст["речь"] and ст["речь"]["state"] in ("READY", "UNAVAILABLE", "BROWSER_DEPENDENT", "PERMISSION_REQUIRED"), str(ст and ст["речь"]))

    page.fill("#мозг-ввод", "что ты умеешь")
    page.click("#мозг-сказать")
    page.wait_for_timeout(500)
    лог = page.locator("#мозг-лог").inner_text()
    check("живой прод: «что ты умеешь» ответил правило-слой", "Команды" in лог and "v0.3" in лог, лог[:150])
    env = page.evaluate("""(t) => {
      const log = window.SingulyarOS.bus.log();
      for (let i = log.length - 1; i >= 0; i--) if (log[i].type === t) return log[i];
      return null;
    }""", "meaning.21.инструкция")
    check("живой прод: конверт meaning.21.инструкция via=rule-layer", env and env["payload"].get("via") == "rule-layer", str(env and env["payload"])[:100])
    реальные = [e for e in ошибки if "favicon" not in e.lower()]
    check("живой прод: 0 ошибок консоли", not реальные, "; ".join(реальные[:2]))
    browser.close()
httpd.shutdown()
print(f"\nИТОГ: {ok} OK / {fail} FAIL")
raise SystemExit(1 if fail else 0)
