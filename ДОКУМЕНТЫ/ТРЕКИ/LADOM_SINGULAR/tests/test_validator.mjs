// Тесты валидатора LADOM_SINGULAR (такт v10.73, P0.1).
// ЧИТАЮТ ЖИВЫЕ HTML-ФАЙЛЫ: блок между // VALIDATOR-BEGIN и // VALIDATOR-END
// вырезается и исполняется в node:vm БЕЗ DOM (валидатор — чистые функции).
// Если валидатор в файле сломается/исчезнет — тест краснеет.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const SPECS = [
  {
    id: 'composition',
    file: path.join(ROOT, 'LADOM_SINGULAR_COMPOSITION_v1.html'),
    schema: 'ladom.composition.v1',
    limit: 80,
    limitStr: '>80 регионов',
    types: ['visual', 'music', 'event'],
    validateName: 'validate',
    tol: 1.001 // допуск выхода за кадр в живом validate() композиции
  },
  {
    id: 'studio',
    file: path.join(ROOT, 'ladom-layout-studio-p0.html'),
    schema: 'ladom.layout.v1',
    limit: 64,
    limitStr: 'лимит 64',
    types: null, // студийный IR не имеет поля type
    validateName: 'validateLayout',
    tol: 1.0001 // допуск выхода за кадр в живом validateLayout() студии
  }
];

function readHtml(spec) {
  return fs.readFileSync(spec.file, 'utf8');
}

function extractBlock(html) {
  const begin = html.indexOf('// VALIDATOR-BEGIN');
  const end = html.indexOf('// VALIDATOR-END');
  assert.ok(begin !== -1, 'нет маркера VALIDATOR-BEGIN');
  assert.ok(end !== -1, 'нет маркера VALIDATOR-END');
  assert.ok(begin < end, 'VALIDATOR-BEGIN должен идти раньше VALIDATOR-END');
  return html.slice(begin, end);
}

function loadValidator(spec) {
  const html = readHtml(spec);
  const src = extractBlock(html);
  const sandbox = {}; // намеренно БЕЗ document/window: валидатор обязан быть чистым
  vm.runInNewContext(src, sandbox, { filename: spec.id + '.validator.extract.js' });
  assert.equal(typeof sandbox.validateProject, 'function', 'validateProject должна быть объявлена внутри VALIDATOR-блока');
  assert.equal(typeof sandbox.validateImport, 'function', 'validateImport должна быть объявлена внутри VALIDATOR-блока');
  assert.equal(typeof sandbox[spec.validateName], 'function', spec.validateName + ' должна быть объявлена внутри VALIDATOR-блока');
  return { html, src, sandbox };
}

function makeRegion(spec, over = {}) {
  const base = {
    id: 'r-' + Math.random().toString(36).slice(2, 8),
    label: 'Регион',
    prompt: 'инструкция',
    bbox: { x: 0.1, y: 0.1, width: 0.3, height: 0.3 },
    zIndex: 0,
    locked: false
  };
  if (spec.types) {
    base.type = 'visual';
    base.role = '';
  }
  return Object.assign(base, over);
}

function makeProject(spec, over = {}, regions) {
  const p = {
    schemaVersion: spec.schema,
    title: 'Тестовый проект',
    canvas: { width: 1024, height: 1024, aspectRatio: '1:1' },
    regions: regions || [makeRegion(spec)]
  };
  if (spec.types) p.adapters = { visual: true, speech: true, vibro: true, pulse: true };
  return Object.assign(p, over);
}

const codesOf = (errs, code) => errs.filter((e) => e.code === code);

