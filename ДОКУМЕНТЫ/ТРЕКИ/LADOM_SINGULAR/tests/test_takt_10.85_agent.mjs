// test_takt_10.85_agent.mjs — ЛАДОМ·СИНГУЛЯР, такт v10.85 «АРХИТЕКТОР».
// Строка карты: Л5 «P3–P4: поочерёдное» — P4 (остаток): agentic repair planner.
//
// Критерий строки (роль 9 из 09_ARCHITECTURE_BLUEPRINT_RU.md): «Repair Planner —
// определяет, какую область/сущность исправить, и выбирает повторный layout edit,
// masked inpainting или композитинг». Канон — src/repair-agent.mjs (repair-agent/0.1):
// агентный ЦИКЛ поверх их канона v10.81. Применение агент не изобретает — только их
// batchRepair/applyMaskedRepair (derive — их baselineDerive), выбор — их pickBest.
//
// ЗАКОН ЧЕСТНОСТИ: агента-модели в доме нет — реестр proposer'ов пуст от моделей;
// стоковые proposer'ы детерминированы; адаптеры (Л1 Reve, P4.1) встанут через
// registerProposer, когда будут честны.
//
// Честные границы проверок:
//   - детерминизм — байт-в-байт (JSON.stringify) на двух прогонах;
//   - «без вызовов apply» доказывается ссылочным равенством: их applyMaskedRepair
//     всегда возвращает НОВЫЙ объект проекта, а других путей применения у агента нет —
//     если результат.проект является тем же объектом, применений не было;
//   - scoreRepair сверяется руками: inter 0.05·0.3 = 0.015, union 0.09+0.09−0.015 = 0.165;
//   - статика источника проверяется чтением файла: 0 сети, 0 часов, 0 случайности,
//     импорты — ровно два канона дома.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ver, registerProposer, runRepairAgent, scoreRepair, listProposers,
  proposeHeuristic, proposeLattice,
} from '../src/repair-agent.mjs';
import * as агентNS from '../src/repair-agent.mjs';
import {
  REPAIR_SCHEMA, planMaskedRepair, planMaskFromOverlaps, applyMaskedRepair,
} from '../src/masked-repair.mjs';
import { bboxIoU } from '../src/qa-metrics.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', 'src', 'repair-agent.mjs');

// ---------------------------------------------------------------------------
// Фикстуры — та же геометрия, что у test_takt_10.81.mjs (их канон v10.81).
// ---------------------------------------------------------------------------

