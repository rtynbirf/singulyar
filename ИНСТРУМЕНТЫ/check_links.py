#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ПАУТИНА v1 (такт v1.26.2): каждая нить канона живая.
Урок Task 33: карточка «ОС v1.9» годами вела на относительный releases/download/...
— Pages-домен релизы не отдаёт, а владелец поймал 404 живьём. Класс шва закрыт:
теперь не один index.html, а весь живой слой канона проверяется машиной.
Что проверяется:
  1. Внешние http(s)-ссылки — живым HEAD-запросом (405/501 → GET). 404/410 = МЁРТВАЯ нить.
     403/429/999 = «стена для ботов» — нить чужая, честно докладываем, не судим.
  2. Внутренние пути — существованием на диске (кириллица/%-кодирование учитываются).
  3. Якоря — id/name в целевом файле (для .html — обязательно, для .md — по встреченному тексту).
Область: корневые *.html/*.md + ДОКУМЕНТЫ/** целиком. АРХИВ_V3/СКРИНШОТЫ — доказательства
прошлого (не трогаем), БИБЛИОТЕКИ — чужой vendor-код (ссылки не наши обещания).
Запуск: python3 ИНСТРУМЕНТЫ/check_links.py   (без сети: внешние — «не ответили», внутренние судятся строго)
"""
import os, re, sys, time, unicodedata
import urllib.request, urllib.error
from urllib.parse import urlparse, unquote, quote

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
UA = {'User-Agent': 'Mozilla/5.0 (compatible; singulyar-link-check/1; +https://github.com/rtynbirf/singulyar)'}

живой_слой = []
for ф in sorted(os.listdir('.')):
    if ф.endswith(('.html', '.md')):
        живой_слой.append(ф)
для_док = os.path.join('ДОКУМЕНТЫ')
for корень, _, имена in os.walk(для_док):
    for и in sorted(имена):
        if и.endswith(('.html', '.md')):
            живой_слой.append(os.path.join(корень, и))

Р_хтмл = re.compile(r'(?:href|src)="([^"\#]*)?(?:\#([^"]*))?"', re.I)
Р_мд   = re.compile(r'\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)')

def цели(путь, текст):
    вых = []
    if путь.endswith('.html'):
        for м in Р_хтмл.finditer(текст):
            вых.append((м.group(1) or '', м.group(2) or ''))
    else:
        for м in Р_мд.finditer(текст):
            вых.append((м.group(1), ''))
        for м in Р_хтмл.finditer(текст):
            вых.append((м.group(1) or '', м.group(2) or ''))
    return вых

ид_кэш = {}
def ид_набор(путь):
    if путь not in ид_кэш:
        try:
            т = open(путь, encoding='utf-8').read()
        except Exception:
            ид_кэш[путь] = set(), set()
            return ид_кэш[путь]
        явные = set(re.findall(r'id="([^"]+)"', т)) | set(re.findall(r'name="([^"]+)"', т))
        шапки = set()
        if путь.endswith('.md'):
            for стр in т.splitlines():
                м = re.match(r'^\s*#{1,6}\s+(.+?)\s*$', стр)
                if м:
                    с = м.group(1).strip().lower()
                    с = re.sub(r'[^\wа-яё\- ]', '', с).replace(' ', '-')
                    шапки.add(с)
                    шапки.add(с.replace('-', ''))
        ид_кэш[путь] = (явные, шапки)
    return ид_кэш[путь]

def чистый_урл(у):
    # кириллица и весь не-ASCII в пути → %XX, как браузеры делают молча;
    # иначе urllib падает с 'ascii' codec error ещё до сети (урок первого прогона)
    return quote(у, safe="%/:=&?~#+!$,;'@()*[]")

def внешний(урл):
    урл = чистый_урл(урл)
    try:
        з = urllib.request.Request(урл, headers=UA, method='HEAD')
        от = urllib.request.urlopen(з, timeout=15)
        return от.status, ''
    except urllib.error.HTTPError as е:
        if е.code in (405, 501):
            try:
                з = urllib.request.Request(урл, headers=UA, method='GET')
                от = urllib.request.urlopen(з, timeout=15)
                return от.status, ''
            except urllib.error.HTTPError as е2:
                return е2.code, ''
            except Exception as е2:
                return None, str(е2)[:80]
        return е.code, ''
    except Exception as е:
        return None, str(е)[:80]

мёртвые, стены, тишина = [], [], []
внеш_кэш = {}
всего_внеш = 0
всего_внутр = 0

for путь in живой_слой:
    текст = open(путь, encoding='utf-8').read()
    для_файла = цели(путь, текст)
    for база, фраг in для_файла:
        база = база.strip()
        if not база and фраг:
            # якорь в самом файле
            явные, шапки = ид_набор(путь)
            if фраг not in явные and фраг.lower() not in {s.lower() for s in шапки}:
                мёртвые.append(путь + ' → #' + фраг + ' (якоря нет в самом файле)')
            continue
        if база.startswith(('data:', 'mailto:', 'javascript:', 'tel:')):
            continue
        if база.startswith(('http://', 'https://')):
            всего_внеш += 1
            if база in внеш_кэш:
                статус, ош = внеш_кэш[база]
            else:
                статус, ош = внешний(база)
                внеш_кэш[база] = (статус, ош)
                time.sleep(0.25)
            if статус is None:
                тишина.append(путь + ' → ' + база + ' (' + ош + ')')
            elif 200 <= статус < 400:
                pass
            elif статус in (403, 429, 999, 405):
                стены.append(путь + ' → ' + база + ' (HTTP ' + str(статус) + ' — чужая стена для ботов)')
            else:
                мёртвые.append(путь + ' → ' + база + ' (HTTP ' + str(статус) + ')')
            continue
        if '://' in база:
            continue
        всего_внутр += 1
        цель = unquote(urlparse(база).path)
        if цель.endswith('/'):
            цель = цель.rstrip('/') + '/index.html'
        полный = os.path.normpath(os.path.join(os.path.dirname(путь), цель))
        if not os.path.exists(полный):
            мёртвые.append(путь + ' → ' + база + ' (файла нет на диске)')
            continue
        if фраг:
            явные, шапки = ид_набор(полный)
            я, ш = {s.lower() for s in явные}, {s.lower() for s in шапки}
            if фраг.lower() not in я and фраг.lower() not in ш and фраг.lower().replace('-', '') not in ш:
                класс = мёртвые if полный.endswith('.html') else тишина
                пометка = ' (якоря нет в ' + полный + ')' if полный.endswith('.html') else ' (якорь .md не подтверждён однозначно)'
                класс.append(путь + ' → ' + база + пометка)

print('— ПАУТИНА v1: живой слой = %d файлов' % len(живой_слой))
print('  нитей внешних: %d (уникальных %d) · внутренних: %d' % (всего_внеш, len(внеш_кэш), всего_внутр))
если = lambda имя, список: print('\n  ' + имя + ':') or [print('    · ' + с) for с in список]
if мёртвые:
    если('МЁРТВЫЕ НИТИ (%d) — чинить до пуша' % len(мёртвые), мёртвые)
if стены:
    если('стены для ботов (%d) — чужие границы, доклад без приговора' % len(стены), стены)
if тишина:
    если('не ответили/не подтверждено (%d)' % len(тишина), тишина)
if not (мёртвые or стены or тишина):
    print('  ✓ ни одной мёртвой нити')
print('')
print('ИТОГ: %s' % ('ПАУТИНА ЦЕЛА (%d мёртвых)' % len(мёртвые) if not мёртвые else 'МЁРТВЫЕ НИТИ: %d — ПУША НЕ БУДЕТ' % len(мёртвые)))
sys.exit(1 if мёртвые else 0)
