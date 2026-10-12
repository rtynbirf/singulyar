// test_takt_10.89_openmodel.mjs — ЛАДОМ·СИНГУЛЯР, такт v10.89 «МОСТ» (С64).
// Строка карты: Л5-P4.1 — локальный open-model адаптер.
//
// Канон — src/open-model-adapter.mjs (open-model-adapter/0.1): мост «модель хоста ↔
// их реестр registerProposer» (repair-agent/0.1, v10.85). Модель-планировщик выбирает
// МАСКУ («что чинить»); применение остаётся их канону v10.81 (applyMaskedRepair +
// baselineDerive — «как чинить»); план по маске собирает их planMaskedRepair.
//
// Честные границы проверок:
//   - детерминизм — байт-в-байт (JSON.stringify) на двух прогонах;
//   - немутация — deepStrictEqual до/после плюс ссылочное равенство регионов;
//   - модели в тестах — синтетические детерминированные функции; ВЕСОВ в такте нет:
//     адаптер проверяет КОНТРАКТ, а не наличие мозгов (это честно сказано и в шапке);
//   - статика источника проверяется чтением файла: ровно три канон-импорта,
//     0 сети, 0 часов, 0 случайности, 0 инъекций.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ver, ASK_SCHEMA, ПЛАН_СХЕМА,
  составитьЗапрос, проверитьОтветМодели,
  makeOpenModelProposer, registerOpenModel, списокАдаптеров,
} from '../src/open-model-adapter.mjs';
import { REPAIR_SCHEMA } from '../src/masked-repair.mjs';
import { bboxIoU } from '../src/qa-metrics.mjs';
import { registerProposer, listProposers, runRepairAgent } from '../src/repair-agent.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', 'src', 'open-model-adapter.mjs');

// ---------------------------------------------------------------------------
// Фикстуры — та же геометрия, что у test_takt_10.81/10.85 (их канон).
// ---------------------------------------------------------------------------

