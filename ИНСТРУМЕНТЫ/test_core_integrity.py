#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Тест целостности синтеза v1.21: provenance-практика (AD-S3).
1) Отпечаток ядра: SHA-256 трёх нормативных файлов сходится с
   БИБЛИОТЕКИ/кристалл/ЯДРО_SHA256SUMS.txt — подмена ядра = провал.
2) Ненормативные надстройки (bridges, крипта) НЕ входят в отпечаток —
   они меняются честно, ядро — никогда.
3) ГОТОВНОСТЬ.manifest.json: валидный JSON, три списка непусты,
   core_normative.files существуют, версия согласована со сборкой.
Запуск: python3 ИНСТРУМЕНТЫ/test_core_integrity.py"""
import hashlib
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

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

print('Часть 1 — отпечаток нормативного ядра')
путь_сум = os.path.join(ROOT, 'БИБЛИОТЕКИ', 'кристалл', 'ЯДРО_SHA256SUMS.txt')
ок('ЯДРО_SHA256SUMS.txt существует', os.path.isfile(путь_сум))
строки = [с for с in open(путь_сум, encoding='utf-8').read().splitlines() if с.strip()]
ок('в отпечатке ровно 3 нормативных файла', len(строки) == 3)
для_сверки = {}
for с in строки:
    хэш, имя = с.split(None, 1)
    имя = имя.strip()
    для_сверки[имя] = хэш
    файл = os.path.join(ROOT, 'БИБЛИОТЕКИ', 'кристалл', имя)
    факт = hashlib.sha256(open(файл, 'rb').read()).hexdigest()
    ок('ядро %s не подменено' % имя, факт == хэш)
ядерные = {'crystal-core.mjs', 'journal.mjs', 'semantic-event.schema.json'}
ок('в отпечатке именно нормативная тройка', set(для_сверки) == ядерные)
ок('надстройки НЕ в отпечатке (меняются честно)',
   'bridges.mjs' not in для_сверки and 'крипта.mjs' not in для_сверки)

print('Часть 2 — ГОТОВНОСТЬ.manifest.json')
манифест = json.load(open(os.path.join(ROOT, 'ГОТОВНОСТЬ.manifest.json'), encoding='utf-8'))
ок('манифест валидный JSON с именем singulyar-gotovnost',
   манифест.get('name') == 'singulyar-gotovnost')
ок('production_ready непустой (%d)' % len(манифест.get('production_ready', [])),
   len(манифест.get('production_ready', [])) >= 5)
ок('prototype_only непустой (%d)' % len(манифест.get('prototype_only', [])),
   len(манифест.get('prototype_only', [])) >= 3)
ок('known_nonproduction непустой (%d) — честно' % len(манифест.get('known_nonproduction', [])),
   len(манифест.get('known_nonproduction', [])) >= 5)
ок('щели из аудита ПРОЕКТ.txt приняты (форвард-секретность, backup, attestation)',
   any('форвард' in с for с in манифест['known_nonproduction'])
   and any('backup' in с for с in манифест['known_nonproduction'])
   and any('attestation' in с for с in манифест['known_nonproduction']))
с_блок = манифест.get('синтез') or манифест.get('синтез_v2') or манифест.get('синтез_v1_2_1') or {}
ок('синтез зафиксирован: принято/не принято (v1.21 и/или v2)',
   'принято' in с_блок and 'не принято' in с_блок
   and ('принято' in манифест.get('синтез_v2', {}) and 'не принято' in манифест.get('синтез_v2', {})))
для_файлов = манифест.get('core_normative', {}).get('files', [])
ок('core_normative.files = нормативная тройка', set(для_файлов) == ядерные)
for имя in для_файлов:
    ок('файл ядра существует: %s' % имя,
       os.path.isfile(os.path.join(ROOT, 'БИБЛИОТЕКИ', 'кристалл', имя)))

print('Часть 3 — согласованность версий')
индекс = open('index.html', encoding='utf-8').read()
# такты v1.33+ держат сборку в машиночитаемом маркере <meta name="sng-build">
м_версия = re.search(r'sng-build" content="v([\d.]+)', индекс) or re.search(r'сборка (v[\d.]+)', индекс)
ок('версия манифеста согласована со сборкой index.html (маркер sng-build)',
   м_версия is not None and манифест.get('version') == м_версия.group(1).lstrip('v'))

print('\nИТОГ: %d/%d прошло' % (прошло, прошло + len(провалы)))
sys.exit(1 if провалы else 0)
