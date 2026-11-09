#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ГЕРМЕТИК CSP · дом СИНГУЛЯР — hash-based Content-Security-Policy + «предчувствие двери» (speculation-rules prefetch).

ЗАЧЕМ (прочти перед правкой):
  Дом — статический GitHub Pages: сервер НЕ может отдавать HTTP-заголовки, поэтому CSP
  доставляется через <meta http-equiv="Content-Security-Policy"> в <head> (сразу после charset).
  Вынос inline-скриптов в файлы рискован (их сотни тысяч строк) — выбран канон для такого
  случая: script-src 'self' + sha256-хэш КАЖДОГО inline-<script> ('unsafe-inline' в script-src
  обнуляет защиту, хэши — нет; on*-обработчиков и eval в доме нет — проверено аудитом).
  frame-ancestors в meta НЕ работает (только заголовок) — дом не фреймят, риск принят.

КАК ПЕРЕЗАПУСКАТЬ ПОСЛЕ ПРАВОК СТРАНИЦ (добавил/поправил inline-скрипт → хэши устарели):
  python3 ИНСТРУМЕНТЫ/герметик_csp.py [--вставка-предчувствия]
  Инструмент идемпотентен: пересчитает хэши по свежему тексту, удалит старые meta CSP,
  вставит одну новую. Новые корневые страницы (СИНГУЛЯР_35..38 …) герметизируются тем же запуском.

РЕЖИМЫ:
  (по умолчанию)         — герметизация: hash-CSP во все корневые *.html КРОМЕ
                           organism-living-prototype.html (прототип — не трогаем вовсе);
                           404.html герметизируется только если есть inline-скрипты.
  --вставка-предчувствия — дополнительно вставить сразу после charset-меты блок
                           <script type="speculationrules" id="sg-предчувствие">…moderate prefetch…
                           </script> КРОМЕ organism-living-prototype.html и 404.html и страниц,
                           где id="sg-предчувствие" уже стоит (дважды не вставится).

СТРАХОВОЧНЫЙ режим (страница без CSP лучше сломанной): страница НЕ герметизируется (старый
CSP не трогается), если: inline-скрипт исполняемого типа не проходит `node --check`
(синтакс-ошибка), файл не читается как utf-8, или наивный разбор тегов расходится с
HTMLParser (признак каверзного HTML). Все страховки видны в отчёте.

