/**
 * СИНГУЛЯР · ТЕСТ-СТРАЖ qr-token/0.1 — такт v11.31 «ГЕРМЕТИЧНО» (С109, PAT №33)
 * Канон js/qr-token.js (ISO/IEC 18004, byte mode, EC-L, v1–40): эталонная сверка клетка-в-клетку
 * проведена в песочнице такта (эталон пакета qrcode: 7/7 профилей; декодеры cv2/pyzbar покрывают
 * все профили;/scripts/эталон_qr.json). Здесь — быстрые законы дома: канон, отказ, детерминизм,
 * эталонные векторы ёмкостей и золотая матрица.
 * Запуск: node --test ИНСТРУМЕНТЫ/test_qr_token.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);

const QR = require(fileURLToPath(new URL('../js/qr-token.js', import.meta.url)));

test('канон экспортирован', () => {
  assert.equal(QR.канон, 'qr-token/0.1');
});

test('эталонные ёмкости byte-mode EC-L (ISO 18004)', () => {
  assert.equal(QR.ёмкость[1], 17);
  assert.equal(QR.ёмкость[10], 271);
  assert.equal(QR.ёмкость[40], 2953);
  for (let v = 2; v <= 40; v++) assert.ok(QR.ёмкость[v] > QR.ёмкость[v - 1], `ёмкость монотонна (v${v})`);
});

test('честный отказ: больше ёмкости v40', () => {
  assert.throws(() => QR.закодировать('X'.repeat(2954)), /2953/);
});

test('честный отказ: не строка', () => {
  assert.throws(() => QR.закодировать(null), /строка/);
});

test('детерминизм: двойной прогон — та же матрица и маска', () => {
  const a = QR.закодировать('singulyar-v11.31-детерминизм');
  const b = QR.закодировать('singulyar-v11.31-детерминизм');
  assert.equal(a.маска, b.маска);
  assert.equal(JSON.stringify(a.матрица), JSON.stringify(b.матрица));
});

test('принудительная маска уважается (собрать с маской 0 и 7 — разные матрицы)', () => {
  const м0 = QR.собрать('проба-масок', 2, 0);
  const м7 = QR.собрать('проба-масок', 2, 7);
  assert.equal(м0.маска, 0);
  assert.equal(м7.маска, 7);
  assert.notEqual(JSON.stringify(м0.матрица), JSON.stringify(м7.матрица));
});

test('золотой вектор v1: «SINGULYAR·53» — стабильный sha256 матрицы', () => {
  const р = QR.закодировать('SINGULYAR·53');
  assert.equal(р.версия, 1);
  assert.equal(р.размер, 21);
  const хеш = createHash('sha256').update(JSON.stringify(р.матрица)).digest('hex');
  /* вектор зафиксирован при эталонной сверке такта (клетка-в-клетку с пакетом qrcode, маска авто) */
  assert.equal(хеш, '6407726b43484100965057dd1edcc5a09637656a1dbeee66903db11210a33870');
});

test('многобайтная кириллица: UTF-8 честно считает байты', () => {
  const р = QR.закодировать('ёЁїєґў');
  assert.equal(р.байт, 12); /* 6 букв × 2 байта */
  assert.ok(р.версия >= 1 && р.версия <= 40);
});

test('размер = 17 + 4·версия', () => {
  for (const текст of ['а', 'б'.repeat(100), 'в'.repeat(700), 'г'.repeat(1400)]) { /* кириллица ×2 байта: 2800 ≤ 2953 */
    const р = QR.закодировать(текст);
    assert.equal(р.размер, 17 + 4 * р.версия);
  }
});
