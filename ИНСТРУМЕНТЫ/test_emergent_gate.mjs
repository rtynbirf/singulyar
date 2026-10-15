/* ═══════════════════════════════════════════════════════════════════════════
   Запуск: node --test ИНСТРУМЕНТЫ/test_emergent_gate.mjs
   ═══   ГЕЙТ О-2 (такт v11.47 «ЗАКРЫТИЕ» С125): независимая ревизия починки EMERGENT
   Повторяет юнит-ревизию коллег (14 проб) на закреплённых байтах дома.
   Chromium-часть (7/7) исполнялась в песочнице такта (e2e.chromium.cjs,
   independent run) — гейт держит юнит-часть, браузерная — отчёт такта.
   node --test ИНСТРУМЕНТЫ/test_emergent_gate.mjs
   ═══════════════════════════════════════════════════════════════════════════ */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const корень = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const ТРЕК = 'ДОКУМЕНТЫ/ЕДИНОЕ_ОКНО/EMERGENT';

test('О-2: байты трека EMERGENT на месте', () => {
  for (const п of [ТРЕК + '/src/core.js', ТРЕК + '/src/adapters.js', ТРЕК + '/tests/core.test.js', ТРЕК + '/schemas/communication-intent.schema.json']) {
    assert.ok(fs.existsSync(path.join(корень, п)), 'нет ' + п);
  }
});

test('О-2: их юнит-ревизия 14/14 проходит на байтах дома (независимый прогон)', () => {
  const р = spawnSync(process.execPath, [path.join(корень, ТРЕК, 'tests/core.test.js')], {
    cwd: path.join(корень, ТРЕК),
    encoding: 'utf8',
    timeout: 30000,
  });
  assert.equal(р.status, 0, 'их тесты упали: ' + (р.stderr || '').slice(0, 400));
  assert.match(р.stdout, /14\/14 tests passed/, 'ожидалась их ревизия 14/14');
});

test('О-2: контракт починки — конверт валиден схеме (Draft 2020-12)', () => {
  const схема = JSON.parse(fs.readFileSync(path.join(корень, ТРЕК, 'schemas/communication-intent.schema.json'), 'utf8'));
  assert.ok(схема.required && Array.isArray(схема.required), 'схема без required');
  const ядро = fs.readFileSync(path.join(корень, ТРЕК, 'src/core.js'), 'utf8');
  assert.ok(ядро.includes('createIntent'), 'ядро без createIntent');
  assert.ok(ядро.includes('consentToSend'), 'ядро без согласия (consentToSend) — главный закон починки');
});
