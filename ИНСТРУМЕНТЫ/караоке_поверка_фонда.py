#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""v11.10 «ПОВЕРКА ФОНДА» — перемер осей КАРАОКЕ против mp3 фонда дома, который реально играет.

Как работает:
 1. Беру каждую ось КАРАОКЕ/<id>.js и её носитель: голос/<id>.mp3 → чистый-минус/<id>.mp3
    (9ys_TVEtda8 — prosto-lubi.mp3; Qb8xb0vUYDg — сборник-цепь, пропускаем честно).
 2. faster-whisper tiny int8 beam5, пословные тайминги по ВСЕЙ песне.
 3. Нидлман–Вунш (лента ±45 с, порог 0.6, гэп −0.45 — как измерял дом) ось ↔ whisper.
 4. Строку оси переписываю ТОЛЬКО если есть ≥2 надёжных пары (s≥0.6) ИЛИ ≥1 пара s≥0.85
    с явным сдвигом |Δa|>0.5; и если |новый a − старый a| > 0.15 с. Остальное не трогаю.
 5. Слова: совпавшие — времена whisper; непопавшие — интерполяция между соседями.
 6. Перезаписываю файл хирургически: новая шапка + исходный байт-код с новым массивом cues;
    lyr (150 языков) не трогаю вообще.
