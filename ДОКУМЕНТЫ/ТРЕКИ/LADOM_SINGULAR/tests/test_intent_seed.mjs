// Тесты Intent → region seed (такт v10.78 «ОТКЛИК», P1.1, Л2).
// ЧИТАЕТ ЖИВОЙ HTML студии: блок между // INTENT-SEED-BEGIN и // INTENT-SEED-END
// вырезается и исполняется в node:vm БЕЗ DOM (правила — чистые функции, 0 сети).
// Если блок в файле сломается/исчезнет — тест краснеет.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const FILE = path.join(ROOT, 'ladom-layout-studio-p0.html');

function extractSeed() {
  const html = fs.readFileSync(FILE, 'utf8');
  const a = html.indexOf('// INTENT-SEED-BEGIN');
  const b = html.indexOf('// INTENT-SEED-END');
  assert.ok(a >= 0, 'INTENT-SEED-BEGIN не найден в студии');
  assert.ok(b > a, 'INTENT-SEED-END не найден после BEGIN');
  return html.slice(a, b);
}

function runSeed() {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(extractSeed() + '\nthis.ladomIntentSeed = ladomIntentSeed;', ctx, { filename: 'intent-seed.vm.js' });
  return ctx;
}

// validateLayout живёт в VALIDATOR-блоке — вытаскиваем его тоже, чтобы проверить
// что черновик intent проходит живой валидатор студии (связка блоков — честная).
function extractValidator() {
  const html = fs.readFileSync(FILE, 'utf8');
  const a = html.indexOf('// VALIDATOR-BEGIN');
  const b = html.indexOf('// VALIDATOR-END');
  assert.ok(a >= 0 && b > a, 'VALIDATOR-блок не найден');
  return html.slice(a, b);
}

function runBoth() {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(extractValidator() + '\n' + extractSeed() +
    '\nthis.ladomIntentSeed = ladomIntentSeed; this.validateLayout = validateLayout;', ctx,
    { filename: 'intent-seed.vm.js' });
  return ctx;
}

describe('INTENT-SEED: присутствие и чистота', () => {
  it('блок живёт в HTML студии между BEGIN/END маркерами', () => {
    extractSeed();
  });
  it('правила детерминированы: одинаковый текст → одинаковый черновик', () => {
    const { ladomIntentSeed } = runSeed();
    const t = 'фон, заголовок вверху, большой герой справа, маленький логотип в углу';
    const r1 = ladomIntentSeed(t);
    const r2 = ladomIntentSeed(t);
    assert.deepStrictEqual(r1, r2);
  });
  it('0 сети: в блоке нет fetch/XHR/WebSocket/eval', () => {
    const блок = extractSeed();
    for (const запрещено of ['fetch(', 'XMLHttpRequest', 'WebSocket', 'eval(', 'import(']) {
      assert.ok(!блок.includes(запрещено), 'запрещённое в офлайн-блоке: ' + запрещено);
    }
  });
});

describe('INTENT-SEED: лексикон и честность', () => {
  it('пустое намерение → ok:false и честная заметка', () => {
    const { ladomIntentSeed } = runSeed();
    const r = ladomIntentSeed('   ');
    assert.equal(r.ok, false);
    assert.equal(r.regions.length, 0);
    assert.ok(r.notes.length >= 1);
  });
  it('фон получает весь кадр и zIndex 0 (под всем)', () => {
    const { ladomIntentSeed } = runSeed();
    const r = ladomIntentSeed('фон — мягкий градиент');
    assert.equal(r.ok, true);
    const фон = r.regions[0];
    assert.equal(фон.bbox.x, 0); assert.equal(фон.bbox.y, 0);
    assert.equal(фон.bbox.width, 1); assert.equal(фон.bbox.height, 1);
    assert.equal(фон.zIndex, 0);
  });
  it('заголовок/свет/герой/логотип/люди/декор распознаются по лексикону', () => {
    const { ladomIntentSeed } = runSeed();
    const r = ladomIntentSeed('заголовок, свет, герой, логотип, люди, декор');
    assert.equal(r.ok, true);
    assert.equal(r.regions.length, 6);
    const kinds = JSON.parse(JSON.stringify(r.regions.map((g) => g.label.split(' ')[0])));
    assert.deepStrictEqual(kinds, ['заголовок', 'свет', 'герой', 'логотип', 'люди', 'декор']);
  });
  it('непознанная фраза НЕ молча мапится — уходит в unrecognized', () => {
    const { ladomIntentSeed } = runSeed();
    const r = ladomIntentSeed('заголовок, летающий чемодан');
    assert.equal(r.regions.length, 1);
    assert.ok(r.unrecognized.includes('летающий чемодан'));
  });
  it('всё непознанное → ok:false + подсказка лексикона', () => {
    const { ladomIntentSeed } = runSeed();
    const r = ladomIntentSeed('летающий чемодан, крякуша');
    assert.equal(r.ok, false);
    assert.equal(r.regions.length, 0);
    assert.equal(r.unrecognized.length, 2);
    assert.ok(r.notes[0].includes('лексикон'));
  });
  it('trace объясняет, почему регион таков (честный отчёт)', () => {
    const { ladomIntentSeed } = runSeed();
    const r = ladomIntentSeed('большой герой справа');
    assert.equal(r.regions.length, 1);
    const t = r.trace[0];
    assert.ok(t.почему.includes('герой'));
    assert.ok(t.почему.includes('позиция'));
    assert.ok(t.почему.includes('размер'));
  });
  it('prompt хранит фразу человека без затирания (суверенитет слов)', () => {
    const { ladomIntentSeed } = runSeed();
    const r = ladomIntentSeed('тёплый свет слева');
    assert.equal(r.regions[0].prompt, 'тёплый свет слева');
  });
});

