/* ═══ СИНГУЛЯР · sync-crdt/0.1 · такт v10.82 «СХОДИМОСТЬ» (С57) ═══
   Л5 · P3 multi-device sync — очередь событий + CRDT, общая с залом ·17.
   Один факт — одно место: этот файл — канон; зал ·17 грузит его
   классическим <script> (работает и на https/Pages, и на file://),
   тесты зовут этот же файл через node:vm. 0 сети · 0 eval · 0 innerHTML.

   Что внутри (минимальный честный CRDT-набор, все слияния коммутативны,
   ассоциативны и идемпотентны — порядок и повторы доставки не важны):
   - GSet  — grow-only множество: идемпотентный счётчик событий
             (хлопок = уникальный тег src:seq:i; повторная доставка не меняет размер);
   - ORSet — add/remove-множество (метки «вернусь»): remove снимает только
             наблюдённые теги, новая метка возвращает элемент (классика OR-set);
   - LWW   — last-write-wins регистр: при равном лэмпорте побеждает больший src
             (детерминированный тай-брейк — все реплики сходятся к одному);
   - SyncPeer — реплика: лэмпорт-часы, очередь исходящих конвертов (outbox,
             ограниченный журнал — офлайн-окна доотправляют при встрече),
             дедуп входящих по src:seq (двойной транспорт зала
             BroadcastChannel+localStorage может доставить пакет дважды —
             не страшно и без дедупа: слияния идемпотентны), снимок для
             опоздавших (snapshot/mergeSnapshot), persist/restore (localStorage).

   Конверт совпадает с протоколом зала ·17 (ver:1): {ver:1, t:'CRDT', src, seq, d} —
   HallTransport зала доставляет его своим приёмникам, дедуп src:seq уже есть.
   События: ginc {key,by} · oradd {key,el} · orrem {key,el} · lww {key,v}. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; /* node */
  if (root) root.SyncCRDT = api;                                          /* браузер */
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VER = 'sync-crdt/0.1';
  var MAX_OUTBOX = 200;    /* журнал неотправленного — ограничен честно */
  var MAX_SEEN = 500;      /* дедуп-память входящих src:seq */
  var MAX_GTAGS = 100;     /* потолок «by» у одного события ginc */

  /* ── GSet: grow-only множество (идемпотентный счётчик) ── */
  function GSet() { this.tags = {}; }
  GSet.prototype.add = function (tag) { this.tags[tag] = 1; return this; };
  GSet.prototype.has = function (tag) { return this.tags[tag] === 1; };
  GSet.prototype.size = function () { var n = 0, t; for (t in this.tags) if (this.tags[t] === 1) n++; return n; };
  GSet.prototype.merge = function (o) {
    if (!o || !o.tags) return this;
    for (var t in o.tags) if (o.tags[t] === 1) this.tags[t] = 1;
    return this;
  };
  GSet.prototype.toJSON = function () { return this.tags; };
  GSet.fromJSON = function (j) { var s = new GSet(); if (j && typeof j === 'object') for (var t in j) if (j[t] === 1) s.tags[t] = 1; return s; };

  /* ── ORSet: add/remove-множество (remove снимает наблюдённые теги) ── */
  function ORSet() { this.adds = {}; this.rems = {}; }
  ORSet.prototype.add = function (el, tag) {
    el = String(el);
    if (!this.adds[el]) this.adds[el] = {};
    this.adds[el][tag] = 1;
    return this;
  };
  ORSet.prototype.remove = function (el) {          /* снимает только наблюдённые теги */
    el = String(el);
    var seen = this.adds[el] || {}, r = this.rems[el] || (this.rems[el] = {});
    for (var t in seen) r[t] = 1;
    return this;
  };
  ORSet.prototype.members = function () {
    var out = [], el;
    for (el in this.adds) {
      var live = false, tags = this.adds[el], rems = this.rems[el] || {}, t;
      for (t in tags) if (tags[t] === 1 && rems[t] !== 1) { live = true; break; }
      if (live) out.push(el);
    }
    return out;
  };
  ORSet.prototype.merge = function (o) {
    if (!o) return this;
    var k, t;
    var a = o.adds || {}, r = o.rems || {};
    for (k in a) { var dst = this.adds[k] || (this.adds[k] = {}); for (t in a[k]) if (a[k][t] === 1) dst[t] = 1; }
    for (k in r) { var dr = this.rems[k] || (this.rems[k] = {}); for (t in r[k]) if (r[k][t] === 1) dr[t] = 1; }
    return this;
  };
  ORSet.prototype.toJSON = function () { return { adds: this.adds, rems: this.rems }; };
  ORSet.fromJSON = function (j) {
    var s = new ORSet(), k, t;
    if (j && typeof j === 'object') {
      var a = j.adds || {}, r = j.rems || {};
      for (k in a) { var d = s.adds[k] = {}; for (t in a[k]) if (a[k][t] === 1) d[t] = 1; }
      for (k in r) { var d2 = s.rems[k] = {}; for (t in r[k]) if (r[k][t] === 1) d2[t] = 1; }
    }
    return s;
  };

  /* ── LWW-регистр: (лэмпорт, src) — детерминированный тай-брейк ── */
  function LWW() { this.v = null; this.t = 0; this.src = ''; }
  LWW.prototype._wins = function (t, src) {
    t = t | 0;
    if (t > this.t) return true;
    if (t === this.t && String(src) > this.src) return true;
    return false;
  };
  LWW.prototype.set = function (v, t, src) { if (this._wins(t, src)) { this.v = v; this.t = t | 0; this.src = String(src); } return this; };
  LWW.prototype.merge = function (o) { if (o) this.set(o.v, o.t | 0, o.src); return this; };
  LWW.prototype.value = function () { return this.v; };
  LWW.prototype.toJSON = function () { return { v: this.v, t: this.t, src: this.src }; };
  LWW.fromJSON = function (j) { var r = new LWW(); if (j && typeof j === 'object') { r.v = j.v === undefined ? null : j.v; r.t = j.t | 0; r.src = String(j.src || ''); } return r; };

  /* ── SyncPeer: реплика зала — очередь событий + состояния ── */
  /* cfg: { id, send(env), onRemote(), save(json), restore(json) } */
  function SyncPeer(cfg) {
    cfg = cfg || {};
    this.id = String(cfg.id || 'r-0');
    this._send = typeof cfg.send === 'function' ? cfg.send : function () {};
    this._onRemote = typeof cfg.onRemote === 'function' ? cfg.onRemote : function () {};
    this._save = typeof cfg.save === 'function' ? cfg.save : null;
    this.clock = 0;                 /* лэмпорт */
    this.seq = 0;                   /* свой счётчик событий */
    this.gsets = {};                /* key → GSet  (идемпотентные счётчики) */
    this.orsets = {};               /* key → ORSet (метки) */
    this.lwws = {};                 /* key → LWW   (последнее слово) */
    this.outbox = [];               /* журнал исходящих — flush при встрече */
    this.seen = {};                 /* src:seq → 1 (дедуп входящих) */
    this.seenOrder = [];            /* FIFO для честного потолка памяти */
    this.applied = 0;               /* принято чужих событий (после дедупа) */
    if (cfg.restore) this._hydrate(cfg.restore);
  }

  SyncPeer.prototype._gset = function (k) { return this.gsets[k] || (this.gsets[k] = new GSet()); };
  SyncPeer.prototype._orset = function (k) { return this.orsets[k] || (this.orsets[k] = new ORSet()); };
  SyncPeer.prototype._lww = function (k) { return this.lwws[k] || (this.lwws[k] = new LWW()); };

  /* Своё событие: применить локально, в журнал, отправить. */
  SyncPeer.prototype.op = function (type, p) {
    p = p || {};
    this.clock += 1;
    var seq = ++this.seq;
    var d = { op: String(type), lam: this.clock };
    var i;
    if (type === 'ginc') {
      var by = Math.max(1, Math.min(MAX_GTAGS, parseInt(p.by, 10) || 1));
      d.key = String(p.key); d.by = by; d.tags = [];
      for (i = 0; i < by; i++) d.tags.push('g:' + this.id + ':' + seq + ':' + i);
    } else if (type === 'oradd') {
      d.key = String(p.key); d.el = String(p.el === undefined ? '' : p.el); d.tag = 't:' + this.id + ':' + seq;
    } else if (type === 'orrem') {
      d.key = String(p.key); d.el = String(p.el === undefined ? '' : p.el);
    } else if (type === 'lww') {
      d.key = String(p.key); d.v = p.v === undefined ? null : p.v;
    } else {
      return null;                  /* незнакомое событие — честный отказ */
    }
    var env = { ver: 1, t: 'CRDT', src: this.id, seq: seq, d: d };
    this._apply(d, this.id);
    this.outbox.push(env);
    if (this.outbox.length > MAX_OUTBOX) this.outbox.shift();   /* журнал ограничен */
    try { this._send(env); } catch (_e) { /* транспорт молчит — событие живёт в очереди */ }
    this._persist();
    return env;
  };

  /* Чужой конверт: дедуп src:seq → лэмпорт → применить. Повтор — честный false. */
  SyncPeer.prototype.recv = function (env) {
    if (!env || env.ver !== 1 || env.t !== 'CRDT' || !env.d || !env.d.op) return false;
    var src = String(env.src === undefined ? '' : env.src);
    if (!src || src === this.id) return false;                  /* своё/пустое — не чужое */
    var id = src + ':' + env.seq;
    if (this.seen[id] === 1) return false;
    this.seen[id] = 1;
    this.seenOrder.push(id);
    if (this.seenOrder.length > MAX_SEEN) {
      var drop = this.seenOrder.shift();
      delete this.seen[drop];
    }
    var lam = env.d.lam | 0;
    if (lam > this.clock) this.clock = lam;                     /* see(): лэмпорт чужого — свой не отстаёт */
    this._apply(env.d, src);
    this.applied += 1;
    this._persist();
    this._onRemote();
    return true;
  };

  SyncPeer.prototype._apply = function (d, src) {
    var k = d.key, i;
    if (d.op === 'ginc') {
      var s = this._gset(k), tags = d.tags || [], by = d.by | 0;
      /* идемпотентно: теги уже есть — добавка не растёт */
      if (tags.length) { for (i = 0; i < tags.length; i++) s.add(tags[i]); }
      else { for (i = 0; i < by; i++) s.add('g:' + src + ':' + (d.lam | 0) + ':' + i); } /* конверт без тегов — честный фолбэк по лэмпорту */
    } else if (d.op === 'oradd') {
      this._orset(k).add(d.el, d.tag || 't:' + src + ':' + (d.lam | 0));
    } else if (d.op === 'orrem') {
      this._orset(k).remove(d.el);
    } else if (d.op === 'lww') {
      this._lww(k).set(d.v, d.lam | 0, src);
    }
  };

  /* Доотправка журнала при встрече (online/visibility): идемпотентно. */
  SyncPeer.prototype.flush = function () {
    var n = 0, i;
    for (i = 0; i < this.outbox.length; i++) {
      try { this._send(this.outbox[i]); n++; } catch (_e) { /* транспорт молчит — останется в журнале */ }
    }
    return n;
  };

  /* Снимок для опоздавших: только состояние (журнал не гоняем). */
  SyncPeer.prototype.snapshot = function () {
    var g = {}, o = {}, l = {}, k;
    for (k in this.gsets) g[k] = this.gsets[k].toJSON();
    for (k in this.orsets) o[k] = this.orsets[k].toJSON();
    for (k in this.lwws) l[k] = this.lwws[k].toJSON();
    return { v: 1, id: this.id, lam: this.clock, gsets: g, orsets: o, lwws: l };
  };
  SyncPeer.prototype.mergeSnapshot = function (s) {
    if (!s || s.v !== 1) return false;
    var k;
    var g = s.gsets || {}, o = s.orsets || {}, l = s.lwws || {};
    for (k in g) this._gset(k).merge(GSet.fromJSON(g[k]));
    for (k in o) this._orset(k).merge(ORSet.fromJSON(o[k]));
    for (k in l) this._lww(k).merge(LWW.fromJSON(l[k]));
    if ((s.lam | 0) > this.clock) this.clock = s.lam | 0;
    this._persist();
    this._onRemote();
    return true;
  };

  /* Чтение сходящегося состояния (для интерфейса зала). */
  SyncPeer.prototype.value = function (k) {   /* GSet → размер; LWW → значение */
    if (this.gsets[k]) return this.gsets[k].size();
    if (this.lwws[k]) return this.lwws[k].value();
    return 0;
  };
  SyncPeer.prototype.members = function (k) { /* ORSet → живые элементы */
    return this.orsets[k] ? this.orsets[k].members() : [];
  };
  SyncPeer.prototype.stats = function () {
    return {
      id: this.id, ver: VER, lamport: this.clock, seq: this.seq,
      pending: this.outbox.length, seen: this.seenOrder.length, applied: this.applied
    };
  };

  /* persist/restore: между перезагрузками окна состояние и журнал живы. */
  SyncPeer.prototype._persist = function () {
    if (!this._save) return;
    var g = {}, o = {}, l = {}, k;
    for (k in this.gsets) g[k] = this.gsets[k].toJSON();
    for (k in this.orsets) o[k] = this.orsets[k].toJSON();
    for (k in this.lwws) l[k] = this.lwws[k].toJSON();
    try {
      this._save({
        v: 1, ver: VER, lam: this.clock, seq: this.seq,
        gsets: g, orsets: o, lwws: l,
        outbox: this.outbox, seen: this.seenOrder
      });
    } catch (_e) { /* хранилище молчит — реплика работает в памяти */ }
  };
  SyncPeer.prototype._hydrate = function (j) {
    if (!j || j.v !== 1) return;
    var k, i, t;
    this.clock = j.lam | 0; this.seq = j.seq | 0;
    var g = j.gsets || {}, o = j.orsets || {}, l = j.lwws || {};
    for (k in g) this.gsets[k] = GSet.fromJSON(g[k]);
    for (k in o) this.orsets[k] = ORSet.fromJSON(o[k]);
    for (k in l) this.lwws[k] = LWW.fromJSON(l[k]);
    var ob = Array.isArray(j.outbox) ? j.outbox : [];
    for (i = 0; i < ob.length; i++) {
      if (ob[i] && ob[i].ver === 1 && ob[i].t === 'CRDT') this.outbox.push(ob[i]);
    }
    var sn = Array.isArray(j.seen) ? j.seen : [];
    for (i = 0; i < sn.length; i++) { t = String(sn[i]); this.seen[t] = 1; this.seenOrder.push(t); }
  };

  return {
    ver: VER,
    GSet: GSet,
    ORSet: ORSet,
    LWW: LWW,
    SyncPeer: SyncPeer,
    MAX: { OUTBOX: MAX_OUTBOX, SEEN: MAX_SEEN, GTAGS: MAX_GTAGS }
  };
});
