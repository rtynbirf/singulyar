/* ═══ Такт v10.82 «СХОДИМОСТЬ» (С57) · Л5-P3: тесты sync-crdt ═══
   Канон один: ДОКУМЕНТЫ/ТРЕКИ/LADOM_SINGULAR/src/sync-crdt.js —
   тесты грузят ЕГО ЖЕ через node:vm (зал ·17 берёт его классическим
   <script>). 0 сети · 0 eval (vm.runInNewContext — только наш файл). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', 'src', 'sync-crdt.js');
const code = readFileSync(SRC, 'utf8');

/* Загрузчик канона в песочнице — тот же файл, что в зал ·17 грузится скриптом. */
function load() {
  const sandbox = { self: {}, module: { exports: {} }, console };
  vm.runInNewContext(code, sandbox, { filename: 'sync-crdt.js' });
  const api = sandbox.self.SyncCRDT || sandbox.module.exports;
  assert.ok(api && api.SyncPeer, 'канон не встал в песочницу');
  return api;
}

/* Фейковый транспорт с двойной доставкой (bc + ls — как HallTransport зала):
   каждое send() приходит КАЖДОМУ подписчику, кроме отправителя, дважды. */
function net() {
  const subs = new Set();
  return {
    dup: 0,
    join(p) { subs.add(p); },
    dupSend(env, from) {
      this.dup++;
      for (const q of subs) {
        if (q === from) continue;
        q.recv(env); q.recv(env);   /* двойная доставка bc+ls — дедуп обязателен */
      }
    }
  };
}

function peer(api, id, sendFn, restore) {
  return new api.SyncPeer({
    id,
    send: sendFn || function () {},
    onRemote: function () {},
    restore: restore || null
  });
}

/* Массивы из vm-realm сравниваются только через JSON (realms разные). */
const rt = (x) => JSON.parse(JSON.stringify(x));

test('00 · канон грузится в песочнице и честно версионируется', () => {
  const api = load();
  assert.equal(api.ver, 'sync-crdt/0.1');
});

test('01 · GSet: слияние коммутативно, ассоциативно, идемпотентно', () => {
  const api = load();
  const a = new api.GSet(), b = new api.GSet(), c = new api.GSet();
  a.add('x'); a.add('y'); b.add('y'); b.add('z'); c.add('z');
  const ab = new api.GSet().merge(a).merge(b);
  const ba = new api.GSet().merge(b).merge(a);
  assert.equal(ab.size(), ba.size());                    /* коммутативность */
  const ab1 = new api.GSet().merge(new api.GSet().merge(a).merge(b)).merge(c);
  const ab2 = new api.GSet().merge(a).merge(new api.GSet().merge(b).merge(c));
  assert.equal(ab1.size(), ab2.size());                  /* ассоциативность */
  const before = ab.size();
  ab.merge(a); ab.merge(b);
  assert.equal(ab.size(), before);                       /* идемпотентность */
  assert.ok(a.has('x') === true && a.has('q') === false);
});

test('02 · ORSet: remove снимает наблюдённое, новая метка возвращает', () => {
  const api = load();
  const s = new api.ORSet();
  s.add('песня-1', 't:a:1'); s.add('песня-2', 't:a:2');
  assert.deepEqual(rt(s.members()).sort(), ['песня-1', 'песня-2']);
  s.remove('песня-1');
  assert.deepEqual(rt(s.members()), ['песня-2']);
  s.add('песня-1', 't:b:9');                             /* новая метка — вернулся */
  assert.ok(rt(s.members()).indexOf('песня-1') !== -1);
});

