#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""С184 «ЧИСТОВИК В ДОМ» — сборщик корпуса ·32 из чистовиков RUVSON (Фаза 3).

Закон дома (ruvson-lyrics, docs/KARAOKE_ТЗ §4): тексты каноничны, время —
производное. Якоря времени: измеренный словесный поток осей v11.07
(faster-whisper word ts), выравнивание — Нидлман–Вунш (порог 0.6, гэп −0.45 —
параметры дома), дыры — слоговые веса v10.91. Тайминги не выдумываются:
строки без якоря интерполируются между измеренными соседями и считаются в
отчёте отдельно.

Режимы:
  --снимок   : залить снимок чистовиков из клона ruvson-lyrics в
               ДАННЫЕ/ЧИСТОВИКИ/ и сверить sha256-пломбы registry.json
  --вшить 1  : пересобрать корпус ·32 + оси КАРАОКЕ/ + PACK15 ·15 по чистовикам
               (существующие песни; без чистовика — честно остаются ASR)
  --вшить 2  : добавить 4 недостающие песни RUVSON (№37/38/42/65) в корпус,
               оси и PACK15 (метки базовые karaoke/lrc, слова по слогам)
  --проверка : повторная сверка снимка + идемпотентность («двойной прогон
               байт-идентичен») без записи
