/**
 * Тесты валидатора .harm (07_HARM_FORMAT.md + schema/harm.schema.json).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateHarm } from '../src/harm-validate.mjs';
import { readFileSync } from 'node:fs';

const DEMO = JSON.parse(readFileSync(new URL('../доки/demo.harm.json', import.meta.url), 'utf8'));

test('демо-событие из examples/demo.harm.json валидно без ошибок и предупреждений', () => {
  const r = validateHarm(DEMO);
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
});

test('более новая мажорная версия схемы не открывается (правило 5 формата)', () => {
  const r = validateHarm({ ...DEMO, schema: 'harm/1.0' });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('мажорн')));
  const r2 = validateHarm({ ...DEMO, schema: 'harm/0.1' });
  assert.equal(r2.ok, true);
  const r3 = validateHarm({ ...DEMO, schema: 'harm/0.2' });
  assert.equal(r3.ok, true, 'минорная новее поддерживается');
  const r4 = validateHarm({ ...DEMO, schema: 'чужой-формат' });
  assert.equal(r4.ok, false);
});

test('text без alt — ошибка (правило 1); prompt без альтернативы жесту — предупреждение (правило 2)', () => {
  const noAlt = {
    schema: 'harm/0.1', title: 'x', bpm: 100,
    timeline: [{ beat: 0, type: 'text', data: { words: [[['та', 1]]] } }],
  };
  const r = validateHarm(noAlt);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('.alt')));

  const promptNoAlt = {
    schema: 'harm/0.1', title: 'x', bpm: 100,
    timeline: [{ beat: 0, type: 'prompt', data: { action: 'clap' }, alt: 'Хлопните' }],
  };
  const r2 = validateHarm(promptNoAlt);
  assert.equal(r2.ok, true, 'предупреждение не блокирует');
  assert.equal(r2.warnings.length, 1);

  const promptOk = {
    schema: 'harm/0.1', title: 'x', bpm: 100,
    timeline: [{ beat: 0, type: 'prompt', data: { action: 'clap', keyboardAlt: 'Space' }, alt: 'Хлопните или пробел' }],
  };
  assert.equal(validateHarm(promptOk).warnings.length, 0);
});

test('bpm вне 30–240, отрицательный beat, неизвестный type, data не объект — ошибки', () => {
  const base = { schema: 'harm/0.1', title: 'x' };
  assert.ok(validateHarm({ ...base, bpm: 500, timeline: [] }).errors.some((e) => e.includes('bpm')));
  assert.ok(validateHarm({ ...base, bpm: 10, timeline: [] }).errors.some((e) => e.includes('bpm')));
  const r = validateHarm({
    ...base, bpm: 120,
    timeline: [
      { beat: -1, type: 'text', data: { words: [] }, alt: 'x' },
      { beat: 0, type: 'взрыв', data: {} },
      { beat: 1, type: 'accent' },
    ],
  });
  assert.ok(r.errors.some((e) => e.includes('beat')));
  assert.ok(r.errors.some((e) => e.includes('type')));
  assert.ok(r.errors.some((e) => e.includes('data')));
  assert.ok(validateHarm({ ...base, bpm: 120, timeline: [] }).errors.some((e) => e.includes('beatsPerLine')) === false);
  const r2 = validateHarm({ ...base, bpm: 120, beatsPerLine: 0, timeline: [] });
  assert.ok(r2.errors.some((e) => e.includes('beatsPerLine')));
});

test('словарь долей: слово — массив пар [слог, доля > 0]', () => {
  const bad = {
    schema: 'harm/0.1', title: 'x', bpm: 120,
    timeline: [{
      beat: 0, type: 'text', alt: 'x',
      data: { words: [[['Про']], ['сто'], [[1, 'лю']], 'не-массив'] },
    }],
  };
  const r = validateHarm(bad);
  assert.equal(r.ok, false);
  assert.ok(r.errors.filter((e) => e.includes('пара [слог')).length >= 3, JSON.stringify(r.errors));
  assert.ok(r.errors.some((e) => e.includes('слово — массив слогов')));
});

test('не-объекты отклоняются, ошибки не бросаются, а возвращаются списком', () => {
  assert.equal(validateHarm(null).ok, false);
  assert.equal(validateHarm('строка').ok, false);
  assert.equal(validateHarm([]).ok, false);
  const r = validateHarm({ schema: 'harm/0.1', title: '', bpm: 120, timeline: 'нет' });
  assert.equal(r.ok, false);
  assert.ok(Array.isArray(r.errors) && r.errors.length >= 2);
});