Отчёт: /tmp/sync/report.json + таблица в stdout.
"""
import os, re, json, sys, time, statistics, urllib.request

REPO = '/home/z/my-project/download/singulyar'
AXDIR = os.path.join(REPO, 'КАРАОКЕ')
FOND = '/tmp/sync/fond'
BASE = 'https://raw.githubusercontent.com/rtynbirf/singulyar/minus-fond/minus/'
GOLOS = BASE + '%D0%B3%D0%BE%D0%BB%D0%BE%D1%81/'
CHIST = BASE + '%D1%87%D0%B8%D1%81%D1%82%D1%8B%D0%B9-%D0%BC%D0%B8%D0%BD%D1%83%D1%81/'
REPORT = {'songs': [], 'started': time.strftime('%Y-%m-%d %H:%M:%S')}

def norm(x):
    return re.sub(r'[^а-яёa-z0-9]', '', (x or '').lower())

def lev_ratio(a, b):
    if not a or not b:
        return 0.0
    la, lb = len(a), len(b)
    if abs(la - lb) > max(la, lb) * 0.7:
        return 0.0
    d = list(range(lb + 1))
    for i in range(1, la + 1):
        prev, d[0] = d[0], i
        for j in range(1, lb + 1):
            cur = d[j]
            d[j] = min(d[j] + 1, d[j - 1] + 1, prev + (0 if a[i - 1] == b[j - 1] else 1))
            prev = cur
    return 1 - d[lb] / max(la, lb)

def parse_axis_full(path):
    s = open(path, encoding='utf-8').read()
    m = re.search(r'КАРАОКЕ_КОРПУС\["([^"]+)"\]=(\{.*\});\s*$', s, re.S)
    if not m:
        return None, None, s
    body = m.group(2)
    ci = body.find('"cues"')
    a0 = body.find('[', ci)
    # честный поиск закрывающей скобки массива cues (без предположений о том, что дальше)
    depth = 0
    end = None
    for k in range(a0, len(body)):
        ch = body[k]
        if ch == '[':
            depth += 1
        elif ch == ']':
            depth -= 1
            if depth == 0:
                end = k
                break
    if end is None:
        return None, None, s
    cues = json.loads(body[a0:end + 1])
    return m.group(1), cues, s

def axis_words(cues):
    """Конвенция дома (·01 axisParse): слот w[i] отвечает СЫРОМУ индексу токена,
    маркеры ♪/> занимают свой слот. Матчим только слова, ключ — сырвой индекс ri."""
    AM = re.compile(r'^[\u266A\u266B>]+$')
    out = []  # (cue_idx, raw_token_idx, t0, t1, text)
    for ci, c in enumerate(cues):
        toks = [t for t in re.split(r'\s+', c.get('t', '')) if t]
        ws = c.get('w') or []
        for ri, tok in enumerate(toks):
            if AM.match(tok):
                continue
            p = ws[ri] if ri < len(ws) else None
            t0 = float(p[0]) if p and p[0] is not None else None
            t1 = float(p[1]) if p and p[1] is not None else None
            out.append((ci, ri, t0, t1, norm(tok)))
    return out

def nw_pairs(axw, asrw, band=45.0, thr=0.6, gap=-0.45):
    n, m2 = len(axw), len(asrw)
    if not n or not m2:
        return []
    # лента: для каждого слова оси диапазон j по времени
    starts = [w[0] for w in asrw]
    import bisect
    rows = []
    for (ci, wi, t0, t1, tx) in axw:
        lo = bisect.bisect_left(starts, (t0 if t0 is not None else -1) - band)
        hi = bisect.bisect_right(starts, (t0 if t0 is not None else 1e9) + band)
        rows.append((max(0, lo - 5), min(m2, hi + 5)))
    F = [[0.0] * (m2 + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        F[i][0] = gap * i
    for j in range(1, m2 + 1):
        F[0][j] = gap * j
    for i in range(1, n + 1):
        ax_t = axw[i - 1][2]
        tx = axw[i - 1][4]
        Fi, Fp, (lo, hi) = F[i], F[i - 1], rows[i - 1]
        for j in range(1, m2 + 1):
            if j < lo or j >= hi or not tx:
                Fi[j] = max(Fp[j] + gap, Fi[j - 1] + gap)
                continue
            s = lev_ratio(tx, asrw[j - 1][2])
            s = s if s >= thr else (s - thr) * 0.5
            Fi[j] = max(Fp[j - 1] + s, Fp[j] + gap, Fi[j - 1] + gap)
    pairs = []
    i, j = n, m2
    while i > 0 and j > 0:
        tx = axw[i - 1][4]
        lo, hi = rows[i - 1]
        if j >= lo and j < hi and tx:
            s = lev_ratio(tx, asrw[j - 1][2])
            s = s if s >= thr else (s - thr) * 0.5
        else:
            s = None
        if s is not None and abs(F[i - 1][j - 1] + s - F[i][j]) < 1e-9:
            if s >= thr:
                pairs.append((i - 1, j - 1, s))
            i, j = i - 1, j - 1
        elif abs(F[i - 1][j] + gap - F[i][j]) < 1e-9:
            i -= 1
        else:
            j -= 1
    return pairs

def decode16k(path):
    import numpy as np, av
    with av.open(path) as c:
        st = c.streams.audio[0]
        mono = []
        for f in c.decode(st):
            a = f.to_ndarray()
            mono.append(a.mean(axis=0) if a.ndim > 1 else a)
        sig = np.concatenate(mono)
        sr = st.rate
    if sr != 16000:
        n = int(round(len(sig) * 16000 / sr))
        sig = np.interp(np.linspace(0, len(sig) - 1, n), np.arange(len(sig)), sig)
    return sig.astype(np.float32)

def fond_for(aid):
    if aid == 'Qb8xb0vUYDg':
        return None
    if aid == '9ys_TVEtda8':
        return [('prosto-lubi.mp3', BASE + 'prosto-lubi.mp3')]
    return [('голос/%s.mp3' % aid, GOLOS + aid + '.mp3'),
            ('чистый-минус/%s.mp3' % aid, CHIST + aid + '.mp3')]

def get_fond(aid):
    os.makedirs(FOND, exist_ok=True)
    local = os.path.join(FOND, aid + '.mp3')
    if os.path.exists(local) and os.path.getsize(local) > 100000:
        return local, 'кэш'
    chain = fond_for(aid)
    if chain is None:
        return None, 'сборник-цепь'
    for name, url in chain:
        if url is None:
            return None, 'сборник-цепь'
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'curl/8'})
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
            if len(data) > 100000:
                open(local, 'wb').write(data)
                return local, name
        except Exception as e:
            continue
    return None, 'фонд недоступен'

def main():
    only = set(sys.argv[1:]) or None
    from faster_whisper import WhisperModel
    model = WhisperModel('tiny', device='cpu', compute_type='int8', cpu_threads=2)
    files = sorted(f for f in os.listdir(AXDIR) if f.endswith('.js'))
    print('осей:', len(files))
    for fn in files:
        path = os.path.join(AXDIR, fn)
        aid, cues, src = parse_axis_full(path)
        if not aid:
            print('SKIP (нет корпуса):', fn)
            continue
        if src.startswith('/* v11.10'):
            print('%-18s SKIP уже перемерена (v11.10)' % aid)
            continue
        if only and aid not in only:
            continue
        entry = {'id': aid, 'file': fn}
        mp3, how = get_fond(aid)
        if not mp3:
            entry['status'] = 'skip: ' + how
            REPORT['songs'].append(entry)
            print('%-18s SKIP %s' % (aid, how))
            continue
        entry['fond'] = how
        sig = decode16k(mp3)
        segs, info = model.transcribe(sig, language='ru', word_timestamps=True, beam_size=5, vad_filter=False)
        asrw = []
        for seg in segs:
            for w in (seg.words or []):
                t = norm(w.word)
                if t:
                    asrw.append((float(w.start), float(w.end), t))
        axw = axis_words(cues)
        pairs = nw_pairs(axw, asrw)
        # пары по строкам
        byc = {}
        for (i, j, s) in pairs:
            byc.setdefault(axw[i][0], []).append((axw[i], asrw[j], s))
        old_as = [c['a'] for c in cues]
        changed, kept, weak = 0, 0, 0
        new_cues = [dict(c) for c in cues]
        for ci, c in enumerate(cues):
            mp = byc.get(ci, [])
            if not mp:
                weak += 1
                continue
            solid = [(aw, rw, s) for (aw, rw, s) in mp if s >= 0.6]
            big = [(aw, rw, s) for (aw, rw, s) in mp if s >= 0.85]
            na = min(rw[0] for (_, rw, _) in solid) if solid else (min(rw[0] for (_, rw, _) in big) if big else None)
            ok = (len(solid) >= 2 and na is not None) or (big and abs(min(r[0] for _, r, _ in big) - c['a']) > 0.5)
            if not ok or na is None or abs(na - c['a']) <= 0.15:
                kept += 1
                continue
            ends = [rw[1] for (_, rw, _) in solid] or [rw[1] for (_, rw, _) in big]
            nb = max(ends) + 0.25
            nb = max(nb, na + 0.6)
            # слова: слот на КАЖДЫЙ сырой токен (конвенция дома); маркер ♪ — свой слот
            AM = re.compile(r'^[\u266A\u266B>]+$')
            toks = [t for t in re.split(r'\s+', c.get('t', '')) if t]
            matched = {}
            for aw, rw, s in (solid or big):
                matched[aw[1]] = (rw[0], rw[1])
            nw2 = []
            prev_e = na
            for ri, tok in enumerate(toks):
                if AM.match(tok):
                    # маркер: крошечный слот у входа голоса, как в оригиналах дома
                    nxt = next((matched[x][0] for x in range(ri + 1, len(toks)) if x in matched), na + 0.07)
                    nw2.append([round(na, 3), round(min(na + 0.07, max(na, nxt)), 3)])
                    continue
                if ri in matched:
                    prev_e = matched[ri][1]
                    nw2.append([round(matched[ri][0], 3), round(matched[ri][1], 3)])
                else:
                    nxt = next((matched[x][0] for x in range(ri + 1, len(toks)) if x in matched), nb - 0.05)
                    nw2.append([round(prev_e, 3), round(max(prev_e, nxt), 3)])
            nc = dict(c)
            nc['a'] = round(na, 3)
            nc['b'] = round(nb, 3)
            if nw2:
                nc['w'] = nw2
            new_cues[ci] = nc
            changed += 1
        # монотонность
        for k in range(len(new_cues) - 1):
            if new_cues[k]['b'] > new_cues[k + 1]['a'] and new_cues[k]['a'] < new_cues[k + 1]['a']:
                new_cues[k]['b'] = round(new_cues[k + 1]['a'], 3)
            if new_cues[k]['b'] <= new_cues[k]['a']:
                new_cues[k]['b'] = round(new_cues[k]['a'] + 0.6, 3)
        entry.update({'whisper_words': len(asrw), 'axis_words': len(axw), 'pairs': len(pairs),
                      'cues': len(cues), 'changed': changed, 'kept': kept, 'no_match': weak})
        if changed:
            ci0 = src.find('"cues"')
            arr0 = src.find('[', ci0)
            depth, end0 = 0, None
            for k in range(arr0, len(src)):
                ch = src[k]
                if ch == '[':
                    depth += 1
                elif ch == ']':
                    depth -= 1
                    if depth == 0:
                        end0 = k
                        break
            head_note = ('/* v11.10 «ПОВЕРКА ФОНДА»: ось перемерена «от голоса» против минус-фонда дома '
                         '(faster-whisper tiny int8 beam5, Нидлман–Вунш 0.6/−0.45; носитель %s; '
                         'строк правлено %d из %d, оставлено %d — расхождение ≤0,15 с) */\n' % (how, changed, len(cues), kept))
            new_arr = json.dumps(new_cues, ensure_ascii=False, separators=(',', ':'))
            # всё после массива cues (lyr, dur, хвост) остаётся байт-в-байт
            out = src[:arr0] + new_arr + src[end0 + 1:]
            open(path, 'w', encoding='utf-8').write(head_note + out)
        REPORT['songs'].append(entry)
        print('%-18s %-34s пар=%3d строк=%3d правок=%3d оставлено=%2d нет-пар=%2d' % (
            aid, how, len(pairs), len(cues), changed, kept, weak))
    REPORT['finished'] = time.strftime('%Y-%m-%d %H:%M:%S')
    json.dump(REPORT, open('/tmp/sync/report.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('\nотчёт: /tmp/sync/report.json')

if __name__ == '__main__':
    main()
