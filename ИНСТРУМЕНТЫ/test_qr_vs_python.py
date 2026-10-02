#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Сверка матриц JS-энкодера с эталонным python qrcode.
JS-класс извлекается в рантайме из живой страницы репо (СИНГУЛЯР_17_ЗАЛ.html) —
внешних копий не нужно. Для набора (текст, маска) строим обе матрицы
(border=0, ECC L) и сравниваем попиксельно.
Запуск: python3 ИНСТРУМЕНТЫ/test_qr_vs_python.py   (пути считаются от файла)
"""
import json, subprocess, sys, os, re, tempfile
import qrcode
from qrcode.constants import ERROR_CORRECT_L

ЗДЕСЬ = os.path.dirname(os.path.abspath(__file__))
РЕПО = os.path.dirname(ЗДЕСЬ)

with open(os.path.join(РЕПО, 'СИНГУЛЯР_17_ЗАЛ.html'), encoding='utf-8') as f:
    html = f.read()

tables = re.search(r'const QR_CAPL=[\s\S]*?(?=class SingulyarQR)', html).group(0)
cls = re.search(r'class SingulyarQR \{[\s\S]*?\n\}(?=\n\n/\* ── 0b)', html).group(0)

# принудительная маска — теми же внутренностями, что и auto-encode на странице
# (патчим прототип извлечённого класса; нового класса не объявляем)
MASKED = '''
;(function () {
    SingulyarQR.prototype.encodeMasked = function (text, mask) {
        const bytes = Array.from(new TextEncoder().encode(String(text)));
        const v = this.pickVersion(bytes.length);
        const cw = this.buildCodewords(bytes, v);
        const ctx = this.makeMatrix(v);
        this.placeData(ctx, cw);
        const t = { m: ctx.m.map((row) => Uint8Array.from(row)), fn: ctx.fn, size: ctx.size };
        this.applyMask(t, mask); this.drawFormat(t, mask);
        return { version: v, size: ctx.size, mask, modules: t.m };
    };
})();
'''

NODE_SCRIPT = r'''
const { SingulyarQR } = require(process.env.QR_MOD);
const q = new SingulyarQR();
const tasks = JSON.parse(process.env.TASKS);
const out = [];
for (const t of tasks) {
    const r = q.encodeMasked(t.text, t.mask);
    out.push({ mask: r.mask, size: r.size, version: r.version, rows: r.modules.map(row => Array.from(row).join('')) });
}
process.stdout.write(JSON.stringify(out));
'''

# модуль: таблицы + класс страницы + принудительная маска
fd, qr_mod = tempfile.mkstemp(suffix='.js')
with os.fdopen(fd, 'w', encoding='utf-8') as f:
    f.write(tables + '\n' + cls + '\n' + MASKED + '\nmodule.exports = { SingulyarQR };\n')

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
                     env={**os.environ, 'TASKS': json.dumps(tasks), 'QR_MOD': qr_mod})
os.unlink(qr_mod)
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
