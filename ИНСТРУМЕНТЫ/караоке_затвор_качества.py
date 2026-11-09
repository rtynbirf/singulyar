#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ЗАТВОР КАЧЕСТВА перемера (v11.10): строка остаётся на новом месте только если
ТЕКСТ строки реально звучит в новом окне (lev_ratio ≥ 0.5 против слов whisper).
Иначе строке возвращаются старые времена из git-версии. После — ремонт монотонности.
Запуск: python3 axis_gate.py id1 id2 ...  (mp3 — из кэша /tmp/sync/fond)"""
import sys, os, re, json, subprocess
import numpy as np, av
from faster_whisper import WhisperModel

# закон «инструкция без автора»: репо выводится из места самого инструмента,
# никакого пути машины автора (страж test_instruction_alone.py, п.4)
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def span(src):
    ci0 = src.find('"cues"')
    a0 = src.find('[', ci0)
    d, e = 0, None
    for k in range(a0, len(src)):
        if src[k] == '[':
            d += 1
        elif src[k] == ']':
            d -= 1
            if d == 0:
                e = k
                break
    return a0, e

def cues_of(txt):
    m = re.search(r'КАРАОКЕ_КОРПУС\["([^"]+)"\]=(\{.*\});\s*$', txt, re.S)
    if not m:
        return None
    body = m.group(2)
    a0, e = span(body)
    if e is None:
        return None
    return json.loads(body[a0:e + 1])

def norm(x):
    return re.sub(r'[^а-яёa-z0-9]', '', (x or '').lower())

MARK = re.compile(r'[\u266A\u266B>]+')

def lev_ratio(a, b):
    if not a or not b:
        return 0.0
    la, lb = len(a), len(b)
    d = list(range(lb + 1))
    for i in range(1, la + 1):
        prev, d[0] = d[0], i
        for j in range(1, lb + 1):
            cur = d[j]
            d[j] = min(d[j] + 1, d[j - 1] + 1, prev + (0 if a[i - 1] == b[j - 1] else 1))
            prev = cur
    return 1 - d[lb] / max(la, lb)

def main():
    ids = sys.argv[1:]
    model = WhisperModel('tiny', device='cpu', compute_type='int8', cpu_threads=2)
    for aid in ids:
        path = os.path.join(REPO, 'КАРАОКЕ', aid + '.js')
        if not os.path.exists(path):
            continue
        src = open(path, encoding='utf-8').read()
        if not src.startswith('/* v11.10'):
            continue
        mp3 = '/tmp/sync/fond/%s.mp3' % aid
        if not os.path.exists(mp3):
            print('%s: нет mp3' % aid)
            continue
        new = cues_of(src)
        old_txt = subprocess.run(['git', 'show', 'HEAD:КАРАОКЕ/%s.js' % aid], capture_output=True, text=True, cwd=REPO).stdout
        old = cues_of(old_txt)
        if not new or not old or len(new) != len(old):
            print('%s: пропускаю (оси не сравнить)' % aid)
            continue
        with av.open(mp3) as c:
            st = c.streams.audio[0]
            mono = []
            for f in c.decode(st):
                a = f.to_ndarray()
                mono.append(a.mean(axis=0) if a.ndim > 1 else a)
            sig = np.concatenate(mono)
        if st.rate != 16000:
            n = int(round(len(sig) * 16000 / st.rate))
            sig = np.interp(np.linspace(0, len(sig) - 1, n), np.arange(len(sig)), sig)
        segs, _ = model.transcribe(sig.astype(np.float32), language='ru', word_timestamps=True, beam_size=5, vad_filter=False)
        words = [(w.start, w.end, norm(w.word)) for s in segs for w in (s.words or []) if norm(w.word)]
        reverted, kept = 0, 0
        for on, nn in zip(old, new):
            if abs(nn['a'] - on['a']) <= 0.15:
                continue
            t_end = nn['a'] + max(2.2, nn['b'] - nn['a'])
            win = ''.join(t for a, b, t in words if nn['a'] - 0.4 <= a <= t_end)
            s = lev_ratio(norm(MARK.sub(' ', on.get('t', ''))), win)
            if s < 0.5:
                nn['a'] = on['a']
                nn['b'] = on['b']
                if on.get('w') is not None:
                    nn['w'] = on['w']
                elif 'w' in nn:
                    del nn['w']
                reverted += 1
            else:
                kept += 1
        if reverted:
            a0, e = span(src)
            # ремонт монотонности после смешения старых/новых строк
            cues = new
            for c in cues:
                if c['b'] <= c['a']:
                    c['b'] = round(c['a'] + 0.6, 3)
            for i in range(len(cues) - 1):
                if cues[i + 1]['a'] < cues[i]['a']:
                    lo = cues[i - 1]['a'] if i > 0 else 0.0
                    cues[i]['a'] = round(max(lo, cues[i + 1]['a'] - 0.05), 3)
                    if cues[i]['b'] <= cues[i]['a']:
                        cues[i]['b'] = round(cues[i]['a'] + 0.6, 3)
            for i in range(len(cues) - 1):
                if cues[i + 1]['a'] < cues[i]['a']:
                    cues[i + 1]['a'] = round(cues[i]['a'] + 0.05, 3)
                    if cues[i + 1]['b'] <= cues[i + 1]['a']:
                        cues[i + 1]['b'] = round(cues[i + 1]['a'] + 0.6, 3)
            new_arr = json.dumps(cues, ensure_ascii=False, separators=(',', ':'))
            # note уже содержит src[:a0] — дописываем ТОЛЬКО массив и хвост
            out = new_arr + src[e + 1:]
            note = re.sub(r'строк правлено \d+ из \d+, оставлено \d+',
                          'строк правлено %d из %d, затвор вернул %d' % (kept, len(cues), reverted), src[:a0])
            open(path, 'w', encoding='utf-8').write(note + out)
        print('%-14s затвор: выдержало %d, вернул %d' % (aid, kept, reverted))

if __name__ == '__main__':
    main()
