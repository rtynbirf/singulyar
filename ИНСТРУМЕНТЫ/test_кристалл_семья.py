#!/usr/bin/env python3
# -*- coding: utf-8 -*-
'''Страж латки С129 — КРИСТАЛЛ ЧЕЛОВЕКА: семейная рума.
Детерминированный, без браузера и сети (канон CI: «Python-оракулы — без браузера/сети»).
Проверяет: файл собран, CSP-постур А, слоты семьи, канон krug-profiles подключён
классическим script-тегом, автомат слоя на месте, 0 внешних скриптов, мост в ·22,
маркеры-стражи ровно по одному, бюджет веса (ТЗ-Е ≤ 5 МБ), честность И-01
(релей — только по явному слову, import не на верхнем уровне).
Запуск: python3 ИНСТРУМЕНТЫ/test_кристалл_семья.py'''
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
КРИСТ = os.path.join(ROOT, 'КРИСТАЛЛ_ЧЕЛОВЕКА.html')
СВЯЗЬ = os.path.join(ROOT, 'СИНГУЛЯР_22_СВЯЗЬ.html')
KRUG = os.path.join(ROOT, 'ДОКУМЕНТЫ', 'ТРЕКИ', 'LADOM_SINGULAR', 'src', 'krug-profiles.js')

прошло = 0
провалы = []

def ок(имя, условие, дет=''):
    global прошло
    if условие:
        прошло += 1
        print('  ✓ ' + имя)
    else:
        провалы.append(имя)
        print('  ✗ ПРОВАЛ: ' + имя + ((' — ' + дет) if дет else ''))

т = open(КРИСТ, encoding='utf-8').read() if os.path.exists(КРИСТ) else ''

# 1. Файл есть и в бюджете
ок('файл КРИСТАЛЛ_ЧЕЛОВЕКА.html существует', bool(т))
размер = os.path.getsize(КРИСТ) if os.path.exists(КРИСТ) else 0
ок('бюджет веса ≤ 5 МБ (ТЗ-Е)', 0 < размер <= 5 * 1024 * 1024, f'{размер} байт')

# 2. CSP-постур А (дом: script-src с 'unsafe-inline' и 'wasm-unsafe-eval'; connect-src wss:)
мета = re.search(r'<meta http-equiv="Content-Security-Policy" content="([^"]+)"', т)
ок('CSP-мета в head', bool(мета))
if мета:
    с = мета.group(1)
    ок("CSP script-src содержит 'unsafe-inline'", "'unsafe-inline'" in с)
    ок("CSP script-src содержит 'wasm-unsafe-eval'", "'wasm-unsafe-eval'" in с)
    ок('CSP connect-src wss: (релей честен)', 'connect-src' in с and 'wss:' in с)
    ок('CSP object-src none', 'object-src \'none\'' in с)
    # CSP раньше первого внешнего скрипта
    i_csp = т.find('Content-Security-Policy')
    i_scr = т.find('<script')
    ок('CSP раньше первого <script', 0 < i_csp < i_scr if i_scr > 0 else False)

# 3. Слоты семьи (приказ владельца: ПАША МАМА ЖЕНЯ ВАНЯ)
for слот in ('ПАША', 'МАМА', 'ЖЕНЯ', 'ВАНЯ'):
    ок(f'слот {слот} в руме', f'data-slot="{слот}"' in т)

# 4. Канон krug-profiles: классический script-тег с точным путём, файл существует
тег = '<script src="ДОКУМЕНТЫ/ТРЕКИ/LADOM_SINGULAR/src/krug-profiles.js"></script>'
ок('канон krug-profiles классическим script-тегом', тег in т)
ок('файл канона krug-profiles существует', os.path.exists(KRUG))

# 5. Автомат слоя: рендеву-мосты, авто-приём ссылки, закон согласия
ок('мост вкладок (BroadcastChannel)', 'new BroadcastChannel' in т)
ок('релей trystero по явному слову', "import('./БИБЛИОТЕКИ/trystero-nostr.bundle.mjs')" in т)
ок('import релея ровно один (не на верхнем уровне)', т.count("import('./БИБЛИОТЕКИ/trystero-nostr.bundle.mjs')") == 1)
ок('закон согласия через canon (повторныйКонтакт)', 'повторныйКонтакт' in т)
ок('мастер-слово владельца (без вопросов)', 'снгБезВопросов' in т)
ок('ссылка-приглашение #снг-связь', 'снг-связь=' in т)
ок('авто-приём по хэшу', 'decodeURIComponent' in т and "$('acc').click()" in т)
ок('автомат жмёт родные кнопки кристалла', "$('mk').click()" in т)
ок('ID в паспорте румы', 'ID устройства' in т)
ок('честная проба адресов без STUN (iceServers:[])', 'iceServers:[]' in т)
ок('честный отказ не молчит', 'снг-отказ' in т)

# 6. Маркеры-стражи ровно по одному (идемпотентность)
for маркер in ('СНГ:КРИСТАЛЛ-СЕМЬЯ-НАЧАЛО', 'СНГ:КРИСТАЛЛ-СЕМЬЯ-КОНЕЦ',
               'СНГ:КРИСТАЛЛ-СЛОЙ-НАЧАЛО', 'СНГ:КРИСТАЛЛ-СЛОЙ-КОНЕЦ'):
    ок(f'маркер {маркер} ровно один', т.count(маркер) == 1, str(т.count(маркер)))

# 7. 0 внешних скриптов/сети по умолчанию
внешние = re.findall(r'<script[^>]+src="([^"]+)"', т)
чужие = [с for с in внешние if not (с.startswith('ДОКУМЕНТЫ/') or с.startswith('./') or с.startswith('/'))]
ок('все script src локальные', not чужие, str(чужие))
ок('нет внешних http-скриптов', not re.search(r'src="https?://', т))
ок('нет внешних http-ресурсов (src/href/url)', not re.search(r'(src|href)="https?://|url\(https?://', т))

# 8. Байты владельца целы: заголовок и ключевые куски v5 на месте
ок('заголовок кристалла владельца цел', 'Кристалл Человека' in т)
ок('родной журнал SHA-256 цел', 'Проверить цепь' in т)
ок('родная ценность целa', 'Передать ценность' in т)
ок('родный WebRTC цел', 'RTCPeerConnection' in т)

# 9. Мост в ·22 СВЯЗЬ
с = open(СВЯЗЬ, encoding='utf-8').read() if os.path.exists(СВЯЗЬ) else ''
ок('·22 содержит мост КРИСТАЛЛА', 'мостКрист' in с)
ок('мост ведёт на файл румы', 'КРИСТАЛЛ_ЧЕЛОВЕКА.html' in с)
ок('мост в секции ЗВОНОК (перед callList)', с.find('мостКрист') < с.find('id="callList"') if 'id="callList"' in с else False)

# 10. Язык и честность
ок('честная пометка про релей (И-01) в панели', 'явному слову' in т or 'явного слова' in т)

print(f'\nИтог: прошло {прошло}, провалов {len(провалы)}')
if провалы:
    print('ПРОВАЛЫ:', '; '.join(провалы))
    sys.exit(1)
print('СТРАЖ КРИСТАЛЛА ЗЕЛЁНЫЙ')
