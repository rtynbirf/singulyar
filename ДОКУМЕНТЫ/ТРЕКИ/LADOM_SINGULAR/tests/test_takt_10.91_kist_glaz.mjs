// test_takt_10.91_kist_glaz.mjs — ЛАДОМ·СИНГУЛЯР, такт v10.91 «СВОИ».
// Строка карты: Л1 закрыта СВОИМ путём (приказ владельца 2026-10-13: «МЫ САМИ С УСАМИ…
// ОТ НОЛЯ ДО ИХ УРОВНЯ И ДАЖЕ НА ГОЛОВУ ЛУЧШЕ»; закон I-13 «СВОЙ МЕХАНИЗМ»).
//
// Канон такта:
//   src/svoya-kist.mjs (svoya-kist/0.1) — СВОЯ КИСТЬ: renderLayout(Project → SVG),
//     альтернативныйТекст (словесная картина для незрячего), ledger ladom.svoya-kist.v1;
//   src/svoy-glaz.mjs (svoy-glaz/0.1) — СВОЙ ГЛАЗ: extractLayout (SVG кисти → Project,
//     round-trip), reconcileLayout + маска в их repair-agent, применитьКоманду
//     (add|shift|remove|place|keep|change), мост toReveWire/fromReveWire.
//
// Проверяемые честные границы:
//   - детерминизм байт-в-байт (два вызова — один выход) у кисти, глаза, команд;
//   - статика источников: 0 сети / 0 часов / 0 случайности / 0 eval / 0 innerHTML;
//   - импортов ровно один на модуль — канон дома ./reve-adapter.mjs;
//   - экранирование пользовательских строк в SVG (innerHTML-двери нет);
//   - замки не снимаются и не двигаются никогда;
//   - вход команд не мутируется; round-trip Project → SVG → Project точен;
//   - мост x0/y0/x1/y1 туда-обратно; чужие схемы — честный отказ.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { renderLayout, альтернативныйТекст, ledgerЗапись, ver as KIST_VER } from '../src/svoya-kist.mjs';
import {
  extractLayout, reconcileLayout, маскаИзОтчёта, применитьКоманду,
  toReveWire, fromReveWire, ver as GLAZ_VER,
} from '../src/svoy-glaz.mjs';
import { валидироватьПроект } from '../src/reve-adapter.mjs';

const j = (x) => JSON.stringify(x);

const проект3 = {
  schemaVersion: 'ladom.project.v1',
  title: 'Вечер ·31',
  canvas: { width: 1920, height: 1080, aspectRatio: '16:9' },
  regions: [
    { id: 'a-titul', type: 'visual', label: 'Титул', prompt: 'крупный заголовок вечера', bbox: { x: 0.05, y: 0.05, width: 0.9, height: 0.2 }, zIndex: 3, locked: true },
    { id: 'b-сцена', type: 'music', label: 'Сцена', prompt: 'живой луп 92 bpm', role: 'melody', bbox: { x: 0.1, y: 0.35, width: 0.5, height: 0.4 }, zIndex: 1 },
    { id: 'c-зал', type: 'visual', label: 'Зал', prompt: 'круг своих за столом', role: 'pass_turn', bbox: { x: 0.55, y: 0.3, width: 0.35, height: 0.55 }, zIndex: 2 },
  ],
};

