// test_takt_10.81.mjs — ЛАДОМ·СИНГУЛЯР, такт v10.81 «ЛАТКА».
// Строка карты: Л5 «P3–P4: поочерёдное» — шаг P4 «Masked repair · batch experiments».
//
// Критерий строки: «адресный ремонт региона без полной перегенерации» —
// чинится ТОЛЬКО маска, нетронутые регионы остаются байт-в-байт, план устарел —
// честный отказ, «ремонт не нужен» не притворяется ремонтом (kept), места нет —
// честный блок (blocked).
//
// Честные границы:
//   - детерминизм проверяется байт-в-байт (JSON.stringify) на повторных прогонах —
//     в модуле нет часов и генераторов случайности;
//   - blocked-кейс построен геометрически (замок-рамка вокруг окна) — если алгоритм
//     базлайна изменит порядок обхода решётки, тест честно упадёт: порядок есть часть
//     контракта детерминизма;
//   - модуль НЕ заменяет канонический валидатор студии — держит только shape-гард;
//   - node --check эквивалентен успешному import (ESM), статика источника проверяется
//     чтением файла: 0 сети, единственный внутренний импорт — qa-metrics (связка с Л3).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  REPAIR_SCHEMA, REPORT_SCHEMA, GENERATED_BY, MIN_SIZE, MAX_ATTEMPTS,
  planMaskedRepair, planMaskFromOverlaps, applyMaskedRepair,
  batchRepair, pickBest, baselineDerive, assertProjectShape,
} from '../src/masked-repair.mjs';
import { bboxIoU } from '../src/qa-metrics.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SRC = path.join(ROOT, 'src', 'masked-repair.mjs');

// ---------------------------------------------------------------------------
// Фикстуры (мини-проекты в духе 04_LAYOUT_EXAMPLE.json, ladom.project.v1)
// ---------------------------------------------------------------------------

function projectOverlap() {
  // a и b пересекаются (0.05 по x), c далеко — victim планировщика: b (поздний).
  return {
    schemaVersion: 'ladom.project.v1',
    title: 'Испытание · пересечение',
    canvas: { width: 1024, height: 1024, aspectRatio: '1:1' },
    regions: [
      { id: 'a', label: 'Левый', prompt: 'p-a', bbox: { x: 0.0, y: 0.0, width: 0.3, height: 0.3 }, zIndex: 0, locked: false },
      { id: 'b', label: 'Правый', prompt: 'p-b', bbox: { x: 0.25, y: 0.0, width: 0.3, height: 0.3 }, zIndex: 1, locked: false },
      { id: 'c', label: 'Дальний', prompt: 'p-c', bbox: { x: 0.7, y: 0.7, width: 0.2, height: 0.2 }, zIndex: 2, locked: false },
    ],
  };
}

function projectFenced() {
  // Замок-рамка вокруг окна 0.4..0.6 × 0.35..0.65; m наезжает на левую створку,
  // свободного места для него нет (все сдвиги решётки бьются о рамку) → blocked.
  return {
    schemaVersion: 'ladom.project.v1',
    title: 'Испытание · рамка',
    canvas: { width: 1024, height: 1024, aspectRatio: '1:1' },
    regions: [
      { id: 'f1', label: 'Верх', prompt: 'p', bbox: { x: 0.0, y: 0.0, width: 1.0, height: 0.35 }, zIndex: 0, locked: true },
      { id: 'f2', label: 'Низ', prompt: 'p', bbox: { x: 0.0, y: 0.65, width: 1.0, height: 0.35 }, zIndex: 0, locked: true },
      { id: 'f3', label: 'Лево', prompt: 'p', bbox: { x: 0.0, y: 0.35, width: 0.4, height: 0.3 }, zIndex: 0, locked: true },
      { id: 'f4', label: 'Право', prompt: 'p', bbox: { x: 0.6, y: 0.35, width: 0.4, height: 0.3 }, zIndex: 0, locked: true },
      { id: 'm', label: 'Застрявший', prompt: 'p-m', bbox: { x: 0.35, y: 0.4, width: 0.2, height: 0.2 }, zIndex: 1, locked: false },
    ],
  };
}