function projectOverlap() {
  // a и b пересекаются (0.05 по x), c далеко — их жертва: b (поздний).
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

function projectLockOverlap() {
  // lock (замок) наезжает на m — m чинится, lock нет; у m нет zIndex (грань копии).
  return {
    schemaVersion: 'ladom.project.v1',
    title: 'Испытание · замок',
    canvas: { width: 1024, height: 1024, aspectRatio: '1:1' },
    regions: [
      { id: 'lock', label: 'Замок', prompt: 'p-l', bbox: { x: 0.0, y: 0.0, width: 0.5, height: 0.5 }, zIndex: 0, locked: true },
      { id: 'm', label: 'Жертва', prompt: 'p-m', bbox: { x: 0.4, y: 0.4, width: 0.2, height: 0.2 }, locked: false },
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
      { id: 'x1', label: 'Один', prompt: 'p-1', bbox: { x: 0.05, y: 0.05, width: 0.2, height: 0.2 }, zIndex: 0, locked: false },
      { id: 'x2', label: 'Два', prompt: 'p-2', bbox: { x: 0.7, y: 0.7, width: 0.2, height: 0.2 }, zIndex: 0, locked: false },
    ],
  };
}

// Синтетические детерминированные модели (тестовые; весов в такте нет).

const демоМодель = (запрос) => {
  // Их конвенция жертвы: поздняя сторона пары; locked исключены гардом ответа.
  if (запрос.пересечения.length === 0) return { маска: [] };
  const lockedIds = new Set(запрос.regions.filter((r) => r.locked).map((r) => r.id));
  const маска = [];
  for (const пара of запрос.пересечения) {
    if (!lockedIds.has(пара.b) && !маска.includes(пара.b)) маска.push(пара.b);
  }
  return { маска };
};

const тихаяМодель = () => ({ маска: [] });
const отказывающаяМодель = () => ({ отказ: 'не вижу смысла ремонта' });
const мутантМодель = (запрос) => {
  запрос.regions[0].bbox.x = 999; // попытка мутации мира
  запрос.журнал.push({ раунд: -1, proposer: 'внедрился' });
  return { маска: [] };
};
const бросающаяМодель = () => {
  throw new Error('модель сломалась честно');
};
const мусорнаяМодель = () => 'я не конверт, я строка';

// ---------------------------------------------------------------------------

describe('такт v10.89 «МОСТ» — Л5-P4.1 локальный open-model адаптер', () => {
  it('константы экспорта: ver, ASK_SCHEMA, ПЛАН_СХЕМА — их REPAIR_SCHEMA без переопределения', () => {
    assert.equal(ver, 'open-model-adapter/0.1');
    assert.equal(ASK_SCHEMA, 'ladom.open-model-ask.v1');
    assert.equal(ПЛАН_СХЕМА, REPAIR_SCHEMA);
    assert.equal(REPAIR_SCHEMA, 'ladom.repair.v1');
  });

  it('составитьЗапрос: два прогона — байт-в-байт (0 часов, 0 случайности)', () => {
    const p1 = составитьЗапрос(projectOverlap(), []);
    const p2 = составитьЗапрос(projectOverlap(), []);
    assert.equal(JSON.stringify(p1), JSON.stringify(p2));
  });

  it('составитьЗапрос: вход не мутирован — проект и журнал целы, регионы те же ссылки', () => {
    const проект = projectOverlap();
    const журнал = [{ раунд: 1, proposer: 'heuristic', исход: 'план', счёт: 3, причина: '' }];
    const до = JSON.parse(JSON.stringify(проект));
    const журналДо = JSON.parse(JSON.stringify(журнал));
    const ссылкаA = проект.regions[0];
    составитьЗапрос(проект, журнал);
    assert.deepEqual(JSON.parse(JSON.stringify(проект)), до);
    assert.deepEqual(JSON.parse(JSON.stringify(журнал)), журналДо);
    assert.equal(проект.regions[0], ссылкаA); // ссылка на месте — мир не пересобирался
    assert.equal(ссылкаA.bbox.x, 0);
  });

  it('составитьЗапрос: структура — регионы по id, пересечения их bboxIoU, locked-флаг, правило', () => {
    const запрос = составитьЗапрос(projectOverlap(), []);
    assert.equal(запрос.schemaVersion, ASK_SCHEMA);
    assert.deepEqual(запрос.regions.map((r) => r.id), ['a', 'b', 'c']);
    assert.equal(запрос.пересечения.length, 1);
    assert.equal(запрос.пересечения[0].a, 'a');
    assert.equal(запрос.пересечения[0].b, 'b');
    // рука-кейс: inter 0.05·0.3 = 0.015, union 0.09+0.09−0.015 = 0.165
    assert.equal(запрос.пересечения[0].iou, 0.090909);
    assert.equal(запрос.title, 'Испытание · пересечение');
    assert.equal(typeof запрос.правило.власть, 'string');

    const замок = составитьЗапрос(projectLockOverlap(), []);
    assert.equal(замок.regions.find((r) => r.id === 'lock').locked, true);
    assert.equal(замок.regions.find((r) => r.id === 'm').zIndex, null); // нет zIndex → null
    assert.equal(замок.пересечения.length, 1); // факты видны и на паре с замком
  });

  it('составитьЗапрос: журнал скопирован глубоко — мутации копии не доходят до оригинала', () => {
    const журнал = [{ раунд: 1, proposer: 'lattice', исход: 'план', счёт: 2, причина: '' }];
    const запрос = составитьЗапрос(projectOverlap(), журнал);
    запрос.журнал.push({ раунд: 99, proposer: 'мутант' });
    запрос.журнал[0].счёт = -1;
    assert.deepEqual(журнал, [{ раунд: 1, proposer: 'lattice', исход: 'план', счёт: 2, причина: '' }]);
  });

  it('гард: валидная маска — ок, дубликаты съедаются, порядок ответа сохранён', () => {
    const проект = projectOverlap();
    const v = проверитьОтветМодели({ маска: ['b', 'b', 'a'] }, проект);
    assert.equal(v.ок, true);
    assert.deepEqual(v.маска, ['b', 'a']);
  });

  it('гард: пустая маска — ок («нечего чинить» — честный ответ)', () => {
    const v = проверитьОтветМодели({ маска: [] }, projectOverlap());
    assert.equal(v.ок, true);
    assert.deepEqual(v.маска, []);
  });

  it('гард: честный отказ модели — ок, строкой', () => {
    const v = проверитьОтветМодели({ отказ: 'не вижу смысла' }, projectOverlap());
    assert.equal(v.ок, true);
    assert.equal(v.отказ, 'не вижу смысла');
  });

  it('гард: неизвестный id — честный отказ', () => {
    const v = проверитьОтветМодели({ маска: ['нет-такого'] }, projectOverlap());
    assert.equal(v.ок, false);
    assert.match(v.причина, /неизвестный id "нет-такого"/);
  });

  it('гард: locked-регион в маске — честный отказ (замки не чинятся никогда)', () => {
    const v = проверитьОтветМодели({ маска: ['lock'] }, projectLockOverlap());
    assert.equal(v.ок, false);
    assert.match(v.причина, /locked-регион "lock"/);
  });

  it('гард: маска не массив — отказ', () => {
    const v = проверитьОтветМодели({ маска: 'b' }, projectOverlap());
    assert.equal(v.ок, false);
    assert.match(v.причина, /маска не массив/);
  });

  it('гард: id не непустой строкой — отказ', () => {
    const v = проверитьОтветМодели({ маска: [42] }, projectOverlap());
    assert.equal(v.ок, false);
    assert.match(v.причина, /не непустая строка/);
  });

  it('гард: лишние поля рядом с маской — отказ', () => {
    const v = проверитьОтветМодели({ маска: ['b'], причина: 'а это лишнее' }, projectOverlap());
    assert.equal(v.ок, false);
    assert.match(v.причина, /лишние поля/);
  });

  it('гард: отказ, смешанный с маской, — отказ (двусмысленность нечестна)', () => {
    const v = проверитьОтветМодели({ маска: ['b'], отказ: 'и так, и так' }, projectOverlap());
    assert.equal(v.ок, false);
    assert.match(v.причина, /смешан/);
  });

  it('гард: не-объект (null / строка / массив) — отказ, не бросок', () => {
    for (const мусор of [null, 'строка', ['массив']]) {
      const v = проверитьОтветМодели(мусор, projectOverlap());
      assert.equal(v.ок, false);
      assert.match(v.причина, /не объект-конверт/);
    }
  });

  it('makeOpenModelProposer: плохие входы — честный ок:false с причиной, без броска', () => {
    const безИмени = makeOpenModelProposer({ имя: '', модель: демоМодель });
    assert.equal(безИмени.ок, false);
    assert.match(безИмени.причина, /непустая строка/);
    const безМодели = makeOpenModelProposer({ имя: 'open-model:x', модель: 'строка' });
    assert.equal(безМодели.ок, false);
    assert.match(безМодели.причина, /синхронная функция/);
  });

  it('proposer: маска модели → их план ladom.repair.v1, generatedBy — их канона, reason называет модель', () => {
    const сделан = makeOpenModelProposer({ имя: 'open-model:demo', модель: демоМодель, правило: 'жертва — поздняя сторона пары' });
    assert.equal(сделан.ок, true);
    const ответ = сделан.proposer('open-model:demo', projectOverlap(), []);
    assert.ok(ответ.план);
    assert.equal(ответ.план.schemaVersion, REPAIR_SCHEMA);
    assert.deepEqual(ответ.план.mask, ['b']);
    assert.equal(ответ.план.generatedBy, 'masked-repair/0.1'); // план собран их каноном
    assert.match(ответ.план.reason, /open model "open-model:demo"/);
    assert.match(ответ.план.reason, /жертва — поздняя сторона пары/);
  });

  it('proposer: пустая маска → конверт {маска: []} — «нечего чинить» честно', () => {
    const сделан = makeOpenModelProposer({ имя: 'open-model:quiet', модель: тихаяМодель });
    const ответ = сделан.proposer('open-model:quiet', projectOverlap(), []);
    assert.deepEqual(ответ, { маска: [] });
  });

  it('proposer: отказ модели → {отказ} с именем модели, без броска', () => {
    const сделан = makeOpenModelProposer({ имя: 'open-model:shy', модель: отказывающаяМодель });
    const ответ = сделан.proposer('open-model:shy', projectOverlap(), []);
    assert.ok(ответ.отказ);
    assert.match(ответ.отказ, /"open-model:shy" отказалась: не вижу смысла/);
  });

  it('proposer: бросок модели → честный отказ записью, цикл агента не падает', () => {
    const сделан = makeOpenModelProposer({ имя: 'open-model:throw', модель: бросающаяМодель });
    const ответ = сделан.proposer('open-model:throw', projectOverlap(), []);
    assert.ok(ответ.отказ);
    assert.match(ответ.отказ, /модель сломалась честно/);
  });

  it('proposer: модель-мутант не трогает ни проект, ни журнал — мир адаптера копирующий', () => {
    const сделан = makeOpenModelProposer({ имя: 'open-model:mutant', модель: мутантМодель });
    const проект = projectOverlap();
    const журнал = [{ раунд: 1, proposer: 'heuristic', исход: 'план', счёт: 3, причина: '' }];
    const проектДо = JSON.parse(JSON.stringify(проект));
    const журналДо = JSON.parse(JSON.stringify(журнал));
    сделан.proposer('open-model:mutant', проект, журнал);
    assert.deepEqual(JSON.parse(JSON.stringify(проект)), проектДо);
    assert.deepEqual(журнал, журналДо);
  });

  it('registerOpenModel: успех — их listProposers().имена видит адаптер, списокАдаптеров() говорит правду о моделях', () => {
    const итог = registerOpenModel({ имя: 'open-model:demo', модель: демоМодель, правило: 'тест-модель такта' });
    assert.equal(итог.ок, true);
    assert.equal(итог.имя, 'open-model:demo');
    assert.ok(listProposers().имена.includes('open-model:demo')); // их реестр принял
    const адаптеры = списокАдаптеров();
    assert.ok(адаптеры.имена.includes('open-model:demo'));
    assert.match(адаптеры.пометка, /весов в модуле нет/);
  });

  it('registerOpenModel: дубликат имени и плохой вход — честный false-отказ, их реестр не перезаписывается', () => {
    const дубль = registerOpenModel({ имя: 'open-model:demo', модель: тихаяМодель });
    assert.equal(дубль.ок, false);
    assert.match(дубль.причина, /не принял|имя занято/);
    const плохойИмя = registerOpenModel({ имя: '', модель: демоМодель });
    assert.equal(плохойИмя.ок, false);
    const плохаяМодель = registerOpenModel({ имя: 'open-model:bad', модель: 123 });
    assert.equal(плохаяМодель.ок, false);
    assert.ok(!listProposers().имена.includes('open-model:bad'));
  });

  it('E2E runRepairAgent: демо-модель чинит пересечение — b сдвинут, a/c те же ссылки, память честная', () => {
    // Семантика их цикла v10.85 (проверена на этом тесте и зафиксирована в ОТЧЁТ_P4.1):
    // ремонт происходит в раунде 1 (итог.лучший), раунд 2 честно находит «нечего
    // чинить» и останавливает цикл — финальный статус говорит о ПОСЛЕДНЕМ раунде.
    const проект = projectOverlap();
    const итог = runRepairAgent(проект, { proposers: ['open-model:demo'], rounds: 2 });
    assert.equal(итог.раундов, 2);
    assert.ok(итог.лучший);
    assert.equal(итог.лучший.раунд, 1);
    assert.equal(итог.лучший.proposer, 'open-model:demo');
    assert.equal(typeof итог.лучший.счёт, 'number');
    assert.match(итог.причина, /нечего чинить/);
    const регионы = итог.проект.regions;
    const a = регионы.find((r) => r.id === 'a');
    const b = регионы.find((r) => r.id === 'b');
    const c = регионы.find((r) => r.id === 'c');
    assert.equal(a, проект.regions[0]); // удержанные — те же объекты
    assert.equal(c, проект.regions[2]);
    assert.notEqual(b, проект.regions[1]); // b — новый объект
    assert.equal(bboxIoU(b.bbox, a.bbox), 0); // пересечение закрыто
    const планЗапись = итог.память.find((z) => z.раунд === 1 && z.proposer === 'open-model:demo');
    assert.equal(планЗапись.исход, 'план');
    const тихаяЗапись = итог.память.find((z) => z.раунд === 2 && z.proposer === 'open-model:demo');
    assert.equal(тихаяЗапись.исход, 'пусто');
  });

  it('E2E: два прогона агента с адаптером — байт-в-байт', () => {
    const p1 = runRepairAgent(projectOverlap(), { proposers: ['open-model:demo', 'heuristic'], rounds: 3 });
    const p2 = runRepairAgent(projectOverlap(), { proposers: ['open-model:demo', 'heuristic'], rounds: 3 });
    assert.equal(JSON.stringify(p1), JSON.stringify(p2));
  });

  it('E2E: тихий проект — честное «нечего чинить», проект — тот же объект (применений не было)', () => {
    const проект = projectQuiet();
    const итог = runRepairAgent(проект, { proposers: ['open-model:quiet'] });
    assert.equal(итог.статус, 'нечего-чинить');
    assert.equal(итог.проект, проект); // ссылочное равенство — применений не было
    assert.match(итог.причина, /применения не было/);
    const запись = итог.память.find((z) => z.proposer === 'open-model:quiet');
    assert.equal(запись.исход, 'пусто');
  });

  it('E2E: мусор модели — честный отказ в памяти, дом не падает и не притворяется', () => {
    const проект = projectOverlap();
    const итог = runRepairAgent(проект, { proposers: ['open-model:mutant-garbage'] });
    assert.equal(итог.статус, 'нечего-чинить');
    const запись = итог.память.find((z) => z.proposer === 'open-model:mutant-garbage');
    assert.equal(запись.исход, 'отказ');
    assert.match(запись.причина, /не объект-конверт|модель/);
  });

  it('статика источника: ровно три канон-импорта, 0 сети, 0 часов, 0 случайности, 0 инъекций', () => {
    const src = fs.readFileSync(SRC, 'utf8');
    const импорты = src.split('\n').filter((l) => /^import .* from '\.\//.test(l));
    assert.equal(импорты.length, 3);
    assert.match(импорты[0], /from '\.\/masked-repair\.mjs';/);
    assert.match(импорты[1], /from '\.\/qa-metrics\.mjs';/);
    assert.match(импорты[2], /from '\.\/repair-agent\.mjs';/);
    for (const запрещённое of [/fetch\(/, /XMLHttpRequest/, /\bDate\b/, /Math\.random/, /\beval\(/, /innerHTML/, /localStorage/, /\bWebSocket\b/]) {
      assert.ok(!запрещённое.test(src), `в каноне найдено запрещённое: ${запрещённое}`);
    }
    assert.match(src, /export const ver = 'open-model-adapter\/0\.1';/);
    assert.match(src, /ladom\.open-model-ask\.v1/);
  });
});

// Регистрации хвоста тест-моделей — на загрузке модуля (до прогона тестов):
// node:test исполняет файл целиком раньше тестов, а спорить имена будут только
// с тестом дубликата, который пробует ровно 'open-model:demo' — этот вкомкан
// самим тестом 22 их registerOpenModel'ом.
registerProposer('open-model:quiet', makeOpenModelProposer({ имя: 'open-model:quiet', модель: тихаяМодель }).proposer);
registerProposer('open-model:mutant-garbage', makeOpenModelProposer({ имя: 'open-model:mutant-garbage', модель: мусорнаяМодель }).proposer);