Отчёт: ИНСТРУМЕНТЫ/ЧИСТОВИК_ОТЧЁТ.json
"""
import base64, difflib, gzip, hashlib, json, os, re, shutil, subprocess, sys

ДОМ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# путь клона ruvson-lyrics — вычисляется от себя (работает в любом клоне),
# переопределяется переменной окружения; литералов машины автора нет (С184, гейт Э-5.4)
КЛОН = os.environ.get('КЛОН_RUVSON_LYRICS') or os.path.join(os.path.dirname(ДОМ), 'repo-ruvson-lyrics')
СНИМОК = os.path.join(ДОМ, 'ДАННЫЕ', 'ЧИСТОВИКИ')
СЦЕНА = os.path.join(ДОМ, 'СИНГУЛЯР_32_СЦЕНА.html')
С15 = os.path.join(ДОМ, 'СИНГУЛЯР_15_ОРКЕСТРАТОР.html')
ОСИ = os.path.join(ДОМ, 'КАРАОКЕ')
ОТЧЁТ = os.path.join(ДОМ, 'ИНСТРУМЕНТЫ', 'ЧИСТОВИК_ОТЧЁТ.json')

ГЭП, НЕСОВП, ПОРОГ = -0.45, -0.30, 0.6
ДУБЛИ = {'t9h3cCPCKoo': 17}
ВНЕ_РЕЕСТРА = {'Qb8xb0vUYDg', 'VwoK5U0qOys', '2g5n6B0bc2Q'}
НОВЫЕ_Н = [37, 38, 42, 65]
ЯКОРЬ_КОРПУС = 'window.S32_КОРПУС = '

КЭШ = {}

def сход(a, b):
    if a == b:
        return 1.0
    k = (a, b) if a < b else (b, a)
    if k in КЭШ:
        return КЭШ[k]
    v = 0.0
    if min(len(a), len(b)) >= 3 and a[:3] == b[:3]:
        v = difflib.SequenceMatcher(None, a, b, autojunk=False).ratio()
    КЭШ[k] = v
    return v

def ток(w):
    return w.lower().strip('♪>».,!?;:«»()"\'—–-…')

def слоги(w):
    г = len(re.findall(r'[аеёиоуыэюя]', w.lower()))
    return г if г > 0 else 1

def нв(n, m, скора):
    """Нидлман–Вунш, параметры дома (0.6 / −0.45); возврат пар (i, j)"""
    if n == 0 or m == 0:
        return []
    D = [[0.0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        D[i][0] = D[i - 1][0] + ГЭП
    for j in range(1, m + 1):
        D[0][j] = D[0][j - 1] + ГЭП
    for i in range(1, n + 1):
        Dp, Di = D[i - 1], D[i]
        for j in range(1, m + 1):
            Di[j] = max(Dp[j - 1] + скора(i - 1, j - 1), Dp[j] + ГЭП, Di[j - 1] + ГЭП)
    пары, i, j = [], n, m
    while i > 0 and j > 0:
        с = D[i - 1][j - 1] + скора(i - 1, j - 1)
        if D[i][j] == с:
            пары.append((i - 1, j - 1)); i -= 1; j -= 1
        elif D[i][j] == D[i - 1][j] + ГЭП:
            i -= 1
        else:
            j -= 1
    пары.reverse()
    return пары

def разложить_лрс(путь, с_метками):
    текст, метки = [], []
    for ln in open(путь, encoding='utf-8'):
        ln = ln.rstrip('\n')
        if not ln.strip():
            continue
        if re.match(r'^\[([a-z]+):', ln, re.I):
            continue
        if с_метками:
            мм = re.match(r'^\[(\d+):(\d+(?:\.\d+)?)\](.*)$', ln)
            if мм:
                т = мм.group(3).strip()
                if т:
                    текст.append(т)
                    метки.append(round(int(мм.group(1)) * 60 + float(мм.group(2)), 2))
                continue
        текст.append(ln.strip())
    return текст, метки

def загрузить_реестр():
    рег = json.load(open(os.path.join(СНИМОК, 'registry.json'), encoding='utf-8'))
    return рег, {т['youtube']: т for т in рег['tracks']}, {т['num']: т for т in рег['tracks']}

def чистовик(н, по_н):
    т = по_н[н]
    строки, _ = разложить_лрс(os.path.join(СНИМОК, 'lyrics', os.path.basename(т['lrc'])), False)
    метки = []
    пм = os.path.join(СНИМОК, 'метки', 'n%02d.lrc' % н)
    if os.path.exists(пм):
        м_стр, метки = разложить_лрс(пм, True)
        assert м_стр == строки, 'n%02d: строки меток не равны чистовику' % н
    assert метки == [] or len(метки) == len(строки), 'n%02d: метки %d != строк %d' % (н, len(метки), len(строки))
    return строки, метки

def длительность_сек(s):
    ч = s.split(':')
    return int(ч[0]) * 60 + float(ч[1]) if len(ч) == 2 else float(s)

# ─── оси ───────────────────────────────────────────────────────────────────
def читать_ось(iд):
    п = os.path.join(ОСИ, iд + '.js')
    if not os.path.exists(п):
        return None, None, None
    t = open(п, encoding='utf-8').read()
    мм = re.search(r'КАРАОКЕ_КОРПУС\["' + re.escape(iд) + r'"\]\s*=\s*', t)
    if not мм:
        return None, None, None
    i = t.find('{', мм.end())
    dep, k, внутр, esc, ось = 0, None, False, False, None
    for x in range(i, len(t)):
        c = t[x]
        if внутр:
            if esc: esc = False
            elif c == '\\': esc = True
            elif c == '"': внутр = False
            continue
        if c == '"': внутр = True
        elif c == '{':
            if dep == 0: k = x
            dep += 1
        elif c == '}':
            dep -= 1
            if dep == 0:
                ось = json.loads(t[k:x + 1])
                return t[:мм.end()], ось, t[x + 1:].rstrip()
    return t[:мм.end()], None, None

def писать_ось(iд, шапка_старая, ось, пометка):
    шапка = (шапка_старая or '').rstrip('\n')
    шапка += '\n/* ' + пометка + ' */\n' if шапка else '/* ' + пометка + ' */\n'
    тело = 'window.КАРАОКЕ_КОРПУС=window.КАРАОКЕ_КОРПУС||{};\n'
    тело += 'window.КАРАОКЕ_КОРПУС["' + iд + '"]=' + json.dumps(ось, ensure_ascii=False, separators=(',', ':')) + ';\n'
    open(os.path.join(ОСИ, iд + '.js'), 'w', encoding='utf-8', newline='').write(шапка + тело)

# ─── корпус ·32 ────────────────────────────────────────────────────────────
def читать_корпус():
    t = open(СЦЕНА, encoding='utf-8').read()
    i = t.find(ЯКОРЬ_КОРПУС)
    assert i >= 0, 'якорь корпуса не найден'
    j = t.find(';\n</script>', i)
    assert j > i, 'хвост корпуса не найден'
    assert t.count(ЯКОРЬ_КОРПУС) == 1, 'якорь корпуса не уникален'
    return json.loads(t[i + len(ЯКОРЬ_КОРПУС):j]), t

def писать_корпус(корпус):
    t = open(СЦЕНА, encoding='utf-8').read()
    i = t.find(ЯКОРЬ_КОРПУС)
    j = t.find(';\n</script>', i)
    бл = ЯКОРЬ_КОРПУС + json.dumps(корпус, ensure_ascii=False, separators=(',', ':')) + ';\n</script>'
    t2 = t[:i] + бл + t[j + len(';\n</script>'):]
    open(СЦЕНА, 'w', encoding='utf-8', newline='').write(t2)

# ─── якоря трёх пород ──────────────────────────────────────────────────────
def якоря_из_оси(ось):
    стр = [str(c.get('t', '')) for c in ось['cues']]
    як_сл = []
    for c in ось['cues']:
        тк = str(c.get('t', '')).split()
        w = c.get('w') or []
        if len(w) == len(тк):
            як_сл.append([(float(a), float(b)) for (a, b) in w])
        else:
            як_сл.append([None] * len(тк))
    як_ст = [float(c['a']) for c in ось['cues']]
    return стр, як_сл, як_ст

def якоря_из_строк(строки):
    як_сл = [[None] * len(str(r[1]).split()) for r in строки]
    як_ст = [float(r[0]) for r in строки]
    return [str(r[1]) for r in строки], як_сл, як_ст

# ─── главный конструктор ───────────────────────────────────────────────────
def строить(чист_строки, аср_стр, аср_як_сл, аср_як_ст, lyr_старые, с_словами=True):
    """чист_строки — канон; аср_* — измеренный поток (строки/слова/старты).
    Возврат (строки_корпуса, cues_оси|None, lyr_новые, статистика)."""
    n_чист_сл = [(ток(w), л, п) for л, стр in enumerate(чист_строки) for п, w in enumerate(стр.split())]
    n_аср_сл = []
    for л, стр in enumerate(аср_стр):
        тк = стр.split()
        wс = аср_як_сл[л] if л < len(аср_як_сл) else []
        for п in range(len(тк)):
            s, e = wс[п] if п < len(wс) and wс[п] else (None, None)
            n_аср_сл.append((ток(тк[п]), л, п, s, e))

    def скора(i, j):
        return 1.0 if сход(n_чист_сл[i][0], n_аср_сл[j][0]) >= ПОРОГ else НЕСОВП

    пары = нв(len(n_чист_сл), len(n_аср_сл), скора)
    як_время = {}    # плоский индекс чиста -> (s, e)
    як_связь = {}    # плоский индекс чиста -> строка аср (для переводов)
    for (i, j) in пары:
        if сход(n_чист_сл[i][0], n_аср_сл[j][0]) >= ПОРОГ:
            _, л, п = n_чист_сл[i]
            _, ла, па, s, e = n_аср_сл[j]
            як_связь.setdefault(л, set()).add(ла)
            if s is not None:
                як_время[(л, п)] = (s, e)

    вес_стр = [sum(слоги(w) for w in стр.split()) or 1 for стр in чист_строки]
    t0 = [None] * len(чист_строки)
    як_кон = [None] * len(чист_строки)
    for л in range(len(чист_строки)):
        вр = [пара for (лл, п), пара in як_время.items() if лл == л]
        if вр:
            t0[л] = round(min(s for s, e in вр), 2)
            як_кон[л] = round(max(e for s, e in вр), 2)

    # интерполяция строк без якоря по слоговым весам между измеренными соседями
    i = 0
    while i < len(t0):
        if t0[i] is not None:
            i += 1
            continue
        j = i
        while j < len(t0) and t0[j] is None:
            j += 1
        лев = як_кон[i - 1] if i > 0 and як_кон[i - 1] is not None else (t0[i - 1] if i > 0 else None)
        пр = t0[j] if j < len(t0) else None
        if лев is None and пр is None:
            i = j
            continue
        if лев is None:
            лев = max(0.0, пр - вес_стр[j - 1] * 0.0 - sum(вес_стр[i:j]) * 0.42)
        if пр is None:
            пр = лев + sum(вес_стр[i:j]) * 0.42 + 4.0
        сумма = sum(вес_стр[i:j])
        кум = 0
        for k in range(i, j):
            кум += вес_стр[k]
            t0[k] = round(лев + (кум / сумма) * (пр - лев), 2)
        i = j
    for л in range(1, len(t0)):
        if t0[л] < t0[л - 1]:
            t0[л] = t0[л - 1]
    # следующая строка — конец окна текущей
    окно = [t0[к + 1] if к + 1 < len(t0) else t0[к] + 6.0 for к in range(len(t0))]

    слова_стр = [None] * len(чист_строки)
    дыры = як = 0
    for л in range(len(чист_строки)):
        ток_стр = чист_строки[л].split()
        w_стр = [як_время.get((л, п)) for п in range(len(ток_стр))]
        поз_як = [п for п, v in enumerate(w_стр) if v]
        б = окно[л]
        if not поз_як:
            if с_словами:
                если = распредели([ток_стр], t0[л], б)
                w_стр = [(с, е) for (с, е) in если[0]] if ток_стр else []
        else:
            if с_словами:
                бег = 0
                while бег < len(w_стр):
                    if бег < len(w_стр) and w_стр[бег]:
                        бег += 1
                        continue
                    к2 = бег
                    while к2 < len(w_стр) and not w_стр[к2]:
                        к2 += 1
                    лев = w_стр[бег - 1][1] if бег > 0 and w_стр[бег - 1] else t0[л]
                    пр = w_стр[к2][0] if к2 < len(w_стр) else max(б, лев + 0.5)
                    if пр <= лев:
                        пр = лев + 0.5
                    кус = [ток_стр[п] for п in range(бег, к2)]
                    если = распредели([кус], лев, пр)
                    для_офф = [(с, е) for (с, е) in если[0]]
                    for офф, пар in enumerate(для_офф):
                        w_стр[бег + офф] = (пар[0], пар[1])
                    бег = к2
        w_стр = [[round(s, 2), round(e, 2)] for (s, e) in w_стр if s is not None] if с_словами else []
        як += len(поз_як)
        дыры += len(ток_стр) - len(поз_як)
        слова_стр[л] = w_стр

    # переводы: строка чиста получает перевод аср-строк, которые её слова покрывают
    lyr_нов = {}
    if lyr_старые:
        for яз, список in lyr_старые.items():
            вых = []
            for л in range(len(чист_строки)):
                ку = як_связь.get(л) or set()
                куски = [str(список[к]) for к in sorted(ку) if к < len(список) and str(список[к]).strip()]
                вых.append(' '.join(куски))
            lyr_нов[яз] = вых

    строки_корпус = [[t0[л], чист_строки[л]] + ([[s, e] for (s, e) in слова_стр[л]] and [слова_стр[л]] if с_словами else []) for л in range(len(чист_строки))]
    cues = None
    if с_словами:
        cues = []
        for л in range(len(чист_строки)):
            b = round(окно[л], 2)
            if b <= t0[л]:
                b = round(t0[л] + 0.5, 2)
            cues.append({'a': t0[л], 'b': b, 't': чист_строки[л], 'w': слова_стр[л]})
    якорные_строки = len([1 for л in range(len(чист_строки)) if any((л, п) in як_время for п in range(len(чист_строки[л].split())))])
    статистика = {'строк_чистовик': len(чист_строки), 'строк_якорных': якорные_строки, 'слов_якорей': як, 'слов_дыр': дыры, 'переводов_пусто': len([1 for л in range(len(чист_строки)) if not (як_связь.get(л))]) if lyr_старые else 0}
    return строки_корпус, cues, lyr_нов, статистика

def распредели(группы, лев, пр):
    """дыры по слоговым весам v10.91 внутри [лев, пр]; группы = список строк токенов"""
    всего = sum(len(g) for g in группы)
    if всего == 0:
        return [[] for _ in группы]
    if пр <= лев:
        пр = лев + 0.5 * всего
    веса = [слоги(w) for g in группы for w in g]
    сумма = sum(веса) or всего
    шаги = []
    кум = 0
    for в in веса:
        с = лев + (кум / сумма) * (пр - лев)
        кум += в
        е = лев + (кум / сумма) * (пр - лев)
        шаги.append((round(с, 2), round(е, 2)))
    вых, к = [], 0
    for g in группы:
        вых.append(шаги[к:к + len(g)])
        к += len(g)
    return вых

# ─── PACK15 ────────────────────────────────────────────────────────────────
def читать_пак():
    t = open(С15, encoding='utf-8').read()
    м = re.search(r'window\.PACK15_B64="([^"]+)"', t)
    assert м, 'PACK15_B64 не найден'
    пак = json.loads(gzip.decompress(base64.b64decode(м.group(1))).decode('utf-8'))
    return пак, t, м

def писать_пак(пак, t, м):
    сы = json.dumps(пак, ensure_ascii=False, separators=(',', ':'))
    б64 = base64.b64encode(gzip.compress(сы.encode('utf-8'), 6)).decode('ascii')
    t2 = t[:м.start()] + 'window.PACK15_B64="' + б64 + '"' + t[м.end():]
    open(С15, 'w', encoding='utf-8', newline='').write(t2)

def пересобрать_яз(чист_строки, аср_стр, аср_як_ст):
    """строка→строка: [t, текст]; якорь — t старых строк"""
    н_чист = [' '.join(ток(w) for w in s.split()) for s in чист_строки]
    н_аср = [' '.join(ток(w) for w in s.split()) for s in аср_стр]

    def скора(i, j):
        return 1.0 if сход(н_чист[i], н_аср[j]) >= ПОРОГ else НЕСОВП

    пары = нв(len(н_чист), len(н_аср), скора)
    связ = {}
    for (i, j) in пары:
        if сход(н_чист[i], н_аср[j]) >= ПОРОГ:
            связ.setdefault(i, []).append(j)
    t0 = [None] * len(чист_строки)
    for i, js in связ.items():
        ts = [аср_як_ст[j] for j in js if j < len(аср_як_ст)]
        if ts:
            t0[i] = round(min(ts), 2)
    вес_стр = [sum(слоги(w) for w in s.split()) or 1 for s in чист_строки]
    i = 0
    while i < len(t0):
        if t0[i] is not None:
            i += 1
            continue
        j = i
        while j < len(t0) and t0[j] is None:
            j += 1
        як_лев = [аср_як_ст[л] for л in связ.get(i - 1, []) if л < len(аср_як_ст)] if i > 0 else []
        лев = min(як_лев) if як_лев else (t0[i - 1] if i > 0 else None)
        пр = t0[j] if j < len(t0) else None
        if лев is None and пр is None:
            i = j
            continue
        if лев is None:
            лев = max(0.0, пр - sum(вес_стр[i:j]) * 0.42)
        if пр is None:
            пр = лев + sum(вес_стр[i:j]) * 0.42 + 4.0
        сумма = sum(вес_стр[i:j]); кум = 0
        for k in range(i, j):
            кум += вес_стр[k]
            t0[k] = round(лев + (кум / сумма) * (пр - лев), 2)
        i = j
    for л in range(1, len(t0)):
        if t0[л] < t0[л - 1]:
            t0[л] = t0[л - 1]
    пусто = len([1 for i in range(len(чист_строки)) if not связ.get(i)])
    return [[t0[i], чист_строки[i]] for i in range(len(чист_строки))], связ, пусто

# ─── режимы ────────────────────────────────────────────────────────────────
def режим_снимок():
    assert os.path.isdir(КЛОН), 'клон ruvson-lyrics не найден: ' + КЛОН
    for д in ('lyrics', 'метки'):
        os.makedirs(os.path.join(СНИМОК, д), exist_ok=True)
    shutil.copy(os.path.join(КЛОН, 'data', 'lyrics', 'registry.json'), os.path.join(СНИМОК, 'registry.json'))
    n_л = n_м = 0
    for f in sorted(os.listdir(os.path.join(КЛОН, 'data', 'lyrics'))):
        if f.endswith('.lrc'):
            shutil.copy(os.path.join(КЛОН, 'data', 'lyrics', f), os.path.join(СНИМОК, 'lyrics', f))
            n_л += 1
    пк = os.path.join(КЛОН, 'karaoke', 'lrc')
    if os.path.isdir(пк):
        for f in sorted(os.listdir(пк)):
            if re.match(r'^n\d+\.lrc$', f):
                shutil.copy(os.path.join(пк, f), os.path.join(СНИМОК, 'метки', f))
                n_м += 1
    проверка_снимка()
    print('снимок: lyrics %d, метки %d, sha256-пломбы сверены' % (n_л, n_м))

def проверка_снимка():
    рег = json.load(open(os.path.join(СНИМОК, 'registry.json'), encoding='utf-8'))
    пл = 0
    for т in рег['tracks']:
        п = os.path.join(СНИМОК, 'lyrics', os.path.basename(т['lrc']))
        х = hashlib.sha256(open(п, 'rb').read()).hexdigest()
        assert х == т['sha256_lrc'], 'пломба лрс не сошлась: ' + т['lrc']
        пт = os.path.join(КЛОН, т['source_txt'])
        if os.path.exists(пт):
            х2 = hashlib.sha256(open(пт, 'rb').read()).hexdigest()
            assert х2 == т['sha256_txt'], 'пломба чистовика не сошлась: ' + т['source_txt']
        пл += 1
    print('sha256: %d пломб сошлись' % пл)

def мелкие_латки_с32(t):
    прав = [
        ('тексты — черновики распознавания (ASR), маркеры ♪ и &gt;&gt; — язык корпуса; смысловая редактура — Фаза 3.',
         'тексты — чистовики RUVSON (Фаза 3 выполнена С184: выравнивание к измеренному потоку осей), маркеры ♪/&gt;&gt; сняты.'),
        ('тексты всех песен вшиты (ASR-черновики, построчные тайминги)',
         'тексты всех песен вшиты (чистовики RUVSON, тайминги от измеренных якорей)'),
    ]
    для_п = []
    for ст, нов in прав:
        к = t.count(ст)
        assert к >= 1, 'якорь не найден: %s' % ст[:60]
        t = t.replace(ст, нов)
        для_п.append('%s×%d' % (ст[:40], к))
    return t, для_п

def вшить_этап1():
    рег, по_ют, по_н = загрузить_реестр()
    корпус, t = читать_корпус()
    пак, t15, м15 = читать_пак()
    отчёт = {'этап': 1, 'песни': {}, 'вне_чистовика': [], 'без_оси': []}
    for песня in корпус['songs']:
        iд = песня['id']
        if iд in ВНЕ_РЕЕСТРА:
            отчёт['вне_чистовика'].append(iд)
            continue
        т = по_ют.get(iд)
        н = т['num'] if т else ДУБЛИ.get(iд)
        if н is None:
            отчёт['вне_чистовика'].append(iд)
            continue
        чист, _ = чистовик(н, по_н)
        шапка, ось, хвост = читать_ось(iд)
        if ось:
            аср_стр, аср_як_сл, аср_як_ст = якоря_из_оси(ось)
            строки, cues, lyr, ст = строить(чист, аср_стр, аср_як_сл, аср_як_ст, ось.get('lyr'))
            песня['lines'] = строки
            песня['nlines'] = len(строки)
            песня['has_text'] = True
            писать_ось(iд, шапка, {'t': ось['t'], 'dur': ось['dur'], 'cues': cues, 'lyr': lyr},
                       'С184 «ЧИСТОВИК В ДОМ»: текст = чистовик ruvson-lyrics n%02d; якоря = измеренный поток v11.07; дыры — слоговые веса v10.91; строк без якоря: %d' % (н, ст['строк_чистовик'] - ст['строк_якорных']))
            ст['ось'] = True
        elif iд == '9ys_TVEtda8':
            аср_стр = [str(р[1]) for р in песня['lines']]
            аср_як_ст = [float(р[0]) for р in песня['lines']]
            строки, связ, пусто = пересобрать_яз(чист, аср_стр, аср_як_ст)
            песня['lines'] = строки
            песня['nlines'] = len(строки)
            ст = {'строк_чистовик': len(чист), 'строк_якорных': len(связ), 'слов_якорей': 0, 'слов_дыр': 0, 'переводов_пусто': 0, 'ось': False}
            отчёт['без_оси'].append(iд)
        else:
            отчёт['без_оси'].append(iд + ' (нет ни оси, ни строк — честно оставлено)')
            continue
        отчёт['песни'][iд] = ст
    # meta корпуса
    м = корпус['meta']
    м['version'] = '2.0.0'
    м['источник_текстов'] = 'ЧИСТОВИК ruvson-lyrics n01–n65 (снимок ДАННЫЕ/ЧИСТОВИКИ/, sha256-пломбы registry.json; №1–5 сверка на слух) — латка С184'
    м['выравнивание'] = 'слова чистовиков выровнены Нидлман–Вунш (порог 0.6, гэп −0.45) к измеренному словесному потоку осей v11.07; дыры — слоговые веса v10.91; строки без якоря — интерполяция между измеренными соседями (отчёт: ИНСТРУМЕНТЫ/ЧИСТОВИК_ОТЧЁТ.json)'
    м['честность'] = 'тексты — чистовики RUVSON (Фаза 3 выполнена С184); маркеры ♪/>> сняты; вне чистовика честно: ' + ', '.join(отчёт['вне_чистовика'])
    t, правки = мелкие_латки_с32(t)
    писать_корпус(корпус)
    # PACK15 ·15: ml.ru + языки + флагман
    ml, флаг = пак['ml'], пак['flag']
    по_н = {т['num']: т for т in рег['tracks']}
    по_ют15 = {т['youtube']: т for т in рег['tracks']}
    сч15 = 0
    for iд, языки in list(ml.items()):
        н = по_ют15.get(iд, {}).get('num') if по_ют15.get(iд) else ДУБЛИ.get(iд)
        if н is None or 'ru' not in языки:
            continue
        чист, _ = чистовик(н, по_н)
        аср_стр = [str(р[1]) for р in языки['ru']]
        аср_як_ст = [float(р[0]) for р in языки['ru']]
        ru_нов, связ, пусто = пересобрать_яз(чист, аср_стр, аср_як_ст)
        языки['ru'] = ru_нов
        for яз, список in языки.items():
            if яз == 'ru' or not isinstance(список, list):
                continue
            вых = []
            for i in range(len(чист)):
                ку = связ.get(i) or []
                куски = [str(список[j]) if isinstance(список[j], str) else str(список[j][1]) for j in ку if j < len(список)]
                вых.append(' '.join(куски))
            языки[яз] = вых
        сч15 += 1
    if флаг.get('id') in по_ют15 or флаг.get('id'):
        iд_ф = флаг.get('id')
        н = по_ют15.get(iд_ф, {}).get('num') or ДУБЛИ.get(iд_ф) or 64
        чист, _ = чистовик(н, по_н)
        аср_стр = [str(р[1]) for р in флаг['ru']]
        аср_як_ст = [float(р[0]) for р in флаг['ru']]
        флаг['ru'], _, _ = пересобрать_яз(чист, аср_стр, аср_як_ст)
    писать_пак(пак, t15, м15)
    отчёт['pack15_песен'] = сч15
    json.dump(отчёт, open(ОТЧЁТ, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('этап 1: пересобрано %d песен корпуса (вне чистовика: %s), pack15: %d' % (len(отчёт['песни']), ','.join(отчёт['вне_чистовика']) or '—', сч15))

def вшить_этап2():
    рег, по_ют, по_н = загрузить_реестр()
    корпус, t = читать_корпус()
    пак, t15, м15 = читать_пак()
    есть = {s['id'] for s in корпус['songs']}
    отчёт = json.load(open(ОТЧЁТ, encoding='utf-8')) if os.path.exists(ОТЧЁТ) else {'этап': 2, 'песни': {}}
    отчёт['этап'] = 2
    добавлено = []
    for н in НОВЫЕ_Н:
        т = по_н[н]
        iд = т['youtube']
        if iд in есть:
            continue
        чист, метки = чистовик(н, по_н)
        assert метки, 'n%02d: базовых меток нет' % н
        # текст = метки 1:1 (канон build_lrc.js) — строки строим напрямую, NW не нужен
        dur = длительность_сек(т['length'])
        строки, cues = [], []
        for л, текст in enumerate(чист):
            т0 = метки[л]
            б = round(метки[л + 1] if л + 1 < len(метки) else min(т0 + 6.0, dur), 2)
            if б <= т0:
                б = round(т0 + 0.5, 2)
            w = [[с, е] for (с, е) in распредели([текст.split()], т0, б)[0]]
            строки.append([т0, текст, w])
            cues.append({'a': т0, 'b': б, 't': текст, 'w': w})
        ст = {'строк_чистовик': len(чист), 'строк_якорных': len(чист), 'слов_якорей': 0, 'слов_дыр': sum(len(s.split()) for s in чист), 'переводов_пусто': 0}
        корпус['songs'].append({'id': iд, 'title': т['title'], 'has_text': True, 'published': True, 'lines': строки, 'nlines': len(строки)})
        шапка = None
        писать_ось(iд, шапка, {'t': т['title'], 'dur': dur, 'cues': cues, 'lyr': {}},
                   'С185 «РУВСОН ЦЕЛИКОМ»: песня n%02d вошла в дом; текст = чистовик; метки базовые build_lrc (karaoke/lrc), слова по слогам v10.91; переводов нет (честно)' % н)
        пак['cat'].append({'id': iд, 't': т['title'] + ' | RUVSON', 'd': dur, 'n': len(пак['cat']) + 1})
        пак['ml'][iд] = {'ru': [[r[0], r[1]] for r in строки]}
        добавлено.append('%02d %s (%s)' % (н, т['title'], iд))
        отчёт['песни'][iд] = ст
    писать_корпус(корпус)
    писать_пак(пак, t15, м15)
    отчёт['добавлено'] = добавлено
    json.dump(отчёт, open(ОТЧЁТ, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('этап 2: добавлено %d песен: %s' % (len(добавлено), '; '.join(добавлено)))

def самопроверка():
    корпус, _ = читать_корпус()
    стр = 0
    бит = 0
    for s in корпус['songs']:
        пред = 0
        for р in s['lines']:
            assert len(р) in (2, 3), 'форма строки: ' + s['id']
            стр += 1
            if len(р) == 3 and len(str(р[1]).split()) != len(р[2]):
                бит += 1
            assert isinstance(р[0], (int, float)), 'время не число: ' + s['id']
        for р, след in zip(s['lines'], s['lines'][1:]):
            assert р[0] <= след[0] + 0.01, 'монотонность: ' + s['id']
    print('самопроверка корпуса: песен %d, строк %d, битых слов %d' % (len(корпус['songs']), стр, бит))
    # оси: node --check каждого
    пл = 0
    for f in sorted(os.listdir(ОСИ)):
        if f.endswith('.js'):
            r = subprocess.run(['node', '--check', os.path.join(ОСИ, f)], capture_output=True, text=True)
            assert r.returncode == 0, 'ось не чиста: ' + f + ' ' + r.stderr[:200]
            пл += 1
    print('оси node --check: %d чисты' % пл)

if __name__ == '__main__':
    а = sys.argv[1:]
    if '--снимок' in а:
        режим_снимок()
    elif '--вшить' in а:
        этап = а[а.index('--вшить') + 1]
        проверка_снимка()
        (вшить_этап1 if этап == '1' else вшить_этап2)()
        самопроверка()
    elif '--проверка' in а:
        проверка_снимка()
        самопроверка()
        print('проверка: чисто')
    else:
        print(__doc__)