test('03 · ORSet: гонка add/remove — чужой unobserved-тег выживает (классика OR-set)', () => {
  const api = load();
  const a = new api.ORSet(), b = new api.ORSet();
  a.add('song', 't:a:1');
  b.merge(JSON.parse(JSON.stringify(a.toJSON())));       /* b видит тег a:1 */
  b.remove('song');                                      /* b снял наблюдённый a:1 */
  a.add('song', 't:a:2');                                /* a добавил НОВЫЙ тег (b его не видел) */
  a.merge(b.toJSON()); b.merge(a.toJSON());
  assert.deepEqual(rt(a.members()), rt(b.members()));  /* сходятся */
  assert.deepEqual(rt(a.members()), ['song']);         /* unobserved-тег жив */
});

test('04 · LWW: старший лэмпорт побеждает, при равном — больший src (детерминизм)', () => {
  const api = load();
  const r = new api.LWW();
  r.set('первая', 5, 'r-a');
  r.set('вторая', 7, 'r-b');
  assert.equal(r.value(), 'вторая');
  r.set('старая', 6, 'r-c');
  assert.equal(r.value(), 'вторая');                     /* младший лэмпорт не откатывает */
  const x = new api.LWW(), y = new api.LWW();
  x.set('A', 10, 'r-b'); y.set('B', 10, 'r-c');
  x.merge(y.toJSON()); y.merge(x.toJSON());
  assert.equal(x.value(), 'B');                          /* больший src wins — на обеих сторонах */
  assert.equal(y.value(), 'B');
});

test('05 · конверт зала ver:1: точные ключи {ver,t,src,seq,d}', () => {
  const api = load();
  let got = null;
  const p = peer(api, 'r-1', (env) => { got = env; });
  p.op('ginc', { key: 'claps', by: 1 });
  assert.ok(got);
  assert.equal(got.ver, 1);
  assert.equal(got.t, 'CRDT');
  assert.equal(got.src, 'r-1');
  assert.equal(got.seq, 1);
  assert.equal(got.d.op, 'ginc');
  assert.equal(got.d.key, 'claps');
  assert.ok(got.d.lam >= 1);
});

test('06 · двойная доставка (bc+ls): дедуп src:seq — событие применено один раз', () => {
  const api = load();
  let remoteCalls = 0;
  const p = peer(api, 'r-2', null, null);
  p._onRemote = () => { remoteCalls++; };
  const env = { ver: 1, t: 'CRDT', src: 'r-1', seq: 3, d: { op: 'ginc', key: 'claps', by: 1, lam: 4, tags: ['g:r-1:3:0'] } };
  assert.equal(p.recv(env), true);
  assert.equal(p.recv(env), false);                      /* повтор — честный false */
  assert.equal(p.value('claps'), 1);                     /* не задвоился */
  assert.equal(remoteCalls, 1);
});

test('07 · две реплики через двойной транспорт: сходимость хлопков', () => {
  const api = load();
  const t = net();
  const A = peer(api, 'r-a'), B = peer(api, 'r-b');
  t.join(A); t.join(B);
  A._send = (env) => t.dupSend(env, A);
  B._send = (env) => t.dupSend(env, B);
  A.op('ginc', { key: 'claps', by: 1 });
  A.op('ginc', { key: 'claps', by: 1 });
  B.op('ginc', { key: 'claps', by: 1 });
  assert.equal(A.value('claps'), 3);
  assert.equal(B.value('claps'), 3);                     /* сошлись */
});

test('08 · гонка одновременных ginc с обеих сторон: обе реплики к одному числу', () => {
  const api = load();
  const t = net();
  const A = peer(api, 'r-a'), B = peer(api, 'r-b');
  t.join(A); t.join(B);
  A._send = (env) => t.dupSend(env, A);
  B._send = (env) => t.dupSend(env, B);
  A.op('ginc', { key: 'claps', by: 2 });
  B.op('ginc', { key: 'claps', by: 3 });
  assert.equal(A.value('claps'), 5);
  assert.equal(B.value('claps'), 5);
});

