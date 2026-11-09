#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Ремонт монотонности осей после перемера: a не убывает, b >= a+0.6.
Спайка та же, что в axis_remeasure.py: меняется только массив cues, lyr не трогаем."""
import os, re, json

REPO = '/home/z/my-project/download/singulyar'
AXDIR = os.path.join(REPO, 'КАРАОКЕ')

def cues_span(src):
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

def main():
    fixed_files = 0
    for fn in sorted(os.listdir(AXDIR)):
        if not fn.endswith('.js'):
            continue
        path = os.path.join(AXDIR, fn)
        src = open(path, encoding='utf-8').read()
        a0, e = cues_span(src)
        if e is None:
            print('SKIP (нет массива):', fn)
            continue
        cues = json.loads(src[a0:e + 1])
        ch = 0
        # 1) b <= a  →  b = a + 0.6
        for c in cues:
            if c['b'] <= c['a']:
                c['b'] = round(c['a'] + 0.6, 3)
                ch += 1
        # 2) a не убывает: инверсию тянет вниз РАННЯЯ (оставленная) строка —
        #    её честное место между предыдущей и следующей измеренной
        for i in range(len(cues) - 1):
            if cues[i + 1]['a'] < cues[i]['a']:
                lo = cues[i - 1]['a'] if i > 0 else 0.0
                cues[i]['a'] = round(max(lo, cues[i + 1]['a'] - 0.05), 3)
                if cues[i]['b'] <= cues[i]['a']:
                    cues[i]['b'] = round(cues[i]['a'] + 0.6, 3)
                ch += 1
        # 3) контрольный проход
        for i in range(len(cues) - 1):
            if cues[i + 1]['a'] < cues[i]['a']:
                cues[i + 1]['a'] = round(cues[i]['a'] + 0.05, 3)
                if cues[i + 1]['b'] <= cues[i + 1]['a']:
                    cues[i + 1]['b'] = round(cues[i + 1]['a'] + 0.6, 3)
                ch += 1
        if ch:
            new_arr = json.dumps(cues, ensure_ascii=False, separators=(',', ':'))
            out = src[:a0] + new_arr + src[e + 1:]
            open(path, 'w', encoding='utf-8').write(out)
            fixed_files += 1
            print('%s: правок %d' % (fn, ch))
    print('файлов починено:', fixed_files)

if __name__ == '__main__':
    main()
