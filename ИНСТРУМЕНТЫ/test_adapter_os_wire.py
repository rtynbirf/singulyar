#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ТЕСТ production-проводки Adapter OS (срез 2) на живых файлах ·21/·22.
  Правило №10 пакета: тесты против живых файлов ДО изменения проводки.
  · ·21: реестр держит 6 канальных адаптеров output.21-канал-<ch> (READY);
  · ·21: S21.route идёт через реестр, ядро — исполнитель и фолбэк;
  · ·21: проводка прозрачна (результат JSON-равен ядру), профиль не мутируется;
  · ·21: конверт шины meaning.21.route с via=registry / via=kernel (фолбэк);
  · ·22: зеркало зала публикует конверт meaning.22.зал в шину смыслов;
  · 0 JS-ошибок на обеих страницах.
Запуск: python3 ИНСТРУМЕНТЫ/test_adapter_os_wire.py   (из корня репо; пути считаются от файла)
"""
import http.server, socketserver, threading, functools, urllib.parse, json, os
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # корень репо
PORT = 8801

ok = fail = 0
def check(name, cond, extra=""):
    global ok, fail
    if cond: ok += 1; print(f"  OK   {name}")
    else:    fail += 1; print(f"  FAIL {name} {extra}")

BUS_KEY = "singulyar.meaningbus.v1"

# JS-фрагменты
JS_LAST_ENV = """(t) => {
  const log = (window.SingulyarOS && window.SingulyarOS.bus) ? window.SingulyarOS.bus.log() : [];
  for (let i = log.length - 1; i >= 0; i--) if (log[i].type === t) return log[i];
  return null;
}"""

def main():
    Handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
    class Q(socketserver.TCPServer): allow_reuse_address = True
    srv = Q(("127.0.0.1", PORT), Handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{PORT}/"

    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": 1280, "height": 900})
        page = ctx.new_page()
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)))

        def open_page(name):
            errs.clear()
            page.goto(base + urllib.parse.quote(name), wait_until="load", timeout=60000)
            page.wait_for_timeout(900)

        def js(expr):
            return page.evaluate("() => (" + expr + ")")

        # ── ·21 ОБЩЕНИЕ: production-проводка через реестр ──
        open_page("СИНГУЛЯР_21_ОБЩЕНИЕ.html")
        page.evaluate(f"() => localStorage.removeItem('{BUS_KEY}')")  # чистый лог для теста
        page.reload(wait_until="load"); page.wait_for_timeout(900)

        st = js("window.SingulyarOS ? window.SingulyarOS.state : null")
        check("·21: OS готова", st == "ready", f"state={st}")

        каналы = js("""(() => {
          if (!window.SingulyarOS || !window.S21 || !S21.CHANNEL) return null;
          const ids = Object.keys(S21.CHANNEL).map(ch => 'output.21-канал-' + ch);
          return ids.map(id => window.SingulyarOS.registry.get(id)).filter(Boolean)
                    .map(a => ({ id: a.id, state: a.status().state }));
        })()""")
        check("·21: 6 канальных адаптеров существуют в реестре", каналы is not None and len(каналы) == 6, str(каналы))
        check("·21: канальные адаптеры READY", каналы and all(c["state"] == "READY" for c in (каналы or [])), str(каналы))

        check("·21: проводка активна (S21.route.kernel определён)",
              js("typeof S21 === 'object' && S21.route && typeof S21.route.kernel === 'function'"))

        # прозрачность: результат обёртки JSON-равен ядру; профиль не мутируется
        рав = js("""(() => {
          const человек = { id: 't', name: 'Тест', output: ['text','speech','braille','haptic','aac','sign'], voice: { rate: 0.9, lang: 'ru-RU' } };
          const через = S21.route(человек, 'Привет');
          if (!S21.route || typeof S21.route.kernel !== 'function') return { eq: false, голосЦел: false, брайль: (через && через[2]) ? через[2].view : null };
          const ядро = S21.route.kernel(человек, 'Привет');
          const голосЦел = человек.voice.rate === 0.9 && через[1] && через[1].voice && через[1].voice.rate === 0.9;
          return { eq: JSON.stringify(через) === JSON.stringify(ядро), голосЦел: голосЦел,
                   брайль: через[2] ? через[2].view : null };
        })()""")
        check("·21: проводка прозрачна (JSON-равенство с ядром)", bool(рав["eq"]),
              f"через={json.dumps(рав.get('eq'))}")
        check("·21: голос копируется без мутации профиля", bool(рав["голосЦел"]))
        check("·21: брайль-представление корректно (кириллица вне латинской таблицы остаётся собой — контракт ядра)", рав["брайль"] == "привет",
              f"view={рав['брайль']}")

        env = page.evaluate(JS_LAST_ENV, "meaning.21.route")
        check("·21: конверт шины meaning.21.route существует", env is not None)
        check("·21: конверт via=registry (реестр обслужил все каналы)",
              bool(env) and env["payload"].get("via") == "registry", str(env and env["payload"]))
        check("·21: конверт несёт каналы получателя и автора",
              bool(env) and env["payload"].get("channels") == ['text','speech','braille','haptic','aac','sign'] and env["author"] == "21-ОБЩЕНИЕ",
              str(env and env["payload"]))

        # фолбэк: портим статус одного канального адаптера → ядро обслуживает, via=kernel
        page.evaluate("""(() => {
          const a = window.SingulyarOS && window.SingulyarOS.registry.get('output.21-канал-haptic');
          if (!a) return;
          a.__origStatus = a.status;
          a.status = () => ({ state: 'UNAVAILABLE', privacy: 'local' });
        })()""")
        page.evaluate(f"() => localStorage.removeItem('{BUS_KEY}')")
        фолбэк = js("""(() => {
          const человек = { id: 't2', name: 'Т2', output: ['text','haptic'], voice: {} };
          const через = S21.route(человек, 'волна');
          if (!S21.route || typeof S21.route.kernel !== 'function') return { eq: false, текст: через && через[0] ? через[0].view : null };
          const ядро = S21.route.kernel(человек, 'волна');
          return { eq: JSON.stringify(через) === JSON.stringify(ядро), текст: через[0].view };
        })()""")
        env2 = page.evaluate(JS_LAST_ENV, "meaning.21.route")
        check("·21: фолбэк на ядро при UNAVAILABLE-адаптере (результат равен ядру)", bool(фолбэк["eq"]))
        check("·21: конверт фолбэка via=kernel", bool(env2) and env2["payload"].get("via") == "kernel", str(env2 and env2["payload"]))
        page.evaluate("""(() => {
          const a = window.SingulyarOS && window.SingulyarOS.registry.get('output.21-канал-haptic');
          if (a && a.__origStatus) a.status = a.__origStatus;
        })()""")
        page.evaluate(f"() => localStorage.removeItem('{BUS_KEY}')")
        js("(() => { S21.route({ id:'t3', name:'Т3', output:['text'] }, 'восстановление'); })()")
        env3 = page.evaluate(JS_LAST_ENV, "meaning.21.route")
        check("·21: после восстановления статуса реестр снова обслуживает (via=registry)",
              bool(env3) and env3["payload"].get("via") == "registry", str(env3 and env3["payload"]))

        # пустой список каналов — без падений, пустой маршрут
        пусто = js("""(() => {
          const ч = { id:'t4', name:'Т4', output: [], voice: {} };
          return JSON.stringify(S21.route(ч, 'х')) === '[]';
        })()""")
        check("·21: пустой список каналов → пустой маршрут без падений", bool(пусто))

        check("·21: 0 JS-ошибок", len(errs) == 0, "; ".join(errs[:3]))

        # ── ·22 СВЯЗЬ: зеркало зала публикует конверт смысла ──
        open_page("СИНГУЛЯР_22_СВЯЗЬ.html")
        st22 = js("window.SingulyarOS ? window.SingulyarOS.state : null")
        check("·22: OS готова", st22 == "ready", f"state={st22}")

        page.evaluate(f"() => localStorage.removeItem('{BUS_KEY}')")
        page.evaluate("""(() => {
          const ч = new BroadcastChannel('singular-most-21-22-v1');
          ч.postMessage({ мост: '21-22', v: 1, тип: 'incoming', зал: 'ABC12', от: 'тест-волна', текст: 'смысл без формы', t: Date.now() });
          setTimeout(() => { try { ч.close(); } catch (e) {} }, 300);
        })()""")
        page.wait_for_timeout(700)
        env22 = page.evaluate(JS_LAST_ENV, "meaning.22.зал")
        check("·22: зеркало зала публикует конверт meaning.22.зал", env22 is not None)
        check("·22: конверт несёт смысл, автора и зал без искажений",
              bool(env22) and env22["payload"].get("text") == "смысл без формы"
              and env22["payload"].get("от") == "тест-волна" and env22["payload"].get("зал") == "ABC12"
              and env22["author"] == "22-СВЯЗЬ",
              str(env22 and env22["payload"]))
        check("·22: 0 JS-ошибок", len(errs) == 0, "; ".join(errs[:3]))

        browser.close()
        srv.shutdown()

    print(f"\nИТОГ: {ok} OK / {fail} FAIL")
    raise SystemExit(1 if fail else 0)

if __name__ == "__main__":
    main()