test('09 · метки ORSet через сеть: добавить/снять/вернуть — сошлись', () => {
  const api = load();
  const t = net();
  const A = peer(api, 'r-a'), B = peer(api, 'r-b');
  t.join(A); t.join(B);
  A._send = (env) => t.dupSend(env, A);
  B._send = (env) => t.dupSend(env, B);
  A.op('oradd', { key: 'marks', el: 'Просто люби' });
  B.op('oradd', { key: 'marks', el: 'Когда теряем' });
  assert.deepEqual(rt(A.members('marks')).sort(), rt(B.members('marks')).sort());
  A.op('orrem', { key: 'marks', el: 'Просто люби' });
  assert.deepEqual(rt(A.members('marks')), ['Когда теряем']);
  assert.deepEqual(rt(B.members('marks')), ['Когда теряем']);
  B.op('oradd', { key: 'marks', el: 'Просто люби' });    /* вернули */
  assert.deepEqual(rt(A.members('marks')).sort(), rt(B.members('marks')).sort());
  assert.equal(A.members('marks').length, 2);
});

test('10 · LWW через сеть: «просьба следующей» — у обеих одно слово', () => {
  const api = load();
  const t = net();
  const A = peer(api, 'r-a'), B = peer(api, 'r-b'), C = peer(api, 'r-c');
  t.join(A); t.join(B); t.join(C);
  A._send = (env) => t.dupSend(env, A);
  B._send = (env) => t.dupSend(env, B);
  C._send = (env) => t.dupSend(env, C);
  A.op('lww', { key: 'req', v: 'песня-А' });
  C.op('lww', { key: 'req', v: 'песня-C' });             /* позже по лэмпорту */
  assert.equal(A.value('req'), 'песня-C');
  assert.equal(B.value('req'), 'песня-C');
  assert.equal(C.value('req'), 'песня-C');
});

test('11 · офлайн-журнал: реплика-сирота накопила и доотправила flush()', () => {
  const api = load();
  const sent = [];
  const A = peer(api, 'r-a', (env) => sent.push(env));   /* транспорт молчит: send копит в тестовый карман */
  A.op('ginc', { key: 'claps', by: 1 });
  A.op('oradd', { key: 'marks', el: 'песня' });
  A.op('lww', { key: 'req', v: 'следующая' });
  assert.equal(A.stats().pending, 3);
  const B = peer(api, 'r-b');
  for (const env of sent) { B.recv(env); B.recv(env); }  /* встреча: двойная доставка журнала */
  assert.equal(B.value('claps'), 1);
  assert.deepEqual(rt(B.members('marks')), ['песня']);
  assert.equal(B.value('req'), 'следующая');
  assert.equal(A.flush(), 3);                            /* flush доотправляет журнал */
});

test('12 · полный повтор ВСЕХ конвертов не меняет состояние (идемпотентность повтора)', () => {
  const api = load();
  const t = net();
  const A = peer(api, 'r-a'), B = peer(api, 'r-b');
  t.join(A); t.join(B);
  A._send = (env) => t.dupSend(env, A);
  B._send = (env) => t.dupSend(env, B);
  A.op('ginc', { key: 'claps', by: 1 });
  B.op('oradd', { key: 'marks', el: 'x' });
  A.op('lww', { key: 'req', v: 'y' });
  const snapBefore = JSON.stringify(B.snapshot());
  /* гоняем весь журнал A и B повторно по кругу — 3 раза */
  for (let round = 0; round < 3; round++) {
    A.flush(); B.flush();
  }
  assert.equal(JSON.stringify(B.snapshot()), snapBefore); /* байт-в-байт то же состояние */
});

test('13 · опоздавший через снимок: mergeSnapshot → сходился без журнала', () => {
  const api = load();
  const A = peer(api, 'r-a');
  A.op('ginc', { key: 'claps', by: 2 });
  A.op('oradd', { key: 'marks', el: 'Просто люби' });
  const C = peer(api, 'r-c');
  assert.equal(C.mergeSnapshot(A.snapshot()), true);
  assert.equal(C.value('claps'), 2);
  assert.deepEqual(rt(C.members('marks')), ['Просто люби']);
  assert.equal(C.mergeSnapshot({ v: 2 }), false);        /* чужая схема — честный отказ */
  /* и обратная сторона: A принял снимок C — не откатился */
  C.op('ginc', { key: 'claps', by: 1 });
  A.mergeSnapshot(C.snapshot());
  assert.equal(A.value('claps'), 3);
});