const clone = (x) => JSON.parse(JSON.stringify(x));

// ---------------------------------------------------------------------------

describe('masked-repair · план (ladom.repair.v1)', () => {
  it('planMaskedRepair фиксирует маску и текущие bbox, дубликаты съедаются', () => {
    const p = projectOverlap();
    const plan = planMaskedRepair(p, ['b', 'b'], { reason: 'тест' });
    assert.equal(plan.schemaVersion, REPAIR_SCHEMA);
    assert.equal(plan.generatedBy, GENERATED_BY);
    assert.deepEqual(plan.mask, ['b']);
    assert.deepEqual(plan.steps, [{ id: 'b', from: { x: 0.25, y: 0, width: 0.3, height: 0.3 } }]);
    assert.equal(plan.reason, 'тест');
    assert.equal(plan.title, p.title);
  });

  it('план детерминирован: один вход → один выход (deep-equal)', () => {
    const plan1 = planMaskedRepair(projectOverlap(), ['b', 'a']);
    const plan2 = planMaskedRepair(projectOverlap(), ['b', 'a']);
    assert.deepEqual(plan1, plan2);
  });

  it('маска-строка принимается; пустая маска, неизвестный id, locked — честные отказы', () => {
    const p = projectOverlap();
    assert.deepEqual(planMaskedRepair(p, 'c').mask, ['c']);
    assert.throws(() => planMaskedRepair(p, []), /маска пуста/);
    assert.throws(() => planMaskedRepair(p, ['нет-такого']), /неизвестный id/);
    const fenced = projectFenced();
    assert.throws(() => planMaskedRepair(fenced, ['f1']), /locked/);
  });

  it('планировщик по пересечениям: жертва — поздний; locked-сосед не жертва; без пересечений — маска []', () => {
    const p = projectOverlap();
    const plan = planMaskFromOverlaps(p);
    assert.deepEqual(plan.mask, ['b']); // a∩b → поздний b; пары с c нет
    assert.equal(plan.overlaps.length, 1);
    assert.deepEqual(plan.overlaps[0], { id: 'b', сосед: 'a', iou: plan.overlaps[0].iou });
    assert.ok(plan.overlaps[0].iou > 0);

    // locked пересекается со свободным → в маску идёт СВОБОДНЫЙ, замок не трогаем.
    const lockedLeft = projectOverlap();
    lockedLeft.regions[0].locked = true; // a locked, пересекается с b
    assert.deepEqual(planMaskFromOverlaps(lockedLeft).mask, ['b']);

    // оба locked — «не наше дело».
    const bothLocked = projectOverlap();
    bothLocked.regions[0].locked = true;
    bothLocked.regions[1].locked = true;
    assert.deepEqual(planMaskFromOverlaps(bothLocked).mask, []);

    // без пересечений — честное «нечего чинить».
    const quiet = {
      schemaVersion: 'ladom.project.v1',
      title: 'Тихий',
      canvas: { width: 1024, height: 1024, aspectRatio: '1:1' },
      regions: [
        { id: 'x', label: 'X', prompt: 'p', bbox: { x: 0.0, y: 0.0, width: 0.3, height: 0.3 }, zIndex: 0, locked: false },
        { id: 'y', label: 'Y', prompt: 'p', bbox: { x: 0.6, y: 0.6, width: 0.2, height: 0.2 }, zIndex: 1, locked: false },
      ],
    };
    const emptyPlan = planMaskFromOverlaps(quiet);
    assert.deepEqual(emptyPlan.mask, []);
  });

  it('iouMin=0.3 глушит слабые пересечения — фильтр работает', () => {
    const p = projectOverlap(); // IoU(a,b) = 0.05·0.3 / (0.09+0.09−0.015) ≈ 0.0945
    assert.equal(planMaskFromOverlaps(p, { iouMin: 0.5 }).mask.length, 0);
    assert.equal(planMaskFromOverlaps(p, { iouMin: 0.05 }).mask.length, 1);
    assert.throws(() => planMaskFromOverlaps(p, { iouMin: 2 }), /iouMin/);
  });
});

