/* ═══════════════════════════════════════════════════════════════════
   Пробы канона opfs-core/0.1 (node --test) — такт v11.22 «СТОЙКОСТЬ».
   OPFS-шим: честная in-memory модель контракта OPFS + Storage-шим.
   ═══════════════════════════════════════════════════════════════════ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ИМЯ, создатьЯдро } from '../src/opfs-core.mjs';

/* ── OPFS-шим: in-memory файловая система источника ─────────────── */
class ШимПисатель {
  constructor(шим, ид) { this.шим = шим; this.ид = ид; this.куски = []; }
  async write(б) { this.куски.push(б instanceof Uint8Array ? б : new Uint8Array(await б.arrayBuffer())); }
  async close() { let n = 0; for (const к of this.куски) n += к.byteLength; const из = new Uint8Array(n); let о = 0; for (const к of this.куски) { из.set(к, о); о += к.byteLength; } this.шим.файлы.set(this.ид, из); }
}
class ШимФайлХендл {
  constructor(шим, ид) { this.шим = шим; this.ид = ид; }
  async createWritable() { if (this.шим.падатьЗапись) throw new Error('диск переполнен (шим)'); return new ШимПисатель(this.шим, this.ид); }
  async getFile() {
    const б = this.шим.файлы.get(this.ид);
    if (!б) throw new Error('NotFoundError (шим): ' + this.ид);
    const коп = б.slice();
    return { type: 'application/octet-stream', size: коп.byteLength, arrayBuffer: async () => коп.buffer.slice(коп.byteOffset, коп.byteOffset + коп.byteLength) };
  }
}
class ШимКаталог {
  constructor(шим) { this.шим = шим; }
  async getDirectoryHandle(имя, оп) {
    assert.equal(имя, this.шим.ждётКаталог, 'шим: имя каталога');
    if (оп && оп.create) this.шим.создавалиКаталог = true;
    return this;
  }
  async getFileHandle(ид, оп) {
    if (!оп || !оп.create) { if (!this.шим.файлы.has(ид)) throw new Error('NotFoundError (шим): ' + ид); }
    this.шим.файлы.has(ид); return new ШимФайлХендл(this.шим, ид);
  }
  async removeEntry(ид) { if (!this.шим.файлы.delete(ид)) throw new Error('NotFoundError (шим): ' + ид); }
  async *keys() { for (const к of [...this.шим.файлы.keys()].sort()) yield к; }
}
class ШимOPFS {
  constructor() { this.файлы = new Map(); this.ждётКаталог = 'фонограммы'; this.создавалиКаталог = false; this.падатьЗапись = false; }
  async getDirectory() { return new ШимКаталог(this); }
}
class ШимStorage extends ШимOPFS {
  constructor() { super(); this._persisted = false; this.падатьPersist = false; this._estimate = { usage: 1234, quota: 5678 }; }
  async persisted() { return this._persisted; }
  async persist() { if (this.падатьPersist) throw new Error('браузер отказал (шим)'); this._persisted = true; return true; }
  async estimate() { if (!this._estimate) return null; return { usage: this._estimate.usage, quota: this._estimate.quota }; }
}

const б = (строка) => new TextEncoder().encode(строка);

test('01 · имя канона', () => { assert.equal(ИМЯ, 'opfs-core/0.1'); });

test('02 · возможности честны при отсутствии хранилища (явное null)', async () => {
  const я = создатьЯдро({ хранилище: null });
  assert.deepEqual(я.возможности(), { opfs: false, persist: false, оценка: false, каталог: 'фонограммы' });
});

test('03 · возможности честны с полным шимом', () => {
  const я = создатьЯдро({ хранилище: new ШимStorage() });
  assert.deepEqual(я.возможности(), { opfs: true, persist: true, оценка: true, каталог: 'фонограммы' });
});

test('04 · круг положить→взять (байты равны)', async () => {
  const ст = new ШимStorage();
  const я = создатьЯдро({ хранилище: ст, вернутьБлоб: false });
  const исх = б('RUVSON — Просто люби');
  const р = await я.положить('prosto-lubi.min', исх);
  assert.deepEqual(р, { ок: true, размер: исх.byteLength });
  const вз = await я.взять('prosto-lubi.min');
  assert.ok(вз instanceof Uint8Array);
  assert.deepEqual(Buffer.from(вз).toString('utf8'), 'RUVSON — Просто люби');
});