SPECS.forEach((spec) => {
  describe('валидатор · ' + spec.file.replace(ROOT + '/', ''), () => {
    const loaded = loadValidator(spec);
    const { html, src, sandbox } = loaded;
    const vp = sandbox.validateProject;
    const vi = sandbox.validateImport;

    it('маркеры: ровно один VALIDATOR-BEGIN и один VALIDATOR-END, BEGIN раньше END', () => {
      assert.equal((html.match(/\/\/ VALIDATOR-BEGIN/g) || []).length, 1);
      assert.equal((html.match(/\/\/ VALIDATOR-END/g) || []).length, 1);
    });

    it('блок исполняется в vm без DOM и содержит живой валидатор с прежними проверками', () => {
      assert.match(src, /function validateProject/, 'в блоке должна быть validateProject');
      assert.ok(src.includes(spec.limitStr), 'в блоке должен остаться прежний лимит регионов: ' + spec.limitStr);
      // валидатор не должен обращаться к DOM/сети
      assert.doesNotMatch(src, /\bdocument\b|\bwindow\b|\bfetch\s*\(|XMLHttpRequest|WebSocket|innerHTML/);
    });

    it('нормальный проект — 0 ошибок', () => {
      assert.equal(vp(makeProject(spec)).length, 0);
    });

    it('границы ровно 0 и 1 — валидны (включая полный кадр и правый/нижний край)', () => {
      const regions = [
        makeRegion(spec, { id: 'full', bbox: { x: 0, y: 0, width: 1, height: 1 } }),
        makeRegion(spec, { id: 'edge-br', bbox: { x: 0.98, y: 0.98, width: 0.02, height: 0.02 } }),
        makeRegion(spec, { id: 'edge-bottom', bbox: { x: 0, y: 0.5, width: 1, height: 0.5 } })
      ];
      assert.equal(vp(makeProject(spec, {}, regions)).length, 0);
    });

    it('bbox вне границ — ошибка геометрии', () => {
      const a = makeProject(spec, {}, [makeRegion(spec, { id: 'out-left', bbox: { x: -0.01, y: 0.1, width: 0.3, height: 0.3 } })]);
      const b = makeProject(spec, {}, [makeRegion(spec, { id: 'out-right', bbox: { x: 0.9, y: 0.1, width: 0.6, height: 0.3 } })]);
      const c = makeProject(spec, {}, [makeRegion(spec, { id: 'out-bottom', bbox: { x: 0.1, y: 0.9, width: 0.3, height: 0.2 } })]);
      for (const p of [a, b, c]) {
        const errs = vp(p);
        assert.ok(codesOf(errs, 'geometry').length >= 1, 'ожидается geometry-ошибка для ' + JSON.stringify(p.regions[0].bbox));
      }
      // граница чуть внутри допуска живого валидатора — ок; заметно дальше — уже нет
      assert.equal(codesOf(vp(makeProject(spec, {}, [makeRegion(spec, { bbox: { x: 0, y: 0, width: spec.tol - 0.00005, height: 0.5 } })])), 'geometry').length, 0);
      assert.ok(codesOf(vp(makeProject(spec, {}, [makeRegion(spec, { bbox: { x: 0, y: 0, width: spec.tol + 0.005, height: 0.5 } })])), 'geometry').length >= 1);
    });

    it('нулевые и отрицательные размеры — ошибка', () => {
      for (const bbox of [
        { x: 0.1, y: 0.1, width: 0, height: 0.3 },
        { x: 0.1, y: 0.1, width: 0.3, height: 0 },
        { x: 0.1, y: 0.1, width: -0.2, height: 0.3 },
        { x: 0.1, y: 0.1, width: 0.3, height: -0.05 }
      ]) {
        const errs = vp(makeProject(spec, {}, [makeRegion(spec, { bbox })]));
        assert.ok(codesOf(errs, 'geometry').length >= 1, 'ожидается ошибка для bbox ' + JSON.stringify(bbox));
      }
      // минимально допустимый размер валиден
      assert.equal(vp(makeProject(spec, {}, [makeRegion(spec, { bbox: { x: 0.1, y: 0.1, width: 0.02, height: 0.02 } })])).length, 0);
    });

    it('отсутствие обязательных полей — ошибки field/geometry', () => {
      const emptyRegion = makeProject(spec, {}, [{}]);
      const errs = vp(emptyRegion);
      assert.ok(codesOf(errs, 'field').length >= 3, 'нет id/label/prompt → минимум 3 field-ошибки, получили: ' + JSON.stringify(errs));
      const noBbox = makeProject(spec, {}, [makeRegion(spec, { bbox: undefined })]);
      assert.ok(codesOf(vp(noBbox), 'geometry').length >= 1, 'отсутствие bbox → geometry-ошибка');
      // явное отсутствие массива regions
      const p = makeProject(spec);
      delete p.regions;
      assert.ok(codesOf(vp(p), 'regions').length === 1, 'нет regions → ровно одна regions-ошибка');
    });

    it('неизвестный schemaVersion — ошибка schemaVersion', () => {
      const errs = vp(makeProject(spec, { schemaVersion: 'чужая.схема.v9' }));
      assert.equal(codesOf(errs, 'schemaVersion').length, 1);
      // пустой/нестроковый schemaVersion тоже не совпадает с ожидаемым
      assert.ok(codesOf(vp(makeProject(spec, { schemaVersion: 42 })), 'schemaVersion').length === 1);
      // точное значение схемы — валидно
      assert.equal(vp(makeProject(spec)).length, 0);
    });

    it('некорректные типы — ошибки regions/type/field, без исключений', () => {
      // regions не массив
      const p1 = makeProject(spec);
      p1.regions = 'не массив';
      assert.equal(codesOf(vp(p1), 'regions').length, 1);
      // bbox с нечисловыми полями
      const p2 = makeProject(spec, {}, [makeRegion(spec, { bbox: { x: 'abc', y: null, width: NaN, height: Infinity } })]);
      assert.ok(codesOf(vp(p2), 'geometry').length >= 1);
      // label не строка, zIndex не число
      const p3 = makeProject(spec, {}, [makeRegion(spec, { label: 42, zIndex: 'ноль' })]);
      assert.ok(codesOf(vp(p3), 'field').some((e) => e.msg.includes('label')));
      assert.ok(codesOf(vp(p3), 'type').some((e) => e.msg.includes('zIndex')));
      // регион не объект
      const p4 = makeProject(spec, {}, [null]);
      assert.ok(codesOf(vp(p4), 'type').length >= 1, 'null-регион → type-ошибка без исключения');
      // locked не boolean (только если указан)
      const p5 = makeProject(spec, {}, [makeRegion(spec, { locked: 'да' })]);
      assert.ok(codesOf(vp(p5), 'type').some((e) => e.msg.includes('locked')));
    });

    it('лимит регионов: ' + spec.limit + ' валидно, ' + (spec.limit + 1) + ' — ошибка limit', () => {
      const ok = Array.from({ length: spec.limit }, (_, i) => makeRegion(spec, { id: 'r' + i, bbox: { x: (i % 10) * 0.1, y: Math.floor(i / 10) * 0.1, width: 0.05, height: 0.05 } }));
      assert.equal(vp(makeProject(spec, {}, ok)).length, 0);
      const over = ok.concat([makeRegion(spec, { id: 'extra', bbox: { x: 0.9, y: 0.9, width: 0.05, height: 0.05 } })]);
      const errs = vp(makeProject(spec, {}, over));
      assert.equal(codesOf(errs, 'limit').length, 1, 'ожидалась ровно одна limit-ошибка: ' + JSON.stringify(errs));
    });

    it('validateProject не мутирует проект', () => {
      const p = makeProject(spec);
      const before = JSON.stringify(p);
      vp(p);
      assert.equal(JSON.stringify(p), before);
    });

    const isErr = (e) => e && typeof e.message === 'string' && e.message.length > 0;

    it('validateImport (живая): валидный JSON проходит, транзакционные отказы работают', () => {
      const good = makeProject(spec);
      const imported = vi(JSON.parse(JSON.stringify(good)));
      assert.equal(imported.regions.length, good.regions.length);
      assert.equal(typeof imported.schemaVersion, 'string');

      // слишком много регионов
      const many = Array.from({ length: spec.limit + 1 }, (_, i) => makeRegion(spec, { id: 'x' + i }));
      assert.throws(() => vi({ schemaVersion: spec.schema, regions: many }), isErr);

      // нет regions
      assert.throws(() => vi({ title: 'x' }), isErr);
      // корень не объект
      assert.throws(() => vi('строка'), isErr);
      // bbox вне 0..1
      assert.throws(() => vi({ regions: [makeRegion(spec, { bbox: { x: -0.5, y: 0, width: 0.2, height: 0.2 } })] }), isErr);
      // нулевой размер
      assert.throws(() => vi({ regions: [makeRegion(spec, { bbox: { x: 0, y: 0, width: 0, height: 0.2 } })] }), isErr);
      // нечисловой bbox
      assert.throws(() => vi({ regions: [makeRegion(spec, { bbox: { x: 'лево', y: 0, width: 0.2, height: 0.2 } })] }), isErr);
    });

    it('известный зазор (задокументирован в отчёте): validateImport НЕ отклоняет чужую строку schemaVersion', () => {
      // Текущее живое поведение обоих прототипов: любая строка принимается как есть.
      // Тест фиксирует это поведение; если его сделают строже — тест честно краснеет и behaviour меняют сознательно.
      const p = makeProject(spec, { schemaVersion: 'ladom.project.v1' });
      const imported = vi(JSON.parse(JSON.stringify(p)));
      assert.equal(imported.schemaVersion, 'ladom.project.v1');
    });
  });
});

// Специфичные проверки композиции: enum type и adapters
describe('валидатор · специфика ladom.composition.v1', () => {
  const spec = SPECS[0];
  const { sandbox } = loadValidator(spec);
  const vp = sandbox.validateProject;

  it('неизвестный type региона — field-ошибка', () => {
    const p = makeProject(spec, {}, [makeRegion(spec, { type: 'texture' })]);
    const errs = vp(p);
    assert.ok(codesOf(errs, 'field').some((e) => e.msg.includes('type')));
  });

  it('adapters не объект — type-ошибка; корректный adapters — ок', () => {
    const p1 = makeProject(spec, { adapters: 'все' });
    assert.ok(codesOf(vp(p1), 'type').some((e) => e.msg.includes('adapters')));
    assert.equal(vp(makeProject(spec)).length, 0);
  });
});

// Специфичные проверки студии: отсутствие поля type — не ошибка
describe('валидатор · специфика ladom.layout.v1', () => {
  const spec = SPECS[1];
  const { sandbox } = loadValidator(spec);
  const vp = sandbox.validateProject;

  it('регион без type — валиден (в студийном IR нет type), без adapters — тоже', () => {
    const p = {
      schemaVersion: spec.schema,
      title: 'Т',
      canvas: { width: 1024, height: 1024, aspectRatio: '1:1' },
      regions: [makeRegion(spec, { type: undefined, role: undefined })]
    };
    delete p.adapters;
    // type/role просто отсутствуют — студийная схема их не знает
    const region = p.regions[0];
    delete region.type;
    delete region.role;
    assert.equal(vp(p).length, 0);
  });

  it('нулевые размеры дают и «размер < MIN», и «нулевой/отрицательный размер» (прежние проверки сохранены)', () => {
    const p = makeProject(spec, {}, [makeRegion(spec, { bbox: { x: 0.1, y: 0.1, width: 0, height: 0.3 } })]);
    const msgs = codesOf(vp(p), 'geometry').map((e) => e.msg).join(' | ');
    assert.match(msgs, /размер < /);
    assert.match(msgs, /нулевой\/отрицательный размер/);
  });
});