АВТО-двери (по литералам в тексте страницы, задвоения нет):
  script-src: ' https://cdn.jsdelivr.net' (CDN-либы); 'wasm-unsafe-eval' (onnx-инференс
  ·31/·01/·02); ' blob:' (AudioWorklet-модули из blob: — ·31/·17/·15/·16/·27/ШТАБ).
  connect-src: jsdelivr, huggingface/transformers, translate.googleapis,
  raw.githubusercontent, api.github/github.com/login/device, mempool.space, blockstream,
  blockcypher, wss: (trystero|wss://), filebin.

Хэш считается от ТОЧНЫХ байтов содержимого <script>…</script> (utf-8): HTML-entities внутри
JS не разэкранируются — браузер в raw-text-содержимом script их тоже не разэкранирует.
Только stdlib (питон 3.8+); node нужен лишь для проверки синтаксиса исполняемых скриптов.

Запуск: python3 ИНСТРУМЕНТЫ/герметик_csp.py [--вставка-предчувствия] [--репо ПУТЬ]
Выход-код 0, если герметизировано/пропущено честно ≥80% страниц.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import os
import re
import subprocess
import sys
import tempfile
from html.parser import HTMLParser
from pathlib import Path

# ── Константы дома ──────────────────────────────────────────────────────────────

МАРКЕР_ПРЕДЧУВСТВИЯ = 'id="sg-предчувствие"'
БЕЗ_ПРЕДЧУВСТВИЯ = {'organism-living-prototype.html', '404.html'}
БЕЗ_ВСЕГО = {'organism-living-prototype.html'}  # прототип: не герметизировать, не предчувствовать

SCRIPT_RE = re.compile(r'<script\b([^>]*)>([\s\S]*?)</script>', re.I)
CHARSET_RE = re.compile(r'<meta\s+charset=[^>]*>', re.I)
HEAD_RE = re.compile(r'<head\b[^>]*>', re.I)
META_RE = re.compile(r'<meta\b[^>]*>', re.I)
META_С_ПРОБЕЛОМ_RE = re.compile(r'''\s*<meta\b[^>]*>''', re.I)
CSP_HINT_RE = re.compile(r'''http-equiv\s*=\s*(["']?)content-security-policy''', re.I)
TYPE_RE = re.compile(r'''type\s*=\s*(["'])(.*?)\1''', re.I)
SRC_RE = re.compile(r'\bsrc\s*=', re.I)

ИСПОЛНЯЕМЫЕ_ТИПЫ = {'', 'text/javascript', 'application/javascript',
                    'text/ecmascript', 'application/ecmascript', 'module'}
ДАННЫЕ_ТИПЫ = {'speculationrules', 'application/ld+json', 'application/json', 'importmap'}

ПРАВИЛА_ПРЕДЧУВСТВИЯ = ('{"prefetch":[{"source":"document","where":{"and":'
                        '[{"href_matches":"/*"},{"not":{"href_matches":'
                        '"/*.(md|json|txt|webp|png|jpg|jpeg|mp3|webm|js|css|ico|svg|xml|wasm|mjs|srt|xlsx|pdf|docx)"}}]},'
                        '"eagerness":"moderate"}]}')
БЛОК_ПРЕДЧУВСТВИЯ = ('<script type="speculationrules" ' + МАРКЕР_ПРЕДЧУВСТВИЯ + '>\n'
                     + ПРАВИЛА_ПРЕДЧУВСТВИЯ + '\n</script>')

# (метка, литерал-условие по нижнему регистру текста страницы, добавка к connect-src)
CONNECT_ДВЕРИ = [
    ('jsdelivr',    lambda t: 'cdn.jsdelivr.net' in t),
    ('hf',          lambda t: 'huggingface.co' in t or 'transformers' in t),
    ('translate',   lambda t: 'translate.googleapis' in t),
    ('rawgh',       lambda t: 'raw.githubusercontent' in t),
    ('github-api',  lambda t: 'api.github' in t or 'github.com/login/device' in t),
    ('mempool',     lambda t: 'mempool.space' in t),
    ('blockstream', lambda t: 'blockstream' in t),
    ('blockcypher', lambda t: 'blockcypher' in t),
    ('wss',         lambda t: 'trystero' in t or 'wss://' in t),
    ('filebin',     lambda t: 'filebin' in t),
]
CONNECT_СТАВКИ = {
    'jsdelivr':    ' https://cdn.jsdelivr.net',
    'hf':          ' https://huggingface.co https://*.hf.co',
    'translate':   ' https://translate.googleapis.com',
    'rawgh':       ' https://raw.githubusercontent.com',
    'github-api':  ' https://api.github.com https://github.com',
    'mempool':     ' https://mempool.space',
    'blockstream': ' https://blockstream.info',
    'blockcypher': ' https://api.blockcypher.com',
    'wss':         ' wss:',
    'filebin':     ' https://filebin.net',
}


# ── Утилиты ─────────────────────────────────────────────────────────────────────

def хэш_скрипта(код: str) -> str:
    """sha256 от точных байтов (utf-8) содержимого <script> → 'sha256-<base64>'."""
    дайджест = hashlib.sha256(код.encode('utf-8')).digest()
    return 'sha256-' + base64.b64encode(дайджест).decode('ascii')


def node_проверка(код: str, модуль: bool) -> tuple[bool, str]:
    """node --check во временном файле; True — синтаксис честный."""
    суффикс = '.mjs' if модуль else '.js'
    дескриптор, путь = tempfile.mkstemp(suffix=суффикс)
    try:
        with os.fdopen(дескриптор, 'wb') as файл:
            файл.write(код.encode('utf-8'))
        результат = subprocess.run(['node', '--check', путь],
                                   capture_output=True, text=True, timeout=120)
        return результат.returncode == 0, (результат.stderr or '').strip()[:300]
    except FileNotFoundError:
        return False, 'node не найден'
    finally:
        try:
            os.unlink(путь)
        except OSError:
            pass


class СборщикСкриптов(HTMLParser):
    """Достаёт содержимое <script>…</script> так, как его видит браузерный парсер."""

    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.внутри = 0
        self.буфер: list[str] = []
        self.тексты: list[str] = []

    def handle_starttag(self, тег, атрибуты):
        if тег == 'script':
            self.внутри += 1
            self.буфер = []

    def handle_startendtag(self, тег, атрибуты):
        if тег == 'script':
            self.тексты.append('')

    def handle_endtag(self, тег):
        if тег == 'script' and self.внутри:
            self.внутри -= 1
            self.тексты.append(''.join(self.буфер))
            self.буфер = []

    def handle_data(self, данные):
        if self.внутри:
            self.буфер.append(данные)


def удалить_старые_csp(текст: str) -> str:
    """Удаляет ВСЕ существующие <meta http-equiv="Content-Security-Policy" …> вместе
    с предшествующим пробелом/переводом строки — иначе остаётся пустая строка и
    повторные запуски раздувают head."""
    return META_С_ПРОБЕЛОМ_RE.sub(
        lambda м: '' if CSP_HINT_RE.search(м.group(0)) else м.group(0), текст)


def собрать_политику(текст: str, хэши: list[str]) -> tuple[str, list[str]]:
    """Политика по контракту витка 11 + авто-двери по литералам. Возвращает (CSP, метки дверей)."""
    t = текст.lower()
    двери: list[str] = []

    script_src = "'self'"
    if хэши:
        script_src += ' ' + ' '.join(sorted(set(хэши)))
    if 'cdn.jsdelivr.net' in текст:
        script_src += ' https://cdn.jsdelivr.net'
        двери.append('jsdelivr')
    if 'onnx' in t:  # инференс ONNX/Whisper в браузере требует wasm-компиляции
        script_src += " 'wasm-unsafe-eval'"
        двери.append('wasm-eval')
    if 'audioworklet' in t:  # AudioWorklet-модуль стро́я создаётся из blob:
        script_src += ' blob:'
        двери.append('worklet-blob')

    надстройки = ''
    for метка, условие, in CONNECT_ДВЕРИ:
        if условие(t):
            надстройки += CONNECT_СТАВКИ[метка]
            двери.append(метка)

    политика = (
        "default-src 'self'"
        f"; script-src {script_src}"
        "; style-src 'self' 'unsafe-inline'"
        "; img-src 'self' data: blob:"
        "; media-src 'self' blob:"
        "; font-src 'self'"
        "; manifest-src 'self'"
        "; worker-src 'self' blob:"
        "; object-src 'none'"
        "; base-uri 'self'"
        "; form-action 'self'"
        f"; connect-src 'self'{надстройки}"
    )
    return политика, двери


# ── Герметизация одной страницы ─────────────────────────────────────────────────

def герметизировать(путь: Path, вставить_предчувствие: bool) -> dict:
    отчёт = {'имя': путь.name, 'статус': '', 'скриптов': 0, 'хэшей': 0,
             'двери': [], 'заметка': '', 'изменено': False, 'предчувствие': False}

    try:
        сырое = путь.read_bytes()
        текст = сырое.decode('utf-8')
    except (OSError, UnicodeDecodeError) as беда:
        отчёт['статус'] = 'СТРАХОВКА'
        отчёт['заметка'] = f'не читается как utf-8: {беда}'
        return отчёт

    исходник = текст

    # 1) «Предчувствие двери» — сразу после charset-меты (до CSP, чтобы CSP встал первым).
    if вставить_предчувствие and путь.name not in БЕЗ_ПРЕДЧУВСТВИЯ:
        if МАРКЕР_ПРЕДЧУВСТВИЯ not in текст:
            м = CHARSET_RE.search(текст)
            if м is None:
                м = HEAD_RE.search(текст)
            if м is not None:
                текст = текст[:м.end()] + '\n' + БЛОК_ПРЕДЧУВСТВИЯ + текст[м.end():]
                отчёт['предчувствие'] = True

    # 2) Сбор inline-скриптов (регекс по контракту: src= → внешний, пропустить).
    inline: list[tuple[str, str]] = []  # (атрибуты, тело)
    for атрибуты, тело in SCRIPT_RE.findall(текст):
        if SRC_RE.search(атрибуты):
            continue
        inline.append((атрибуты, тело))
    отчёт['скриптов'] = len(inline)

    if not inline:
        отчёт['статус'] = 'ПРОПУСК'
        отчёт['заметка'] = 'нет inline-скриптов — герметизировать нечего'
        return отчёт

    # 3) Хэши; исполняемые типы — через node --check (СТРАХОВКА при синтакс-ошибке).
    хэши: list[str] = []
    for атрибуты, тело in inline:
        м = TYPE_RE.search(атрибуты)
        тип = (м.group(2).strip().lower() if м else '')
        if тип in ИСПОЛНЯЕМЫЕ_ТИПЫ:
            ок, причина = node_проверка(тело, модуль=(тип == 'module'))
            if not ок:
                отчёт['статус'] = 'СТРАХОВКА'
                отчёт['заметка'] = f'node --check: {причина}'
                return отчёт
        # ДАННЫЕ_ТИПЫ (speculationrules, ld+json, json, importmap) и прочие не-исполняемые:
        # хэш сразу, node не гоняем.
        хэши.append(хэш_скрипта(тело))
    отчёт['хэшей'] = len(set(хэши))

    # 4) Страховочная сеть: наивный разбор не должен расходиться с HTMLParser.
    парсер = СборщикСкриптов()
    try:
        парсер.feed(текст)
        парсер.close()
    except Exception as беда:  # noqa: BLE001 — любой каприз парсера = страховка
        отчёт['статус'] = 'СТРАХОВКА'
        отчёт['заметка'] = f'HTMLParser не осилил страницу: {беда}'
        return отчёт
    тела = {тело for _, тело in inline}
    для_парсера = [т for т in парсер.тексты if т.strip()]
    for т in для_парсера:
        if т not in тела:
            отчёт['статус'] = 'СТРАХОВКА'
            отчёт['заметка'] = 'разбор <script> расходится с HTMLParser (каверзный HTML)'
            return отчёт

    # 5) Политика: удалить старые meta CSP, вставить одну новую сразу после charset.
    политика, двери = собрать_политику(текст, хэши)
    отчёт['двери'] = двери
    мета = f'<meta http-equiv="Content-Security-Policy" content="{политика}">'

    текст = удалить_старые_csp(текст)
    якорь = CHARSET_RE.search(текст) or HEAD_RE.search(текст)
    if якорь is None:
        отчёт['статус'] = 'СТРАХОВКА'
        отчёт['заметка'] = 'не найдены ни charset-мета, ни <head> — вставлять некуда'
        return отчёт
    текст = текст[:якорь.end()] + '\n' + мета + текст[якорь.end():]

    if текст == исходник:
        отчёт['статус'] = 'OK'
        отчёт['заметка'] = 'уже герметизирована (идемпотентно, без записи)'
        return отчёт

    путь.write_bytes(текст.encode('utf-8'))
    отчёт['статус'] = 'OK'
    отчёт['изменено'] = True
    return отчёт


# ── Отчёт и запуск ──────────────────────────────────────────────────────────────

def главное() -> int:
    парсер_арг = argparse.ArgumentParser(
        description='Герметик CSP дома СИНГУЛЯР: hash-CSP + speculation-rules prefetch.')
    парсер_арг.add_argument('--вставка-предчувствия', action='store_true',
                            help='вставить <script type="speculationrules" id="sg-предчувствие"> после charset')
    парсер_арг.add_argument('--репо', default=None,
                            help='корень репо (по умолчанию — родитель папки ИНСТРУМЕНТЫ)')
    арг = парсер_арг.parse_args()

    корень = Path(арг.репо).resolve() if арг.репо else Path(__file__).resolve().parent.parent
    страницы = sorted(p for p in корень.glob('*.html') if p.name not in БЕЗ_ВСЕГО)

    строки: list[dict] = []
    for путь in страницы:
        try:
            строки.append(герметизировать(путь, арг.вставка_предчувствия))
        except Exception as беда:  # noqa: BLE001 — ничего не должно валить весь прогон
            строки.append({'имя': путь.name, 'статус': 'СТРАХОВКА', 'скриптов': 0,
                           'хэшей': 0, 'двери': [], 'заметка': f'неожиданно: {беда}',
                           'изменено': False, 'предчувствие': False})

    # ── Таблица ──
    ш_имя = max(len('СТРАНИЦА'), max((len(r['имя']) for r in строки), default=0))
    ш_скр = len('СКРИПТОВ')
    ш_хэш = len('ХЭШЕЙ')
    ш_дв = max(len('CONNECT-SRC-НАДСТРОЙКИ'), max((len(', '.join(r['двери']) or '—') for r in строки), default=0))
    ш_ст = max(len('СТАТУС'), max((len(r['статус']) for r in строки), default=0))

    print('=' * (ш_имя + ш_скр + ш_хэш + ш_дв + ш_ст + 16))
    print(f"{'СТРАНИЦА':<{ш_имя}} | {'СКРИПТОВ':>{ш_скр}} | {'ХЭШЕЙ':>{ш_хэш}} | "
          f"{'CONNECT-SRC-НАДСТРОЙКИ':<{ш_дв}} | СТАТУС")
    print('-' * (ш_имя + ш_скр + ш_хэш + ш_дв + ш_ст + 16))
    for r in строки:
        двери = ', '.join(r['двери']) if r['двери'] else '—'
        печать = f"{r['имя']:<{ш_имя}} | {r['скриптов']:>{ш_скр}} | {r['хэшей']:>{ш_хэш}} | " \
                 f"{двери:<{ш_дв}} | {r['статус']}"
        print(печать)
        if r['заметка']:
            print(f"{'':<{ш_имя}} | {'':>{ш_скр}} | {'':>{ш_хэш}} | {'':<{ш_дв}} |   ↳ {r['заметка']}")

    # ── Суммарная статистика ──
    ок = [r for r in строки if r['статус'] == 'OK']
    страховки = [r for r in строки if r['статус'] == 'СТРАХОВКА']
    пропуски = [r for r in строки if r['статус'] == 'ПРОПУСК']
    вставлено = sum(1 for r in строки if r['предчувствие'])
    правок = sum(1 for r in строки if r['изменено'])
    всего_хэшей = sum(r['хэшей'] for r in ок)
    доля = (len(ок) + len(пропуски)) / len(строки) if строки else 1.0

    print('-' * (ш_имя + ш_скр + ш_хэш + ш_дв + ш_ст + 16))
    print(f'ИТОГО: страниц {len(строки)} | OK {len(ок)} | страховок {len(страховки)} | '
          f'пропусков {len(пропуски)} | записано {правок}')
    print(f'Предчувствие вставлено: {вставлено} | inline-скриптов запечатано: '
          f'{sum(r["скриптов"] for r in ок)} | уникальных хэшей: {всего_хэшей}')
    if страховки:
        print('СТРАХОВКИ (без CSP — страница без CSP лучше сломанной):')
        for r in страховки:
            print(f'  • {r["имя"]} — {r["заметка"]}')
    print(f'Доля честно обработанных: {доля:.0%} (порог 80%) | корень: {корень}')

    return 0 if доля >= 0.8 else 1


if __name__ == '__main__':
    sys.exit(главное())
