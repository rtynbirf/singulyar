// test_takt_10.90_reve_mock.mjs — ЛАДОМ·СИНГУЛЯР, такт v10.90 «ЗАКОН».
// Строка карты: Л1 (P1 Reve-адаптер) — mock-ход по решению владельца
// «заводим mock и двигаем адаптер без них» (2026-10-13).
//
// Канон — src/reve-adapter.mjs (reve-adapter/0.1): полный контракт ТЗ Reve
// (03_TZ_IMPLEMENTATION.md, слой D) на честном моке — 0 сети, 0 токена,
// 0 часов, 0 случайности; статус «mock», image:null, MOCK_NO_TOKEN,
// retryable:true; INVALID_PAYLOAD на плохом входе; закон I-08 — контракт
// адаптера один, мок не меняет смысл.
//
// Честные границы проверок:
//   - детерминизм байт-в-байт: два renderLayout → одинаковый конверт (JSON.stringify);
//   - статика источника: 0 сети (fetch/XMLHttpRequest/WebSocket/EventSource/
//     sendBeacon), 0 часов (Date.now/new Date), 0 случайности (Math.random),
//     0 eval/innerHTML, 0 импортов (самодостаточен);
//   - валидация: bbox вне 0..1, не-числа, дубли id, пустой prompt, перебор
//     регионов, чужой schemaVersion — отказ с причиной, ничего не чинится молча;
//   - round-trip Project → wire → Project байт-в-байт.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ver, LEDGER_SCHEMA, СХЕМА_ПРОЕКТА, СХЕМА_WIRE, МАКС_РЕГИОНОВ,
  валидироватьПроект, createLayout, extractLayout, renderLayout, reconcileLayout, режим,
} from '../src/reve-adapter.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', 'src', 'reve-adapter.mjs');
const src = fs.readFileSync(SRC, 'utf8');

const глубокаяКопия = (x) => JSON.parse(JSON.stringify(x));

function проект() {
  return {
    schemaVersion: 'ladom.project.v1',
    title: 'Обложка — пример композиции',
    canvas: { width: 1024, height: 1024, aspectRatio: '1:1' },
    regions: [
      { id: 'background', label: 'Фон', prompt: 'Мягкий тёплый градиент, без текста',
        bbox: { x: 0, y: 0, width: 1, height: 1 }, zIndex: 0, locked: false },
      { id: 'hero-object', label: 'Главный объект', prompt: 'Один выразительный центральный объект',
        bbox: { x: 0.25, y: 0.18, width: 0.5, height: 0.52 }, zIndex: 1, locked: false },
      { id: 'title-area', label: 'Область заголовка', prompt: 'Спокойное пустое пространство',
        bbox: { x: 0.1, y: 0.76, width: 0.8, height: 0.16 }, zIndex: 2, locked: true },
    ],
  };
}

describe('reve-adapter/0.1 — паспорт', () => {
  it('версия и ledger-схема названы честно', () => {
    assert.equal(ver, 'reve-adapter/0.1');
    assert.equal(LEDGER_SCHEMA, 'ladom.reve.v1');
    assert.equal(СХЕМА_ПРОЕКТА, 'ladom.project.v1');
    assert.equal(СХЕМА_WIRE, 'reve.layout.mock/0.1');
  });
  it('режим назван моком прямо, без ложных обещаний', () => {
    const р = режим();
    assert.ok(р.includes('mock'), 'в режиме должно быть слово mock');
    assert.ok(р.includes('0 сети'), 'режим честно говорит про 0 сети');
  });
});

describe('статика источника — честный мок', () => {
  it('0 сети: ни fetch, ни XMLHttpRequest, ни WebSocket, ни EventSource, ни sendBeacon', () => {
    for (const слово of ['fetch(', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'sendBeacon', "import('"]) {
      assert.ok(!src.includes(слово), `в источнике не должно быть ${слово}`);
    }
  });
  it('0 часов: ни Date.now, ни new Date — детерминизм без времени', () => {
    assert.ok(!src.includes('Date.now'));
    assert.ok(!src.includes('new Date'));
  });
  it('0 случайности: Math.random запрещён', () => {
    assert.ok(!src.includes('Math.random'));
  });
  it('0 eval/innerHTML и 0 импортов — самодостаточен', () => {
    assert.ok(!src.includes('eval('));
    assert.ok(!src.includes('innerHTML'));
    assert.equal(src.match(/^import /gm), null, 'импортов быть не должно');
  });
});