test('14 · persist/restore: перезагрузка окна — состояние и журнал живы', () => {
  const api = load();
  let store = null;
  const A = peer(api, 'r-a', null);
  A._save = (j) => { store = JSON.parse(JSON.stringify(j)); };
  A.op('ginc', { key: 'claps', by: 1 });
  A.op('oradd', { key: 'marks', el: 'песня' });
  A.op('lww', { key: 'req', v: 'следующая' });
  const B = peer(api, 'r-a', null, store);               /* тот же id — восстановление */
  assert.equal(B.value('claps'), 1);
  assert.deepEqual(rt(B.members('marks')), ['песня']);
  assert.equal(B.value('req'), 'следующая');
  assert.equal(B.stats().pending, 3);                    /* журнал пережил перезагрузку */
  assert.equal(B.clock >= 3, true);
});

test('15 · потолки честные: outbox ≤ 200, seen ≤ 500, ginc by ≤ 100', () => {
  const api = load();
  const A = peer(api, 'r-a', () => {});
  for (let i = 0; i < 230; i++) A.op('ginc', { key: 'claps', by: 1 });
  assert.ok(A.stats().pending <= api.MAX.OUTBOX);
  assert.equal(A.value('claps'), 230);                   /* потолок журнала не режет счёт */
  const B = peer(api, 'r-b');
  for (let i = 0; i < 600; i++) {
    B.recv({ ver: 1, t: 'CRDT', src: 'r-x', seq: i, d: { op: 'oradd', key: 'm', el: 'e' + i, tag: 't:r-x:' + i, lam: i + 1 } });
  }
  assert.ok(B.stats().seen <= api.MAX.SEEN);
  const C = peer(api, 'r-c', () => {});
  C.op('ginc', { key: 'k', by: 1000 });
  assert.equal(C.value('k'), 100);                       /* потолок одной добавки */
});

test('16 · честные границы: чужая схема, пустышка, своё эхо, незнакомая операция', () => {
  const api = load();
  const A = peer(api, 'r-a', () => {});
  assert.equal(A.recv(null), false);
  assert.equal(A.recv({}), false);
  assert.equal(A.recv({ ver: 2, t: 'CRDT', src: 'x', seq: 1, d: { op: 'ginc', key: 'k', by: 1 } }), false);
  assert.equal(A.recv({ ver: 1, t: 'HELLO', src: 'x', seq: 1 }), false);   /* не CRDT — не наш */
  assert.equal(A.recv({ ver: 1, t: 'CRDT', src: 'r-a', seq: 1, d: { op: 'ginc', key: 'k', by: 1, lam: 1 } }), false); /* своё эхо */
  assert.equal(A.op('нет-такой', {}), null);             /* незнакомое — честный отказ */
  const env = A.op('ginc', { key: 'k', by: 0 });         /* by:0 → минимум 1, не ноль */
  assert.ok(env.d.by >= 1);
});

test('17 · 0 сети · 0 eval в каноне (исходник чист)', () => {
  const src = code;
  assert.ok(!/fetch\s*\(/.test(src), 'fetch в каноне');
  assert.ok(!/XMLHttpRequest/.test(src), 'XHR в каноне');
  assert.ok(!/WebSocket/.test(src), 'WebSocket в каноне');
  assert.ok(!/\beval\s*\(/.test(src), 'eval в каноне');
  assert.ok(!/new\s+Function/.test(src), 'new Function в каноне');
  assert.ok(!/document\./.test(src), 'document в каноне (модуль чистый, DOM — снаружи)');
});
