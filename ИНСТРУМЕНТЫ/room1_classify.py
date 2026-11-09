#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Точный классификатор: где innerHTML= в ЖИВОМ коде JS, а где внутри строковых литералов/комментариев.
Сканер учитывает: '…"…', "…", `…` (с \\-эскейпами и ${} → вложенные строки в template),
// и /* */ комментарии, regex-литералы (упрощённо: /…/ после операторов не трекаем — не мешает)."""
import sys, re

def scan_live_positions(code):
    """Возвращает список (start,end) интервалов ЖИВОГО кода (вне строк и комментариев)."""
    n = len(code)
    i = 0
    live = []
    seg_start = 0
    while i < n:
        c = code[i]
        if c == "'" or c == '"':
            j = i + 1
            while j < n:
                if code[j] == '\\': j += 2; continue
                if code[j] == c: break
                j += 1
            if seg_start < i: live.append((seg_start, i))
            i = j + 1
            seg_start = i
        elif c == '`':
            # template literal: ${...} → внутри выражения могут быть строки; рекурсивно упрощаем
            j = i + 1
            depth_expr = 0
            while j < n:
                ch = code[j]
                if ch == '\\': j += 2; continue
                if ch == '`' and depth_expr == 0: break
                if ch == '$' and j + 1 < n and code[j+1] == '{':
                    depth_expr += 1; j += 2; continue
                if ch == '}' and depth_expr > 0:
                    depth_expr -= 1; j += 1; continue
                if ch in '\'"' and depth_expr > 0:
                    # строка внутри ${...}
                    q = ch; k = j + 1
                    while k < n:
                        if code[k] == '\\': k += 2; continue
                        if code[k] == q: break
                        k += 1
                    j = k + 1; continue
                j += 1
            if seg_start < i: live.append((seg_start, i))
            i = j + 1
            seg_start = i
        elif c == '/' and i + 1 < n and code[i+1] == '/':
            j = code.find('\n', i)
            j = n if j < 0 else j
            if seg_start < i: live.append((seg_start, i))
            i = j
            seg_start = i
        elif c == '/' and i + 1 < n and code[i+1] == '*':
            j = code.find('*/', i)
            j = n if j < 0 else j + 2
            if seg_start < i: live.append((seg_start, i))
            i = j
            seg_start = i
        else:
            i += 1
    if seg_start < n: live.append((seg_start, n))
    return live

def main(path):
    txt = open(path, encoding='utf-8').read()
    blocks = [(m.start(1), m.end(1)) for m in re.finditer(r'<script[^>]*>([\s\S]*?)</script>', txt)]
    live_marks = []
    for a, b in blocks:
        code = txt[a:b]
        for s, e in scan_live_positions(code):
            live_marks.append((a + s, a + e))
    def is_live(pos):
        for s, e in live_marks:
            if s <= pos < e: return True
        return False
    out = []
    for i, m in enumerate(re.finditer(r'innerHTML\s*=', txt)):
        kind = 'ЖИВОЙ' if is_live(m.start()) else 'в-строке(данные/цитата)'
        line = txt[:m.start()].count('\n') + 1
        out.append('%2d: %-22s (абс.поз. %d)' % (i + 1, kind, m.start()))
    print('\n'.join(out))
    n_live = sum(1 for m in re.finditer(r'innerHTML\s*=', txt) if is_live(m.start()))
    print('\nИТОГ: живых %d, всего %d' % (n_live, len(re.findall(r'innerHTML\s*=', txt))))
    # сохраняем интервалы живого кода для ревизионного скрипта
    import json, os
    json.dump(live_marks, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'room1_live_marks.json'), 'w'))
    print('интервалы живого кода → room1_live_marks.json')

if __name__ == '__main__':
    main(sys.argv[1])
