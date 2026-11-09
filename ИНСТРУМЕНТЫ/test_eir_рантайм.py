#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
test_eir_рантайм.py — страж рантайма-намерений (латка С140, RUM23-9).
Гоняет собственные 40 тестов пакета БИБЛИОТЕКИ/рантайм-намерений (unittest, stdlib)
и демо ядра; проверяет целостность ключевых файлов пакета. Детерминированный, без сети.
Запуск из корня дома: python3 ИНСТРУМЕНТЫ/test_eir_рантайм.py
"""
import os
import subprocess
import sys

T = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ПАКЕТ = os.path.join(T, 'БИБЛИОТЕКИ', 'рантайм-намерений')
ок = 0


def проверь(что, да):
    global ок
    assert да, 'НЕ СОШЛОСЬ: ' + что
    ок += 1
    print('  ok ·', что)


проверь('пакет на месте (БИБЛИОТЕКИ/рантайм-намерений)', os.path.isdir(ПАКЕТ))
для_проверки = ['src/singulyar_runtime.py', 'src/sqlite_ledger.py', 'src/schema_validate.py',
                'schemas/intent.schema.json', 'schemas/capability.schema.json',
                'schemas/evidence.schema.json', 'tests/test_runtime.py',
                'tests/test_durability.py', 'experiments/ablation.py',
                'docs/AUDIT_POLYMATH.md', 'docs/RUNBOOK_HARDENED.md', 'docs/LIMITATIONS.md',
                'prototype/index.html', 'prototype/replay_data.js',
                'scripts/check.py', 'README_ДОМ.md']
for ф in для_проверки:
    проверь('файл пакета: ' + ф, os.path.isfile(os.path.join(ПАКЕТ, ф)))

# 40 тестов ядра (включая реальную смерть процесса между эффектом и записью)
р = subprocess.run([sys.executable, '-m', 'unittest', 'discover', '-s', 'tests'],
                   cwd=ПАКЕТ, capture_output=True, text=True, timeout=300)
проверь('тесты ядра зелёные (unittest discover)', р.returncode == 0)
вывод = (р.stdout + р.stderr)
проверь('в ядре 40 тестов', 'Ran 40 tests' in вывод)

# демо ядра: failover / сбой после эффекта / честный UNKNOWN
р = subprocess.run([sys.executable, 'src/demo.py'], cwd=ПАКЕТ,
                   capture_output=True, text=True, timeout=120)
проверь('демо ядра зелёное', р.returncode == 0)
проверь('демо знает честный UNKNOWN', 'UNKNOWN' in (р.stdout + р.stderr))

# оригиналы Polymath OS в доме
for ф in ['ДОКУМЕНТЫ/POLYMATH_OS/RUNBOOK_оригинал.md',
          'ДОКУМЕНТЫ/POLYMATH_OS/Polymath-OS-Report.pdf']:
    проверь('оригинал Polymath OS: ' + ф, os.path.isfile(os.path.join(T, ф)))

print(f'РАНТАЙМ-НАМЕРЕНИЙ (EIR v0.3.0): {ок} проверок сошлось')
