#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""НАСТОЯЩИЙ e2e: локальная модель грузится и отвечает в браузере.
   Не макет: wllama (llama.cpp → WASM) реально запускает Qwen2.5-0.5B.
   Веса качаются с локального сервера (копия частей из репы singulyar-llm,
   md5-склейка сверена) — тот же код-путь, что и с raw.githubusercontent.com.
   Откуда части (в порядке приоритета):
     1) первый аргумент — папка с qwen2.5-*.part-0N-of-06.bin;
     2) переменная окружения SINGULAR_LLM_PARTS_DIR;
     3) скачать из репы rtynbirf/singulyar-llm во временный каталог
        (файлы уже есть нужного размера — не перекачиваются).
   Запуск: python3 ИНСТРУМЕНТЫ/test_llm_real.py [папка_с_частями]
"""
import http.server, socketserver, threading, functools, os, sys, time, tempfile, urllib.request, urllib.parse
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8821          # репо
MPORT = 8823         # папка с частями модели
LLM_РЕПО_БАЗА = "https://raw.githubusercontent.com/rtynbirf/singulyar-llm/main/MODELS/"

def имена_частей():
    return [f"qwen2.5-0.5b-instruct-q4_k_m.part-0{i}-of-06.bin" for i in range(1, 7)]

размеры = {1: 81900005, 2: 81900005, 3: 81900005, 4: 81900005, 5: 81900005, 6: 81900007}

def обеспечить_части():
    папка = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("SINGULAR_LLM_PARTS_DIR")
    if not папка:
        папка = os.path.join(tempfile.gettempdir(), "singular-llm-parts")
        os.makedirs(папка, exist_ok=True)
    нужно = False
    for i, имя in enumerate(имена_частей(), 1):
        п = os.path.join(папка, имя)
        if not (os.path.isfile(п) and os.path.getsize(п) == размеры[i]):
            нужно = True
    if нужно and not sys.argv[1:] and not os.environ.get("SINGULAR_LLM_PARTS_DIR"):
        print("частей нет локально — скачиваю из репы singulyar-llm в", папка)
        for i, имя in enumerate(имена_частей(), 1):
            п = os.path.join(папка, имя)
            if os.path.isfile(п) and os.path.getsize(п) == размеры[i]:
                continue
            url = LLM_РЕПО_БАЗА + urllib.parse.quote(имя)
            print("  часть", i, "/6 …")
            urllib.request.urlretrieve(url, п)
    недостача = [имя for i, имя in enumerate(имена_частей(), 1)
                 if not (os.path.isfile(os.path.join(папка, имя)) and os.path.getsize(os.path.join(папка, имя)) == размеры[i])]
    if недостача:
        print("нет частей модели в", папка, ":", недостача)
        raise SystemExit(2)
    return папка

папка_частей = обеспечить_части()

ok = fail = 0
def check(name, cond, extra=""):
    global ok, fail
    if cond: ok += 1; print(f"  OK   {name}")
    else:    fail += 1; print(f"  FAIL {name} {extra}")

handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
mhandler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=папка_частей)
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")  # как raw.githubusercontent.com в проде
        super().end_headers()
httpd = socketserver.TCPServer(("127.0.0.1", PORT), functools.partial(Quiet, directory=ROOT))
mhttpd = socketserver.TCPServer(("127.0.0.1", MPORT), functools.partial(Quiet, directory=папка_частей))
for s in (httpd, mhttpd): threading.Thread(target=s.serve_forever, daemon=True).start()

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    page = browser.new_page()
    ошибки = []
    page.on("console", lambda m: ошибки.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: ошибки.append(str(e)))
    page.add_init_script(f"window.SINGULAR_LLM_BASE = 'http://127.0.0.1:{MPORT}/';")
    page.goto(f"http://127.0.0.1:{PORT}/СИНГУЛЯР_21_ОБЩЕНИЕ.html")
    page.wait_for_timeout(1200)

    # 1. кнопка включена, статусы честные
    check("кнопка загрузки активна до старта", page.locator("#мозг-загрузить").is_enabled())

    # 2. реальная загрузка: 6 частей → Blob → wllama → модель в память
    t0 = time.time()
    page.click("#мозг-загрузить")
    page.wait_for_function("""() => {
      const s = window.SingulyarOS && window.SingulyarOS.registry && window.SingulyarOS.registry.get('llm.local');
      return s && s.status().state === 'READY';
    }""", timeout=420000)
    сек = round(time.time() - t0, 1)
    check(f"модель реально загрузилась в браузере ({сек} с)", True)
    статус = page.locator("#мозг-статус").inner_text()
    check("статус панели честно готов", "готова" in статус.lower(), статус[:120])

    # 3. «статус» через правило-слой теперь видит llm.local READY
    page.fill("#мозг-ввод", "статус")
    page.click("#мозг-сказать")
    page.wait_for_timeout(300)
    лог = page.locator("#мозг-лог").inner_text()
    check("правило-слой видит llm.local READY", "llm.local READY" in лог, лог[:200])

    # 4. свободная речь: модель отвечает локально
    page.fill("#мозг-ввод", "привет, кто ты")
    page.click("#мозг-сказать")
    page.wait_for_function("""() => {
      const лог = document.getElementById('мозг-лог');
      if (!лог) return false;
      const t = лог.textContent;
      return t.includes('мозг · локальная модель');
    }""", timeout=300000)
    лог = page.locator("#мозг-лог").inner_text()
    ответ_начало = лог.find("локальная модель")
    ответ = лог[ответ_начало:][:400]
    check("локальная модель ответила текстом", ответ_начало >= 0 and len(лог) > 40, ответ)

    env = page.evaluate("""(t) => {
      const log = window.SingulyarOS.bus.log();
      for (let i = log.length - 1; i >= 0; i--) if (log[i].type === t) return log[i];
      return null;
    }""", "meaning.21.инструкция")
    check("конверт: via=llm.local", env and env["payload"].get("via") == "llm.local", str(env and env["payload"])[:120])

    # 5. консоль
    реальные = [e for e in ошибки if "favicon" not in e.lower()]
    check("0 ошибок консоли", not реальные, "; ".join(реальные[:3]))

    browser.close()
for s in (httpd, mhttpd): s.shutdown()
print(f"\nИТОГ: {ok} OK / {fail} FAIL")
raise SystemExit(1 if fail else 0)
