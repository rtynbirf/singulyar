#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ТЕСТ проводки LLM-среза «МОЗГ» на живой странице ·21 ОБЩЕНИЕ.
  Правило №10 пакета: тесты против живых файлов ДО изменения проводки.
  · панель «МОЗГ» на странице (ввод инструкции, лог, загрузка модели);
  · реестр Adapter OS держит llm.local (честно UNAVAILABLE до загрузки)
    и input.speech (честное состояние среды);
  · правило-слой исполняет команды БЕЗ модели: статус / отправь: / очисти
    журнал / прочитай поле сообщения / стоп;
  · отправка команды через отправку → сообщение попало в журнал ·21
    и маршрутизировано через реестр (конверт meaning.21.route);
  · конверт шины meaning.21.инструкция {фраза, намерение, via:rule-layer};
  · свободная фраза без модели — честный ответ «модель не загружена», без выдумок;
  · 0 JS-ошибок.
Запуск: python3 ИНСТРУМЕНТЫ/test_llm_wire.py   (из корня репо; пути считаются от файла)
"""
import http.server, socketserver, threading, functools, json, os
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # корень репо
PORT = 8811

ok = fail = 0
def check(name, cond, extra=""):
    global ok, fail
    if cond: ok += 1; print(f"  OK   {name}")
    else:    fail += 1; print(f"  FAIL {name} {extra}")

BUS_KEY = "singulyar.meaningbus.v1"

JS_LAST_ENV = """(t) => {
  const log = (window.SingulyarOS && window.SingulyarOS.bus) ? window.SingulyarOS.bus.log() : [];
  for (let i = log.length - 1; i >= 0; i--) if (log[i].type === t) return log[i];
  return null;
}"""

def шина(последний_тип):
    return JS_LAST_ENV.replace("__T__", последний_тип)

def main():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
    httpd = socketserver.TCPServer(("127.0.0.1", PORT), handler)
    t = threading.Thread(target=httpd.serve_forever, daemon=True); t.start()

    with sync_playwright() as pw:
        browser = pw.chromium.launch(args=["--allow-file-access-from-files"])
        page = browser.new_page()
        errors = []
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(str(e)))

        # перехват speechSynthesis до загрузки страницы
        page.add_init_script("""
          window.__speakCalls = [];
          try {
            Object.defineProperty(window, 'speechSynthesis', {
              configurable: true,
              get() {
                return {
                  cancel: () => window.__speakCalls.push('[cancel]'),
                  speak: (u) => window.__speakCalls.push(String(u.text || '')),
                  getVoices: () => [],
                  pending: false, speaking: false, paused: false,
                  onvoiceschanged: null, addEventListener(){}, removeEventListener(){}
                };
              }
            });
          } catch (e) {}
        """)

        page.goto(f"http://127.0.0.1:{PORT}/СИНГУЛЯР_21_ОБЩЕНИЕ.html")
        page.wait_for_timeout(1200)

        # 1. OS жива и реестр держит новые адаптеры с честными статусами
        ст = page.evaluate("""() => {
          const os = window.SingulyarOS;
          if (!os || os.state !== 'ready') return null;
          const s = os.statuses();
          const pick = (id) => s.find(a => a.id === id) || null;
          return { llm: pick('llm.local'), речь: pick('input.speech'), всего: s.length };
        }""")
        check("SingulyarOS ready, адаптеров в реестре ≥ 18", ст and ст["всего"] >= 18, str(ст and ст["всего"]))
        check("llm.local в реестре, UNAVAILABLE до загрузки", ст and ст["llm"] and ст["llm"]["state"] == "UNAVAILABLE", str(ст and ст["llm"]))
        check("llm.local назвал причину", ст and ст["llm"] and bool(ст["llm"].get("reason")))
        check("input.speech в реестре с честным состоянием", ст and ст["речь"] and ст["речь"]["state"] in ("READY", "UNAVAILABLE", "BROWSER_DEPENDENT", "PERMISSION_REQUIRED"), str(ст and ст["речь"]))

        # 2. Панель МОЗГ на странице
        check("панель МОЗГ в DOM", page.locator("#мозг-панель").count() == 1)
        check("поле ввода инструкции есть", page.locator("#мозг-ввод").count() == 1)
        check("кнопка «сказать» есть", page.locator("#мозг-сказать").count() == 1)
        check("кнопка загрузки модели есть", page.locator("#мозг-загрузить").count() == 1)
        check("лог панели есть", page.locator("#мозг-лог").count() == 1)
        статус_текст = page.locator("#мозг-статус").inner_text() if page.locator("#мозг-статус").count() else ""
        check("панель честно пишет, что модель не загружена", "не загружен" in (статус_текст or "").lower(), статус_текст)

        def инструкция(текст):
            page.fill("#мозг-ввод", текст)
            page.click("#мозг-сказать")
            page.wait_for_timeout(350)
            return page.locator("#мозг-лог").inner_text()

        # 3. Правило-слой без модели: статус
        лог = инструкция("статус")
        check("«статус» перечислил адаптеры", "llm.local" in лог and "input.speech" in лог, лог[:120])
        конв = page.evaluate(JS_LAST_ENV, "meaning.21.инструкция")
        check("конверт шины meaning.21.инструкция есть", bool(конв))
        check("в конверте via=rule-layer и намерение status", конв and конв["payload"].get("via") == "rule-layer" and конв["payload"].get("намерение") == "status", json.dumps(конв, ensure_ascii=False)[:160] if конв else "")

        # 4. отправь: через правило-слой попадает в журнал и маршрутизируется
        инструкция("отправь: проверка голосом")
        время = page.wait_for_timeout(250)
        сообщения = page.evaluate("() => (typeof db !== 'undefined' && db.messages) ? db.messages.map(m => m.text) : []")
        check("«отправь: …» создало сообщение в журнале ·21", "проверка голосом" in сообщения, str(сообщения))
        конв2 = page.evaluate(JS_LAST_ENV, "meaning.21.route")
        check("сообщение ушло через проводку (meaning.21.route)", bool(конв2), "")
        check("маршрут через реестр", конв2 and конв2["payload"].get("via") == "registry", str(конв2 and конв2["payload"]))

        # 5. очисти журнал
        инструкция("очисти журнал")
        сообщение2 = page.evaluate("() => (typeof db !== 'undefined' && db.messages) ? db.messages.length : -1")
        check("«очисти журнал» опустошил журнал", сообщение2 == 0, str(сообщение2))

        # 6. прочитай поле сообщения → oзвучка вызвана
        page.fill("#msgText", "текст на озвучку")
        инструкция("прочитай поле сообщения")
        speak_вызовы = page.evaluate("() => window.__speakCalls")
        check("«прочитай поле сообщения» озвучил текст", any("текст на озвучку" in str(x) for x in speak_вызовы), str(speak_вызовы))

        # 7. стоп гасит речь
        инструкция("стоп")
        speak_вызовы = page.evaluate("() => window.__speakCalls")
        check("«стоп» вызвал cancel озвучки", any("[cancel]" in str(x) for x in speak_вызовы), str(speak_вызовы))

        # 8. свободная фраза без модели — честный ответ
        лог = инструкция("привет, кто ты")
        check("свободная фраза без модели → честное «модель не загружена»", "не загружена" in лог.lower(), лог[:160])
        лог = инструкция("какая завтра погода")
        check("неизвестная фраза — без выдумок, путь к загрузке назван", "загруз" in лог.lower(), лог[:160])

        # 9. чистая консоль
        check("0 ошибок консоли", not errors, "; ".join(errors[:3]))

        browser.close()
    httpd.shutdown()
    print(f"\nИТОГ: {ok} OK / {fail} FAIL")
    raise SystemExit(1 if fail else 0)

if __name__ == "__main__":
    main()