describe('masked-repair · применение (гарантия нетронутости)', () => {
  it('чинится ТОЛЬКО маска: нетронутые байт-в-байт, у отремонтированного меняется только bbox', () => {
    const p = projectOverlap();
    const before = clone(p);
    const plan = planMaskedRepair(p, ['b']);
    const { project: next, report } = applyMaskedRepair(p, plan);

    // нетронутые — те же объекты и те же байты
    assert.equal(next.regions[0], p.regions[0], 'удержанный регион — та же ссылка');
    assert.equal(next.regions[2], p.regions[2], 'удержанный регион — та же ссылка');
    assert.deepEqual(next.regions[0], before.regions[0]);
    assert.deepEqual(next.regions[2], before.regions[2]);

    // отремонтированный: сдвинут из пересечения, id/label/prompt/zIndex при нём
    const b = next.regions[1];
    assert.equal(b.id, 'b');
    assert.equal(b.label, 'Правый');
    assert.equal(b.prompt, 'p-b');
    assert.equal(b.zIndex, 1);
    assert.equal(bboxIoU(b.bbox, next.regions[0].bbox), 0, 'ремонт не наезжает на удержанных');
    assert.equal(bboxIoU(b.bbox, next.regions[2].bbox), 0);
    assert.equal(bboxIoU(next.regions[0].bbox, next.regions[2].bbox), 0);
    assert.deepEqual(
      JSON.stringify(next.regions[1]) !== JSON.stringify(before.regions[1]), true,
    );

    // проект целиком: отличается только маска; ключи без изменений
    assert.deepEqual(Object.keys(next).sort(), Object.keys(before).sort());
    assert.deepEqual(next.title, before.title);
    assert.deepEqual(next.canvas, before.canvas);
    assert.equal(report.status, 'done');
    assert.equal(report.repairedCount, 1);
    assert.equal(report.keptCount, 0);
    assert.equal(report.blockedCount, 0);
    assert.deepEqual(report.steps[0].from, { x: 0.25, y: 0, width: 0.3, height: 0.3 });
    assert.equal(report.schemaVersion, REPORT_SCHEMA);
  });

  it('детерминизм: два прогона байт-в-байт; в отчёте нет часов', () => {
    const run = () => {
      const p = projectOverlap();
      const plan = planMaskedRepair(p, ['b'], { reason: 'r' });
      return applyMaskedRepair(p, plan);
    };
    const r1 = run();
    const r2 = run();
    assert.equal(JSON.stringify(r1), JSON.stringify(r2));
    assert.match(JSON.stringify(r1.report), /ladom\.repair-report\.v1/);
    assert.doesNotMatch(JSON.stringify(r1.report), /\d{4}-\d{2}-\d{2}T/);
    assert.doesNotMatch(JSON.stringify(r1.report), /generatedAt/i);
  });

  it('baselineDerive: точка остановки контракта — сдвиг вправо на решётке', () => {
    // Спецификация решётки: k=1.0, порядок dy=0 → dx=-0.2 (бьётся о a) → dx=+0.2 → свободно.
    const p = projectOverlap();
    const plan = planMaskedRepair(p, ['b']);
    const { project: next, report } = applyMaskedRepair(p, plan);
    const b = next.regions[1];
    assert.deepEqual(b.bbox, { x: 0.45, y: 0, width: 0.3, height: 0.3 });
    assert.equal(report.steps[0].status, 'repaired');
  });

  it('«ремонт не нужен» не притворяется ремонтом: статус kept, регион байт-в-байт', () => {
    const p = projectOverlap();
    // c ни с кем не пересекается: baseline вернёт исходное место → kept.
    const plan = planMaskedRepair(p, ['c']);
    const { project: next, report } = applyMaskedRepair(p, plan);
    assert.equal(report.steps[0].status, 'kept');
    assert.equal(report.repairedCount, 0);
    assert.equal(report.keptCount, 1);
    assert.equal(next.regions[2], p.regions[2], 'ссылка не менялась');
    assert.equal(JSON.stringify(next), JSON.stringify(p), 'проект байт-в-байт тот же');
  });

  it('места нет — честный блок: статус blocked, регион не тронут, отчёт partial', () => {
    const p = projectFenced();
    const before = clone(p);
    const plan = planMaskedRepair(p, ['m']);
    const { project: next, report } = applyMaskedRepair(p, plan);
    assert.equal(report.steps[0].status, 'blocked');
    assert.equal(report.status, 'partial');
    assert.equal(report.blockedCount, 1);
    assert.equal(JSON.stringify(next.regions[4]), JSON.stringify(before.regions[4]));
    assert.equal(JSON.stringify(next), JSON.stringify(before), 'blocked не меняет проект вовсе');
  });

  it('пустой план планировщика → nothing-to-repair, проект без изменений', () => {
    const p = projectOverlap();
    const plan = planMaskFromOverlaps(p, { iouMin: 0.9 }); // пересечение слабое → маска []
    const { project: next, report } = applyMaskedRepair(p, plan);
    assert.equal(report.status, 'nothing-to-repair');
    assert.equal(JSON.stringify(next), JSON.stringify(p));
  });

  it('план устарел / чужой план / чужой проект — честные отказы', () => {
    const p = projectOverlap();
    const plan = planMaskedRepair(p, ['b']);
    const drifted = clone(p);
    drifted.regions[1].bbox.x = 0.3;
    assert.throws(() => applyMaskedRepair(drifted, plan), /менялся после плана/);
    assert.throws(() => applyMaskedRepair(p, { ...plan, title: 'другое' }), /пересоберите план/);
    assert.throws(() => applyMaskedRepair(p, { schemaVersion: 'ладом.чужой' }), /ladom\.repair\.v1/);
    assert.throws(() => applyMaskedRepair(p, plan, { derive: 'не функция' }), /derive/);
  });

  it('повторное применение того же плана — честный отказ (план потреблён проектом)', () => {
    const p = projectOverlap();
    const plan = planMaskedRepair(p, ['b']);
    const { project: next } = applyMaskedRepair(p, plan);
    assert.throws(() => applyMaskedRepair(next, plan), /менялся после плана/);
  });

  it('свой derive: null → blocked; prompt-ремонт меняет только prompt; порядок и purity держатся', () => {
    const p = projectOverlap();
    const plan = planMaskedRepair(p, ['b']);
    const { project: next, report } = applyMaskedRepair(p, plan, {
      derive: ({ region }) => (region.id === 'b' ? { prompt: 'переписанный промпт' } : null),
    });
    const b = next.regions[1];
    assert.equal(b.prompt, 'переписанный промпт');
    assert.deepEqual(b.bbox, { x: 0.25, y: 0, width: 0.3, height: 0.3 });
    assert.equal(report.steps[0].status, 'repaired');
    assert.deepEqual(Object.keys(b).sort(), Object.keys(p.regions[1]).sort(), 'ключи региона не распухают');

    const { project: kept, report: keptReport } = applyMaskedRepair(p, plan, { derive: () => null });
    assert.equal(keptReport.steps[0].status, 'blocked');
    assert.equal(JSON.stringify(kept), JSON.stringify(p));

    // derive без bbox — объект-пустышка: чистый no-op, шаг kept.
    const { report: noopReport } = applyMaskedRepair(p, plan, { derive: () => ({}) });
    assert.equal(noopReport.steps[0].status, 'kept');
  });

  it('derive с плохим bbox (мало/за кадром/не число/наехал на удержанных) — честные отказы', () => {
    const p = projectOverlap();
    const plan = planMaskedRepair(p, ['b']);
    assert.throws(
      () => applyMaskedRepair(p, plan, { derive: () => ({ bbox: { x: 0.4, y: 0.4, width: 0.01, height: 0.2 } }) }),
      /MIN_SIZE/,
    );
    assert.throws(
      () => applyMaskedRepair(p, plan, { derive: () => ({ bbox: { x: 0.9, y: 0, width: 0.3, height: 0.3 } }) }),
      /за кадром/,
    );
    assert.throws(
      () => applyMaskedRepair(p, plan, { derive: () => ({ bbox: { x: 'лево', y: 0, width: 0.3, height: 0.3 } }) }),
      /не конечное число/,
    );
    assert.throws(
      () => applyMaskedRepair(p, plan, { derive: () => ({ bbox: { x: 0.0, y: 0.0, width: 0.3, height: 0.3 } }) }),
      /наехал/,
    );
    assert.throws(
      () => applyMaskedRepair(p, plan, { derive: () => 42 }),
      /ожидается объект/,
    );
  });

  it('shape-гард: не-проект, пустые regions, дубликат id, крошечный bbox, выход за кадр', () => {
    assert.throws(() => assertProjectShape(null), /объект проекта/);
    assert.throws(() => assertProjectShape({ schemaVersion: 'ladom.x', regions: 'нет' }), /массив/);
    const bad = {
      schemaVersion: 'ladom.project.v1', title: 'x', canvas: {},
      regions: [
        { id: 'a', label: 'A', prompt: 'p', bbox: { x: 0, y: 0, width: 0.3, height: 0.3 }, zIndex: 0, locked: false },
        { id: 'a', label: 'A2', prompt: 'p', bbox: { x: 0.5, y: 0, width: 0.3, height: 0.3 }, zIndex: 1, locked: false },
      ],
    };
    assert.throws(() => assertProjectShape(bad), /дубликат id/);
    const tiny = projectOverlap();
    tiny.regions[2].bbox = { x: 0.7, y: 0.7, width: 0.01, height: 0.2 };
    assert.throws(() => assertProjectShape(tiny), /MIN_SIZE/);
    const out = projectOverlap();
    out.regions[2].bbox = { x: 0.9, y: 0.7, width: 0.2, height: 0.2 };
    assert.throws(() => assertProjectShape(out), /за кадр/);
  });
});