test('05 · положить строкой (TextEncoder внутри)', async () => {
  const я = создатьЯдро({ хранилище: new ШимStorage(), вернутьБлоб: false });
  const р = await я.положить('str', 'строка дома');
  assert.equal(р.ок, true);
  assert.equal(р.размер, Buffer.byteLength('строка дома', 'utf8'));
});

test('06 · положить ArrayBuffer', async () => {
  const я = создатьЯдро({ хранилище: new ШимStorage(), вернутьБлоб: false });
  const р = await я.положить('ab', new TextEncoder().encode('абв').buffer);
  assert.equal(р.ок, true);
});

test('07 · положить Blob', async () => {
  const я = создатьЯдро({ хранилище: new ШимStorage(), вернутьБлоб: false });
  const р = await я.положить('blob', new Blob([б('blobok')]));
  assert.deepEqual(р, { ок: true, размер: 6 });
});

test('08 · закон ида: плохие отказываются честно', async () => {
  const я = создатьЯдро({ хранилище: new ШимStorage(), вернутьБлоб: false });
  for (const плохой of ['', '../x', 'a..b', '.скрытый', 'x'.repeat(121), null, 42, 'пробел внутри']) {
    const р = await я.положить(плохой, б('x'));
    assert.equal(р.ок, false, 'ид должен быть отвергнут: ' + String(плохой));
    assert.ok(р.причина.includes('ид не проходит'), 'причина русская: ' + р.причина);
  }
});

test('09 · закон ида: хорошие проходят (дефисы, точки, подчёркивания)', async () => {
  const я = создатьЯдро({ хранилище: new ШимStorage(), вернутьБлоб: false });
  for (const добрый of ['pke-ladom.v1', 'A9', 'x_-.y', 'a'.repeat(120)]) {
    const р = await я.положить(добрый, б('x'));
    assert.equal(р.ок, true, 'ид должен пройти: ' + добрый);
  }
});

test('10 · взять отсутствующего — честное «нет» (null)', async () => {
  const я = создатьЯдро({ хранилище: new ШимStorage(), вернутьБлоб: false });
  assert.equal(await я.взять('нету'), null);
});

test('11 · есть true/false', async () => {
  const я = создатьЯдро({ хранилище: new ШимStorage(), вернутьБлоб: false });
  await я.положить('est', б('1'));
  assert.equal(await я.есть('est'), true);
  assert.equal(await я.есть('net'), false);
  assert.equal(await я.есть('../плохой'), false);
});

test('12 · убрать: true потом false (второй раз не врёт)', async () => {
  const я = создатьЯдро({ хранилище: new ШимStorage(), вернутьБлоб: false });
  await я.положить('usel', б('1'));
  assert.equal(await я.убрать('usel'), true);
  assert.equal(await я.убрать('usel'), false);
});

test('13 · список сортирован и растёт', async () => {
  const я = создатьЯдро({ хранилище: new ШимStorage(), вернутьБлоб: false });
  assert.deepEqual(await я.список(), []);
  await я.положить('c', б('1'));
  await я.положить('a', б('2'));
  await я.положить('b', б('3'));
  assert.deepEqual(await я.список(), ['a', 'b', 'c']);
});

test('14 · перезапись того же ида — живёт последний', async () => {
  const я = создатьЯдро({ хранилище: new ШимStorage(), вернутьБлоб: false });
  await я.положить('perezapis', б('старое-длинное'));
  await я.положить('perezapis', б('новое'));
  const вз = await я.взять('perezapis');
  assert.equal(Buffer.from(вз).toString('utf8'), 'новое');
});

test('15 · без OPFS все операции отказываются честно', async () => {
  const я = создатьЯдро({ хранилище: null });
  assert.deepEqual(await я.положить('x', б('x')), { ок: false, причина: 'OPFS недоступен — положить нельзя' });
  assert.equal(await я.взять('x'), null);
  assert.equal(await я.есть('x'), false);
  assert.equal(await я.убрать('x'), false);
  assert.deepEqual(await я.список(), []);
});

test('16 · закрепить: со свежего — уже:false, результат:true', async () => {
  const ст = new ШимStorage();
  const я = создатьЯдро({ хранилище: ст });
  const р = await я.закрепить();
  assert.deepEqual(р, { ок: true, уже: false, результат: true });
  assert.equal(await я.постоянное(), true);
});

test('17 · закрепить: когда уже стойко — уже:true без повторного persist', async () => {
  const ст = new ШимStorage();
  ст._persisted = true;
  const я = создатьЯдро({ хранилище: ст });
  assert.deepEqual(await я.закрепить(), { ок: true, уже: true });
});

