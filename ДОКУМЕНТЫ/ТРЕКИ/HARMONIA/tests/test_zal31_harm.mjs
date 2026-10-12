/**
 * Тесты авторского эталона дома: доки/зал-31.harm.json (ЛАДОМ-вечер, зал ·31).
 * Фаза 2, такт v10.73 «СВОД».
 *
 * Честность: зал-31.harm.json — это ПРИМЕР-ЭТАЛОН профиля дома, НЕ вкатка в зал ·31
 * (вкатка — фаза 3, отдельная строка карты). Тест закрепляет:
 *  - живой валидатор src/harm-validate.mjs пропускает документ целиком
 *    (включая допполя id/version/meta — совместимость с harm/0.1);
 *  - все обязательные поля и метаданные (id, версия, откуда значения) на месте;
 *  - значения в допусках формата и собственных допусков эталона;
 *  - reduced-motion-гард присутствует (уважение prefers-reduced-motion).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateHarm, MARKER_TYPES } from '../src/harm-validate.mjs';

const ZAL31 = JSON.parse(readFileSync(new URL('../доки/зал-31.harm.json', import.meta.url), 'utf8'));

test('зал-31.harm.json существует, это честный JSON-объект с допполями поверх harm/0.1', () => {
  assert.equal(typeof ZAL31, 'object');
  assert.ok(ZAL31 && !Array.isArray(ZAL31), 'документ — объект, не массив');
  assert.equal(ZAL31.schema, 'harm/0.1');
  for (const k of ['id', 'version', 'meta']) {
    assert.ok(Object.keys(ZAL31).includes(k), `допполе ${k} объявлено`);
  }
});

test('живой harm-validate из src/ пропускает документ: ok, 0 ошибок, 0 предупреждений', () => {
  const r = validateHarm(ZAL31);
  assert.equal(r.ok, true, 'ошибки: ' + JSON.stringify(r.errors));
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, [], 'prompt несёт keyboardAlt — правила 2 формата соблюдены');
});

test('обязательные поля и метаданные (id, версия, откуда значения) на месте', () => {
  for (const k of ['schema', 'title', 'author', 'license', 'bpm', 'beatsPerLine', 'timeline']) {
    assert.ok(ZAL31[k] !== undefined, `поле ${k} присутствует`);
  }
  assert.ok(typeof ZAL31.title === 'string' && ZAL31.title.trim() !== '');
  assert.ok(typeof ZAL31.author === 'string' && ZAL31.author.trim() !== '');
  assert.ok(typeof ZAL31.license === 'string' && ZAL31.license.trim() !== '');
  assert.ok(typeof ZAL31.id === 'string' && ZAL31.id.includes('зал-31'), 'id называет зал ·31');
  assert.match(ZAL31.version, /^\d+\.\d+\.\d+$/, 'версия — семантическая');
  const meta = ZAL31.meta;
  assert.equal(typeof meta, 'object' && meta !== null ? 'object' : typeof meta, 'meta — объект');
  for (const k of ['роль', 'откуда', 'такт', 'пульс', 'тишина', 'движение']) {
    assert.ok(meta[k] !== undefined, `meta.${k} присутствует (откуда значения)`);
  }
  for (const k of ['формат', 'оси-зрителя', 'пресеты', 'образец-структуры']) {
    assert.ok(typeof meta.откуда[k] === 'string' && meta.откуда[k].length > 10, `meta.откуда.${k} заполнен`);
  }
});

test('значения в допусках формата и собственных допусков эталона', () => {
  const doc = ZAL31;
  assert.ok(doc.bpm >= 30 && doc.bpm <= 240, 'bpm в допуске формата 30–240');
  assert.ok(doc.bpm <= 120, 'авторский допуск эталона: спокойный вечер ≤ 120');
  assert.equal(doc.bpm, doc.meta.такт.bpm, 'bpm согласован с meta.такт (документ самосогласован)');
  assert.equal(doc.beatsPerLine, doc.meta.такт.beatsPerLine, 'beatsPerLine согласован с meta.такт');
  assert.ok(Number.isInteger(doc.beatsPerLine) && doc.beatsPerLine >= 1);

  const tl = doc.timeline;
  assert.ok(Array.isArray(tl) && tl.length > 0);
  let prev = -Infinity;
  for (const mk of tl) {
    assert.ok(typeof mk.beat === 'number' && Number.isFinite(mk.beat) && mk.beat >= 0, 'beat — конечное число ≥ 0');
    assert.ok(mk.beat >= prev, 'партитура не убывает по beat (честное время)');
    prev = mk.beat;
    assert.ok(MARKER_TYPES.includes(mk.type), `тип ${mk.type} из перечня формата`);
    assert.ok(mk.data && typeof mk.data === 'object' && !Array.isArray(mk.data), 'data — объект');
    assert.ok(typeof mk.alt === 'string' && mk.alt.trim() !== '', `у маркера ${mk.type} есть читаемая расшифровка (эталон строже формата)`);
    if (mk.type === 'text') {
      assert.ok(Array.isArray(mk.data.words) && mk.data.words.length > 0);
      for (const word of mk.data.words) {
        assert.ok(Array.isArray(word) && word.length > 0, 'слово — массив слогов');
        for (const pair of word) {
          assert.ok(Array.isArray(pair), 'пара [слог, доля]');
          assert.ok(typeof pair[0] === 'string' && pair[0].length > 0, 'слог — непустая строка');
          assert.ok(Number(pair[1]) > 0, 'доля слога > 0');
        }
      }
    }
    if (mk.type === 'accent') {
      const s = Number(mk.data.strength);
      assert.ok(Number.isFinite(s) && s > 0 && s <= 1, 'strength в (0;1] по формату');
      assert.ok(s <= doc.meta.пульс.максимум, `strength ≤ ${doc.meta.пульс.максимум} — мягкий пульс эталона`);
    }
    if (mk.type === 'pause') {
      assert.ok(Number.isInteger(mk.data.beats) && mk.data.beats >= 1, 'pause: целое число долей ≥ 1');
    }
    if (mk.type === 'prompt') {
      assert.equal(mk.data.action, 'clap');
      assert.ok(typeof mk.data.keyboardAlt === 'string' && mk.data.keyboardAlt.trim() !== '', 'жест имеет клавиатурную альтернативу (правило 2)');
    }
    if (mk.type === 'scene') {
      assert.ok(['day', 'party', 'kids', 'romantic'].includes(mk.data.scene), 'scene из палитры формата');
    }
  }
  // самосогласованность заявленного пульса: интервал между акцентами ≥ заявленного
  const accents = tl.filter((m) => m.type === 'accent');
  for (let i = 1; i < accents.length; i++) {
    const gap = accents[i].beat - accents[i - 1].beat;
    assert.ok(gap >= doc.meta.пульс.интервал_долей, `между акцентами ≥ ${doc.meta.пульс.интервал_долей} долей (факт: ${gap})`);
  }
  // самосогласованность заявленной тишины
  const pauses = tl.filter((m) => m.type === 'pause');
  assert.equal(pauses.length, doc.meta.тишина.пауз, 'число pause-маркеров = заявленному в meta.тишина');
});

test('reduced-motion-гард присутствует: эталон уважает prefers-reduced-motion', () => {
  const d = ZAL31.meta.движение;
  assert.equal(d.уважает, 'prefers-reduced-motion', 'гард назван прямо');
  assert.match(d.как, /motion/, 'описан механизм: ось motion профиля зрителя');
  assert.match(d.как, /motion=none|data-motion/, 'описан режим без анимации и вспышек');
  assert.match(d['гард-автора'], /motion=none/, 'автор гарантирует читаемость при motion=none');
  // эталон не изобретает «вспышечных» типов маркеров — только перечень валидатора
  for (const mk of ZAL31.timeline) assert.ok(MARKER_TYPES.includes(mk.type));
  // у каждого акцента текстовый дубль — смысл живёт и без света
  for (const mk of ZAL31.timeline.filter((m) => m.type === 'accent')) {
    assert.ok(typeof mk.alt === 'string' && mk.alt.trim() !== '', 'акцент дублируется текстом');
  }
});

test('честность: документ — эталон-пример, НЕ вкатка в зал ·31', () => {
  assert.equal(ZAL31.meta.вкатка, false, 'meta.вкатка = false заявлено явно');
  assert.match(ZAL31.meta.роль, /НЕ вкатка/, 'роль говорит «НЕ вкатка»');
  assert.match(ZAL31.meta.роль, /фаза 3/, 'вкатка отнесена к фазе 3');
  assert.match(ZAL31.id, /эталон/, 'id помечает документ как эталон');
});
