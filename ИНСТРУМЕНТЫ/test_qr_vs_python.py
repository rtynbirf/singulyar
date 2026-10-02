#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Сверка матриц JS-энкодера (через node) с эталонным python qrcode.
Для набора (текст, маска) строим обе матрицы (border=0, ECC L) и сравниваем."""
import json, subprocess, sys
import qrcode
from qrcode.constants import ERROR_CORRECT_L

NODE_SCRIPT = r'''
const { SingulyarQR } = require('/home/z/my-project/scripts/qr_dev.js');
const q = new SingulyarQR();
const tasks = JSON.parse(process.env.TASKS);
const out = [];
for (const t of tasks) {
    const r = q.encode(t.text, t.mask);
    out.push({ mask: r.mask, size: r.size, version: r.version, rows: r.modules.map(row => Array.from(row).join('')) });
}
process.stdout.write(JSON.stringify(out));
'''

# qr_dev.js уже содержит encode(text, forceMask) — патчинг не нужен
with open('/home/z/my-project/scripts/qr_dev.js', 'r', encoding='utf-8') as f:
    src = f.read()
assert '_encWithMask' in src, 'qr_dev.js должен содержать _encWithMask'

def py_matrix(text, mask):
    qr = qrcode.QRCode(error_correction=ERROR_CORRECT_L, border=0, mask_pattern=mask)
    qr.add_data(text.encode('utf-8'))
    qr.make(fit=True)
    m = qr.modules
    return [row for row in m]

CASES = []
for text in ['hello', 'https://rtynbirf.github.io/singulyar/test', 'А' * 120, 'ё' * 400,
             'СИНГУЛЯР ·17 зал: ' + 'b' * 600]:
    for mask in range(8):
        CASES.append((text, mask))

tasks = [{'text': t, 'mask': m} for (t, m) in CASES]
res = subprocess.run(['node', '-e', NODE_SCRIPT], capture_output=True, text=True,
                     env={**__import__('os').environ, 'TASKS': json.dumps(tasks)})
if res.returncode != 0:
    print('NODE FAIL:', res.stderr[:2000]); sys.exit(1)
js = json.loads(res.stdout)

fails = 0
for (text, mask), j in zip(CASES, js):
    pm = py_matrix(text, mask)
    psize = len(pm)
    if psize != j['size']:
        print(f'SIZE mismatch mask={mask} len={len(text)}: py={psize} js={j["size"]}'); fails += 1; continue
    ok = all(pm[r][c] == (j['rows'][r][c] == '1') for r in range(psize) for c in range(psize))
    if not ok:
        diff = sum(1 for r in range(psize) for c in range(psize) if pm[r][c] != (j['rows'][r][c] == '1'))
        print(f'MATRIX mismatch mask={mask} len={len(text)} diff={diff}/{psize*psize}'); fails += 1

print(f'случаев: {len(CASES)}, несовпадений: {fails}')
sys.exit(1 if fails else 0)
