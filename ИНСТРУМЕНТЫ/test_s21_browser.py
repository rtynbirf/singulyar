#!/usr/bin/env python3
# Браузерный тест ·21 ОБЩЕНИЕ: загрузка модуля, отрисовка людей без innerHTML,
# отправка сообщения и разбор представлений (текст/брайль/речь), персонализация
# голоса (профили, ползунки, сохранение в localStorage), честные статусы,
# сброс, отсутствие JSON-дампа состояния, 0 ошибок консоли.
# Запуск: python3 ИНСТРУМЕНТЫ/test_s21_browser.py   (пути считаются от файла — из любого клона репо)
import subprocess, time, sys, os
from playwright.sync_api import sync_playwright

РЕПО = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # корень репо
PORT = int(os.environ.get('S21_PORT', '8925'))
URL = f'http://127.0.0.1:{PORT}/СИНГУЛЯР_21_ОБЩЕНИЕ.html'

прошло = []
упало = []
def ок(name, cond, extra=''):
    (прошло if cond else упало).append(name)
    print(('  ✓ ' if cond else '  ✗ FAIL: ') + name + (('' if cond else ' | ' + str(extra))))

def http_serve():
    subprocess.run(['node', os.path.join(РЕПО, 'ИНСТРУМЕНТЫ', 'serve_repo.mjs'), str(PORT), РЕПО],
                   capture_output=True)

import threading
t = threading.Thread(target=http_serve, daemon=True)
t.start()
time.sleep(1.2)

СТРЕЛОЧКИ = 'Человек А'

with sync_playwright() as p:
    browser = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    ctx = browser.new_context()
    ошибки = []
    A = ctx.new_page()
    A.on('console', lambda m: ошибки.append(m.text) if m.type == 'error' else None)
    A.on('pageerror', lambda e: ошибки.append(str(e)))

    print('— ЗАГРУЗКА')
    A.goto(URL)
    A.wait_for_selector('#people .person', timeout=10000)
    ок('модуль загрузился, люди отрисованы', True)
    ок('заголовок чёткий', 'ОБЩЕНИЕ' in A.title())
    ок('бейдж без классификации человека', 'без классификации человека' in A.text_content('.badge'))
    ок('JSON-дамп состояния отсутствует', A.query_selector('#state') is None)

    print('— ЛЮДИ И ОБОЗНАЧЕНИЯ')
    txt = A.text_content('#people')
    for имя in ['Человек А', 'Человек Б', 'Человек В']:
        ок('участник обозначен: ' + имя, имя in txt)
    ок('принимает/выводит подписаны по-русски', 'Принимает:' in txt and 'Выводит:' in txt)
    ок('голос подписан по-русски', 'Голос: ' in txt and 'любой' in txt and 'женский' in txt)
    ок('нет сырых кодов any/female в отрисовке', 'OUT:' not in txt and 'IN:' not in txt)

    print('— СООБЩЕНИЕ И МАРШРУТЫ')
    A.select_option('#msgFrom', 'person-a')
    A.select_option('#msgTo', 'person-b')
    A.fill('#msgText', '')
    A.click('#btnSend')
    ок('пустое сообщение не отправляется', 'Смысл не задан' in A.text_content('#sendStatus'))
    A.select_option('#msgTo', 'person-a')
    A.fill('#msgText', 'тест')
    A.click('#btnSend')
    ок('совпадение отправителя и получателя отслежено', 'совпадают' in A.text_content('#sendStatus'))
    A.select_option('#msgTo', 'person-b')
    A.fill('#msgText', 'hello')
    A.click('#btnSend')
    статус = A.text_content('#sendStatus')
    ок('статус честный: создано и показано', 'создано и показано' in статус and 'Человек Б' in статус)
    ок('каналы перечислены по-русски', 'Текст' in статус and 'Брайль' in статус and 'Речь' in статус)
    журнал = A.text_content('#log')
    ок('журнал: кто → кому', 'Человек А → Человек Б' in журнал)
    ок('журнал: брайль отрисован', '⠓⠑⠇⠇⠕' in журнал)
    ок('журнал: состояние по-русски', 'показано ·' in журнал)
    ок('журнал: речь помечена голосом получателя', 'голосом получателя' in журнал)
    ок('aria-регион озвучила сообщение', 'hello' in (A.text_content('#aria') or ''))
    первая = A.inner_text('#log .msg .meta')
    ок('штамп времени есть', '·' in первая)

    print('— ГОЛОС: ЛИЧНАЯ НАСТРОЙКА')
    A.select_option('#voicePerson', 'person-b')
    A.wait_for_timeout(150)
    ок('форма голоса загрузила профиль Б', A.input_value('#voicePreset') == 'pleasant')
    ок('пожелание Б — женский', A.input_value('#voicePreference') == 'female')
    список = A.text_content('#voiceStatus')
    ок('честный статус голосов', ('Голосов на устройстве' in список) or ('не загрузились' in список))
    A.select_option('#voicePreset', 'slow')
    A.wait_for_timeout(150)
    ок('профиль «медленный» применил темп', abs(float(A.input_value('#voiceRate')) - 0.75) < 0.001)
    ок('вывод темпа обновился', A.text_content('#rateOut') == '0.75')
    статус2 = A.text_content('#voiceStatus')
    ок('профиль подтвердил применение', 'Профиль применён' in статус2)
    A.select_option('#voicePreset', 'custom')
    A.fill('#voiceRate', '1.5')
    A.dispatch_event('#voiceRate', 'input')
    A.wait_for_timeout(150)
    ок('свои настройки: ползунок оставляет «Мои настройки»', A.input_value('#voicePreset') == 'custom')
    ок('сохранение в localStorage', '1.5' in A.evaluate("localStorage.getItem('singulyar.human.communication.v2')"))

    print('— ПЕРСОНАЛИЗАЦИЯ ПЕРЕЖИВАЕТ ПЕРЕЗАГРУЗКУ')
    B = ctx.new_page()
    B.on('pageerror', lambda e: ошибки.append(str(e)))
    B.goto(URL)
    B.wait_for_selector('#people .person', timeout=10000)
    B.select_option('#voicePerson', 'person-b')
    B.wait_for_timeout(150)
    ок('темп Б после перезагрузки — 1.5', abs(float(B.input_value('#voiceRate')) - 1.5) < 0.001)
    B.close()

    print('— СБРОС')
    A.click('#btnReset')
    A.wait_for_timeout(150)
    ок('журнал очищен', 'Сообщений пока нет' in A.text_content('#log'))
    ок('темп Б вернулся к профилю примера', abs(float(A.input_value('#voiceRate')) - 0.9) < 0.001)

    скрин = os.path.join(РЕПО, 'СКРИНШОТЫ', 'ОБЩЕНИЕ_21')
    os.makedirs(скрин, exist_ok=True)
    A.select_option('#voicePerson', 'person-b')
    A.wait_for_timeout(150)
    A.screenshot(path=os.path.join(скрин, 'обобщение_голова.png'), clip={'x': 0, 'y': 0, 'width': 1080, 'height': 240})
    A.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    A.wait_for_timeout(200)
    A.screenshot(path=os.path.join(скрин, 'принцип_и_границы.png'), full_page=False)

    ок('консоль без ошибок', len(ошибки) == 0, ошибки[:3])
    browser.close()

print(f'\nИТОГ: {len(прошло)}/{len(прошло) + len(упало)}')
if упало:
    print('УПАЛИ:', упало)
    sys.exit(1)