describe('masked-repair · batch experiments и выбор', () => {
  it('batchRepair ведёт варианты по порядку, вход не мутируется, имена уникальны', () => {
    const p = projectOverlap();
    const snapshot = JSON.stringify(p);
    const results = batchRepair(p, [
      { name: 'сдвиг', mask: ['b'] },
      { name: 'текст', mask: ['b'], derive: () => ({ prompt: 'новый' }) },
      { name: 'ничего', mask: ['c'] },
    ]);
    assert.equal(JSON.stringify(p), snapshot, 'вход не мутируется');
    assert.deepEqual(results.map((r) => r.name), ['сдвиг', 'текст', 'ничего']);
    assert.equal(results[0].result.report.repairedCount, 1);
    assert.equal(results[1].result.project.regions[1].prompt, 'новый');
    assert.equal(results[2].result.report.steps[0].status, 'kept');
    assert.throws(
      () => batchRepair(p, [{ name: 'дубль', mask: ['b'] }, { name: 'дубль', mask: ['c'] }]),
      /дубликат имени/,
    );
    assert.throws(() => batchRepair(p, [{ name: '' , mask: ['b'] }]), /name/);
  });

  it('pickBest: максимум; равенство — первый по порядку; пусто — null; не-число — отказ', () => {
    const p = projectOverlap();
    const results = batchRepair(p, [
      { name: 'первый', mask: ['b'] },
      { name: 'второй', mask: ['b'], derive: () => ({ prompt: 'новый' }) },
    ]);
    const byPromptLen = (r) => (r.result.project.regions[1].prompt === 'новый' ? 1 : 0);
    assert.equal(pickBest(results, byPromptLen).name, 'второй');
    const allZero = (/* детерминированно одинаково */) => 0;
    assert.equal(pickBest(results, allZero).name, 'первый', 'при равенстве — первый');
    assert.equal(pickBest([], allZero), null);
    assert.throws(() => pickBest(results, () => 'нечисло'), /конечное число/);
    assert.throws(() => pickBest(results, 'не функция'), /scoreFn/);
  });

  it('полный цикл P4: планировщик по пересечениям → ремонт → граньIoU=0 → детерминированный выбор', () => {
    const p = projectOverlap();
    const plan = planMaskFromOverlaps(p);
    const results = batchRepair(p, [
      { name: 'базлайн', plan },
      { name: 'ручной-сдвиг', plan, derive: ({ region }) => ({ bbox: { x: 0.5, y: 0, width: region.bbox.width, height: region.bbox.height } }) },
    ]);
    const score = (r) => {
      const b = r.result.project.regions[1];
      const touching = r.result.project.regions.filter((x) => x.id !== 'b');
      const minIou = Math.min(...touching.map((x) => bboxIoU(b.bbox, x.bbox)));
      // чем дальше от удержанных, тем лучше; детерминировано, без часов
      return (minIou === 0 ? 1 : 0) * 10 - bboxIoU(b.bbox, { x: 0.25, y: 0, width: 0.3, height: 0.3 });
    };
    const best = pickBest(results, score);
    assert.ok(['базлайн', 'ручной-сдвиг'].includes(best.name));
    const winner = best.result.project.regions[1];
    for (const other of best.result.project.regions.filter((x) => x.id !== 'b')) {
      assert.equal(bboxIoU(winner.bbox, other.bbox), 0, 'лучший не наезжает на удержанных');
    }
    assert.equal(best.result.report.schemaVersion, REPORT_SCHEMA);
  });
});

