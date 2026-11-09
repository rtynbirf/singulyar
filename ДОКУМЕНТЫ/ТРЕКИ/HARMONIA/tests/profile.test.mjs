/**
 * Тесты профиля доступности (Фаза 1): оси 04_PROFILE_SPEC.md, зажим диапазонов,
 * экспорт/импорт туда-обратно, автоначальные значения из системных настроек (F8),
 * пресеты, локальное хранение офлайн, отсутствие ярлыков (F10).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { Profile, AXES, PRESETS, SCHEMA, MemoryStore, defaultsFor } from '../src/profile.mjs';

test('оси спецификации присутствуют полностью (движение, текст, контраст, темп, громкость, вибро, сдвиг, ввод, вывод)', () => {
  assert.deepEqual(Object.keys(AXES), [
    'motion', 'gran', 'size', 'contrast', 'tempo', 'sound', 'haptic', 'offset', 'input', 'output',
  ]);
});

test('автоначальные значения: prefers-reduced-motion → motion=none, prefers-contrast → contrast=high (F8)', () => {
  assert.equal(new Profile({ prefersReducedMotion: true }).get('motion'), 'none');
  assert.equal(new Profile({}).get('motion'), 'soft');
  assert.equal(new Profile({ prefersContrast: true }).get('contrast'), 'high');
  assert.equal(new Profile({}).get('contrast'), 'normal');
  // остальное — значения по умолчанию из таблицы спецификации
  const p = new Profile({});
  assert.equal(p.get('gran'), 'syllable');
  assert.equal(p.get('size'), 1.0);
  assert.equal(p.get('tempo'), 1.0);
  assert.equal(p.get('sound'), 0.7);
  assert.equal(p.get('haptic'), 0.5);
  assert.equal(p.get('offset'), 0);
  assert.equal(p.get('input'), 'touch');
  assert.deepEqual(p.get('output'), ['visual', 'audio']);
});

test('числовые оси: значение вне диапазона → ближайшее допустимое (правило 3)', () => {
  const p = new Profile({});
  assert.equal(p.set('tempo', 9), 1.5);
  assert.equal(p.set('tempo', -3), 0.5);
  assert.equal(p.set('offset', -999), -300);
  assert.equal(p.set('offset', 999), 300);
  assert.equal(p.set('size', 0.2), 1.0);
  assert.equal(p.set('size', 5), 2.0);
  assert.equal(p.set('sound', 0.33), 0.33);
  assert.equal(p.set('haptic', 2), 1);
  // мусор → значение по умолчанию, а не NaN
  assert.equal(p.set('tempo', 'ерунда'), 1.0);
  assert.equal(p.set('size', NaN), 1.0);
});

test('перечисления: чужое значение → значение по умолчанию; неизвестная ось — TypeError', () => {
  const p = new Profile({});
  assert.equal(p.set('gran', 'word'), 'word');
  assert.equal(p.set('gran', 'письмо'), 'syllable');
  assert.equal(p.set('motion', 'none'), 'none');
  assert.equal(p.set('motion', 'камень'), 'soft');
  assert.equal(p.set('input', 'switch'), 'switch');
  assert.equal(p.set('input', 'морзе'), 'touch');
  assert.throws(() => p.set('цвет', 'красный'), TypeError);
});

test('вывод: минимум два канала, канонический порядок, дедупликация', () => {
  const p = new Profile({});
  assert.deepEqual(p.set('output', ['braille']), ['visual', 'audio'], 'один канал недопустим — дефолт');
  assert.deepEqual(p.set('output', ['haptic', 'braille', 'haptic']), ['haptic', 'braille']);
  assert.deepEqual(p.set('output', ['audio', 'visual']), ['visual', 'audio'], 'порядок канонический');
  assert.deepEqual(p.set('output', 'haptic+audio'), ['audio', 'haptic'], 'строка вида visual+audio тоже принимается');
  assert.deepEqual(p.set('output', []), ['visual', 'audio']);
});

test('экспорт: {"schema":"harm-profile/0.1","profile":{...}} — ровно оси, стабильный порядок', () => {
  const p = new Profile({});
  p.set('gran', 'word'); p.set('offset', 150);
  const obj = JSON.parse(p.export());
  assert.equal(obj.schema, SCHEMA);
  assert.deepEqual(Object.keys(obj.profile), Object.keys(AXES));
  assert.equal(obj.profile.gran, 'word');
  assert.equal(obj.profile.offset, 150);
});

test('экспорт/импорт туда-обратно: побайтно то же самое, оси совпадают (F9)', () => {
  const p = new Profile({ prefersReducedMotion: true });
  p.apply({ motion: 'soft', gran: 'line', size: 1.6, contrast: 'high', tempo: 0.8, sound: 0.2, haptic: 0.9, offset: -250, input: 'keyboard', output: ['audio', 'haptic'] });
  const json1 = p.export();
  const p2 = Profile.import(json1, {});
  const json2 = p2.export();
  assert.equal(json1, json2, 'байт-в-байт');
  assert.deepEqual(p2.axes(), p.axes());
});

test('импорт: чужой тег схемы, не-JSON, без profile — честный TypeError', () => {
  assert.throws(() => Profile.import('{"schema":"harm-profile/0.2","profile":{}}'), /тег схемы/);
  assert.throws(() => Profile.import('не json'), /JSON/);
  assert.throws(() => Profile.import('{"schema":"harm-profile/0.1"}'), /profile/);
  assert.throws(() => Profile.import(null), /тег схемы/);
});

test('импорт зажимает значения вне диапазонов и игнорирует неизвестные оси', () => {
  const p = Profile.import(JSON.stringify({
    schema: SCHEMA,
    profile: { tempo: 5, offset: -9999, gran: 'чужое', label: 'диагноз', архив: 1 },
  }), {});
  assert.equal(p.get('tempo'), 1.5);
  assert.equal(p.get('offset'), -300);
  assert.equal(p.get('gran'), 'syllable');
  assert.deepEqual(Object.keys(p.axes()), Object.keys(AXES), 'чужие ключи не протекают');
});

test('событие получает только производные значения — в профиле и производных нет ярлыков (F10)', () => {
  const p = new Profile({});
  p.apply({ motion: 'none', gran: 'word' });
  const d = p.derived();
  assert.deepEqual(Object.keys(d).sort(), Object.keys(AXES).sort());
  const forbidden = ['label', 'diagnosis', 'нейротип', 'диагноз', 'preset', 'presetName', 'tags', 'reason'];
  for (const key of forbidden) assert.ok(!(key in d), `ярлык «${key}» не должен попадать в производные`);
  const exported = p.export();
  for (const key of forbidden) assert.ok(!exported.includes(`"${key}"`), `ярлык «${key}» не должен экспортироваться`);
});

test('пресеты спецификации заполняют оси и ничего кроме осей', () => {
  const p = new Profile({});
  p.preset('Минимум стимулов');
  assert.equal(p.get('motion'), 'none');
  assert.equal(p.get('haptic'), 0);
  assert.equal(p.get('sound'), 0.4);
  assert.equal(p.get('contrast'), 'high');
  p.preset('Читаю медленно');
  assert.equal(p.get('gran'), 'word');
  assert.equal(p.get('tempo'), 0.7);
  assert.equal(p.get('size'), 1.4);
  p.preset('Только текст и вибро');
  assert.equal(p.get('sound'), 0);
  assert.equal(p.get('haptic'), 0.8);
  // каналы канонизируются по порядку перечня осей: visual раньше haptic
  assert.deepEqual(p.get('output'), ['visual', 'haptic']);
  assert.throws(() => p.preset('Нет такого'), TypeError);
  // пресет не засоряет экспорт
  assert.ok(!p.export().includes('Минимум'));
});

test('локальное хранение офлайн: save/load/clear на MemoryStore, битый файл не роняет', () => {
  const store = new MemoryStore();
  const p = new Profile({}, store);
  p.apply({ gran: 'word', offset: 120, motion: 'none' });
  p.save();

  const p2 = Profile.load({}, store); // «новая страница» — тот же store
  assert.equal(p2.get('gran'), 'word');
  assert.equal(p2.get('offset'), 120);
  assert.equal(p2.get('motion'), 'none');

  p2.clear();
  const p3 = Profile.load({}, store);
  assert.deepEqual(p3.axes(), defaultsFor({}), 'после очистки — свежие значения');
  assert.equal(store.getItem('harmonia.profile.v1'), null);

  store.setItem('harmonia.profile.v1', '{{{битый json');
  const p4 = Profile.load({}, store);
  assert.equal(p4.get('gran'), 'syllable', 'битый файл → свежий профиль, не падение');
});

test('load без хранилища — работает (офлайн без localStorage)', () => {
  const store = new MemoryStore();
  const p = Profile.load({}, store);
  assert.equal(p.get('tempo'), 1.0);
});