describe('svoya-kist/0.1 — СВОЯ КИСТЬ', () => {
  it('T01 рендер валидного проекта: status ok, image — строка SVG', () => {
    const р = renderLayout(проект3);
    assert.equal(р.status, 'ok');
    assert.equal(typeof р.image, 'string');
    assert.ok(р.image.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
    assert.ok(р.image.endsWith('</svg>'));
  });
  it('T02 детерминизм байт-в-байт: два рендера — одна картинка', () => {
    assert.equal(j(renderLayout(проект3)), j(renderLayout(проект3)));
  });
  it('T03 requestId детерминирован (FNV-1a проекта) и различает проекты', () => {
    const р1 = renderLayout(проект3);
    const другой = { ...проект3, regions: проект3.regions.slice(0, 2) };
    const р2 = renderLayout(другой);
    assert.ok(р1.requestId.startsWith('kist-') && р2.requestId.startsWith('kist-'));
    assert.notEqual(р1.requestId, р2.requestId);
  });
  it('T04 цена рендера: свои кредиты — 0; contentViolation false; errorCode null', () => {
    const р = renderLayout(проект3);
    assert.equal(р.creditsUsed, 0);
    assert.equal(р.contentViolation, false);
    assert.equal(р.errorCode, null);
    assert.equal(р.version, KIST_VER);
  });
  it('T05 плохой проект — статус invalid, не бросок, image null', () => {
    const р = renderLayout({ schemaVersion: 'чужая', regions: [] });
    assert.equal(р.status, 'invalid');
    assert.equal(р.errorCode, 'INVALID_PAYLOAD');
    assert.equal(р.image, null);
    assert.ok(р.причина.length > 10);
  });
  it('T06 экранирование SVG: пользовательские строки не становятся разметкой', () => {
    const р = renderLayout({
      schemaVersion: 'ladom.project.v1', canvas: { width: 800, height: 600 },
      regions: [{ id: 'x1', type: 'visual', label: '</g><script>alert(1)</script>', prompt: '"onclick="x', bbox: { x: 0.1, y: 0.1, width: 0.5, height: 0.3 } }],
    });
    assert.ok(!р.image.includes('<script'));
    assert.ok(!р.image.includes('</g><script'));
    assert.ok(р.image.includes('&lt;/g&gt;&lt;script&gt;'));
    assert.ok(р.image.includes('&quot;onclick=&quot;x'));
  });
  it('T07 слои по zIndex, затем id', () => {
    const р = renderLayout(проект3);
    const порядок = [...р.image.matchAll(/data-region-id="([^"]*)"/g)].map((m) => m[1]);
    assert.deepEqual(порядок, ['b-сцена', 'c-зал', 'a-titul']);
  });
  it('T08 замок рисуется штрихом и помечен data-locked="1"; отсутствие замка — отсутствие метки', () => {
    const р = renderLayout(проект3);
    assert.ok(р.image.includes('stroke-dasharray="6 4"'));
    assert.ok(р.image.includes('data-locked="1"'));
    // b-сцена/c-зал без поля locked — метка честно не пишется (не «false», а «не сказано»)
    assert.ok(!р.image.includes('data-locked="0"'));
  });
  it('T09 пустой холст (0 регионов) — ok, без групп', () => {
    const р = renderLayout({ schemaVersion: 'ladom.project.v1', canvas: { width: 640, height: 480 }, regions: [] });
    assert.equal(р.status, 'ok');
    assert.ok(!р.image.includes('<g '));
  });
  it('T10 альтернативный текст детерминирован, называет регионы и проценты', () => {
    const t1 = альтернативныйТекст(проект3);
    assert.equal(t1, альтернативныйТекст(проект3));
    assert.ok(t1.includes('Вечер ·31'));
    assert.ok(t1.includes('Титул') && t1.includes('Сцена') && t1.includes('Зал'));
    assert.ok(t1.includes('замок'));
    assert.ok(t1.includes('Регионов 3'));
  });
  it('T11 ledger: схема, без timestamps, байты = длина image', () => {
    const р = renderLayout(проект3);
    const л = ledgerЗапись(проект3, р);
    assert.equal(л.схема, 'ladom.svoya-kist.v1');
    assert.equal(л.регионов, 3);
    assert.equal(л.байтов_изображения, р.image.length);
    assert.equal(j(Object.keys(л)).includes('timestamp'), false);
  });
  it('T12 ledger на чужом result — честный TypeError', () => {
    assert.throws(() => ledgerЗапись(проект3, 'не объект'), TypeError);
  });
});

describe('svoy-glaz/0.1 — СВОЙ ГЛАЗ: extract + round-trip', () => {
  it('T13 round-trip: Project → кисть → глаз → тот же проект', () => {
    const р = renderLayout(проект3);
    const обратно = extractLayout(р.image);
    assert.equal(j(обратно), j(проект3));
    assert.ok(валидироватьПроект(обратно).ok);
  });
  it('T14 round-trip с metadata: пользовательский объект сохраняется', () => {
    const п = {
      schemaVersion: 'ladom.project.v1', canvas: { width: 100, height: 100 },
      regions: [{ id: 'm1', prompt: 'p', bbox: { x: 0, y: 0, width: 0.5, height: 0.5 }, metadata: { вена: 'ми', n: 7 } }],
    };
    const обратно = extractLayout(renderLayout(п).image);
    assert.equal(j(обратно), j(п));
  });
  it('T15 чужой SVG (нет data-kist) — TypeError, не угадывание', () => {
    assert.throws(() => extractLayout('<svg xmlns="x"></svg>'), /не картинка нашей кисти/);
  });
  it('T16 SVG чужой кисти (нет data-schema) — TypeError', () => {
    const р = renderLayout(проект3).image.replace(`data-schema="ladom.project.v1" `, '');
    assert.throws(() => extractLayout(р), /чужая схема не угадывается/);
  });
  it('T17 не-строка — честный TypeError', () => {
    assert.throws(() => extractLayout(123), TypeError);
    assert.throws(() => extractLayout(''), TypeError);
  });
  it('T18 рваный формат кисти (убран data-bbox) — TypeError', () => {
    const р = renderLayout(проект3).image.replace(/ data-bbox="[^"]*"/g, '');
    assert.throws(() => extractLayout(р), /формата кисти нарушен|нарушен/);
  });
});

describe('svoy-glaz/0.1 — СВЕРКА (reconcile)', () => {
  it('T19 одинаковые проекты: 0 изменений, маска пуста', () => {
    const о = reconcileLayout(проект3, проект3);
    assert.equal(о.сверено, true);
    assert.equal(о.изменений, 0);
    assert.deepEqual(о.маска, []);
    assert.equal(о.схема, 'ladom.glaz-reconcile.v1');
  });
  it('T20 сдвиг региона виден: изменения и маска', () => {
    const правка = { ...проект3, regions: проект3.regions.map((r) => (r.id === 'b-сцена' ? { ...r, bbox: { ...r.bbox, x: 0.2 } } : r)) };
    const о = reconcileLayout(проект3, правка);
    assert.equal(о.изменений, 1);
    assert.deepEqual(о.шаги[0].изменения, ['сдвинут']);
    assert.deepEqual(о.маска, ['b-сцена']);
  });
  it('T21 добавление/удаление видны; замок в маску не попадает', () => {
    const сДобав = { ...проект3, regions: [...проект3.regions, { id: 'd-нов', prompt: 'новый', bbox: { x: 0.8, y: 0.1, width: 0.1, height: 0.1 } }] };
    const о1 = reconcileLayout(проект3, сДобав);
    assert.deepEqual(о1.маска, ['d-нов']);
    const сУдал = { ...проект3, regions: проект3.regions.filter((r) => r.id !== 'c-зал') };
    const о2 = reconcileLayout(проект3, сУдал);
    assert.deepEqual(о2.шаги[0].изменения, ['удалён']);
    const сдвигЗамка = { ...проект3, regions: проект3.regions.map((r) => (r.id === 'a-titul' ? { ...r, bbox: { ...r.bbox, x: 0.1 } } : r)) };
    const о3 = reconcileLayout(проект3, сдвигЗамка);
    assert.deepEqual(о3.шаги[0].изменения, ['сдвинут']);
    assert.deepEqual(о3.маска, []); // замки не чинятся никогда
  });
  it('T22 детерминизм сверки: два вызова — байт-в-байт', () => {
    const правка = { ...проект3, title: 'Другое' };
    assert.equal(j(reconcileLayout(проект3, правка)), j(reconcileLayout(проект3, правка)));
  });
  it('T23 плохой проект на входе сверки — TypeError', () => {
    assert.throws(() => reconcileLayout(проект3, { regions: 'нет' }), TypeError);
  });
  it('T24 маскаИзОтчёта: копия маски, чужой отчёт — TypeError', () => {
    const правка = { ...проект3, regions: проект3.regions.map((r) => (r.id === 'b-сцена' ? { ...r, prompt: 'другой луп' } : r)) };
    const о = reconcileLayout(проект3, правка);
    const м = маскаИзОтчёта(о);
    assert.deepEqual(м, ['b-сцена']);
    assert.notEqual(м, о.маска);
    assert.throws(() => маскаИзОтчёта({ схема: 'чужая' }), TypeError);
  });
});

describe('svoy-glaz/0.1 — КОМАНДЫ (их шесть, наши)', () => {
  const к = (c) => применитьКоманду(проект3, c);
  it('T25 add: новый регион добавлен, вход не мутирован', () => {
    const н = { id: 'd-нов', type: 'event', prompt: 'стоп-горн', bbox: { x: 0.7, y: 0.85, width: 0.2, height: 0.1 } };
    const было = j(проект3);
    const р = к({ op: 'add', регион: н });
    assert.equal(р.ok, true);
    assert.equal(р.проект.regions.length, 4);
    assert.equal(j(проект3), было);
  });
  it('T26 add: дубль id и пустой prompt — честный отказ', () => {
    assert.ok(!к({ op: 'add', регион: { id: 'b-сцена', prompt: 'x', bbox: { x: 0, y: 0, width: 0.1, height: 0.1 } } }).ok);
    assert.ok(!к({ op: 'add', регион: { id: 'd-нов', prompt: '  ', bbox: { x: 0, y: 0, width: 0.1, height: 0.1 } } }).ok);
  });
  it('T27 shift: движение по холсту; вход чист', () => {
    const р = к({ op: 'shift', id: 'b-сцена', dx: 0.1, dy: 0 });
    assert.equal(р.ok, true);
    assert.equal(р.проект.regions.find((r) => r.id === 'b-сцена').bbox.x, 0.2); // 0.1+0.1 — точный float
  });
  it('T28 shift: выход за холст и замок — честный отказ', () => {
    assert.ok(!к({ op: 'shift', id: 'b-сцена', dx: 0.9, dy: 0 }).ok);
    assert.ok(!к({ op: 'shift', id: 'a-titul', dx: 0.01, dy: 0 }).ok);
  });
  it('T29 remove: свой убирается, замок — нет; неизвестный id — отказ', () => {
    const р = к({ op: 'remove', id: 'c-зал' });
    assert.equal(р.ok, true);
    assert.equal(р.проект.regions.length, 2);
    assert.ok(!к({ op: 'remove', id: 'a-titul' }).ok);
    assert.ok(!к({ op: 'remove', id: 'нету' }).ok);
  });
  it('T30 place: новая позиция валидна; невалидная — отказ', () => {
    const р = к({ op: 'place', id: 'c-зал', bbox: { x: 0.0, y: 0.0, width: 0.3, height: 0.3 } });
    assert.equal(р.ok, true);
    assert.ok(!к({ op: 'place', id: 'c-зал', bbox: { x: -0.1, y: 0, width: 0.3, height: 0.3 } }).ok);
    assert.ok(!к({ op: 'place', id: 'a-titul', bbox: { x: 0.2, y: 0, width: 0.3, height: 0.3 } }).ok);
  });
  it('T31 change: поля меняются; чужое поле и bbox — отказ', () => {
    const р = к({ op: 'change', id: 'b-сцена', поля: { label: 'Сцена главная' } });
    assert.equal(р.ok, true);
    assert.equal(р.проект.regions.find((r) => r.id === 'b-сцена').label, 'Сцена главная');
    assert.ok(!к({ op: 'change', id: 'b-сцена', поля: { чегоНеБывает: 1 } }).ok);
    assert.ok(!к({ op: 'change', id: 'b-сцена', поля: { bbox: {} } }).ok);
  });
  it('T32 keep: без изменений, честная отметка намерения', () => {
    const р = к({ op: 'keep', id: 'a-titul' });
    assert.equal(р.ok, true);
    assert.equal(р.проект, проект3);
    assert.ok(String(р.отмечено).includes('держать'));
  });
  it('T33 неизвестная команда и структурный мусор — отказ/TypeError', () => {
    assert.ok(!к({ op: 'steal' }).ok);
    assert.throws(() => применитьКоманду(проект3, 'не объект'), TypeError);
    assert.throws(() => применитьКоманду({ schemaVersion: 'чужая' }, { op: 'add' }), TypeError);
  });
  it('T34 детерминизм команд: два вызова — байт-в-байт', () => {
    const c = { op: 'shift', id: 'b-сцена', dx: 0.1, dy: -0.05 };
    assert.equal(j(к(c)), j(к(c)));
  });
});

describe('svoy-glaz/0.1 — МОСТ в их форму (x0/y0/x1/y1)', () => {
  it('T35 toReveWire: bbox переводится, prompt/label на месте', () => {
    const w = toReveWire(проект3);
    assert.equal(w.schemaVersion, 'ladom.reve-bridge.v1');
    const первый = w.regions.find((r) => r.label === 'Титул');
    assert.deepEqual(первый.bbox, { x0: 0.05, y0: 0.05, x1: 0.05 + 0.9, y1: 0.05 + 0.2 }); // честная плавающая точка
  });
  it('T36 fromReveWire(toReveWire(p)) — обратимая посадка', () => {
    const обратно = fromReveWire(toReveWire(проект3));
    assert.ok(валидироватьПроект(обратно).ok);
    assert.equal(обратно.regions.length, проект3.regions.length);
    // Честная граница моста: x1-x0 — обратное вычитание плавающей точки,
    // ширина сходится с точностью 1e-12 (сами x0/y0 — точные).
    assert.equal(обратно.regions[0].bbox.x, проект3.regions[0].bbox.x);
    const б = обратно.regions[0].bbox;
    assert.ok(Math.abs(б.width - проект3.regions[0].bbox.width) < 1e-12);
    assert.ok(Math.abs(б.height - проект3.regions[0].bbox.height) < 1e-12);
  });
  it('T37 fromReveWire: чужая схема и bbox вне 0..1 — честный TypeError', () => {
    assert.throws(() => fromReveWire({ schemaVersion: 'чужая', regions: [] }), /чужие схемы не угадываются/);
    assert.throws(() => fromReveWire({
      schemaVersion: 'ladom.reve-bridge.v1', width: 100, height: 100,
      regions: [{ prompt: 'x', bbox: { x0: 0, y0: 0, x1: 1.5, y1: 0.5 } }],
    }), TypeError);
  });
});

describe('ИНТЕГРАЦИЯ такта — кисть + глаз + их канон', () => {
  it('T38 цикл: правка командой → рендер → глаз → сверка показывает шаг', () => {
    const сдвинуто = применитьКоманду(проект3, { op: 'shift', id: 'b-сцена', dx: 0.1, dy: 0 }).проект;
    const р = renderLayout(сдвинуто);
    assert.equal(р.status, 'ok');
    const глазом = extractLayout(р.image);
    const о = reconcileLayout(проект3, глазом);
    assert.deepEqual(о.маска, ['b-сцена']);
    assert.deepEqual(о.шаги[0].изменения, ['сдвинут']);
  });
  it('T39 статика источников: 0 сети / 0 часов / 0 случайности / 0 eval / 0 innerHTML', () => {
    const файлы = [
      join(dirname(fileURLToPath(import.meta.url)), '../src/svoya-kist.mjs'),
      join(dirname(fileURLToPath(import.meta.url)), '../src/svoy-glaz.mjs'),
    ];
    for (const ф of файлы) {
      const т = readFileSync(ф, 'utf8');
      assert.ok(!/fetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon/.test(т), ф + ': сеть');
      assert.ok(!/Date\.now|new Date\(/.test(т), ф + ': часы');
      assert.ok(!/Math\.random/.test(т), ф + ': случайность');
      assert.ok(!/\beval\s*\(|innerHTML/.test(т), ф + ': eval/innerHTML');
    }
  });
  it('T40 импорт ровно один — канон дома ./reve-adapter.mjs', () => {
    const база = join(dirname(fileURLToPath(import.meta.url)), '../src/');
    for (const ф of ['svoya-kist.mjs', 'svoy-glaz.mjs']) {
      const т = readFileSync(join(база, ф), 'utf8');
      const импорты = [...т.matchAll(/^import\s.+from\s+'([^']+)'/gm)].map((m) => m[1]);
      assert.deepEqual(импорты, ['./reve-adapter.mjs'], ф);
    }
  });
  it('T41 закон I-13: версии такта названы, границы честны', () => {
    assert.equal(KIST_VER, 'svoya-kist/0.1');
    assert.equal(GLAZ_VER, 'svoy-glaz/0.1');
    const р = renderLayout(проект3);
    assert.ok(р.причина.includes('I-13'));
  });
});