describe('masked-repair · статика источника и связки', () => {
  const src = fs.readFileSync(SRC, 'utf8');

  it('0 сети: ни fetch, ни XHR, ни WebSocket, ни URL, ни динамического import', () => {
    assert.doesNotMatch(src, /\bfetch\s*\(/);
    assert.doesNotMatch(src, /XMLHttpRequest/);
    assert.doesNotMatch(src, /WebSocket/);
    assert.doesNotMatch(src, /https?:\/\//);
    assert.doesNotMatch(src, /\bimport\s*\(/);
  });

  it('0 часов: ни Date.now, ни new Date — детерминизм по построению', () => {
    assert.doesNotMatch(src, /Date\.now/);
    assert.doesNotMatch(src, /new Date/);
  });

  it('связка с Л3: перекрытие меряется тем же bboxIoU из qa-metrics (единственный импорт)', () => {
    assert.match(src, /import \{ bboxIoU \} from '\.\/qa-metrics\.mjs';/);
    const imports = [...src.matchAll(/^import .*$/gm)].map((m) => m[0]);
    assert.equal(imports.length, 1, 'единственный импорт — qa-metrics');
  });

  it('константы контракта на месте и согласованы: MIN_SIZE=0.02, MAX_ATTEMPTS существует', () => {
    assert.equal(MIN_SIZE, 0.02);
    assert.equal(typeof MAX_ATTEMPTS, 'number');
    assert.ok(MAX_ATTEMPTS > 0);
    assert.match(src, /export const MIN_SIZE = 0\.02;/);
    assert.match(src, /export const REPAIR_SCHEMA = 'ladom\.repair\.v1';/);
    assert.match(src, /export const REPORT_SCHEMA = 'ladom\.repair-report\.v1';/);
  });

  it('честные границы в шапке: blocked/kept/гарантии задокументированы в коде', () => {
    assert.match(src, /не чинятся никогда/);
    assert.match(src, /байт-в-байт/);
    assert.match(src, /не притворяется ремонтом|честный блок|честно помечается/);
    assert.match(src, /НАСЛЕДОВАННОЕ пересечение/);
  });
});
