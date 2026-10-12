// test_takt_10.88_adapter.mjs — ЛАДОМ·СИНГУЛЯР, такт v10.88 «АДАПТЕР».
// Строка карты: Л5 — остаток P4.1 «локальный open-model адаптер»
// (layout-conditioned baseline, fallback без Reve; ТЗ трека, строка 182).
//
// Канон — src/open-model-adapter.mjs (open-model-adapter/0.1) + минимальный честный
// патч listProposers() в src/repair-agent.mjs (свежее состояние — дословно прежнее;
// тесты v10.85 остаются зелёными без правок).
//
// Разделение труда (критерий P4.1): модель решает ГДЕ (маска id'ов), дом решает
// КАК (их baselineDerive), применение — только их applyMaskedRepair через их
// batchRepair. Гарантия нетронутости удержанных остаётся ихней — проверяется и
// ссылками (регион «a» — тот же объект в результате), и байтами.
//
// Закон честности: весов модели в доме нет; модель приходит готовой через runner
// («замороженный ответ» для асинхронных рантаймов); без pinned-хэша — статус
// EXPERIMENTAL, честно; адаптер никогда не бросает — беда конвертируется в отказ.
//
// Честные границы проверок:
//   - детерминизм — байт-в-байт (JSON.stringify) на двух прогонах;
//   - статика источника адаптера: 0 сети, 0 часов, 0 случайности, 0 eval/innerHTML,
//     импорт — ровно один канон дома;
//   - ledger на чистом импорте пуст; свежая пометка listProposers() — дословно
//     прежний текст (совместимость с тестом v10.85 в том же процессе).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ver, LEDGER_SCHEMA, собратьПромпт, разобратьОтвет, registerOpenModel, списокМоделей,
} from '../src/open-model-adapter.mjs';
import {
  listProposers, runRepairAgent, registerProposer,
} from '../src/repair-agent.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', 'src', 'open-model-adapter.mjs');
const src = fs.readFileSync(SRC, 'utf8');

const глубокаяКопия = (x) => JSON.parse(JSON.stringify(x));

// Детерминированная фикстура проекта (родня их projectOverlap из v10.85):
// a×b пересекаются (iou 0,09…), жертва по их конвенции — поздний в списке.
function проектСПересечением() {
  return {
    schemaVersion: 'ladom.project.v1',
    title: 'Пересечение на такте',
    canvas: { width: 1024, height: 1024, aspectRatio: '1:1' },
    regions: [
      { id: 'a', label: 'Удержанный', prompt: 'p', bbox: { x: 0.0, y: 0.0, width: 0.3, height: 0.3 }, zIndex: 0, locked: false },
      { id: 'b', label: 'Жертва', prompt: 'p', bbox: { x: 0.25, y: 0.0, width: 0.3, height: 0.3 }, zIndex: 1, locked: false },
    ],
  };
}

function проектСЗамком() {
  return {
    schemaVersion: 'ladom.project.v1',
    title: 'Один замок',
    canvas: { width: 1024, height: 1024, aspectRatio: '1:1' },
    regions: [
      { id: 'a', label: 'A', prompt: 'p', bbox: { x: 0.0, y: 0.0, width: 0.3, height: 0.3 }, zIndex: 0, locked: false },
      { id: 'замок', label: 'Z', prompt: 'p', bbox: { x: 0.5, y: 0.0, width: 0.3, height: 0.3 }, zIndex: 1, locked: true },
    ],
  };
}

const замороженный = (текст) => () => ({ ответ: текст });

// ---------------------------------------------------------------------------