function projectOverlap() {
  // a и b пересекаются (0.05 по x), c далеко — жертва их планировщика: b (поздний).
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
  // Замок-рамка вокруг окна; m наезжает на левую створку — места нет → честный blocked.
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

function projectQuiet() {
  // Пересечений нет вовсе.
  return {
    schemaVersion: 'ladom.project.v1',
    title: 'Тихий',
    canvas: { width: 1024, height: 1024, aspectRatio: '1:1' },
    regions: [
      { id: 'x', label: 'X', prompt: 'p', bbox: { x: 0.0, y: 0.0, width: 0.3, height: 0.3 }, zIndex: 0, locked: false },
      { id: 'y', label: 'Y', prompt: 'p', bbox: { x: 0.6, y: 0.6, width: 0.2, height: 0.2 }, zIndex: 1, locked: false },
    ],
  };
}

function projectEmpty() {
  return {
    schemaVersion: 'ladom.project.v1',
    title: 'Пустой',
    canvas: { width: 1024, height: 1024, aspectRatio: '1:1' },
    regions: [],
  };
}

function projectAllLocked() {
  // Пересечение есть, но оба — замки: «не наше дело» (их конвенция).
  return {
    schemaVersion: 'ladom.project.v1',
    title: 'Одни замки',
    canvas: { width: 1024, height: 1024, aspectRatio: '1:1' },
    regions: [
      { id: 'a', label: 'A', prompt: 'p', bbox: { x: 0.0, y: 0.0, width: 0.3, height: 0.3 }, zIndex: 0, locked: true },
      { id: 'b', label: 'B', prompt: 'p', bbox: { x: 0.25, y: 0.0, width: 0.3, height: 0.3 }, zIndex: 1, locked: true },
    ],
  };
}

// ---------------------------------------------------------------------------

describe('repair-agent · реестр и стоковые proposer\'ы', () => {
  it('экспорты наружу: ver + шесть функций; ver = repair-agent/0.1', () => {
    assert.equal(ver, 'repair-agent/0.1');
    for (const имя of ['registerProposer', 'runRepairAgent', 'scoreRepair', 'listProposers', 'proposeHeuristic', 'proposeLattice']) {
      assert.equal(typeof агентNS[имя], 'function', `нет экспорта ${имя}`);
    }
    assert.deepEqual(
      Object.keys(агентNS).sort(),
      ['listProposers', 'proposeHeuristic', 'proposeLattice', 'registerProposer', 'runRepairAgent', 'scoreRepair', 'ver'],
    );
    const список = listProposers();
    assert.ok(список.имена.includes('heuristic') && список.имена.includes('lattice'));
    assert.deepEqual([...список.имена].sort(), список.имена, 'имена отсортированы');
    assert.match(список.пометка, /стоковые: heuristic, lattice; моделей нет/);
    assert.deepEqual(список.модели, [], 'реестр пуст от моделей — честно');
  });

  it('стоковые детерминированы по отдельности: два вызова — равные конверты; тишина → маска []', () => {
    const p1 = projectOverlap();
    const p2 = projectOverlap();
    const h1 = proposeHeuristic('heuristic', p1, []);
    const h2 = proposeHeuristic('heuristic', p2, []);
    assert.equal(JSON.stringify(h1), JSON.stringify(h2));
    assert.equal(h1.план.schemaVersion, REPAIR_SCHEMA);
    assert.deepEqual(h1.план.mask, ['b']); // жертва — поздний (их конвенция)
    const l1 = proposeLattice('lattice', p1, []);
    const l2 = proposeLattice('lattice', p2, []);
    assert.equal(JSON.stringify(l1), JSON.stringify(l2));
    assert.equal(l1.план.schemaVersion, REPAIR_SCHEMA);
    assert.deepEqual(l1.план.mask, ['a', 'b', 'c']); // все разблокированные, по id
    // Тишина → оба честно «нечего чинить».
    const q = projectQuiet();
    assert.deepEqual(proposeHeuristic('heuristic', q, []), { маска: [] });
    assert.deepEqual(proposeLattice('lattice', q, []), { маска: [] });
  });

  it('registerProposer: дубликат имени и плохие входы — честный false; занятое имя не подменить', () => {
    assert.equal(registerProposer('heuristic', () => ({ маска: [] })), false, 'дубликат — false');
    assert.equal(registerProposer('', () => ({})), false);
    assert.equal(registerProposer('x', 'не функция'), false);
    assert.equal(registerProposer(42, () => ({})), false);
    // heuristic не подменён: стоковый план на пересечении прежний
    assert.deepEqual(proposeHeuristic('heuristic', projectOverlap(), []).план.mask, ['b']);
  });

  it('кастомный proposer с фиксированной маской участвует в цикле и виден в listProposers; контракт (имя, снимок, копия журнала)', () => {
    const видно = {};
    const фикс = (имя, project, память) => {
      видно.имя = имя;
      видно.проект = project;
      видно.память = память;
      if (Array.isArray(память)) память.push({ подглядывание: true }); // попытка мутации журнала
      return { маска: ['b'] }; // фиксированная маска
    };
    assert.equal(registerProposer('фикс-маска', фикс), true);
    assert.ok(listProposers().имена.includes('фикс-маска'));

    const p = projectOverlap();
    const r = runRepairAgent(p, { proposers: ['фикс-маска'], rounds: 1 });
    assert.equal(r.статус, 'done');
    assert.equal(r.лучший.proposer, 'фикс-маска');
    assert.equal(r.лучший.счёт, 1, 'их план по маске ["b"] → repaired, мера 1');
    // контракт proposer'а: (имя, снимок проекта, копия журнала)
    assert.equal(видно.имя, 'фикс-маска');
    assert.deepEqual(видно.проект, JSON.parse(JSON.stringify(p)), 'данные те же…');
    assert.notStrictEqual(видно.проект, p, '…но это снимок-копия, не сам вход');
    assert.ok(Array.isArray(видно.память));
    assert.equal(r.память.length, 1, 'мутация копии журнала не дошла до агента');
    assert.deepEqual(r.проект.regions[1].bbox, { x: 0.45, y: 0, width: 0.3, height: 0.3 });
  });

  it('неизвестное имя в opts.proposers — честный отказ раунда, не бросок в никуда', () => {
    const r = runRepairAgent(projectOverlap(), { proposers: ['heuristic', 'призрак'], rounds: 1 });
    assert.equal(r.статус, 'done');
    assert.deepEqual(r.память[1], {
      раунд: 1, proposer: 'призрак', исход: 'отказ', счёт: null,
      причина: 'нет proposer\'а "призрак" в реестре — listProposers() покажет, кто есть',
    });
    assert.equal(r.лучший.proposer, 'heuristic');
    assert.equal(r.лучший.счёт, 1);
  });
});

describe('runRepairAgent · агентный цикл', () => {
  it('детерминизм: два прогона — результат и память байт-в-байт; в памяти нет часов', () => {
    const run = () => runRepairAgent(projectOverlap(), { proposers: ['heuristic', 'lattice'], rounds: 3 });
    const a = run();
    const b = run();
    assert.equal(JSON.stringify(a), JSON.stringify(b));
    assert.doesNotMatch(JSON.stringify(a), /\d{4}-\d{2}-\d{2}T/);
    assert.doesNotMatch(JSON.stringify(a), /generatedAt/i);
    // Память точной формы — {раунд, proposer, исход, счёт, причина}, БЕЗ timestamps.
    assert.deepEqual(a.память, [
      { раунд: 1, proposer: 'heuristic', исход: 'план', счёт: 1, причина: '' },
      { раунд: 1, proposer: 'lattice', исход: 'план', счёт: 3, причина: '' },
      { раунд: 2, proposer: 'heuristic', исход: 'пусто', счёт: null, причина: 'маска пуста — нечего чинить' },
      { раунд: 2, proposer: 'lattice', исход: 'пусто', счёт: null, причина: 'маска пуста — нечего чинить' },
    ]);
  });

  it('вход не мутируется: байты те же, ссылки удержанных не подменялись', () => {
    const p = projectOverlap();
    const до = JSON.parse(JSON.stringify(p));
    const r = runRepairAgent(p, { proposers: ['heuristic', 'lattice'], rounds: 2 });
    assert.equal(JSON.stringify(p), JSON.stringify(до), 'вход байт-в-байт тот же');
    // Их гарантия нетронутости течёт сквозь агента: удержанные — те же объекты.
    assert.strictEqual(r.проект.regions[0], p.regions[0]);
    assert.strictEqual(r.проект.regions[2], p.regions[2]);
    // Нетронутые поля проекта при них.
    assert.equal(r.проект.title, p.title);
    assert.deepEqual(r.проект.canvas, p.canvas);
  });

  it('пустой проект / нет пересечений / одни замки — «нечего чинить» без единого применения', () => {
    for (const p of [projectEmpty(), projectQuiet(), projectAllLocked()]) {
      const r = runRepairAgent(p); // дефолтные стоковые proposer'ы
      assert.equal(r.статус, 'нечего-чинить');
      assert.equal(r.раундов, 1);
      assert.equal(r.лучший, null);
      assert.ok(r.память.every((z) => z.исход !== 'план'), 'планов не было');
      // Применение всегда даёт НОВЫЙ объект (их контракт); та же ссылка = применений не было.
      assert.strictEqual(r.проект, p);
      assert.match(r.причина, /нечего чинить/);
    }
  });

  it('heuristic-lattice-сценарий: цикл нашёл план, применил, счёт лучше (1 < 3), пересечение снято', () => {
    const p = projectOverlap();
    const начальныйIoU = bboxIoU(p.regions[0].bbox, p.regions[1].bbox); // руками: 0.015/0.165
    assert.ok(начальныйIoU > 0);
    const r = runRepairAgent(p, { proposers: ['heuristic', 'lattice'], rounds: 2 });
    assert.equal(r.раундов, 2);
    assert.equal(r.статус, 'нечего-чинить', 'во 2-м раунде чинить уже нечего — ДОЧИНИЛ за 1');
    assert.equal(r.память[0].исход, 'план');
    assert.equal(r.память[0].счёт, 1, 'heuristic: точный ремонт дешевле');
    assert.equal(r.память[1].исход, 'план');
    assert.equal(r.память[1].счёт, 3, 'lattice: раздутая маска (все kept) дороже');
    assert.equal(r.лучший.раунд, 1);
    assert.equal(r.лучший.proposer, 'heuristic');
    assert.equal(r.лучший.счёт, 1);
    assert.equal(r.лучший.отчёт.steps[0].status, 'repaired');
    const б = r.проект.regions[1];
    assert.deepEqual(б.bbox, { x: 0.45, y: 0, width: 0.3, height: 0.3 }, 'их решётка: сдвиг вправо');
    assert.equal(bboxIoU(б.bbox, r.проект.regions[0].bbox), 0, 'пересечение снято');
    assert.equal(bboxIoU(б.bbox, r.проект.regions[2].bbox), 0);
  });

  it('замок-рамка: честный blocked — оба плана блокируются, tie-break их pickBest (первый по порядку)', () => {
    const p = projectFenced();
    const r = runRepairAgent(p, { proposers: ['heuristic', 'lattice'], rounds: 1 });
    assert.equal(r.статус, 'done');
    assert.equal(r.раундов, 1);
    assert.equal(r.лучший.proposer, 'heuristic', 'счёты равны (1=1) — их pickBest берёт первого');
    assert.equal(r.лучший.счёт, 1);
    assert.equal(r.лучший.отчёт.steps[0].status, 'blocked');
    assert.equal(JSON.stringify(r.проект), JSON.stringify(p), 'blocked не меняет проект вовсе');
    assert.notStrictEqual(r.проект, p, 'но применение БЫЛО: проект — новый объект');
  });

  it('кастомный scoreFn: равные счёты — победа первого в лексикографическом порядке имён', () => {
    const r = runRepairAgent(projectOverlap(), { proposers: ['lattice', 'heuristic'], rounds: 1, scoreFn: () => 0 });
    assert.equal(r.лучший.proposer, 'heuristic', 'имена сортируются: heuristic первым');
    assert.equal(r.лучший.счёт, 0);
    assert.deepEqual(r.память.map((z) => z.счёт), [0, 0]);
    assert.deepEqual(r.память.map((z) => z.proposer), ['heuristic', 'lattice']);
  });

  it('rounds клампится в 1..8: 100 → 8, дробное → честный пол, 0 → 1', () => {
    const вечная = projectFenced(); // blocked каждый раунд — proposer'ы не пустеют
    const r = runRepairAgent(вечная, { proposers: ['heuristic', 'lattice'], rounds: 100 });
    assert.equal(r.статус, 'done');
    assert.equal(r.раундов, 8);
    assert.deepEqual([...new Set(r.память.map((z) => z.раунд))], [1, 2, 3, 4, 5, 6, 7, 8]);
    assert.equal(runRepairAgent(projectFenced(), { rounds: 2.9 }).раундов, 2);
    assert.equal(runRepairAgent(projectFenced(), { rounds: 0 }).раундов, 1);
  });

  it('дефолты opts: стоковые proposer\'ы, 8 раундов потолка, мера scoreRepair', () => {
    const r = runRepairAgent(projectOverlap());
    assert.equal(r.статус, 'нечего-чинить'); // 1-й раунд починил, 2-й — честно пусто
    assert.equal(r.раундов, 2);
    assert.equal(r.лучший.proposer, 'heuristic');
    assert.equal(r.лучший.счёт, 1);
    assert.match(r.ver, /repair-agent\/0\.1/);
  });
});

describe('scoreRepair · дефолтная мера (меньше — лучше)', () => {
  it('руки-кейс bboxIoU: пересечение с удержанными — штраф, чистое — нет, наследованное — не бьёт', () => {
    const a = { x: 0, y: 0, width: 0.3, height: 0.3 };
    const b = { x: 0.25, y: 0, width: 0.3, height: 0.3 };
    // Руки: inter 0.05·0.3 = 0.015; union 0.09+0.09−0.015 = 0.165; IoU = 0.015/0.165.
    assert.ok(Math.abs(bboxIoU(b, a) - 0.015 / 0.165) < 1e-12);
    const проект = {
      schemaVersion: 'ladom.project.v1', title: 'мера', canvas: {},
      regions: [
        { id: 'a', label: 'A', prompt: 'p', bbox: a, zIndex: 0, locked: false },
        { id: 'b', label: 'B', prompt: 'p', bbox: b, zIndex: 1, locked: false },
      ],
    };
    const отчётНаезд = {
      schemaVersion: 'ladom.repair-report.v1',
      steps: [{ id: 'b', status: 'repaired', from: { x: 0.5, y: 0, width: 0.3, height: 0.3 }, to: b }],
    };
    const отчётЧисто = {
      schemaVersion: 'ladom.repair-report.v1',
      steps: [{ id: 'b', status: 'repaired', from: b, to: { x: 0.5, y: 0, width: 0.3, height: 0.3 } }],
    };
    assert.equal(scoreRepair(проект, отчётНаезд), 2, '1 пересечение + 0 blocked + 1 не-отказ');
    assert.equal(scoreRepair(проект, отчётЧисто), 1, '0 пересечений + 0 blocked + 1 не-отказ');
    const отчётНаследие = {
      schemaVersion: 'ladom.repair-report.v1',
      steps: [{ id: 'b', status: 'repaired', from: b, to: b }],
    };
    assert.equal(scoreRepair(проект, отчётНаследие), 1, 'сдвига не было — их грань не бьёт');
  });

  it('на честных отчётах их applyMaskedRepair: 1 / 3 / blocked-1 — числа из их структур', () => {
    const p = projectOverlap();
    const { project: p1, report: r1 } = applyMaskedRepair(p, planMaskFromOverlaps(p));
    assert.equal(r1.steps[0].status, 'repaired');
    assert.equal(scoreRepair(p1, r1), 1, '0 пересечений + 0 blocked + 1 не-отказ');
    const { project: p2, report: r2 } = applyMaskedRepair(p, planMaskedRepair(p, ['a', 'b', 'c'], { reason: 'решётка' }));
    assert.equal(r2.blockedCount, 0);
    assert.equal(scoreRepair(p2, r2), 3, 'все три шага kept — раздутая маска дороже');
    const pf = projectFenced();
    const { project: p3, report: r3 } = applyMaskedRepair(pf, planMaskedRepair(pf, ['m']));
    assert.equal(r3.steps[0].status, 'blocked');
    assert.equal(scoreRepair(p3, r3), 1, '0 пересечений + 1 blocked + 0 не-отказов');
  });
});

describe('repair-agent · статика источника', () => {
  const src = fs.readFileSync(SRC, 'utf8');

  it('0 сети: ни fetch, ни XHR, ни WebSocket, ни динамического import, ни адресов', () => {
    assert.doesNotMatch(src, /\bfetch\s*\(/);
    assert.doesNotMatch(src, /XMLHttpRequest/);
    assert.doesNotMatch(src, /WebSocket/);
    assert.doesNotMatch(src, /\bimport\s*\(/);
    assert.doesNotMatch(src, /https?:\/\//);
  });

  it('0 вычислений из строк, 0 innerHTML, 0 часов, 0 случайности — детерминизм по построению', () => {
    assert.doesNotMatch(src, /\beval\b/);
    assert.doesNotMatch(src, /new\s+Function/);
    assert.doesNotMatch(src, /innerHTML/);
    assert.doesNotMatch(src, /Date\.now/);
    assert.doesNotMatch(src, /new\s+Date\b/);
    assert.doesNotMatch(src, /\bMath\.random\b/);
  });

  it('импорты — ровно два канона дома: ./masked-repair.mjs и ./qa-metrics.mjs', () => {
    const импорты = [...src.matchAll(/^import[\s\S]*?from '\.\/([^']+)';/gm)].map((m) => m[1]);
    assert.deepEqual(импорты, ['masked-repair.mjs', 'qa-metrics.mjs']);
  });

  it('закон честности и контракт в шапке: моделей нет, адаптеры — через registerProposer', () => {
    assert.match(src, /агента-модели в доме нет/);
    assert.match(src, /registerProposer, когда будут честны/);
    assert.match(src, /export const ver = 'repair-agent\/0\.1';/);
    assert.match(src, /\{ план: ladom\.repair\.v1 \}/);
    assert.match(src, /\{ маска: \[\] \}/);
    assert.match(src, /\{ отказ: причина \}/);
  });
});