test('18 · закрепить: отказ браузера — честная причина', async () => {
  const ст = new ШимStorage();
  ст.падатьPersist = true;
  const я = создатьЯдро({ хранилище: ст });
  const р = await я.закрепить();
  assert.equal(р.ок, false);
  assert.ok(р.причина.includes('не прошло'));
});

test('19 · закрепить/постоянное без persist-метода', async () => {
  const я = создатьЯдро({ хранилище: { getDirectory: async () => new ШимКаталог(new ШимOPFS()) } });
  const р = await я.закрепить();
  assert.equal(р.ок, false);
  assert.ok(р.причина.includes('Storage API недоступен'));
  assert.equal(await я.постоянное(), null);
});

test('20 · постоянное: false честно', async () => {
  const ст = new ШимStorage(); ст._persisted = false;
  const я = создатьЯдро({ хранилище: ст });
  assert.equal(await я.постоянное(), false);
});

test('21 · оценка: числа проходят, без метода и при отказе — null', async () => {
  const я1 = создатьЯдро({ хранилище: new ШимStorage() });
  assert.deepEqual(await я1.оценка(), { использование: 1234, квота: 5678 });
  const я2 = создатьЯдро({ хранилище: { getDirectory: async () => 0 } });
  assert.equal(await я2.оценка(), null);
});

test('22 · запись упала — честная причина, не «успех»', async () => {
  const ст = new ШимStorage(); ст.падатьЗапись = true;
  const я = создатьЯдро({ хранилище: ст, вернутьБлоб: false });
  const р = await я.положить('upal', б('x'));
  assert.equal(р.ок, false);
  assert.ok(р.причина.includes('положить не вышло'));
  assert.ok(р.причина.includes('переполнен'));
});

test('23 · большой блоб 1 МБ кругом', async () => {
  const я = создатьЯдро({ хранилище: new ШимStorage(), вернутьБлоб: false });
  const больш = new Uint8Array(1024 * 1024);
  for (let i = 0; i < больш.length; i += 4096) больш[i] = (i / 4096) & 255;
  const р = await я.положить('bolshoy', больш);
  assert.deepEqual(р, { ок: true, размер: 1048576 });
  const вз = await я.взять('bolshoy');
  assert.equal(вз.length, 1048576);
  assert.equal(вз[0], 0); assert.equal(вз[4096], 1);
});

test('24 · шим получил каталог «фонограммы» с create:true', async () => {
  const ст = new ШимStorage();
  const я = создатьЯдро({ хранилище: ст, вернутьБлоб: false });
  await я.положить('x', б('x'));
  assert.equal(ст.создавалиКаталог, true);
  assert.equal(ст.ждётКаталог, 'фонограммы');
});

test('25 · свой каталог уважается', async () => {
  const ст = new ШимStorage(); ст.ждётКаталог = 'стэмы';
  const я = создатьЯдро({ хранилище: ст, каталог: 'стэмы', вернутьБлоб: false });
  const р = await я.положить('y', б('y'));
  assert.equal(р.ок, true);
  assert.equal(я.возможности().каталог, 'стэмы');
});

test('26 · вернутьБлоб:false — взять отдаёт Uint8Array', async () => {
  const я = создатьЯдро({ хранилище: new ШимStorage(), вернутьБлоб: false });
  await я.положить('t', б('тип'));
  const вз = await я.взять('t');
  assert.ok(вз instanceof Uint8Array);
});

test('27 · вход не мутируется (опоры живы и те же)', async () => {
  const ст = new ШимStorage();
  const опоры = { хранилище: ст, вернутьБлоб: false };
  const снимок = JSON.stringify(Object.keys(опоры));
  const я = создатьЯдро(опоры);
  await я.положить('z', б('z'));
  await я.взять('z');
  assert.equal(JSON.stringify(Object.keys(опоры)), снимок);
  assert.equal(опоры.хранилище, ст);
});

test('28 · 0 сети в источнике канона (fetch/XHR/sendBeacon/getUserMedia)', () => {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../src/opfs-core.mjs'), 'utf8');
  for (const запрет of ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'getUserMedia', 'WebSocket']) {
    assert.ok(!src.includes(запрет), 'канону запрещено: ' + запрет);
  }
  assert.ok(!src.includes('innerHTML'), 'канону запрещён innerHTML');
});