describe('такт 10.88 · канон адаптера: экспорты, статика, шапка', () => {
  it('ver = open-model-adapter/0.1; схема ledger — ladom.open-model.v1', () => {
    assert.equal(ver, 'open-model-adapter/0.1');
    assert.equal(LEDGER_SCHEMA, 'ladom.open-model.v1');
    for (const имя of ['собратьПромпт', 'разобратьОтвет', 'registerOpenModel', 'списокМоделей']) {
      assert.equal(typeof { собратьПромпт, разобратьОтвет, registerOpenModel, списокМоделей }[имя], 'function', `нет экспорта ${имя}`);
    }
  });

  it('статика источника: 0 сети, 0 часов, 0 случайности, 0 eval/innerHTML', () => {
    assert.doesNotMatch(src, /\bfetch\s*\(/);
    assert.doesNotMatch(src, /XMLHttpRequest/);
    assert.doesNotMatch(src, /WebSocket/);
    assert.doesNotMatch(src, /\bimport\s*\(/);
    assert.doesNotMatch(src, /https?:\/\//);
    assert.doesNotMatch(src, /\beval\b/);
    assert.doesNotMatch(src, /new\s+Function/);
    assert.doesNotMatch(src, /innerHTML/);
    assert.doesNotMatch(src, /Date\.now/);
    assert.doesNotMatch(src, /new\s+Date\b/);
    assert.doesNotMatch(src, /\bMath\.random\b/);
  });

  it('импорт — ровно один канон дома: ./repair-agent.mjs', () => {
    const импорты = [...src.matchAll(/^import[\s\S]*?from '\.\/([^']+)';/gm)].map((m) => m[1]);
    assert.deepEqual(импорты, ['repair-agent.mjs']);
  });

  it('закон честности в шапке: весов в доме нет, runner — замороженный ответ, EXPERIMENTAL', () => {
    assert.match(src, /весов модели в доме нет/);
    assert.match(src, /замороженный ответ/);
    assert.match(src, /EXPERIMENTAL/);
    assert.match(src, /модель решает ГДЕ/);
    assert.match(src, /дом решает КАК/);
    assert.match(src, /Никогда не бросает/);
  });
});

describe('такт 10.88 · ledger на чистом импорте (до регистраций)', () => {
  it('ledger пуст; свежая пометка listProposers() — дословно прежняя (совместимость v10.85)', () => {
    assert.deepEqual(списокМоделей(), [], 'моделей в доме нет — честно');
    const список = listProposers();
    assert.deepEqual(список.имена, ['heuristic', 'lattice']);
    assert.equal(список.пометка, 'стоковые: heuristic, lattice; моделей нет — реестр пуст от моделей');
    assert.deepEqual(список.модели, []);
  });
});

describe('такт 10.88 · registerOpenModel: честный true/false, не бросок', () => {
  it('плохой вход — false без броска: пустой id, слэш, пробел, не-runner, плохой pinned, плохая задача', () => {
    const ранер = замороженный('[]');
    assert.equal(registerOpenModel({ id: '', runner: ранер }), false);
    assert.equal(registerOpenModel({ id: 'a/b', runner: ранер }), false);
    assert.equal(registerOpenModel({ id: 'a b', runner: ранер }), false);
    assert.equal(registerOpenModel({ id: 'хвост-', runner: ранер }), true); // дефис не первый — ок
    assert.equal(registerOpenModel({ id: 'нет-раннера', runner: 'не функция' }), false);
    assert.equal(registerOpenModel({ id: 'плох-хэш', runner: ранер, pinned: 'не хэш' }), false);
    assert.equal(registerOpenModel({ id: 'короткий-хэш', runner: ранер, pinned: 'abc' }), false);
    assert.equal(registerOpenModel({ id: 'плох-задача', runner: ранер, задача: '' }), false);
    assert.equal(registerOpenModel(null), false);
    assert.equal(registerOpenModel(undefined), false);
  });

  it('хорошая регистрация: pinned виден в ledger честным статусом; дубликат id — false', () => {
    const хэш = 'a'.repeat(64);
    assert.equal(registerOpenModel({ id: 'пиннутая', runner: замороженный('[]'), pinned: хэш, задача: 'repair-mask' }), true);
    const запись = списокМоделей().find((z) => z.id === 'пиннутая');
    assert.ok(запись, 'запись в ledger');
    assert.equal(запись.имя, 'open-model/пиннутая');
    assert.equal(запись.статус, `pinned sha256:${хэш}`);
    assert.equal(registerOpenModel({ id: 'пиннутая', runner: замороженный('[]') }), false, 'дубликат id — честный false');
  });

  it('без pinned — статус EXPERIMENTAL, честно; коллизия имени в их реестре — false и полузаписи нет', () => {
    assert.equal(registerOpenModel({ id: 'без-хэша', runner: замороженный('[]') }), true);
    const безХэша = списокМоделей().find((z) => z.id === 'без-хэша');
    assert.match(безХэша.статус, /EXPERIMENTAL/);
    assert.match(безХэша.статус, /без pinned-хэша/);

    // имя 'open-model/коллизия' уже занято их registerProposer — адаптер честно false,
    // в ledger полузапись НЕ попадает (их дверь — единственная точка истины).
    assert.equal(registerProposer('open-model/коллизия', () => ({ маска: [] })), true);
    assert.equal(registerOpenModel({ id: 'коллизия', runner: замороженный('[]') }), false);
    assert.equal(списокМоделей().some((z) => z.id === 'коллизия'), false, 'полузаписи нет — честно');
  });

  it('после регистраций пометка listProposers() честно называет адаптеров поимённо', () => {
    const список = listProposers();
    assert.match(список.пометка, /адаптеры: /);
    assert.match(список.пометка, /open-model\/без-хэша/);
    assert.ok(список.имена.includes('open-model/пиннутая'));
  });
});

describe('такт 10.88 · промпт: детерминизм и layout-conditioned', () => {
  it('два вызова — байт-в-байт; вход не мутируется', () => {
    const проект = проектСПересечением();
    const до = глубокаяКопия(проект);
    const п1 = собратьПромпт(проект);
    const п2 = собратьПромпт(проект);
    assert.equal(п1, п2);
    assert.deepEqual(проект, до, 'вход не тронут');
  });

  it('промпт несёт картину раскладки: сортировка по id, замки, холст, формат ответа, границы', () => {
    const проект = {
      schemaVersion: 'ladom.project.v1',
      title: 'Раскладка',
      canvas: { width: 800, height: 600, aspectRatio: '4:3' },
      regions: [
        { id: 'c', label: 'Ц', prompt: 'p', bbox: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 }, zIndex: 2, locked: false },
        { id: 'a', label: 'А', prompt: 'p', bbox: { x: 0.0, y: 0.0, width: 0.3, height: 0.3 }, zIndex: 0, locked: true },
      ],
    };
    const промпт = собратьПромпт(проект);
    assert.ok(промпт.indexOf('"a"') < промпт.indexOf('"c"'), 'регионы сортированы по id');
    assert.match(промпт, /"locked": true/);
    assert.match(промпт, /"width": 800/);
    assert.match(промпт, /не чинятся никогда/);
    assert.match(промпт, /незнакомые id недопустимы/);
    assert.match(промпт, /Раскладка/);
    assert.doesNotMatch(промпт, /\d{4}-\d{2}-\d{2}T/, 'ни часов в промпте');
  });

  it('мусор на входе — честный TypeError: null, без regions, regions не массив', () => {
    assert.throws(() => собратьПромпт(null), /project ожидается объектом/);
    assert.throws(() => собратьПромпт({}), /project\.regions ожидается массивом/);
    assert.throws(() => собратьПромпт({ regions: 'нет' }), /project\.regions ожидается массивом/);
  });
});

describe('такт 10.88 · парсер: строго один формат, никакого угадывания', () => {
  const проект = проектСПересечением();

  it('JSON-массив: сортировка и съедание дублей', () => {
    assert.deepEqual(разобратьОтвет('["b","b","a"]', проект), ['a', 'b']);
  });

  it('конверт дома {"маска": […]} — то же самое', () => {
    assert.deepEqual(разобратьОтвет('{"маска": ["b"]}', проект), ['b']);
    assert.deepEqual(разобратьОтвет('{"маска": []}', проект), []);
  });

  it('пустой массив — валидное «нечего чинить»', () => {
    assert.deepEqual(разобратьОтвет('[]', проект), []);
  });

  it('замки фильтруются молча: одни замки — пустая маска; смешанная — без замков', () => {
    const сЗамком = проектСЗамком();
    assert.deepEqual(разобратьОтвет('["замок"]', сЗамком), [], 'одни замки — не наше дело');
    assert.deepEqual(разобратьОтвет('["замок","a"]', сЗамком), ['a']);
  });

  it('беда — честный TypeError с понятной причиной', () => {
    assert.throws(() => разобратьОтвет('["нет-такого"]', проект), /не в проекте/);
    assert.throws(() => разобратьОтвет('[1]', проект), /не-id/);
    assert.throws(() => разобратьОтвет('модель решила чинить всё', проект), /не JSON/);
    assert.throws(() => разобратьОтвет('{"прочее": 1}', проект), /не по формату/);
    assert.throws(() => разобратьОтвет('', проект), /непустой строкой/);
    assert.throws(() => разобратьОтвет(null, проект), /непустой строкой/);
  });
});

describe('такт 10.88 · proposer в агентном цикле: модель + стоковые', () => {
  it('модель-маска участвует в цикле: план применён их механизмами, удержанный «a» — тот же объект', () => {
    const проект = проектСПересечением();
    assert.equal(registerOpenModel({ id: 'цикл', runner: замороженный('{"маска":["b"]}') }), true);
    const итог = runRepairAgent(проект, { proposers: ['open-model/цикл'], rounds: 3 });
    assert.equal(итог.статус, 'done');
    assert.ok(итог.раундов >= 1);
    const запись = итог.память.find((z) => z.proposer === 'open-model/цикл');
    assert.ok(запись, 'запись модели в памяти раундов');
    assert.equal(запись.исход, 'план');
    assert.equal(typeof запись.счёт, 'number');
    assert.ok(итог.проект !== проект, 'применение вернуло новый проект (их applyMaskedRepair)');
    const удержанный = итог.проект.regions.find((r) => r.id === 'a');
    assert.ok(удержанный === проект.regions.find((r) => r.id === 'a'), 'гарантия нетронутости удержанных — ихняя, через модель не теряется');
  });

  it('модель + оба стоковых: цикл завершён, два прогона — байт-в-байт', () => {
    const п1 = runRepairAgent(проектСПересечением(), { proposers: ['open-model/цикл', 'heuristic', 'lattice'], rounds: 3 });
    const п2 = runRepairAgent(проектСПересечением(), { proposers: ['open-model/цикл', 'heuristic', 'lattice'], rounds: 3 });
    assert.equal(JSON.stringify(п1), JSON.stringify(п2), 'полный цикл детерминирован');
    assert.ok(['done', 'нечего-чинить'].includes(п1.статус));
    assert.ok(п1.память.some((z) => z.proposer === 'open-model/цикл'));
  });

  it('лучший раунда — честный минимум меры среди посчитанных (не выдуман)', () => {
    const итог = runRepairAgent(проектСПересечением(), { proposers: ['open-model/цикл', 'heuristic'], rounds: 1 });
    const счёты = итог.память.filter((z) => typeof z.счёт === 'number').map((z) => z.счёт);
    if (итог.лучший) {
      assert.equal(итог.лучший.счёт, Math.min(...счёты), 'меньше — лучше');
    }
  });
});

describe('такт 10.88 · честные отказы: адаптер не бросает, агент пишет причину в память', () => {
  it('runner отказался — отказ с пометкой «модель отказалась»', () => {
    assert.equal(registerOpenModel({ id: 'отказ-раннера', runner: () => ({ отказ: 'модель ещё греется' }) }), true);
    const итог = runRepairAgent(проектСПересечением(), { proposers: ['open-model/отказ-раннера'], rounds: 1 });
    const запись = итог.память.find((z) => z.proposer === 'open-model/отказ-раннера');
    assert.equal(запись.исход, 'отказ');
    assert.equal(запись.счёт, null);
    assert.match(запись.причина, /модель отказалась/);
    assert.match(запись.причина, /модель ещё греется/);
  });

  it('runner бросил — отказ, не выброс наружу', () => {
    assert.equal(registerOpenModel({ id: 'бросок', runner: () => { throw new TypeError('мозг уехал'); } }), true);
    const итог = runRepairAgent(проектСПересечением(), { proposers: ['open-model/бросок'], rounds: 1 });
    const запись = итог.память.find((z) => z.proposer === 'open-model/бросок');
    assert.equal(запись.исход, 'отказ');
    assert.match(запись.причина, /мозг уехал/);
  });

  it('проза вместо JSON / незнакомый id / пустой конверт — каждый отказ честен по слову', () => {
    assert.equal(registerOpenModel({ id: 'проза', runner: замороженный('чините всё сами') }), true);
    assert.equal(registerOpenModel({ id: 'фантазёр', runner: замороженный('["нет-такого"]') }), true);
    assert.equal(registerOpenModel({ id: 'пустой-конверт', runner: () => ({}) }), true);
    const итог = runRepairAgent(проектСПересечением(), { proposers: ['open-model/проза', 'open-model/фантазёр', 'open-model/пустой-конверт'], rounds: 1 });
    const по = (имя) => итог.память.find((z) => z.proposer === имя);
    assert.match(по('open-model/проза').причина, /не JSON/);
    assert.match(по('open-model/фантазёр').причина, /не в проекте/);
    assert.match(по('open-model/пустой-конверт').причина, /нет строки/);
  });

  it('отказы моделей не валят цикл: стоковые доводят дело', () => {
    const итог = runRepairAgent(проектСПересечением(), { proposers: ['open-model/бросок', 'heuristic', 'lattice'], rounds: 3 });
    assert.ok(['done', 'нечего-чинить'].includes(итог.статус));
    assert.ok(итог.память.some((z) => z.proposer === 'heuristic' && z.исход === 'план'), 'стоковые работали');
  });
});

describe('такт 10.88 · нечего чинить: пустая маска и одни замки', () => {
  it('модель вернула [] — «нечего-чинить», применений ноль (проект — тот же объект)', () => {
    assert.equal(registerOpenModel({ id: 'тишина', runner: замороженный('[]') }), true);
    const проект = проектСПересечением();
    const итог = runRepairAgent(проект, { proposers: ['open-model/тишина'], rounds: 2 });
    assert.equal(итог.статус, 'нечего-чинить');
    assert.ok(итог.проект === проект, 'без применений проект — та же ссылка');
    assert.deepEqual(итог.лучший, null);
  });

  it('модель назвала одни замки — пустая маска, честное «нечего чинить»', () => {
    assert.equal(registerOpenModel({ id: 'замки', runner: замороженный('{"маска":["замок"]}') }), true);
    const проект = проектСЗамком();
    const итог = runRepairAgent(проект, { proposers: ['open-model/замки'], rounds: 2 });
    assert.equal(итог.статус, 'нечего-чинить');
    const запись = итог.память.find((z) => z.proposer === 'open-model/замки');
    assert.equal(запись.исход, 'пусто');
  });
});
