#!/usr/bin/env python3
# test_bridge_browser.py — живой мост ·21⇄·22 в Playwright: 2 окна ·22 одного зала + 1 окно ·21
# Запуск: python3 ИНСТРУМЕНТЫ/test_bridge_browser.py   (страницы грузятся file:// прямо из репо)
import sys, time, os
from playwright.sync_api import sync_playwright

DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # корень репо
F22 = "file://" + DIR + "/СИНГУЛЯР_22_СВЯЗЬ.html"
F21 = "file://" + DIR + "/СИНГУЛЯР_21_ОБЩЕНИЕ.html"
SHOTS = os.path.join(DIR, "СКРИНШОТЫ", "МОСТ_21_22")
os.makedirs(SHOTS, exist_ok=True)

ok = 0; fail = 0
def T(name, cond):
    global ok, fail
    if cond: ok += 1; print(f"  ok {ok} — {name}")
    else: fail += 1; print(f"  FAIL {fail} — {name}")

errors = []
def watch(p, tag):
    p.on("console", lambda m: errors.append(f"{tag}: {m.text}") if m.type == "error" else None)
    p.on("pageerror", lambda e: errors.append(f"{tag}: {e}"))

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = b.new_context()
    # 1) первое окно ·22 с залом
    a = ctx.new_page(); watch(a, "22a")
    a.goto(F22 + "?зал=BRDG1"); a.wait_for_load_state("load")
    # 2) окно ·21
    h = ctx.new_page(); watch(h, "21")
    h.goto(F21); h.wait_for_load_state("load")
    # 3) второе окно ·22 того же зала — отправитель
    c = ctx.new_page(); watch(c, "22b")
    c.goto(F22 + "?зал=BRDG1"); c.wait_for_load_state("load")
    time.sleep(1.2)

    # РУКИПОЖАТИЕ: hello в обе стороны
    a.wait_for_function("document.getElementById('stMost').textContent.includes('на связи')", timeout=8000)
    T("мост: ·22a видит ·21 на связи", True)
    h.wait_for_function("document.getElementById('mostStatus').textContent.includes('на связи')", timeout=8000)
    T("мост: ·21 видит ·22 на связи", True)
    c.wait_for_function("document.getElementById('stMost').textContent.includes('на связи')", timeout=8000)
    T("мост: ·22b тоже на связи", True)

    # НАПРАВЛЕНИЕ 1: зал → ·22a → мост → ·21 → представления → presented → ·22a
    c.fill("#inMsg", "мост-проверка-двадцать-два")
    c.click("#btnSend")
    a.wait_for_function("document.getElementById('journal').textContent.includes('мост-проверка-двадцать-два')", timeout=8000)
    T("зал: сообщение дошло до второго окна", True)
    a.wait_for_function("document.getElementById('mostLog').textContent.includes('отправлено на представление')", timeout=8000)
    T("мост: ·22a отправила входящее в ·21", True)
    h.wait_for_function("document.getElementById('mostLog').textContent.includes('мост-проверка-двадцать-два')", timeout=8000)
    T("мост: ·21 получила входящее из зала", True)
    h.wait_for_function("document.getElementById('mostLog').textContent.includes('представления для Человек А')", timeout=8000)
    T("мост: ·21 построила представления для получателя", True)
    h.wait_for_function("document.getElementById('mostLog').textContent.includes('Речь:')", timeout=8000)
    T("мост: представление «Речь» присутствует", True)
    h.wait_for_function("document.getElementById('mostLog').textContent.includes('Произнести голосом получателя')", timeout=8000)
    T("мост: кнопка озвучки голосом получателя на месте", True)
    a.wait_for_function("document.getElementById('mostLog').textContent.includes('представления ·21')", timeout=8000)
    T("мост: ·22a получила ответ presented от ·21", True)

    # НАПРАВЛЕНИЕ 2: ·21 → «В зал ·22» → журнал ·22a
    h.fill("#msgText", "привет из двадцать первого")
    h.click("#btnToHall")
    h.wait_for_function("document.getElementById('mostStatus').textContent.includes('Отдано в мост')", timeout=8000)
    T("мост: ·21 отдала сообщение в зал", True)
    a.wait_for_function("document.getElementById('journal').textContent.includes('привет из двадцать первого')", timeout=8000)
    T("зал: ·22a получила сообщение из ·21", True)
    a.wait_for_function("document.getElementById('journal').textContent.includes('·21 · Человек А')", timeout=8000)
    T("зал: автор подписан «·21 · Человек А»", True)
    a.wait_for_function("document.getElementById('mostLog').textContent.includes('в зал передано сообщение')", timeout=8000)
    T("мост: ·22a отметила передачу в зал", True)

    # ЧЕСТНОСТЬ: субтитры показывают смысл из ·21
    T("субтитры ·22a показывают смысл из ·21",
      a.evaluate("document.getElementById('subNow').textContent.includes('привет из двадцать первого')"))

    a.screenshot(path=SHOTS + "/most_22a.png", full_page=False)
    h.screenshot(path=SHOTS + "/most_21.png", full_page=False)
    b.close()

print("")
if errors:
    print("ОШИБКИ КОНСОЛИ:")
    for e in errors: print("  ", e)
if fail or errors:
    print(f"ИТОГ: FAIL {fail} (ok {ok}), ошибок консоли: {len(errors)}"); sys.exit(1)
print(f"ИТОГ: ВСЕ ПРОШЛИ ({ok}), ошибок консоли: 0")
