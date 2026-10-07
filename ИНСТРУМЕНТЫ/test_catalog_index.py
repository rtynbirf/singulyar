#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Тест каталога v1.31.0 «НИТЬ АРИАДНЫ»: главная = ТОЛЬКО титул (канон ФУНДАМЕНТА).
Часть 1 (файл-система): ВСЕ локальные ссылки index.html существуют на диске.
Часть 1.5: швы учёта СИСТЕМАТИЗАЦИИ сходятся с диском.
Часть 2 (Playwright): лобное место чисто (капот закрыт — денег/связи/шагов/каталога
НЕ ВИДНО), живой Кристалл-Шар, нить Ариадны закрыта по умолчанию; потянул нить —
дом открывает ровно 19 дверей из манифеста ядра SNG (возможность предоставлена —
путь человек находит сам; такт v1.41.0: дверь ·30 ТКАНЬ открыта); бирка хаба ·00;
версия только в футере; консоль чистая.
Запуск: python3 ИНСТРУМЕНТЫ/test_catalog_index.py"""
import re, subprocess, time, socket, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

from playwright.sync_api import sync_playwright

прошло = 0
провалы = []
def ок(имя, условие):
    global прошло
    if условие:
        прошло += 1
        print('  ✓ ' + имя)
    else:
        провалы.append(имя)
        print('  ✗ ПРОВАЛ: ' + имя)

def свободный_порт():
    s = socket.socket()
    s.bind(('127.0.0.1', 0))
    порт = s.getsockname()[1]
    s.close()
    return порт

# ---------- ЧАСТЬ 1: все локальные ссылки существуют на диске ----------
print('Часть 1 — мёртвые ссылки index.html')
х = open('index.html', encoding='utf-8').read()
цели = set(re.findall(r'(?:href|src)="([^"#]+)"', х))
лок = [ц for ц in цели if not ц.startswith(('http://', 'https://', 'mailto:'))
       and not ц.endswith('.css')]
битые = [ц for ц in sorted(лок) if not os.path.exists(os.path.join(ROOT, ц))]
ок('локальных статических ссылок/целей найдено: %d (19 дверей — динамические, Часть 2)' % len(лок), len(лок) >= 7)
ок('мёртвых ссылок: 0', len(битые) == 0 or (print('   битые: ' + ', '.join(битые)) and False))
ок('канонический каталог существует: ДОКУМЕНТЫ/СИСТЕМАТИЗАЦИЯ_ВСЕЛЕННОЙ.md',
   os.path.isfile('ДОКУМЕНТЫ/СИСТЕМАТИЗАЦИЯ_ВСЕЛЕННОЙ.md'))
канон = open('ДОКУМЕНТЫ/СИСТЕМАТИЗАЦИЯ_ВСЕЛЕННОЙ.md', encoding='utf-8').read()
ок('каталог сходится арифметикой: 13+4+18+18+30+7+399+76+32+132 = 729',
   '= **729**' in канон and '13+4+18+18+30+7+399+76+32+132' in канон)

# ---------- ЧАСТЬ 1.5 — швы учёта ----------
print('Часть 1.5 — швы учёта каталога')
def файлов(путь):
    r = subprocess.run(['find', путь, '-type', 'f'], capture_output=True, text=True)
    return len([s for s in r.stdout.split('\n') if s])

к7_диск = файлов('ИНСТРУМЕНТЫ')
ок('К7: заголовок = файлам ИНСТРУМЕНТЫ на диске (%d)' % к7_диск,
   ('## К7 — ТЕСТЫ И ИНСТРУМЕНТЫ (%d файлов)' % к7_диск) in канон)
т7 = len([f for f in os.listdir('ИНСТРУМЕНТЫ') if f.startswith('test_')])
ок('К7: строка «тесты» = числу test_* на диске (%d)' % т7, re.search(r'\| тесты \| %d \|' % т7, канон) is not None)
к8_диск = len(os.listdir('ДОКУМЕНТЫ')) + len([f for f in os.listdir('.') if f.startswith(('ИНСТРУКЦИЯ_', 'ПРОТОКОЛ_'))])
ок('К8: заголовок = ДОКУМЕНТЫ + инструкции корня (%d)' % к8_диск,
   ('## К8 — ДОКУМЕНТЫ (%d файлов на диске' % к8_диск) in канон)
а9, с9 = файлов('АРХИВ_V3'), файлов('СКРИНШОТЫ')
ок('К9: заголовок = АРХИВ_V3(%d) + СКРИНШОТЫ(%d)' % (а9, с9),
   ('## К9 — АРХИВ И ДОКАЗАТЕЛЬСТВА (%d файла)' % (а9 + с9)) in канон or ('## К9 — АРХИВ И ДОКАЗАТЕЛЬСТВА (%d файлов)' % (а9 + с9)) in канон)
м_сумма = re.search(r'Сумма: ([\d+]+) = \*\*(\d+)\*\*', канон)
ок('ИТОГО: сумма слагаемых = заявленному числу файла за файлом', м_сумма is not None and
   sum(int(x) for x in м_сумма.group(1).split('+')) == int(м_сумма.group(2)))

# ---------- ЧАСТЬ 2: браузерный смоук ----------
print('Часть 2 — браузер (Playwright): лобное место, нить, двери')
ПОРТ = свободный_порт()
сервер = subprocess.Popen(['node', 'ИНСТРУМЕНТЫ/serve_repo.mjs', str(ПОРТ)],
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
время0 = time.time()
url = None
while time.time() - время0 < 10:
    try:
        with socket.create_connection(('127.0.0.1', ПОРТ), timeout=0.5):
            url = 'http://127.0.0.1:%d/' % ПОРТ
            break
    except OSError:
        time.sleep(0.2)
if not url:
    print('сервер не поднялся'); сервер.kill(); sys.exit(1)

try:
    with sync_playwright() as п:
        браузер = п.chromium.launch()
        стр = браузер.new_page()
        ошибки = []
        стр.on('console', lambda м: ошибки.append(м.text) if м.type == 'error' else None)
        стр.on('pageerror', lambda е: ошибки.append(str(е)))
        стр.goto(url, wait_until='networkidle')
        ок('главная открылась: титул SINGULYAR', 'SINGULYAR' in (стр.title() + стр.content()))

        # ── ТИТУЛ (капот ЗАКРЫТ — то, что видит человек при первом выборе) ──
        тело = стр.inner_text('body')
        ок('титул: SINGULYAR + AIO + «Смысл один. Представление — твоё.»',
           all(w in тело for w in ['SINGULYAR', 'AMBIENT INTENT ORGANISM', 'Смысл один. Представление — твоё.']))
        ок('три объекта канона на титуле', all(w in тело for w in ['Один файл.', 'Ноль интернета.', '100% суверенитет.']))
        ок('живой кристалл приглашает сам (такт v1.36.1): тихая подсказка под шаром (uppercase канона)',
           'КОСНИСЬ КРИСТАЛЛА' in тело.upper())
        ок('ЛОБНОЕ МЕСТО ЧИСТО: денег/кошелька/связи/шагов/каталога НЕ ВИДНО при закрытом капоте',
           all(w not in тело for w in ['КОШЕЛЁК', 'ДЕНЬГИ', 'ПОДДЕРЖАТЬ', 'Шаг 1', 'Каталог вселенной', 'СПЕТЬ ОДНОМУ', 'Действие', 'Архитектура модулей']))
        ок('простыней нет и в разметке: ни призмы, ни AURA-панели, ни полок на главной',
           all(w not in х for w in ['sngPrism', 'auraPanel', 'Каталог вселенной', 'ДЕНЬГИ ·25 — честный статус', 'СПЕТЬ ОДНОМУ']))
        ок('картина-фундамент на титуле: КРИСТАЛЛ.png (закон v1.34.0) и существует на диске',
           стр.evaluate("() => { const i = document.getElementById('crystalHero'); return !!i && i.tagName === 'IMG' && /КРИСТАЛЛ\.png$/.test(i.getAttribute('src')) }")
           and os.path.exists('КРИСТАЛЛ.png'))
        ок('ядро модулей SNG живо (манифест 22 узла, v1.11.0, осколки-движок на месте) — этаж с такта v1.46.0',
           стр.evaluate('() => window.SNG && window.SNG.версия === \'1.11.0\' && typeof window.SNG.кристалл === \'function\' && typeof window.SNG.осколки === \'function\' && window.SNG.модуль.length === 22'))
        ок('бирки на хабе нет (закон v1.33.0: лицо дома = ТОЛЬКО макет, бирка живёт в комнатах)',
           not стр.evaluate("() => !!document.querySelector('.sng-strip')"))

        # ── ЖИВОЙ КРИСТАЛЛ (такт v1.36.1): касание — шар рассыпается на двери дома ──
        ок('нить закрыта по умолчанию (капот закрыт — нить поднимается по N/меню)',
           стр.evaluate("() => { const d = document.getElementById('модули'); return !!d && d.tagName === 'DETAILS' && (!d.open || d.hidden) }"))
        стр.click('#crystalButton')
        стр.wait_for_timeout(900)
        оск = стр.evaluate("""() => {
          const SNG = window.SNG, слой = document.getElementById('осколкиСлой');
          if (!SNG || !слой) return {n: 0, чужие: [], файлы: []};
          const манифест = new Set();
          SNG.карта().forEach(r => r.модули.forEach(m => манифест.add(m.файл)));
          const все = [...слой.querySelectorAll('a.осколок')];
          const файлы = все.map(a => a.getAttribute('href'));
          const чужие = файлы.filter(f => !манифест.has(f)).length;
          return {n: все.length, чужие: чужие, файлы: файлы};
        }""")
        ок('кристалл рассыпался на ровно 21 осколок-дверь (хаб ·00 — сам кристалл; порядок из манифеста, СЦЕНА v1.46.0)', оск['n'] == 21)
        ок('каждый осколок — дверь из манифеста ядра, чужих нет', оск['чужие'] == 0)
        нет_на_диске = [f for f in оск['файлы'] if not os.path.exists(f)]
        ок('все 19 файлов осколков существуют на диске', len(нет_на_диске) == 0 or (print('   нет: ' + ', '.join(нет_на_диске)) and False))
        ок('в статусе названо число дверей', '21 дверь' in стр.evaluate("() => (document.getElementById('статусОсколков')||{textContent:''}).textContent") or '21 дверей' in стр.evaluate("() => (document.getElementById('статусОсколков')||{textContent:''}).textContent"))

        # ── НИТЬ (путь по N): дом 19 дверей ──
        стр.keyboard.press('n')
        стр.wait_for_timeout(400)
        ок('нить поднята по N — дом открыт', стр.evaluate("() => { const d = document.getElementById('модули'); return !!d && !d.hidden && d.open }"))
        двери = стр.evaluate("""() => {
          const SNG = window.SNG, бокс = document.getElementById('двери');
          if (!SNG || !бокс) return {n: 0, чужие: [], файлы: []};
          const манифест = new Set();
          SNG.карта().forEach(r => r.модули.forEach(m => манифест.add(m.файл)));
          const все = [...бокс.querySelectorAll('a.дверь')];
          const файлы = все.map(a => decodeURIComponent(new URL(a.href).pathname.split('/').pop()));
          const чужие = файлы.filter(f => !манифест.has(f)).length;
          return {n: все.length, чужие: чужие, файлы: файлы};
        }""")
        ок('дом открывает ровно 21 дверь по нити (второй путь — согласован с осколками; СЦЕНА ·32 такта v1.46.0)', двери['n'] == 21)
        ок('каждая дверь — файл из манифеста ядра, чужих нет', двери['чужие'] == 0)
        нет_на_диске = [f for f in двери['файлы'] if not os.path.exists(f)]
        ок('все 19 файлов дверей существуют на диске', len(нет_на_диске) == 0 or (print('   нет: ' + ', '.join(нет_на_диске)) and False))
        тело2 = стр.inner_text('body')
        ок('возможность предоставлена: тихие двери ·22 СВЯЗЬ и ·25 КОШЕЛЁК есть ПОД капотом',
           '·22' in тело2 and 'СВЯЗЬ' in тело2 and '·25' in тело2 and 'КОШЕЛЁК' in тело2)
        ок('путь человек находит сам: УЗЕЛ ·28 и ТКАНЬ ·30 за дверью', '·28' in тело2 and 'УЗЕЛ' in тело2 and '·30' in тело2 and 'ТКАНЬ' in тело2)

        # ── ВЕРСИЯ: не на титуле, в меню дома (канон тактов v1.33–v1.37) ──
        титул_текст = стр.inner_text('#crystalTitle')
        ок('версии на титуле нет (канон)', 'v1.4' not in титул_текст and 'v1.3' not in титул_текст)
        меню_текст = стр.evaluate("() => { const м = document.getElementById('sux-menu'); return м ? м.textContent : '' }")
        ок('сборка v1.46.0 «СЦЕНА» названа в меню дома; старая вытеснена',
           'сборка v1.46.0 · СЦЕНА' in меню_текст and 'v1.45.0' not in меню_текст)

        resp = стр.request.get(url + 'ДОКУМЕНТЫ/СИСТЕМАТИЗАЦИЯ_ВСЕЛЕННОЙ.md')
        ок('СИСТЕМАТИЗАЦИЯ_ВСЕЛЕННОЙ.md отвечает 200', resp.ok)
        resp2 = стр.request.get(url + 'ДОКУМЕНТЫ/АРХИТЕКТУРА_МОДУЛЕЙ.md')
        ок('АРХИТЕКТУРА_МОДУЛЕЙ.md отвечает 200 (карта живёт там)', resp2.ok)
        resp3 = стр.request.get(url + 'ГОТОВНОСТЬ.manifest.json')
        ок('ГОТОВНОСТЬ.manifest.json отвечает 200', resp3.ok)
        чистые = [о for о in ошибки if 'favicon' not in о.lower()]
        ок('консоль чистая (0 ошибок), шум: %d' % len(чистые), len(чистые) == 0
           or (print('   ошибки: ' + ' | '.join(чистые[:3])) and False))
        браузер.close()
finally:
    сервер.kill()

print('\nИТОГ: %d/%d прошло' % (прошло, прошло + len(провалы)))
sys.exit(1 if провалы else 0)