describe('валидация проекта — ничего не чинится молча', () => {
  it('хороший проект проходит', () => {
    const п = проект();
    assert.deepEqual(валидироватьПроект(п), { ok: true });
  });
  it('bbox вне 0..1 — отказ с причиной', () => {
    const п = проект();
    п.regions[1].bbox.x = 1.5;
    const в = валидироватьПроект(п);
    assert.equal(в.ok, false);
    assert.ok(в.причина.includes('0..1'));
  });
  it('не-число в bbox — отказ', () => {
    const п = проект();
    п.regions[0].bbox.width = 'половина';
    assert.equal(валидироватьПроект(п).ok, false);
  });
  it('дубль id — отказ', () => {
    const п = проект();
    п.regions[2].id = 'background';
    const в = валидироватьПроект(п);
    assert.equal(в.ok, false);
    assert.ok(в.причина.includes('повторяется'));
  });
  it('пустой prompt — отказ', () => {
    const п = проект();
    п.regions[0].prompt = '   ';
    assert.equal(валидироватьПроект(п).ok, false);
  });
  it('перебор регионов — отказ по лимиту', () => {
    const п = проект();
    п.regions = Array.from({ length: МАКС_РЕГИОНОВ + 1 }, (_, i) => ({
      id: `r${i}`, prompt: 'регион', bbox: { x: 0, y: 0, width: 0.1, height: 0.1 },
    }));
    const в = валидироватьПроект(п);
    assert.equal(в.ok, false);
    assert.ok(в.причина.includes('больше'));
  });
  it('чужой schemaVersion — отказ без угадывания', () => {
    const п = проект();
    п.schemaVersion = 'что-то-другое.v9';
    assert.equal(валидироватьПроект(п).ok, false);
  });
  it('не-объект — отказ, броска нет (конверт)', () => {
    assert.equal(валидироватьПроект(null).ok, false);
    assert.equal(валидироватьПроект([1]).ok, false);
    assert.equal(валидироватьПроект('проект').ok, false);
  });
});

describe('createLayout / extractLayout — round-trip', () => {
  it('Project → wire: все поля на месте, замки честны', () => {
    const п = проект();
    const w = createLayout(п);
    assert.equal(w.schemaVersion, 'reve.layout.mock/0.1');
    assert.equal(w.regions.length, 3);
    assert.equal(w.regions[2].locked, true);
    assert.deepEqual(w.regions[1].bbox, { x: 0.25, y: 0.18, width: 0.5, height: 0.52 });
  });
  it('wire → Project → wire: байт-в-байт', () => {
    const п = проект();
    const w1 = createLayout(п);
    const п2 = extractLayout(w1);
    const w2 = createLayout(п2);
    assert.equal(JSON.stringify(w1), JSON.stringify(w2));
  });
  it('вход не мутируется', () => {
    const п = проект();
    const снимок = глубокаяКопия(п);
    createLayout(п);
    assert.equal(JSON.stringify(п), JSON.stringify(снимок));
  });
  it('плохой wire — TypeError с причиной, чужая схема не угадывается', () => {
    assert.throws(() => extractLayout({ schemaVersion: 'reve.layout/9.9' }), /schemaVersion/);
    assert.throws(() => extractLayout(null), /wire/);
  });
  it('createLayout на плохом проекте — TypeError (валидатор впереди)', () => {
    const п = проект();
    п.regions[0].bbox.y = -0.1;
    assert.throws(() => createLayout(п), TypeError);
  });
});

describe('renderLayout — честный мок', () => {
  it('конверт полон и честен: status mock, image null, MOCK_NO_TOKEN, retryable', () => {
    const р = renderLayout(проект());
    assert.equal(р.status, 'mock');
    assert.equal(р.image, null);
    assert.equal(р.contentViolation, false);
    assert.equal(р.errorCode, 'MOCK_NO_TOKEN');
    assert.equal(р.retryable, true);
    assert.equal(р.creditsUsed, 0);
    assert.equal(р.creditsRemaining, null);
    assert.ok(р.причина.includes('mock'), 'причина названа прямо');
    assert.ok(р.requestId.startsWith('mock-'));
    assert.equal(р.version, 'reve-adapter/0.1');
  });
  it('детерминизм: два прогона байт-в-байт (одинаковый requestId)', () => {
    const р1 = JSON.stringify(renderLayout(проект()));
    const р2 = JSON.stringify(renderLayout(проект()));
    assert.equal(р1, р2);
  });
  it('плохой проект → INVALID_PAYLOAD, retryable false, requestId null', () => {
    const п = проект();
    п.regions[1].bbox.width = 2;
    const р = renderLayout(п);
    assert.equal(р.status, 'invalid');
    assert.equal(р.errorCode, 'INVALID_PAYLOAD');
    assert.equal(р.retryable, false);
    assert.equal(р.requestId, null);
    assert.ok(р.причина.includes('0..1'));
  });
  it('requestId зависит от содержания: другой регион — другой id', () => {
    const п = проект();
    п.regions[0].label = 'Фон другой';
    const р = renderLayout(п);
    assert.notEqual(р.requestId, renderLayout(проект()).requestId);
  });
});

describe('reconcileLayout — сверка не притворяется', () => {
  it('мок-результат: сверять не с чем, проект не тронут', () => {
    const п = проект();
    const р = renderLayout(п);
    const отчёт = reconcileLayout(п, р);
    assert.equal(отчёт.сверено, false);
    assert.ok(отчёт.причина.includes('моком'));
  });
  it('не-объект result — TypeError; чужой status — честный отказ', () => {
    const п = проект();
    assert.throws(() => reconcileLayout(п, null), TypeError);
    const о = reconcileLayout(п, { status: 'что-то' });
    assert.equal(о.сверено, false);
  });
});