describe('INTENT-SEED: позиции и размеры', () => {
  it('«в центре» ставит регион в центральный блок', () => {
    const { ladomIntentSeed } = runSeed();
    const r = ladomIntentSeed('герой в центре');
    const b = r.regions[0].bbox;
    assert.ok(b.x > 0.2 && b.x < 0.6, 'x в середине: ' + b.x);
    assert.ok(b.y > 0.2 && b.y < 0.6, 'y в середине: ' + b.y);
  });
  it('«полоса текста внизу» — широкая низкая полоса в нижней трети', () => {
    const { ladomIntentSeed } = runSeed();
    const r = ladomIntentSeed('полоса текста внизу');
    const b = r.regions[0].bbox;
    assert.ok(b.width > 0.8, 'широкая: ' + b.width);
    assert.ok(b.height < 0.3, 'низкая: ' + b.height);
    assert.ok(b.y > 0.6, 'внизу: ' + b.y);
  });
  it('«на весь экран» — большой регион в границах кадра', () => {
    const { ladomIntentSeed } = runSeed();
    const r = ladomIntentSeed('герой на весь экран');
    const b = r.regions[0].bbox;
    assert.ok(b.width > 0.7 && b.height > 0.6);
    assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.width <= 1.0001 && b.y + b.height <= 1.0001);
  });
});

describe('INTENT-SEED: геометрия и валидатор студии', () => {
  it('плейсмент 3×3 без пересечений для нескольких регионов', () => {
    const { ladomIntentSeed } = runSeed();
    const r = ladomIntentSeed('заголовок, текст, свет, герой, логотип, люди, декор');
    const верхние = r.regions.filter((g) => g.zIndex > 0);
    for (let i = 0; i < верхние.length; i++) {
      for (let j = i + 1; j < верхние.length; j++) {
        const a = верхние[i].bbox, b = верхние[j].bbox;
        const пересек = !(a.x + a.width <= b.x + 0.001 || b.x + b.width <= a.x + 0.001 ||
                          a.y + a.height <= b.y + 0.001 || b.y + b.height <= a.y + 0.001);
        assert.ok(!пересек, 'пересечение регионов ' + i + ' и ' + j);
      }
    }
  });
  it('черновик целиком проходит живой validateLayout студии', () => {
    const { ladomIntentSeed, validateLayout } = runBoth();
    const r = ladomIntentSeed('фон — мягкий градиент, заголовок вверху, большой герой справа, полоса текста внизу, маленький логотип в углу, декор');
    assert.equal(r.ok, true);
    const проект = {
      schemaVersion: 'ladom.layout.v1',
      title: 'intent draft',
      canvas: { width: 1024, height: 1024, aspectRatio: '1:1' },
      regions: r.regions.map(({ source, ...g }) => g)
    };
    const отчёт = validateLayout(проект);
    assert.ok(Array.isArray(отчёт), 'validateLayout вернул массив');
    assert.equal(отчёт.length, 0, 'ошибки валидатора: ' + JSON.stringify(отчёт));
  });
  it('переполнение честно: больше 9 — лишние не влезают, отмечены в notes', () => {
    const { ladomIntentSeed } = runSeed();
    const r = ladomIntentSeed('заголовок, текст, свет, герой, логотип, люди, декор, свет, текст, герой, заголовок');
    assert.ok(r.regions.length <= 9, 'регионов: ' + r.regions.length);
    assert.ok(r.notes.some((n) => n.includes('не влез')), 'честной заметки нет');
  });
  it('bbox всех регионов — числа в [0,1] и размер ≥ MIN_SIZE', () => {
    const { ladomIntentSeed } = runSeed();
    const r = ladomIntentSeed('фон, заголовок вверху, маленький логотип в углу, полоса текста внизу, герой на весь экран');
    for (const g of r.regions) {
      const b = g.bbox;
      for (const k of ['x', 'y', 'width', 'height']) {
        assert.equal(typeof b[k], 'number', 'bbox.' + k + ' не число');
        assert.ok(Number.isFinite(b[k]) && b[k] >= 0 && b[k] <= 1, 'bbox.' + k + ' вне [0,1]: ' + b[k]);
      }
      assert.ok(b.width >= 0.02 && b.height >= 0.02, 'регион меньше MIN_SIZE');
    }
  });
});

describe('INTENT-SEED: UI студии связан (С37 — кликабельность)', () => {
  it('textarea, две кнопки и вывод существуют в HTML', () => {
    const html = fs.readFileSync(FILE, 'utf8');
    for (const id of ['intentText', 'btnIntentDraft', 'btnIntentAdd', 'intentOut']) {
      assert.ok(html.includes('id="' + id + '"'), 'нет элемента ' + id);
    }
  });
  it('обе кнопки привязаны к обработчикам в живом скрипте', () => {
    const html = fs.readFileSync(FILE, 'utf8');
    assert.ok(html.includes("$('btnIntentDraft').addEventListener"), 'btnIntentDraft не привязан');
    assert.ok(html.includes("$('btnIntentAdd').addEventListener"), 'btnIntentAdd не привязан');
  });
  it('добавление в проект идёт через pushUndo + takeSnapshot + renderAll (история честная)', () => {
    const html = fs.readFileSync(FILE, 'utf8');
    const i = html.indexOf("$('btnIntentAdd').addEventListener");
    const кусок = html.slice(i, i + 900);
    assert.ok(кусок.includes('pushUndo()'), 'нет pushUndo перед изменением');
    assert.ok(кусок.includes('takeSnapshot()'), 'нет снимка версии после');
    assert.ok(кусок.includes('renderAll()'), 'нет перерисовки');
  });
});
