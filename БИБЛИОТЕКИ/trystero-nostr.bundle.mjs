var vn = Object.freeze, Pe = 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn, qe = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n, gt = 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n, ht = 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n, xr = vn({ p: Pe, n: qe, h: 1n, a: 0n, b: 7n, Gx: gt, Gy: ht }), ue = 32, at = (e2) => e2 instanceof Uint8Array || ArrayBuffer.isView(e2) && e2.constructor.name === "Uint8Array" && e2.BYTES_PER_ELEMENT === 1, ie = (e2, n, t = "") => {
  if (at(e2) && (n === void 0 || e2.length === n)) return e2;
  let r = at(e2), a = n !== void 0 ? ` of length ${n}` : "", s = r ? `length=${e2.length}` : `type=${typeof e2}`, o = (t ? `"${t}" ` : "") + "expected Uint8Array" + a + ", got " + s;
  throw r ? new RangeError(o) : new TypeError(o);
}, _r = (e2) => Uint8Array.from(e2), Ur = (e2, n, t) => _r(ie(e2, t, n)), yt = (e2, n) => e2.toString(16).padStart(n, "0"), pt = (e2) => {
  let n = "";
  for (let t of ie(e2)) n += yt(t, 2);
  return n;
}, wt = (e2) => {
  let n = "hex invalid";
  if (typeof e2 != "string") throw new TypeError(n);
  if (e2.length % 2 || !/^[\da-f]*$/i.test(e2)) throw new RangeError(n);
  let t = new Uint8Array(e2.length / 2);
  for (let r = 0, a = 0; r < t.length; r++, a += 2) {
    let s = e2.charCodeAt(a), o = e2.charCodeAt(a + 1);
    t[r] = ((s & 15) + (s >> 6) * 9) * 16 + (o & 15) + (o >> 6) * 9;
  }
  return t;
}, it = () => {
  var _a;
  let e2 = (_a = globalThis == null ? void 0 : globalThis.crypto) == null ? void 0 : _a.subtle;
  if (e2) return e2;
  throw new Error("crypto.subtle must be defined, consider polyfill");
}, He = (...e2) => {
  let n = 0;
  for (let a of e2) n += ie(a).length;
  let t = new Uint8Array(n), r = 0;
  for (let a of e2) t.set(a, r), r += a.length;
  return t;
}, Sn = (e2 = ue) => {
  let n = globalThis == null ? void 0 : globalThis.crypto;
  if (typeof (n == null ? void 0 : n.getRandomValues) != "function") throw new Error("crypto.getRandomValues must be defined, consider polyfill");
  return n.getRandomValues(new Uint8Array(e2));
}, Nr = BigInt, Ke = (e2, n, t, r = "bad number: out of range") => {
  if (typeof e2 != "bigint") throw new TypeError(r);
  if (n <= e2 && e2 < t) return e2;
  throw new RangeError(r);
}, M = (e2, n = Pe) => (e2 %= n) >= 0n ? e2 : n + e2, Qe = (e2) => M(e2, qe), $r = (e2, n) => {
  if (e2 === 0n) throw new Error("invert: expected non-zero number");
  if (n <= 1n) throw new Error("invert: expected modulus > 1, got " + n);
  let t = M(e2, n), r = n, a = 0n, s = 1n;
  for (; t !== 0n; ) {
    let i = r / t, c = r - t * i, m = a - s * i;
    r = t, t = c, a = s, s = m;
  }
  if (r !== 1n) throw new Error("invert: does not exist");
  return M(a, n);
}, Pt = (e2) => {
  let n = Wr[e2];
  if (typeof n != "function") throw new Error("hashes." + e2 + " not set");
  return n;
}, ct = (e2, n, t) => ie(Pt(e2)(n, t), ue, "digest"), ft = async (e2, n, t) => ie(await Pt(e2)(n, t), ue, "digest");
var pn = (e2) => {
  if (e2 instanceof ke) return e2;
  throw new TypeError("Point expected");
}, wn = "bad point: not on curve", kt = (e2) => M(M(e2 * e2) * e2 + 7n), lt = (e2) => Ke(e2, 0n, Pe), $e = (e2) => Ke(e2, 1n, Pe), vt = (e2) => Ke(e2, 1n, qe), en = (e2) => !(e2 & 1n), jr = (e2) => Uint8Array.of(en(e2) ? 2 : 3), St = (e2) => {
  let n = kt($e(e2)), t = 1n;
  for (let r = n, a = (Pe + 1n) / 4n; a > 0n; a >>= 1n) a & 1n && (t = t * r % Pe), r = r * r % Pe;
  if (M(t * t) !== n) throw new Error("sqrt invalid");
  return new ke(e2, en(t) ? t : M(-t), 1n);
}, ke = class e {
  static BASE;
  static ZERO;
  X;
  Y;
  Z;
  constructor(n, t, r) {
    this.X = lt(n), this.Y = $e(t), this.Z = lt(r), vn(this);
  }
  static CURVE() {
    return xr;
  }
  static fromAffine(n) {
    let { x: t, y: r } = n;
    return t === 0n && r === 0n ? je : new e(t, r, 1n);
  }
  static fromBytes(n) {
    ie(n);
    let t = n.length, r = n[0], a = Ye(n, 1, 33);
    try {
      if (t === 33 && (r === 2 || r === 3)) {
        let s = St(a);
        return r === 3 ? s.negate() : s;
      }
      if (t === 65 && r === 4) return new e(a, Ye(n, 33, 65), 1n).assertValidity();
    } catch {
      throw new Error(wn);
    }
    throw new Error(wn);
  }
  static fromHex(n) {
    return e.fromBytes(wt(n));
  }
  get x() {
    return this.toAffine().x;
  }
  get y() {
    return this.toAffine().y;
  }
  equals(n) {
    let { X: t, Y: r, Z: a } = this, { X: s, Y: o, Z: i } = pn(n);
    return M(t * i) === M(s * a) && M(r * i) === M(o * a);
  }
  is0() {
    return this.Z === 0n;
  }
  negate() {
    return new e(this.X, M(-this.Y), this.Z);
  }
  double() {
    return this.add(this);
  }
  add(n) {
    let { X: t, Y: r, Z: a } = this, { X: s, Y: o, Z: i } = pn(n), c = 0n, m = 7n, u = 0n, f = 0n, d = 0n, h = M(m * 3n), p = M(t * s), A = M(r * o), T = M(a * i), B = M(t + r), w = M(s + o);
    B = M(B * w), w = M(p + A), B = M(B - w), w = M(t + a);
    let C = M(s + i);
    return w = M(w * C), C = M(p + T), w = M(w - C), C = M(r + a), u = M(o + i), C = M(C * u), u = M(A + T), C = M(C - u), d = M(c * w), u = M(h * T), d = M(u + d), u = M(A - d), d = M(A + d), f = M(u * d), A = M(p + p), A = M(A + p), T = M(c * T), w = M(h * w), A = M(A + T), T = M(p - T), T = M(c * T), w = M(w + T), p = M(A * w), f = M(f + p), p = M(C * w), u = M(B * u), u = M(u - p), p = M(B * A), d = M(C * d), d = M(d + p), new e(u, f, d);
  }
  subtract(n) {
    return this.add(pn(n).negate());
  }
  multiply(n, t = true) {
    if (!t && n === 0n) return je;
    if (vt(n), n === 1n) return this;
    if (this.equals(Re)) return Yr(n).p;
    let r = je, a = Re, s = this;
    for (let o = 0; t ? o < 256 : n > 0n; o++) n & 1n ? r = r.add(s) : t && (a = a.add(s)), s = s.double(), n >>= 1n;
    return r;
  }
  multiplyUnsafe(n) {
    return this.multiply(n, false);
  }
  toAffine() {
    let { X: n, Y: t, Z: r } = this;
    if (r === 0n) return { x: 0n, y: 0n };
    if (r === 1n) return { x: n, y: t };
    let a = $r(r, Pe);
    if (M(r * a) !== 1n) throw new Error("inverse invalid");
    return { x: M(n * a), y: M(t * a) };
  }
  assertValidity() {
    let { x: n, y: t } = this.toAffine();
    if ($e(n), $e(t), M(t * t) !== kt(n)) throw new Error(wn);
    return this;
  }
  toBytes(n = true) {
    let { x: t, y: r } = this.assertValidity().toAffine(), a = he(t);
    return n ? He(jr(r), a) : He(Uint8Array.of(4), a, he(r));
  }
  toHex(n) {
    return pt(this.toBytes(n));
  }
}, Re = new ke(gt, ht, 1n), je = new ke(0n, 1n, 0n);
ke.BASE = Re;
ke.ZERO = je;
var qr = (e2, n, t) => Re.multiply(n, false).add(e2.multiply(t, false)).assertValidity(), Ee = (e2) => Nr("0x" + (pt(e2) || "0")), Ye = (e2, n, t) => Ee(e2.subarray(n, t)), he = (e2) => wt(yt(Ke(e2, 0n, 2n ** 256n), ue * 2)), Kr = (e2) => {
  let n = Ee(ie(e2, ue, "secret key"));
  return Ke(n, 1n, qe, "invalid secret key: outside of range");
};
var ut = "SHA-256", Wr = { hmacSha256Async: async (e2, n) => {
  let t = it(), r = await t.importKey("raw", e2, { name: "HMAC", hash: ut }, false, ["sign"]);
  return new Uint8Array(await t.sign("HMAC", r, n));
}, hmacSha256: void 0, sha256Async: async (e2) => new Uint8Array(await it().digest(ut, e2)), sha256: void 0 };
var Fr = (e2) => {
  if (e2 = e2 === void 0 ? Sn(48) : e2, ie(e2), e2.length < 48 || e2.length > 1024) throw new RangeError("expected 48-1024b");
  let n = M(Ee(e2), qe - 1n);
  return he(n + 1n);
}, Jr = (e2) => (n) => {
  let t = Fr(n);
  return { secretKey: t, publicKey: e2(t) };
};
var bt = (e2) => Uint8Array.from("BIP0340/" + e2, (n) => n.charCodeAt(0)), Pn = (e2, ...n) => {
  let t = ct("sha256", bt(e2));
  return ct("sha256", He(t, t, ...n));
}, kn = (e2, ...n) => ft("sha256Async", bt(e2)).then((t) => ft("sha256Async", He(t, t, ...n))), bn = (e2) => {
  let n = Kr(e2), t = Re.multiply(n), { x: r, y: a } = t.assertValidity().toAffine(), s = en(a) ? n : Qe(-n), o = he(r);
  return { d: s, px: o };
}, Tn = (e2) => Qe(Ee(e2)), Tt = (...e2) => Tn(Pn("challenge", ...e2)), At = async (...e2) => Tn(await kn("challenge", ...e2)), Rt = (e2) => bn(e2).px, zr = Jr(Rt), Et = (e2, n, t) => {
  let r = Ur(e2, "message"), { px: a, d: s } = bn(n);
  return { m: r, px: a, d: s, a: ie(t, ue) };
}, Mt = (e2) => {
  let n = Tn(e2);
  if (n === 0n) throw new Error("sign failed: k is zero");
  let { px: t, d: r } = bn(he(n));
  return { rx: t, k: r };
}, Bt = (e2, n, t, r) => He(n, he(Qe(e2 + t * r))), Ot = "invalid signature produced", Vr = (e2, n, t = Sn(ue)) => {
  let { m: r, px: a, d: s, a: o } = Et(e2, n, t), i = he(s ^ Ee(Pn("aux", o))), { rx: c, k: m } = Mt(Pn("nonce", i, a, r)), u = Bt(m, c, Tt(c, a, r), s);
  if (!Dt(u, r, a)) throw new Error(Ot);
  return u;
}, Gr = async (e2, n, t = Sn(ue)) => {
  let { m: r, px: a, d: s, a: o } = Et(e2, n, t), i = he(s ^ Ee(await kn("aux", o))), { rx: c, k: m } = Mt(await kn("nonce", i, a, r)), u = Bt(m, c, await At(c, a, r), s);
  if (!await Lt(u, r, a)) throw new Error(Ot);
  return u;
}, Zr = (e2, n) => e2 instanceof Promise ? e2.then(n) : n(e2), Ct = (e2, n, t, r) => {
  let a = ie(e2, 64, "signature"), s = ie(n, void 0, "message"), o = ie(t, ue, "publicKey"), i, c, m, u;
  try {
    let f = Ee(o);
    i = St(f), c = $e(Ye(a, 0, ue)), m = vt(Ye(a, ue, 64)), u = He(he(c), o, s);
  } catch {
    return false;
  }
  return Zr(r(u), (f) => {
    try {
      let { x: d, y: h } = qr(i, m, Qe(-f)).toAffine();
      return !(!en(h) || d !== c);
    } catch {
      return false;
    }
  });
}, Dt = (e2, n, t) => Ct(e2, n, t, Tt), Lt = async (e2, n, t) => Ct(e2, n, t, At), An = vn({ keygen: zr, getPublicKey: Rt, sign: Vr, verify: Dt, signAsync: Gr, verifyAsync: Lt }), Xr = () => {
  let e2 = [], n = Re, t = n;
  for (let r = 0; r < 33; r++) {
    t = n, e2.push(t);
    for (let a = 1; a < 128; a++) t = t.add(n), e2.push(t);
    n = t.double();
  }
  return e2;
}, dt, mt = (e2, n) => {
  let t = n.negate();
  return e2 ? t : n;
}, Yr = (e2) => {
  let n = dt || (dt = Xr()), t = je, r = Re;
  for (let a = 0; a < 33; a++) {
    let s = Number(e2 & 255n);
    e2 >>= 8n, s > 128 && (s -= 256, e2 += 1n);
    let o = a * 128, i = o + Math.abs(s) - 1, c = a % 2 !== 0, m = s < 0;
    s === 0 ? r = r.add(mt(c, n[o])) : t = t.add(mt(m, n[i]));
  }
  if (e2 !== 0n) throw new Error("invalid wnaf");
  return { p: t, f: r };
};
var { floor: En, min: Qr, sin: eo } = Math, V = "Trystero", ve = (e2, n) => Array(e2).fill(void 0).map(n), no = "0123456789AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz", ce = (e2) => ve(e2, () => {
  var _a;
  return (_a = no[En(Math.random() * 62)]) != null ? _a : "";
}).join(""), G = ce(20), oe = Promise.all.bind(Promise), Bn = typeof window < "u", { entries: de, fromEntries: On, keys: Y, values: ye } = Object, z = () => {
}, nn = "candidate", x = (e2) => (e2 !== null && clearTimeout(e2), null), _ = (e2) => new Error(`${V}: ${e2}`), pe = (e2, n) => e2 instanceof Error && e2.message ? e2.message : typeof e2 == "string" && e2 ? e2 : Z(e2 != null ? e2 : n), fe = (e2, n) => e2 instanceof Error ? e2 : _(pe(e2, n)), to = new TextEncoder(), ro = new TextDecoder(), le = (e2) => to.encode(e2), me = (e2) => ro.decode(e2), we = (e2) => e2.reduce((n, t) => n + t.toString(16).padStart(2, "0"), ""), Me = (...e2) => e2.join("@"), oo = (e2, n) => {
  let t = [...e2], r = () => {
    let s = eo(n++) * 1e4;
    return s - En(s);
  }, a = t.length;
  for (; a; ) {
    let s = En(r() * a--), o = t[a];
    t[a] = t[s], t[s] = o;
  }
  return t;
}, Cn = (e2, n, t, r = false) => {
  var _a, _b, _c;
  return ((_a = e2.relayConfig) == null ? void 0 : _a.urls) || (r ? oo(n, tn(e2.appId)) : n).slice(0, (_c = (_b = e2.relayConfig) == null ? void 0 : _b.redundancy) != null ? _c : t);
}, Z = JSON.stringify, ge = (e2) => {
  try {
    return JSON.parse(e2);
  } catch {
    throw _(`failed to parse JSON: ${e2}`);
  }
}, tn = (e2, n = Number.MAX_SAFE_INTEGER) => e2.split("").reduce((t, r) => t + r.charCodeAt(0), 0) % n, Ht = 3333, It = 6e4, Rn = {}, We = null, Mn = null, Dn = () => {
  We || (We = new Promise((e2) => {
    Mn = e2;
  }).finally(() => {
    Mn = null, We = null;
  }));
}, Ln = () => {
  Mn == null ? void 0 : Mn();
}, Hn = (e2, n, t) => {
  let r = {}, a = false, s = false, o, i = z;
  r.isClosed = false, r.ready = new Promise((m) => i = m);
  let c = () => {
    if (r.isClosed) return;
    o = void 0, s = false;
    let m = new WebSocket(e2);
    m.onclose = () => {
      var _a;
      if (r.isClosed || s) return;
      if (s = true, We) {
        We.then(c);
        return;
      }
      let u = (_a = Rn[e2]) != null ? _a : Rn[e2] = Ht;
      if (u >= It) {
        r.isClosed = true;
        return;
      }
      o = setTimeout(c, Math.random() * u), Rn[e2] = Qr(u * 2, It);
    }, m.onmessage = (u) => n(String(u.data)), r.socket = m, r.url = m.url, m.onopen = () => {
      let u = a;
      a = true, i(r), Rn[e2] = Ht, u && (t == null ? void 0 : t());
    }, r.send = (u) => {
      m.readyState === 1 && m.send(u);
    };
  };
  return r.close = () => {
    r.isClosed = true, o !== void 0 && (clearTimeout(o), o = void 0), r.socket.close();
  }, c(), r;
};
var In = (e2) => {
  let n = {}, t = /* @__PURE__ */ new WeakMap(), r = (o) => {
    let i = t.get(o);
    if (!i) throw _("relay bookkeeping missing registration for relay client");
    return i;
  }, a = () => {
    let o = {}, i = (c) => {
      var _a;
      return (_a = o[c]) != null ? _a : o[c] = {};
    };
    return { forKey: i, forRelay: (c) => i(r(c)) };
  }, s = (o, i) => (n[o] = i, t.set(i, o), i);
  return { register: (o, i) => {
    let c = n[o];
    return c || s(o, i());
  }, keyOf: r, scoped: a, getSockets: () => On(de(n).flatMap(([o, i]) => {
    let c = e2(i);
    return c ? [[o, c]] : [];
  })) };
}, xt = () => {
  if (Bn) {
    let e2 = new AbortController();
    return addEventListener("online", Ln, { signal: e2.signal }), addEventListener("offline", Dn, { signal: e2.signal }), () => e2.abort();
  }
  return z;
};
var xn = "AES-GCM", so = {}, ao = (e2) => btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(e2)))), io = (e2) => {
  let n = atob(e2);
  return new Uint8Array(n.length).map((t, r) => n.charCodeAt(r)).buffer;
}, Be = async (e2, n) => new Uint8Array(await crypto.subtle.digest(e2, le(n))), Se = async (e2) => {
  var _a;
  return (_a = so[e2]) != null ? _a : so[e2] = Array.from(await Be("SHA-1", e2)).map((n) => n.toString(36)).join("");
}, _t = async (e2, n, t) => crypto.subtle.importKey("raw", await crypto.subtle.digest({ name: "SHA-256" }, le(`${e2}:${n}:${t}`)), { name: xn }, false, ["encrypt", "decrypt"]), Ut = async (e2, n) => we(await Be("SHA-256", `${V}:${e2}:${n}`)), Nt = "$", $t = ",", jt = async (e2, n) => {
  let t = crypto.getRandomValues(new Uint8Array(16));
  return t.join($t) + Nt + ao(await crypto.subtle.encrypt({ name: xn, iv: t }, await e2, le(n)));
}, qt = async (e2, n) => {
  var _a;
  let [t, r] = n.split(Nt);
  return me(await crypto.subtle.decrypt({ name: xn, iv: new Uint8Array((_a = t == null ? void 0 : t.split($t).map(Number)) != null ? _a : []) }, await e2, io(r != null ? r : "")));
};
var Fe = 57333, co = 18e4, fo = 20, Kt = class {
  makeOffer;
  pool = [];
  pooled = /* @__PURE__ */ new Set();
  leased = /* @__PURE__ */ new Map();
  recycling = /* @__PURE__ */ new Set();
  cleanupTimer = null;
  active = false;
  constructor(e2) {
    this.makeOffer = e2;
  }
  get isActive() {
    return this.active;
  }
  warmup() {
    this.pool = [], this.pooled.clear(), ve(fo, this.makeOffer).forEach((e2) => this.push(e2)), this.active = true, this.cleanupTimer = setInterval(() => {
      this.pool = this.pool.filter((e2) => e2.isDead ? (this.pooled.delete(e2), false) : true);
    }, Fe);
  }
  push(e2) {
    e2.isDead || this.pooled.has(e2) || this.leased.has(e2) || (this.pool.push(e2), this.pooled.add(e2));
  }
  shift(e2) {
    let n = [];
    for (; n.length < e2 && this.pool.length > 0; ) {
      let t = this.pool.shift();
      if (!t) break;
      this.pooled.delete(t), n.push(t);
    }
    return n;
  }
  claimLeased(e2) {
    let n = this.leased.get(e2);
    n && (x(n), this.leased.delete(e2));
  }
  recycle(e2) {
    if (!(e2.isDead || this.recycling.has(e2))) {
      if (e2.connection.remoteDescription) {
        e2.destroy();
        return;
      }
      if (!this.active) {
        e2.destroy();
        return;
      }
      this.recycling.add(e2), e2.setHandlers({ connect: z, close: z, error: z }), e2.getOffer(true).then((n) => {
        if (!n || n.type !== "offer" || e2.isDead || !this.active) {
          e2.destroy();
          return;
        }
        this.push(e2);
      }).catch(() => e2.destroy()).finally(() => this.recycling.delete(e2));
    }
  }
  reclaimLeased(e2) {
    let n = this.leased.get(e2);
    n && (x(n), this.leased.delete(e2), this.recycle(e2));
  }
  lease(e2) {
    this.claimLeased(e2), this.leased.set(e2, setTimeout(() => {
      this.leased.delete(e2), this.recycle(e2);
    }, co));
  }
  checkout(e2, n, t) {
    let r = this.shift(e2), a = Math.max(0, e2 - r.length);
    a > 0 && r.push(...ve(a, this.makeOffer));
    let s = async (o, i = false) => {
      try {
        let c = await t(o);
        return n ? (this.lease(o), { peer: o, offer: c, claim: () => this.claimLeased(o), reclaim: () => this.reclaimLeased(o) }) : { peer: o, offer: c };
      } catch (c) {
        if (this.claimLeased(o), this.pooled.delete(o), o.destroy(), !i) return s(this.makeOffer(), true);
        throw c;
      }
    };
    return oe(r.map((o) => s(o)));
  }
  getOffers(e2, n) {
    return this.checkout(e2, true, n);
  }
  destroy() {
    this.active = false, this.cleanupTimer && (clearInterval(this.cleanupTimer), this.cleanupTimer = null), this.pool.forEach((e2) => e2.destroy()), this.pool = [], this.pooled.clear(), this.leased.forEach((e2, n) => {
      x(e2), n.destroy();
    }), this.leased.clear(), this.recycling.forEach((e2) => e2.destroy()), this.recycling.clear();
  }
};
var _n = _("incorrect password for overlapping room"), Wt = (e2, n, t) => {
  let r = (o) => Be("SHA-256", `${o}:${e2}:${n}:${t}`).then(we), a = async (o, i, c) => {
    if (!e2) return;
    if (c) {
      let u = ce(36);
      await o({ __trystero_pw: "challenge", c: u });
      let { data: f } = await i();
      if (!f || typeof f != "object" || f.__trystero_pw !== "response" || typeof f.h != "string") throw _n;
      let d = await r(u);
      if (f.h !== d) throw _n;
      return;
    }
    let { data: m } = await i();
    if (!m || typeof m != "object" || m.__trystero_pw !== "challenge" || typeof m.c != "string") throw _n;
    await o({ __trystero_pw: "response", h: await r(m.c) });
  };
  return { run: a, compose: (o) => e2 || o ? async (i, c, m, u) => {
    await a(c, m, u), await (o == null ? void 0 : o(i, c, m, u));
  } : void 0 };
}, lo = (e2) => {
  let n = pe(e2, "unknown error");
  return n.startsWith("handshake ") ? n : `handshake failed: ${n}`;
}, Ft = ({ onPeerHandshake: e2, onHandshakeError: n, handshakeTimeoutMs: t, sendHandshakeData: r, sendHandshakeReady: a, onActivate: s, onFailure: o }) => {
  let i = {}, c = (f, d) => {
    let h = i[f];
    !h || d && h.peer !== d || h.isActive || !h.didLocalHandshakePass || !h.didReceiveRemoteReady || (h.isActive = true, h.handshakeTimer = x(h.handshakeTimer), s(f, h.peer));
  }, m = (f, d, h) => {
    let p = i[f];
    if (!p || p.peer !== d) return;
    let A = lo(h);
    n == null ? void 0 : n(f, A), o(f, d, _(A));
  }, u = (f, d) => {
    let h = i[f];
    !h || h.peer !== d || h.isActive || (h.didLocalHandshakePass = true, a("", f).catch((p) => m(f, d, _(`failed sending handshake readiness: ${pe(p, "unknown send failure")}`))), c(f, d));
  };
  return { addPeer: (f, d) => {
    i[f] = { peer: d, isActive: false, didLocalHandshakePass: false, didReceiveRemoteReady: false, handshakeTimer: null, pendingHandshakePayloads: [], handshakeWaiters: [] };
  }, clearPeer: (f, d) => {
    let h = i[f];
    h && (h.handshakeTimer = x(h.handshakeTimer), h.pendingHandshakePayloads.length = 0, h.handshakeWaiters.splice(0).forEach((p) => p.reject(d)), delete i[f]);
  }, canReceiveFromPeer: (f, d) => {
    let h = i[f];
    return !!(h && (h.isActive || d));
  }, start: (f, d) => {
    let h = i[f];
    if (!h || h.peer !== d) return;
    h.handshakeTimer = setTimeout(() => m(f, d, _(`handshake timed out after ${t}ms`)), t);
    let p = async (B, w) => {
      await r(B, f, w);
    }, A = () => new Promise((B, w) => {
      let C = i[f];
      if (!C || C.peer !== d) {
        w(_("peer disconnected during handshake"));
        return;
      }
      let I = C.pendingHandshakePayloads.shift();
      if (I) {
        B(I);
        return;
      }
      C.handshakeWaiters.push({ resolve: B, reject: (v) => w(v) });
    }), T = G < f;
    Promise.resolve(e2 == null ? void 0 : e2(f, p, A, T)).then(() => u(f, d)).catch((B) => m(f, d, fe(B, "handshake failed")));
  }, receiveHandshakeData: (f, d, h) => {
    let p = i[d];
    if (!p || p.isActive) return;
    let A = h === void 0 ? { data: f } : { data: f, metadata: h }, T = p.handshakeWaiters.shift();
    if (T) {
      T.resolve(A);
      return;
    }
    p.pendingHandshakePayloads.push(A);
  }, receiveHandshakeReady: (f) => {
    let d = i[f];
    !d || d.isActive || (d.didReceiveRemoteReady = true, c(f));
  } };
};
var uo = 15e3, mo = 5e3, Jt = "icegatheringstatechange", go = "iceconnectionstatechange", Je = "offer", ho = "answer", yo = /out of range/i, zt = (e2) => e2.replace(/ (\S+\.local) (\d+) typ host/g, " 127.0.0.1 $2 typ host"), Un = (e2, { trickleIce: n, rtcConfig: t, rtcPolyfill: r, turnConfig: a, _test_only_mdnsHostFallbackToLoopback: s }) => {
  let o = new (r != null ? r : RTCPeerConnection)({ iceServers: po.concat(a != null ? a : []), ...t }), i = {}, c = [], m = [], u = n !== false, f = [], d = [], h = false, p = false, A = null, T = null, B = false, w = () => T = x(T), C = () => {
    var _a;
    B || (B = true, w(), (_a = i.close) == null ? void 0 : _a.call(i));
  }, I = (g) => {
    i.signal ? i.signal(g) : c.push(g);
  }, v = (g) => {
    let k = i.signal;
    i.signal = (H) => {
      k == null ? void 0 : k(H), g(H);
    }, c.length > 0 && c.splice(0).forEach((H) => {
      var _a;
      return (_a = i.signal) == null ? void 0 : _a.call(i, H);
    });
  }, R = (g) => s ? zt(g) : g, $ = (g) => {
    if (!s || typeof g.candidate != "string") return g;
    let k = zt(g.candidate);
    return k === g.candidate ? g : { ...g, candidate: k };
  }, b = (g) => {
    var _a, _b, _c, _d;
    return { type: (_b = (_a = g.localDescription) == null ? void 0 : _a.type) != null ? _b : Je, sdp: R((_d = (_c = g.localDescription) == null ? void 0 : _c.sdp) != null ? _d : "") };
  }, K = () => {
    var _a, _b, _c;
    let g = (_a = o.remoteDescription) == null ? void 0 : _a.sdp;
    return g ? (_c = (_b = g.match(/a=ice-ufrag:([^\s]+)/)) == null ? void 0 : _b[1]) != null ? _c : null : null;
  }, F = () => {
    var _a, _b, _c;
    return ((_c = (_b = (_a = o.remoteDescription) == null ? void 0 : _a.sdp) == null ? void 0 : _b.match(/^m=/gm)) != null ? _c : []).length;
  }, j = (g) => {
    if (!o.remoteDescription) return false;
    let k = F();
    if (typeof g.sdpMLineIndex == "number" && k > 0 && g.sdpMLineIndex >= k) return false;
    let H = K();
    return !(H && g.usernameFragment && g.usernameFragment !== H);
  }, W = async (g) => {
    try {
      return await o.addIceCandidate(g), true;
    } catch (k) {
      if (k instanceof Error && yo.test(k.message) && typeof g.sdpMLineIndex == "number") return false;
      throw k;
    }
  }, Q = async () => {
    if (!o.remoteDescription || f.length === 0) return;
    let g = f.splice(0), k = [];
    for (let H of g) {
      if (!j(H)) {
        k.push(H);
        continue;
      }
      await W(H) || k.push(H);
    }
    k.length > 0 && f.push(...k);
  }, l = async (g) => {
    if (j(g)) {
      await W(g) || f.push(g);
      return;
    }
    f.push(g);
  }, y = (g) => {
    g.binaryType = "arraybuffer", g.bufferedAmountLowThreshold = 65535, g.onmessage = (k) => {
      let H = k.data;
      i.data ? i.data(H) : m.push(H);
    }, g.onopen = () => {
      var _a;
      return (_a = i.connect) == null ? void 0 : _a.call(i);
    }, g.onclose = C, g.onerror = ({ error: k }) => {
      var _a;
      return (_a = i.error) == null ? void 0 : _a.call(i, fe(k, "data channel error"));
    };
  }, S = async (g) => {
    let k = null;
    try {
      await Promise.race([new Promise((H) => {
        let ee = () => {
          g.iceGatheringState === "complete" && (g.removeEventListener(Jt, ee), H());
        };
        g.addEventListener(Jt, ee), ee();
      }), new Promise((H) => {
        k = setTimeout(H, uo);
      })]);
    } finally {
      x(k);
    }
    return b(g);
  }, P = async () => {
    let g = u ? b(o) : await S(o);
    return I(g), g;
  };
  e2 ? (A = o.createDataChannel("data"), y(A)) : o.ondatachannel = ({ channel: g }) => {
    A = g, y(g);
  };
  let E = async (g = false) => {
    var _a, _b;
    if (o.connectionState !== "closed") try {
      return h = true, g && (o.signalingState !== "stable" && o.signalingState !== "closed" && ((_a = o.localDescription) == null ? void 0 : _a.type) === Je && await o.setLocalDescription({ type: "rollback" }), typeof o.restartIce == "function" && o.restartIce()), await o.setLocalDescription(g ? await o.createOffer({ iceRestart: true }) : void 0), await P();
    } catch (k) {
      (_b = i.error) == null ? void 0 : _b.call(i, fe(k, "failed to create local offer"));
    } finally {
      h = false;
    }
  };
  o.onnegotiationneeded = async () => E(false), o.onicecandidate = ({ candidate: g }) => {
    if (!u || !g) return;
    let k = $(typeof g.toJSON == "function" ? g.toJSON() : { candidate: g.candidate, sdpMid: g.sdpMid, sdpMLineIndex: g.sdpMLineIndex, usernameFragment: g.usernameFragment });
    I({ type: nn, sdp: JSON.stringify(k) });
  };
  let U = () => {
    if (o.connectionState === "failed" || o.connectionState === "closed" || o.iceConnectionState === "failed" || o.iceConnectionState === "closed") {
      C();
      return;
    }
    if (o.connectionState === "connected" || o.connectionState === "connecting" || o.iceConnectionState === "connected" || o.iceConnectionState === "completed" || o.iceConnectionState === "checking") {
      w();
      return;
    }
    if (o.connectionState === "disconnected" || o.iceConnectionState === "disconnected") {
      T || (T = setTimeout(() => {
        T = null, (o.connectionState === "disconnected" || o.iceConnectionState === "disconnected") && C();
      }, mo));
      return;
    }
  };
  o.onconnectionstatechange = U, o.addEventListener(go, U), o.ontrack = (g) => {
    var _a, _b;
    let k = g.streams[0];
    if (k) {
      if (!i.track && !i.stream) {
        d.push({ track: g.track, stream: k });
        return;
      }
      (_a = i.track) == null ? void 0 : _a.call(i, g.track, k), (_b = i.stream) == null ? void 0 : _b.call(i, k);
    }
  }, o.onremovestream = (g) => {
    var _a;
    return (_a = i.stream) == null ? void 0 : _a.call(i, g.stream);
  };
  let q = e2 ? new Promise((g) => v((k) => {
    k.type === Je && g(k);
  })) : Promise.resolve();
  return e2 && queueMicrotask(() => {
    var _a;
    !h && o.signalingState === "stable" && !o.localDescription && o.connectionState !== "closed" && ((_a = o.onnegotiationneeded) == null ? void 0 : _a.call(o, new Event("negotiationneeded")));
  }), { created: Date.now(), connection: o, get channel() {
    return A;
  }, get isDead() {
    return o.connectionState === "closed";
  }, getOffer: async (g = false) => {
    var _a;
    if (e2) return g ? E(true) : ((_a = o.localDescription) == null ? void 0 : _a.type) === Je ? u ? b(o) : S(o) : q;
  }, async signal(g) {
    var _a, _b, _c;
    if (g.type === "candidate") {
      try {
        let k = JSON.parse(g.sdp);
        k && typeof k == "object" && await l($(k));
      } catch (k) {
        (_a = i.error) == null ? void 0 : _a.call(i, fe(k, "failed to parse remote candidate"));
      }
      return;
    }
    if (!((A == null ? void 0 : A.readyState) === "open" && !((_b = g.sdp) == null ? void 0 : _b.includes("a=rtpmap")))) try {
      let k = { ...g, sdp: R(g.sdp) };
      if (g.type === Je) {
        if (h || o.signalingState !== "stable" && !p) {
          if (e2) return;
          await oe([o.setLocalDescription({ type: "rollback" }), o.setRemoteDescription(k)]);
        } else await o.setRemoteDescription(k);
        return await Q(), await o.setLocalDescription(), await P();
      }
      if (g.type === ho) {
        p = true;
        try {
          await o.setRemoteDescription(k), await Q();
        } finally {
          p = false;
        }
      }
    } catch (k) {
      (_c = i.error) == null ? void 0 : _c.call(i, fe(k, "failed to apply remote signal"));
    }
  }, sendData: (g) => A == null ? void 0 : A.send(g), destroy: () => {
    w(), A == null ? void 0 : A.close(), o.close(), h = false, p = false, C();
  }, setHandlers: (g) => {
    let { signal: k, ...H } = g;
    Object.assign(i, H), i.data && m.length > 0 && m.splice(0).forEach((ee) => {
      var _a;
      return (_a = i.data) == null ? void 0 : _a.call(i, ee);
    }), k && v(k), (i.track || i.stream) && d.length > 0 && d.splice(0).forEach(({ track: ee, stream: ne }) => {
      var _a, _b;
      (_a = i.track) == null ? void 0 : _a.call(i, ee, ne), (_b = i.stream) == null ? void 0 : _b.call(i, ne);
    });
  }, offerPromise: q, addStream: (g) => g.getTracks().forEach((k) => o.addTrack(k, g)), removeStream: (g) => o.getSenders().filter((k) => k.track && g.getTracks().includes(k.track)).forEach((k) => o.removeTrack(k)), addTrack: (g, k) => o.addTrack(g, k), removeTrack: (g) => {
    let k = o.getSenders().find((H) => H.track === g);
    k && o.removeTrack(k);
  }, replaceTrack: (g, k) => {
    let H = o.getSenders().find((ee) => ee.track === g);
    if (H) return H.replaceTrack(k);
  } };
}, po = [...ve(3, (e2, n) => `stun:stun${n || ""}.l.google.com:19302`), "stun:stun.cloudflare.com:3478"].map((e2) => ({ urls: e2 }));
var wo = Object.getPrototypeOf(Uint8Array), Nn = 32, Po = 0, $n = 32, Vt = 34, jn = 35, rn = 36, Oe = 16 * 2 ** 10 - rn, ze = 255, ko = 65535, Gt = "bufferedamountlow", Zt = "close", Xt = "error", vo = 1e4, So = (e2) => e2 instanceof ArrayBuffer ? new Uint8Array(e2) : new Uint8Array(e2.buffer, e2.byteOffset, e2.byteLength), bo = (e2, n = vo) => e2.readyState !== "open" || e2.bufferedAmount <= e2.bufferedAmountLowThreshold ? Promise.resolve(e2.readyState === "open") : new Promise((t) => {
  let r = false, a = null, s = (c) => {
    r || (r = true, e2.removeEventListener(Gt, o), e2.removeEventListener(Zt, i), e2.removeEventListener(Xt, i), x(a), t(c));
  }, o = () => s(true), i = () => s(false);
  if (e2.addEventListener(Gt, o), e2.addEventListener(Zt, i), e2.addEventListener(Xt, i), a = setTimeout(() => s(false), n), e2.readyState !== "open") {
    s(false);
    return;
  }
  e2.bufferedAmount <= e2.bufferedAmountLowThreshold && s(true);
}), Yt = ({ getPeer: e2, getPeerIds: n, canReceiveFromPeer: t, throwIfAborted: r }) => {
  let a = {}, s = {}, o = {}, i = {}, c = (f, d, { includePending: h = false } = {}) => (f ? Array.isArray(f) ? f : [f] : n(h)).flatMap((p) => {
    let A = e2(p, h);
    return A ? [Promise.resolve(d(p, A))] : (console.warn(`${V}: no peer with id ${p} found`), []);
  });
  return { makeInternalAction: (f, d = {}) => {
    let h = s[f];
    if (a[f] && h) {
      let w = a[f].options;
      if (w.sendToPending !== !!d.sendToPending || w.receiveWhilePending !== !!d.receiveWhilePending) throw _(`action type "${f}" cannot be redefined`);
      return h;
    }
    if (!f) throw _("action type argument is required");
    let p = le(f);
    if (p.byteLength > Nn) throw _(`action type string "${f}" (${p.byteLength}b) exceeds byte limit (${Nn}). Hint: choose a shorter name.`);
    let A = { sendToPending: !!d.sendToPending, receiveWhilePending: !!d.receiveWhilePending }, T = new Uint8Array(Nn);
    T.set(p);
    let B = 0;
    return a[f] = { onComplete: z, onProgress: z, setOnComplete: (w) => {
      a[f].onComplete = w;
      let C = i[f];
      (C == null ? void 0 : C.length) && (delete i[f], C.forEach(({ payload: I, peerId: v, metadata: R }) => w(I, v, R)));
    }, setOnProgress: (w) => {
      a[f].onProgress = w;
    }, send: async (w, C, I, v, R) => {
      r(R);
      let $ = typeof w;
      if ($ === "undefined") throw _("action data cannot be undefined");
      let b = $ !== "string", K = w instanceof Blob, F = K || w instanceof ArrayBuffer || w instanceof wo, j = I !== void 0, W = F ? So(K ? await w.arrayBuffer() : w) : le(b ? Z(w) : w), Q = j ? le(Z(I)) : null, l = Math.ceil(W.byteLength / Oe) + (j ? 1 : 0) || 1, y = ve(l, (S, P) => {
        var _a;
        let E = P === l - 1, U = !!(j && P === 0), q = new Uint8Array(rn + (U ? (_a = Q == null ? void 0 : Q.byteLength) != null ? _a : 0 : E ? W.byteLength - Oe * (l - (j ? 2 : 1)) : Oe));
        return q.set(T), q.set([B >> 8, B & ze], $n), q.set([Number(E) | Number(U) << 1 | Number(F) << 2 | Number(b) << 3], Vt), q.set([Math.round((P + 1) / l * ze)], jn), q.set(j ? U ? Q != null ? Q : new Uint8Array() : W.subarray((P - 1) * Oe, P * Oe) : W.subarray(P * Oe, (P + 1) * Oe), rn), q;
      });
      return B = B + 1 & ko, await oe(c(C, async (S, P) => {
        var _a;
        let { channel: E } = P, U = 0;
        for (; U < l; ) {
          r(R);
          let q = y[U];
          if (!q) break;
          if (E && E.bufferedAmount > E.bufferedAmountLowThreshold) {
            let H = await bo(E);
            if (r(R), !H) break;
          }
          let g = e2(S, A.sendToPending);
          if (!g || g !== P) break;
          P.sendData(q), U++;
          let k = (_a = q[jn]) != null ? _a : ze;
          v == null ? void 0 : v(k / ze, S, I);
        }
      }, { includePending: A.sendToPending })), [];
    }, options: A }, s[f] = { send: a[f].send, onMessage: a[f].setOnComplete, onProgress: a[f].setOnProgress };
  }, handleData: (f, d) => {
    var _a, _b, _c, _d, _e2, _f, _g, _h, _i, _j;
    let h = new Uint8Array(d), p = me(h.subarray(Po, $n)).replace(/\x00/g, function() {
      return "";
    }), A = a[p];
    if (!t(f, !!(A == null ? void 0 : A.options.receiveWhilePending))) return;
    let T = ((_a = h[$n]) != null ? _a : 0) << 8 | ((_b = h[33]) != null ? _b : 0), B = (_c = h[Vt]) != null ? _c : 0, w = (_d = h[jn]) != null ? _d : 0, C = h.subarray(rn), I = !!(B & 1), v = !!(B & 2), R = !!(B & 4), $ = !!(B & 8);
    (_e2 = o[f]) != null ? _e2 : o[f] = {}, (_g = (_f = o[f])[p]) != null ? _g : _f[p] = {};
    let b = (_i = (_h = o[f][p])[T]) != null ? _i : _h[T] = { chunks: [] };
    if (v ? b.meta = ge(me(C)) : b.chunks.push(C), A == null ? void 0 : A.onProgress(w / ze, f, b.meta), !I) return;
    let K = new Uint8Array(b.chunks.reduce((j, W) => j + W.byteLength, 0));
    b.chunks.reduce((j, W) => (K.set(W, j), j + W.byteLength), 0), delete o[f][p][T];
    let F = R ? K : $ ? ge(me(K)) : me(K);
    if (A) {
      A.onComplete(F, f, b.meta);
      return;
    }
    ((_j = i[p]) != null ? _j : i[p] = []).push({ payload: F, peerId: f, ...b.meta === void 0 ? {} : { metadata: b.meta } });
  }, clearPeer: (f) => {
    delete o[f];
  } };
};
var To = 500, Ie = (e2, n) => {
  let t = _(n);
  return t.kind = e2, t.name = e2 === "aborted" ? "AbortError" : t.name, t;
}, qn = (e2) => {
  if (e2 == null ? void 0 : e2.aborted) throw Ie("aborted", "operation aborted");
}, Qt = (e2) => e2 && typeof e2 == "object" && !Array.isArray(e2) && typeof e2.r == "string" ? { r: e2.r, ...Object.hasOwn(e2, "m") ? { m: e2.m } : {} } : null, Ao = (e2) => e2 && typeof e2 == "object" && !Array.isArray(e2) && typeof e2.r == "string" ? { r: e2.r, ...typeof e2.e == "string" ? { e: e2.e } : {} } : null, on = (e2, n) => n === void 0 ? e2 : { ...e2, metadata: n }, er = ({ getPeer: e2, getPeerIds: n, canReceiveFromPeer: t }) => {
  let r = {}, a = {}, s = Yt({ getPeer: e2, getPeerIds: n, canReceiveFromPeer: t, throwIfAborted: qn }), o = s.makeInternalAction, i = s.handleData, c = (h) => {
    let p = a[h];
    p && (x(p.timer), p.signal && p.abortHandler && p.signal.removeEventListener("abort", p.abortHandler), delete a[h]);
  }, m = (h, p) => {
    de(a).forEach(([A, T]) => {
      T.peerId === h && (c(A), T.reject(p));
    });
  }, u = (h, p) => {
    s.clearPeer(h), m(h, Ie("disconnected", pe(p, "peer disconnected")));
  }, f = o("@_response");
  return f.onMessage((h, p, A) => {
    let T = Ao(A);
    if (!T) return;
    let B = a[T.r];
    if (!(!B || B.peerId !== p)) {
      if (c(T.r), T.e !== void 0) {
        B.reject(Ie("rejected", T.e));
        return;
      }
      B.resolve(h);
    }
  }), { makeAction: (h, p) => {
    var _a, _b, _c, _d;
    if (p && "onRequest" in p && p.kind !== "request") throw _('request actions must use kind: "request"');
    let A = (_a = p == null ? void 0 : p.kind) != null ? _a : "message", T = o(h), B = r[h];
    if (B) {
      if (B.kind !== A) throw _(`action type "${h}" cannot be redefined`);
      return B.action;
    }
    let w = { kind: A, action: null, pendingMessages: [], pendingRequests: [], onReceiveProgress: (_b = p == null ? void 0 : p.onReceiveProgress) != null ? _b : null }, C = (l, y) => l ? (S, P) => l(S, on({ peerId: P }, y)) : void 0, I = (l) => {
      w.onReceiveProgress = l;
    }, v = (l, y, S) => {
      var _a2;
      let P = w.kind === "request" ? Qt(S) : null;
      (_a2 = w.onReceiveProgress) == null ? void 0 : _a2.call(w, l, on({ peerId: y }, P ? P.m : S));
    };
    if (T.onProgress(v), A === "message") {
      let l = (_c = p == null ? void 0 : p.onMessage) != null ? _c : null, y = () => {
        if (!l) return;
        let P = l;
        w.pendingMessages.splice(0).forEach(({ payload: E, peerId: U, metadata: q }) => {
          Promise.resolve().then(() => P(E, on({ peerId: U }, q))).catch((g) => console.error(`${V} action handler error:`, g));
        });
      }, S = { send: async (P, E = {}) => {
        await T.send(P, E.target, E.metadata, C(E.onProgress, E.metadata), E.signal);
      }, get onMessage() {
        return l;
      }, set onMessage(P) {
        l = P, y();
      }, get onReceiveProgress() {
        return w.onReceiveProgress;
      }, set onReceiveProgress(P) {
        I(P);
      } };
      return T.onMessage((P, E, U) => {
        if (!l) {
          w.pendingMessages.push(U === void 0 ? { payload: P, peerId: E } : { payload: P, peerId: E, metadata: U });
          return;
        }
        let q = l;
        Promise.resolve().then(() => q(P, on({ peerId: E }, U))).catch((g) => console.error(`${V} action handler error:`, g));
      }), w.action = S, r[h] = w, y(), S;
    }
    let R = (_d = p == null ? void 0 : p.onRequest) != null ? _d : null, $ = (l) => {
      x(l.timer);
      let y = w.pendingRequests.indexOf(l);
      y > -1 && w.pendingRequests.splice(y, 1);
    }, b = (l, y, S) => {
      f.send(null, l, { r: y, e: pe(S, "request failed") });
    }, K = (l, y) => {
      $(l), Promise.resolve().then(() => y(l.payload, { peerId: l.peerId, ...l.metadata === void 0 ? {} : { metadata: l.metadata }, signal: l.controller.signal })).then(async (S) => {
        if (S === void 0) throw _("request handler returned undefined");
        await f.send(S, l.peerId, { r: l.requestId });
      }).catch((S) => b(l.peerId, l.requestId, S)).finally(() => l.controller.abort());
    }, F = () => {
      R && w.pendingRequests.slice().forEach((l) => K(l, R));
    }, j = (l, y, S, P) => {
      if (R) {
        let U = { payload: l, peerId: y, ...S === void 0 ? {} : { metadata: S }, requestId: P, controller: new AbortController(), timer: null };
        K(U, R);
        return;
      }
      let E = { payload: l, peerId: y, ...S === void 0 ? {} : { metadata: S }, requestId: P, controller: new AbortController(), timer: setTimeout(() => {
        $(E), E.controller.abort(), b(y, P, "request handler unavailable");
      }, To) };
      w.pendingRequests.push(E);
    }, W = async (l, y) => {
      let { target: S, metadata: P, onProgress: E, signal: U, timeoutMs: q } = y;
      if (qn(U), !e2(S, false)) throw Ie("disconnected", `no active peer with id ${S}`);
      let g = ce(20), k = new Promise((H, ee) => {
        let ne = { peerId: S, resolve: H, reject: ee, timer: null, ...U === void 0 ? {} : { signal: U } }, Ue = () => {
          c(g), ee(Ie("aborted", "operation aborted"));
        };
        U && (ne.abortHandler = Ue, U.addEventListener("abort", Ue, { once: true })), a[g] = ne;
      }).catch((H) => {
        throw H;
      });
      try {
        await T.send(l, S, P === void 0 ? { r: g } : { r: g, m: P }, C(E, P), U);
        let H = a[g];
        return H && q !== void 0 && (H.timer = setTimeout(() => {
          c(g), H.reject(Ie("timeout", "request timed out"));
        }, q)), await k;
      } catch (H) {
        throw c(g), H;
      }
    }, Q = { request: W, requestMany: async (l, y) => (qn(y.signal), await oe(y.targets.map(async (S) => {
      var _a2, _b2;
      try {
        let P = { peerId: S, status: "fulfilled", value: await W(l, { target: S, ...y.metadata === void 0 ? {} : { metadata: y.metadata }, ...y.timeoutMs === void 0 ? {} : { timeoutMs: y.timeoutMs }, ...y.onProgress === void 0 ? {} : { onProgress: y.onProgress }, ...y.signal === void 0 ? {} : { signal: y.signal } }) };
        return (_a2 = y.onResult) == null ? void 0 : _a2.call(y, P), P;
      } catch (P) {
        let E = fe(P, "request failed");
        if (E.kind === "aborted" || !E.kind) throw E;
        let U = E.kind === "timeout" ? { peerId: S, status: "timeout" } : E.kind === "disconnected" ? { peerId: S, status: "disconnected" } : { peerId: S, status: "rejected", error: E };
        return (_b2 = y.onResult) == null ? void 0 : _b2.call(y, U), U;
      }
    }))), get onRequest() {
      return R;
    }, set onRequest(l) {
      R = l, F();
    }, get onReceiveProgress() {
      return w.onReceiveProgress;
    }, set onReceiveProgress(l) {
      I(l);
    } };
    return T.onMessage((l, y, S) => {
      let P = Qt(S);
      P && j(l, y, P.m, P.r);
    }), w.action = Q, r[h] = w, F(), Q;
  }, makeInternalAction: o, handleData: i, clearPeer: u };
};
var nr = (e2) => e2 && typeof e2 == "object" && !Array.isArray(e2) && typeof e2.k == "string" ? { key: e2.k, ...typeof e2.s == "string" ? { streamId: e2.s } : {}, ...typeof e2.t == "string" ? { trackId: e2.t } : {}, ...Object.hasOwn(e2, "m") ? { metadata: e2.m } : {} } : null, tr = (e2) => (n) => {
  let t = e2.get(n);
  return t || (t = ce(20), e2.set(n, t)), t;
}, Kn = () => {
  let e2 = /* @__PURE__ */ new WeakMap(), n = /* @__PURE__ */ new WeakMap(), t = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map(), a = /* @__PURE__ */ new Map(), s = /* @__PURE__ */ new Map();
  return { getStreamKey: tr(e2), getTrackKey: tr(n), rememberRemoteStream: (o, i, c) => {
    t.set(o, i), c && r.set(c, i);
  }, getRemoteStream: (o, i) => {
    var _a;
    return (_a = t.get(o)) != null ? _a : i ? r.get(i) : void 0;
  }, rememberRemoteTrack: (o, i, c, m, u) => {
    let f = { track: i, stream: c };
    a.set(o, f), m && s.set(m, f), u && r.set(u, c);
  }, getRemoteTrack: (o, i) => {
    var _a;
    return (_a = a.get(o)) != null ? _a : i ? s.get(i) : void 0;
  }, clearRemote: () => {
    t.clear(), r.clear(), a.clear(), s.clear();
  } };
}, rr = ({ iterate: e2, isActive: n, getSharedMediaPeer: t }) => {
  let r = {}, a = {}, s = Kn(), o = { onPeerStream: null, onPeerTrack: null }, i = (u, f, d, h) => {
    var _a, _b, _c;
    n(u) && ((_b = (_a = t(u)) == null ? void 0 : _a.__trysteroMedia) == null ? void 0 : _b.rememberRemoteStream(f, d, typeof d.id == "string" ? d.id : void 0), (_c = o.onPeerStream) == null ? void 0 : _c.call(o, d, u, h));
  }, c = (u, f, d, h, p) => {
    var _a, _b, _c;
    n(u) && ((_b = (_a = t(u)) == null ? void 0 : _a.__trysteroMedia) == null ? void 0 : _b.rememberRemoteTrack(f, d, h, typeof d.id == "string" ? d.id : void 0, typeof h.id == "string" ? h.id : void 0), (_c = o.onPeerTrack) == null ? void 0 : _c.call(o, d, h, u, p));
  }, m = (u, f, d, h, p, A = {}) => {
    let T = { k: f, ...A, ...d === void 0 ? {} : { m: d } };
    return e2(u, async (B, w) => {
      await h(T, B), p(w);
    });
  };
  return { addStream: (u, f, d) => m(f.target, s.getStreamKey(u), f.metadata, d, (h) => h.addStream(u), { s: u.id }), removeStream: (u, f) => {
    e2(f, (d, h) => h.removeStream(u));
  }, addTrack: (u, f, d, h) => m(d.target, s.getTrackKey(u), d.metadata, h, (p) => p.addTrack(u, f), { s: f.id, t: u.id }), removeTrack: (u, f) => {
    e2(f, (d, h) => h.removeTrack(u));
  }, replaceTrack: (u, f, d, h) => m(d.target, s.getTrackKey(f), d.metadata, h, (p) => p.replaceTrack(u, f), { t: u.id }), receiveStreamMeta: (u, f) => {
    var _a, _b, _c;
    if (!n(f)) return;
    let d = nr(u);
    if (!d) return;
    let h = (_b = (_a = t(f)) == null ? void 0 : _a.__trysteroMedia) == null ? void 0 : _b.getRemoteStream(d.key, d.streamId);
    if (h) {
      i(f, d.key, h, d.metadata);
      return;
    }
    ((_c = r[f]) != null ? _c : r[f] = []).push(d);
  }, receiveTrackMeta: (u, f) => {
    var _a, _b, _c;
    if (!n(f)) return;
    let d = nr(u);
    if (!d) return;
    let h = (_b = (_a = t(f)) == null ? void 0 : _a.__trysteroMedia) == null ? void 0 : _b.getRemoteTrack(d.key, d.trackId);
    if (h) {
      c(f, d.key, h.track, h.stream, d.metadata);
      return;
    }
    ((_c = a[f]) != null ? _c : a[f] = []).push(d);
  }, receiveRemoteStream: (u, f) => {
    var _a;
    if (!n(u)) return;
    let d = (_a = r[u]) == null ? void 0 : _a.shift();
    d && i(u, d.key, f, d.metadata);
  }, receiveRemoteTrack: (u, f, d) => {
    var _a;
    if (!n(u)) return;
    let h = (_a = a[u]) == null ? void 0 : _a.shift();
    h && c(u, h.key, f, d, h.metadata);
  }, clearPeer: (u) => {
    delete r[u], delete a[u];
  }, get onPeerStream() {
    return o.onPeerStream;
  }, set onPeerStream(u) {
    o.onPeerStream = u;
  }, get onPeerTrack() {
    return o.onPeerTrack;
  }, set onPeerTrack(u) {
    o.onPeerTrack = u;
  } };
};
var or = "beforeunload", Ro = 1e4, be = (e2) => "@_" + e2, Ve = /* @__PURE__ */ new Set(), sr = () => Ve.forEach((e2) => e2()), Eo = (e2) => (Ve.add(e2), Ve.size === 1 && addEventListener(or, sr), () => {
  Ve.delete(e2), Ve.size || removeEventListener(or, sr);
}), ar = (e2, n, t, { onPeerHandshake: r, onHandshakeError: a, handshakeTimeoutMs: s = Ro, isPassive: o = false } = {}) => {
  let i = {}, c = {}, m = {}, u = { onPeerJoin: null, onPeerLeave: null }, f = z, d = null, h = (l, y, { includePending: S = false } = {}) => (l ? Array.isArray(l) ? l : [l] : Y(S ? i : c)).flatMap((P) => {
    let E = S ? i[P] : c[P];
    return E ? [Promise.resolve(y(P, E))] : (console.warn(`${V}: no peer with id ${P} found`), []);
  }), p = rr({ iterate: (l, y) => h(l, (S, P) => y(S, P)), isActive: (l) => !!c[l], getSharedMediaPeer: (l) => {
    var _a;
    return (_a = i[l]) != null ? _a : null;
  } }), A = er({ getPeer: (l, y) => (y ? i : c)[l], getPeerIds: (l) => Y(l ? i : c), canReceiveFromPeer: (l, y) => !!(d == null ? void 0 : d.canReceiveFromPeer(l, y)) }), T = A.makeInternalAction, B = A.handleData, w = A.makeAction, C = (l, y = _("peer disconnected")) => {
    var _a;
    let S = fe(y, "peer disconnected");
    d == null ? void 0 : d.clearPeer(l, S), delete i[l], delete c[l], A.clearPeer(l, S), (_a = m[l]) == null ? void 0 : _a.splice(0).forEach((P) => P.reject(S)), delete m[l], p.clearPeer(l);
  }, I = (l, y, S) => {
    var _a;
    let P = i[l];
    if (!P || y && P !== y) return;
    let E = !!c[l];
    C(l, S), P.destroy(), E && ((_a = u.onPeerLeave) == null ? void 0 : _a.call(u, l)), n(l);
  }, v = async () => {
    await j.send(""), await new Promise((l) => setTimeout(l, 99)), de(i).forEach(([l, y]) => {
      y.destroy(), C(l, _("room left"));
    }), f(), t();
  }, R = T(be("ping")), $ = T(be("pong")), b = T(be("signal")), K = T(be("stream")), F = T(be("track")), j = T(be("leave"), { sendToPending: true, receiveWhilePending: true }), W = T(be("hsdata"), { sendToPending: true, receiveWhilePending: true }), Q = T(be("hsready"), { sendToPending: true, receiveWhilePending: true });
  return d = Ft({ ...r === void 0 ? {} : { onPeerHandshake: r }, ...a === void 0 ? {} : { onHandshakeError: a }, handshakeTimeoutMs: s, sendHandshakeData: W.send, sendHandshakeReady: Q.send, onActivate: (l, y) => {
    var _a;
    c[l] = y, (_a = u.onPeerJoin) == null ? void 0 : _a.call(u, l);
  }, onFailure: (l, y, S) => I(l, y, S) }), R.onMessage((l, y) => $.send("", y)), $.onMessage((l, y) => {
    var _a;
    let S = m[y];
    (_a = S == null ? void 0 : S.shift()) == null ? void 0 : _a.resolve(), S && !S.length && delete m[y];
  }), b.onMessage((l, y) => {
    var _a;
    c[y] && ((_a = i[y]) == null ? void 0 : _a.signal(l));
  }), K.onMessage((l, y) => p.receiveStreamMeta(l, y)), F.onMessage((l, y) => p.receiveTrackMeta(l, y)), j.onMessage((l, y) => I(y, void 0, _("peer left room"))), W.onMessage((l, y, S) => d == null ? void 0 : d.receiveHandshakeData(l, y, S)), Q.onMessage((l, y) => d == null ? void 0 : d.receiveHandshakeReady(y)), e2((l, y) => {
    let S = i[y];
    if (S) {
      if (S === l) return;
      S.destroy(), C(y, _("peer replaced"));
    }
    i[y] = l, d == null ? void 0 : d.addPeer(y, l), l.setHandlers({ data: (P) => B(y, P), stream: (P) => p.receiveRemoteStream(y, P), track: (P, E) => p.receiveRemoteTrack(y, P, E), signal: (P) => {
      c[y] && b.send(P, y);
    }, close: () => I(y, l, _("peer disconnected")), error: (P) => {
      console.error(`${V} peer error:`, P), I(y, l, P);
    } }), d == null ? void 0 : d.start(y, l);
  }), Bn && (f = Eo(() => v().catch(z))), { makeAction: w, leave: v, ping: async (l) => {
    if (!c[l]) throw _(`no active peer with id ${l}`);
    let y = Date.now();
    return await new Promise((S, P) => {
      var _a;
      let E = (_a = m[l]) != null ? _a : m[l] = [], U = () => {
        let g = m[l];
        if (!g) return;
        let k = g.indexOf(q);
        k > -1 && g.splice(k, 1), g.length || delete m[l];
      }, q = { resolve: () => {
        U(), S();
      }, reject: (g) => {
        U(), P(g);
      } };
      E.push(q), R.send("", l).catch((g) => q.reject(fe(g, "peer disconnected")));
    }), Date.now() - y;
  }, isPassive: () => o, getPeers: () => On(de(c).map(([l, y]) => [l, y.connection])), addStream: (l, y = {}) => p.addStream(l, y, K.send), removeStream: (l, y = {}) => {
    p.removeStream(l, y.target);
  }, addTrack: (l, y, S = {}) => p.addTrack(l, y, S, F.send), removeTrack: (l, y = {}) => {
    p.removeTrack(l, y.target);
  }, replaceTrack: (l, y, S = {}) => p.replaceTrack(l, y, S, F.send), get onPeerJoin() {
    return u.onPeerJoin;
  }, set onPeerJoin(l) {
    u.onPeerJoin = l, l && Y(c).forEach((y) => l(y));
  }, get onPeerLeave() {
    return u.onPeerLeave;
  }, set onPeerLeave(l) {
    u.onPeerLeave = l;
  }, get onPeerStream() {
    return p.onPeerStream;
  }, set onPeerStream(l) {
    p.onPeerStream = l;
  }, get onPeerTrack() {
    return p.onPeerTrack;
  }, set onPeerTrack(l) {
    p.onPeerTrack = l;
  } };
};
var cr = 1, fr = 2, ir = (e2, n) => {
  let t = le(e2), r = new Uint8Array(3 + t.byteLength + n.byteLength);
  return r[0] = cr, r[1] = t.byteLength >>> 8 & 255, r[2] = t.byteLength & 255, r.set(t, 3), r.set(n, 3 + t.byteLength), r;
}, Mo = (e2, n) => {
  let t = le(e2), r = new Uint8Array(4 + t.byteLength);
  return r[0] = fr, r[1] = Number(n), r[2] = t.byteLength >>> 8 & 255, r[3] = t.byteLength & 255, r.set(t, 4), r;
}, Bo = (e2) => {
  var _a, _b, _c, _d;
  let n = new Uint8Array(e2);
  if (n.byteLength < 3) return null;
  if (n[0] === cr) {
    let a = ((_a = n[1]) != null ? _a : 0) << 8 | ((_b = n[2]) != null ? _b : 0), s = 3 + a;
    return a <= 0 || n.byteLength < s ? null : { type: "room", roomToken: me(n.subarray(3, s)), payload: n.subarray(s).slice().buffer };
  }
  if (n[0] !== fr || n.byteLength < 4) return null;
  let t = ((_c = n[2]) != null ? _c : 0) << 8 | ((_d = n[3]) != null ? _d : 0), r = 4 + t;
  return t <= 0 || n.byteLength < r ? null : { type: "presence", roomToken: me(n.subarray(4, r)), isPresent: n[1] === 1 };
}, lr = (e2) => {
  let { connection: n, channel: t } = e2;
  return e2.isDead || n.connectionState === "closed" || n.connectionState === "failed" || n.iceConnectionState === "closed" || n.iceConnectionState === "failed" || (t == null ? void 0 : t.readyState) === "closing" || (t == null ? void 0 : t.readyState) === "closed";
}, ur = (e2) => {
  if (lr(e2)) return "stale";
  let { channel: n } = e2;
  return !n || n.readyState !== "open" ? "transient" : "live";
}, dr = class {
  byApp = {};
  roomPresenceHandlers = {};
  getMap(e2) {
    var _a, _b;
    return (_b = (_a = this.byApp)[e2]) != null ? _b : _a[e2] = {};
  }
  get(e2, n) {
    var _a;
    return (_a = this.byApp[e2]) == null ? void 0 : _a[n];
  }
  isPeerStale(e2) {
    return lr(e2);
  }
  getHealth(e2) {
    return this.isPeerStale(e2) ? "stale" : "live";
  }
  setRoomPresenceHandler(e2, n) {
    return this.roomPresenceHandlers[e2] = n, () => {
      this.roomPresenceHandlers[e2] === n && delete this.roomPresenceHandlers[e2];
    };
  }
  sendRoomPresence(e2, n, t) {
    e2.isClosing || e2.peer.isDead || e2.peer.sendData(Mo(n, t));
  }
  clear(e2, n, { destroyPeer: t }) {
    let r = this.byApp[e2], a = r == null ? void 0 : r[n];
    if (!a || a.isClosing) return;
    a.idleTimer = x(a.idleTimer), a.isClosing = true, t && !a.peer.isDead && a.peer.destroy();
    let s = ye(a.bindings);
    a.bindings = {}, a.bindingsByToken = {}, a.controlRoomId = null, delete r[n], s.forEach((o) => {
      var _a, _b;
      (_b = (_a = o.handlers).close) == null ? void 0 : _b.call(_a), o.pendingData.length = 0, o.pendingSendData.length = 0, o.pendingTracks.length = 0;
    }), a.media.clearRemote(), a.pendingDataByToken.clear(), a.remoteRoomTokens.clear(), Y(r).length === 0 && delete this.byApp[e2];
  }
  register(e2, n, t, r) {
    let a = this.getMap(e2), s = a[n];
    if (s) {
      if (s.idleTimer = x(s.idleTimer), s.peer === t) return s;
      this.clear(e2, n, { destroyPeer: true });
    }
    let o = { appId: e2, peerId: n, peer: t, bindings: {}, bindingsByToken: {}, pendingDataByToken: /* @__PURE__ */ new Map(), remoteRoomTokens: /* @__PURE__ */ new Set(), idleTimer: null, controlRoomId: null, streamOwners: /* @__PURE__ */ new Map(), trackOwners: /* @__PURE__ */ new Map(), media: Kn(), idleMs: r, isClosing: false };
    return t.setHandlers({ data: (i) => this.dispatchData(o, i), signal: (i) => this.dispatchSignal(o, i), close: () => this.clear(e2, n, { destroyPeer: false }), error: (i) => {
      console.error(`${V} peer error:`, i), this.clear(e2, n, { destroyPeer: false });
    }, track: (i, c) => this.dispatchTrack(o, i, c) }), a[n] = o, o;
  }
  bind(e2, n, t, { onDetach: r }) {
    var _a;
    let a = t.bindings[e2];
    if (a) return t.idleTimer = x(t.idleTimer), { proxy: a.proxy, isNew: false };
    let s = { roomId: e2, roomToken: null, roomTokenPromise: n, handlers: {}, pendingData: [], pendingSendData: [], pendingTracks: [], detach: z, proxy: {} }, o = () => {
      var _a2;
      t.bindings[e2] && (this.pruneRoomOwnership(t, e2), delete t.bindings[e2], s.roomToken && t.bindingsByToken[s.roomToken] === s && delete t.bindingsByToken[s.roomToken], t.controlRoomId === e2 && (t.controlRoomId = (_a2 = Y(t.bindings)[0]) != null ? _a2 : null), r(), this.scheduleIdleTimer(t));
    }, i = { created: t.peer.created, get connection() {
      return t.peer.connection;
    }, get channel() {
      return t.peer.channel;
    }, get isDead() {
      return t.peer.isDead;
    }, getOffer: (c) => t.peer.getOffer(c), signal: (c) => t.peer.signal(c), sendData: (c) => {
      if (!s.roomToken) {
        s.pendingSendData.push(c);
        return;
      }
      t.peer.sendData(ir(s.roomToken, c));
    }, destroy: () => o(), setHandlers: (c) => {
      let { signal: m, ...u } = c;
      Object.assign(s.handlers, u), m && (s.handlers.signal = m), this.flushBindingQueues(s);
    }, offerPromise: t.peer.offerPromise, addStream: (c) => {
      var _a2;
      let m = (_a2 = t.streamOwners.get(c)) != null ? _a2 : /* @__PURE__ */ new Set(), u = m.size === 0;
      m.add(e2), t.streamOwners.set(c, m), u && t.peer.addStream(c);
    }, removeStream: (c) => {
      let m = t.streamOwners.get(c);
      m && (m.delete(e2), m.size === 0 && (t.streamOwners.delete(c), t.peer.removeStream(c)));
    }, addTrack: (c, m) => {
      var _a2, _b;
      let u = (_a2 = t.trackOwners.get(c)) != null ? _a2 : { stream: m, rooms: /* @__PURE__ */ new Set() }, f = u.rooms.size === 0;
      return u.stream = m, u.rooms.add(e2), t.trackOwners.set(c, u), f ? t.peer.addTrack(c, m) : (_b = t.peer.connection.getSenders().find((d) => d.track === c)) != null ? _b : t.peer.addTrack(c, m);
    }, removeTrack: (c) => {
      let m = t.trackOwners.get(c);
      m && (m.rooms.delete(e2), m.rooms.size === 0 && (t.trackOwners.delete(c), t.peer.removeTrack(c)));
    }, replaceTrack: (c, m) => {
      var _a2;
      let u = t.trackOwners.get(c);
      if (u) {
        t.trackOwners.delete(c);
        let f = (_a2 = t.trackOwners.get(m)) != null ? _a2 : { stream: u.stream, rooms: /* @__PURE__ */ new Set() };
        u.rooms.forEach((d) => f.rooms.add(d)), t.trackOwners.set(m, f);
      }
      return t.peer.replaceTrack(c, m);
    }, __trysteroMedia: t.media };
    return s.proxy = i, s.detach = o, t.bindings[e2] = s, (_a = t.controlRoomId) != null ? _a : t.controlRoomId = e2, t.idleTimer = x(t.idleTimer), n.then((c) => {
      if (t.isClosing || t.bindings[e2] !== s) return;
      s.roomToken = c, t.bindingsByToken[c] = s;
      let m = t.pendingDataByToken.get(c);
      (m == null ? void 0 : m.length) && (s.pendingData.push(...m), t.pendingDataByToken.delete(c)), s.pendingSendData.splice(0).forEach((u) => t.peer.sendData(ir(c, u))), this.flushBindingQueues(s);
    }), { proxy: i, isNew: true };
  }
  pruneRoomOwnership(e2, n) {
    e2.streamOwners.forEach((t, r) => {
      t.delete(n), t.size === 0 && (e2.streamOwners.delete(r), e2.peer.removeStream(r));
    }), e2.trackOwners.forEach((t, r) => {
      t.rooms.delete(n), t.rooms.size === 0 && (e2.trackOwners.delete(r), e2.peer.removeTrack(r));
    });
  }
  scheduleIdleTimer(e2) {
    e2.isClosing || Y(e2.bindings).length > 0 || (e2.idleTimer = x(e2.idleTimer), e2.idleTimer = setTimeout(() => {
      var _a;
      let n = (_a = this.byApp[e2.appId]) == null ? void 0 : _a[e2.peerId];
      !n || Y(n.bindings).length > 0 || this.clear(e2.appId, e2.peerId, { destroyPeer: true });
    }, e2.idleMs));
  }
  getSignalBinding(e2) {
    if (e2.controlRoomId) {
      let t = e2.bindings[e2.controlRoomId];
      if (t == null ? void 0 : t.handlers.signal) return t;
    }
    let n = ye(e2.bindings).find((t) => !!t.handlers.signal);
    return n ? (e2.controlRoomId = n.roomId, n) : null;
  }
  flushBindingQueues(e2) {
    let { handlers: n } = e2;
    n.data && e2.pendingData.length > 0 && e2.pendingData.splice(0).forEach((t) => {
      var _a;
      return (_a = n.data) == null ? void 0 : _a.call(n, t);
    }), (n.track || n.stream) && e2.pendingTracks.length && e2.pendingTracks.splice(0).forEach(({ track: t, stream: r }) => {
      var _a, _b;
      (_a = n.track) == null ? void 0 : _a.call(n, t, r), (_b = n.stream) == null ? void 0 : _b.call(n, r);
    });
  }
  dispatchData(e2, n) {
    var _a, _b, _c;
    let t = Bo(n);
    if (!t) return;
    if (t.type === "presence") {
      t.isPresent ? e2.remoteRoomTokens.add(t.roomToken) : e2.remoteRoomTokens.delete(t.roomToken), (_b = (_a = this.roomPresenceHandlers)[e2.appId]) == null ? void 0 : _b.call(_a, e2.peerId, t.roomToken, t.isPresent);
      return;
    }
    let r = e2.bindingsByToken[t.roomToken];
    if (!r) {
      let a = (_c = e2.pendingDataByToken.get(t.roomToken)) != null ? _c : [];
      a.push(t.payload), e2.pendingDataByToken.set(t.roomToken, a);
      return;
    }
    r.handlers.data ? r.handlers.data(t.payload) : r.pendingData.push(t.payload);
  }
  dispatchSignal(e2, n) {
    var _a, _b, _c;
    (_c = (_a = this.getSignalBinding(e2)) == null ? void 0 : (_b = _a.handlers).signal) == null ? void 0 : _c.call(_b, n);
  }
  dispatchTrack(e2, n, t) {
    ye(e2.bindings).forEach((r) => {
      var _a, _b, _c, _d;
      if (r.handlers.track || r.handlers.stream) {
        (_b = (_a = r.handlers).track) == null ? void 0 : _b.call(_a, n, t), (_d = (_c = r.handlers).stream) == null ? void 0 : _d.call(_c, t);
        return;
      }
      r.pendingTracks.push({ track: n, stream: t });
    });
  }
};
var Oo = 23333, Co = 12, Do = 7533, Lo = 23333, Wn = "__legacy__", an = "offer-placeholder", Ho = ["offer", "answer", "candidate"], Io = (e2) => {
  if (typeof e2 == "string") try {
    let n = ge(e2);
    return n && typeof n == "object" ? n : null;
  } catch {
    return null;
  }
  return e2 && typeof e2 == "object" ? e2 : null;
}, Ge = (e2, n) => typeof e2[n] == "string" && e2[n] ? e2[n] : void 0, xo = (e2) => Ho.some((n) => n in e2 && (typeof e2[n] != "string" || e2[n] === "")), gr = (e2, n, t, r, a, s) => {
  e2.toCipher(n).then((o) => {
    e2.isLeaving() || !s() || r(t, Z(a(o.sdp)));
  });
}, _o = () => ({ status: "idle", offerPeer: null, offerId: null, offerSdp: null, offerInitPromise: null, offerAnswered: false, offerRelays: [], offerSignalRelays: [], offerSignalBacklog: [], offerRelayTimers: [], offerExpiryTimer: null, connectedPeer: null, connectedPeerUnhealthySinceMs: null, answeringExpiryTimer: null, answeringPeer: null, answerSent: false, connectionErrorReported: false, pendingCandidates: {} }), Uo = (e2) => {
  var _a, _b, _c;
  return [...(_a = e2.turnConfig) != null ? _a : [], ...(_c = (_b = e2.rtcConfig) == null ? void 0 : _b.iceServers) != null ? _c : []].some(({ urls: n }) => (Array.isArray(n) ? n : [n]).some((t) => /^turns?:/i.test(t)));
}, No = (e2, n) => `could not connect to peer ${e2} after exchanging SDP; ${Uo(n) ? "check that your TURN server URLs and credentials are reachable by both peers" : "configure TURN servers with turnConfig or rtcConfig.iceServers"}`, fn = (e2, n, t) => {
  var _a;
  e2.isLeaving() || n.connectedPeer || n.connectionErrorReported || (n.connectionErrorReported = true, (_a = e2.onJoinError) == null ? void 0 : _a.call(e2, { error: No(t, e2.config), appId: e2.appId, peerId: t, roomId: e2.roomId }));
}, xe = (e2, n) => {
  var _a;
  return (_a = e2[n]) != null ? _a : e2[n] = _o();
}, ae = (e2) => {
  e2.connectedPeer ? e2.status = "connected" : e2.answeringPeer ? e2.status = "answering" : e2.offerPeer || e2.offerRelays.some(Boolean) ? e2.status = "offering" : e2.status = "idle";
}, sn = (e2, n) => {
  e2.answeringPeer === n && (e2.answeringExpiryTimer = x(e2.answeringExpiryTimer), e2.answeringPeer = null, e2.answerSent = false, ae(e2));
}, cn = (e2, n, t) => {
  e2.connectedPeer && (e2.connectedPeer.isDead || e2.connectedPeer.destroy(), e2.connectedPeer = null, e2.connectedPeerUnhealthySinceMs = null, ae(e2));
}, Fn = (e2, n) => {
  e2.offerRelayTimers[n] = x(e2.offerRelayTimers[n]), e2.offerRelays[n] && (e2.offerRelays[n] = void 0, ae(e2));
}, mr = (e2, n) => {
  (e2 == null ? void 0 : e2.offerRelays[n]) === an && Fn(e2, n);
}, $o = (e2) => {
  if (e2.isDead || e2.connection.connectionState === "closed") return true;
  try {
    return !!e2.connection.remoteDescription;
  } catch {
    return true;
  }
}, _e = (e2, n) => {
  let t = e2.offerAnswered;
  e2.offerExpiryTimer = x(e2.offerExpiryTimer), e2.offerInitPromise = null, e2.offerRelays.forEach((r, a) => Fn(e2, a)), e2.offerRelays = [], e2.offerSignalRelays = [], e2.offerRelayTimers = [], e2.offerSignalBacklog = [], e2.offerPeer && e2.offerPeer !== e2.connectedPeer && (t || $o(e2.offerPeer) ? e2.offerPeer.isDead || e2.offerPeer.destroy() : n.recycle(e2.offerPeer)), e2.offerPeer = null, e2.offerId = null, e2.offerSdp = null, e2.offerAnswered = false, e2.connectionErrorReported = false, ae(e2);
}, jo = (e2, n, t, r) => {
  x(n.answeringExpiryTimer), n.answeringExpiryTimer = setTimeout(() => {
    let a = e2.peerStates[t];
    !a || a.connectedPeer || a.answeringPeer !== r || (a.answerSent && fn(e2, a, t), r.destroy(), sn(a, r), e2.checkDeactivate());
  }, Lo);
}, qo = async (e2, n, t) => {
  let r = t ? [t, Wn] : [Wn];
  for (let a of r) {
    let s = e2.pendingCandidates[a];
    if (s == null ? void 0 : s.length) {
      delete e2.pendingCandidates[a];
      for (let o of s) await n.signal(o);
    }
  }
}, hr = (e2, n, t, r = Fe) => {
  x(n.offerExpiryTimer);
  let a = n.offerId;
  n.offerExpiryTimer = setTimeout(() => {
    let s = e2.peerStates[t];
    !s || s.connectedPeer || s.offerId !== a || (s.offerAnswered && fn(e2, s, t), _e(s, e2.offerPool), e2.checkDeactivate());
  }, r);
}, Ko = (e2, n, t, r) => n.offerPeer && n.offerId && n.offerSdp ? Promise.resolve({ peer: n.offerPeer, offer: n.offerSdp, offerId: n.offerId }) : (n.offerInitPromise || (n.offerInitPromise = (async () => {
  let a = (await e2.offerPool.checkout(1, false, e2.encryptOffer))[0];
  if (!a) throw _("failed to allocate offer peer");
  let { peer: s, offer: o } = a;
  n.offerPeer = s, n.offerId = ce(Co), n.offerSdp = o, n.offerAnswered = false, n.connectionErrorReported = false, n.offerSignalBacklog = [], ae(n);
  let i = () => {
    n.offerPeer === s && !n.connectedPeer && (n.offerAnswered && fn(e2, n, t), _e(n, e2.offerPool)), e2.disconnectPeer(s, t), e2.checkDeactivate();
  };
  return s.setHandlers({ connect: () => e2.connectPeer(s, t, r), signal: (c) => {
    n.offerPeer === s && (n.offerSignalBacklog.push(c), n.offerSignalRelays.forEach((m) => m == null ? void 0 : m(c)));
  }, close: i, error: i }), hr(e2, n, t), { peer: s, offer: o, offerId: n.offerId };
})().finally(() => n.offerInitPromise = null)), n.offerInitPromise), Wo = async (e2, n, t, r, a) => {
  var _a;
  if (r) {
    e2.attachSharedPeerToRoom(t, r);
    return;
  }
  let s = e2.peerStates[t];
  if (!s || s.connectedPeer || s.answeringPeer || s.offerAnswered) {
    mr(s, n);
    return;
  }
  if (s.offerRelays[n] !== an) return;
  let [o, i] = await oe([Se(Me(e2.rootTopicPlaintext, t)), Ko(e2, s, t, n)]);
  if (e2.isLeaving()) return;
  if (s.connectedPeer || s.answeringPeer || s.offerAnswered || s.offerRelays[n] !== an) {
    mr(s, n);
    return;
  }
  s.offerRelayTimers[n] = x(s.offerRelayTimers[n]), s.offerRelays[n] = true, ae(s), s.offerRelayTimers[n] = setTimeout(() => Vo(e2, t, n), ((_a = e2.announceIntervals[n]) != null ? _a : e2.announceIntervalMs) * 0.9);
  let c = false;
  s.offerSignalRelays[n] = (m) => {
    c && (e2.isLeaving() || s.connectedPeer || s.offerPeer !== i.peer || s.offerId !== i.offerId || m.type !== "candidate" || gr(e2, m, o, a, (u) => ({ peerId: G, offerId: i.offerId, candidate: u, ...e2.isPassive ? { passive: true } : {} }), () => !s.connectedPeer && s.offerPeer === i.peer && s.offerId === i.offerId));
  }, a(o, Z({ peerId: G, offerId: i.offerId, offer: i.offer, ...e2.isPassive ? { passive: true } : {} })), c = true, s.offerSignalBacklog.forEach((m) => {
    var _a2, _b;
    return (_b = (_a2 = s.offerSignalRelays)[n]) == null ? void 0 : _b.call(_a2, m);
  });
}, Fo = async (e2, n, t, r, a, s, o) => {
  var _a;
  let i = xe(e2.peerStates, t);
  if (i.answeringPeer || i.offerAnswered) return;
  let c = !!(i.offerPeer || i.offerRelays.some(Boolean));
  if ((c || s) && G < t) return;
  c && _e(i, e2.offerPool);
  let m = e2.initPeer(false, e2.config);
  i.answeringPeer = m, i.answerSent = false, i.connectionErrorReported = false, jo(e2, i, t, m), ae(i);
  let u = () => {
    i.answeringPeer === m && !i.connectedPeer && i.answerSent && fn(e2, i, t), sn(i, m), e2.disconnectPeer(m, t), e2.checkDeactivate();
  };
  m.setHandlers({ connect: () => e2.connectPeer(m, t, n), close: u, error: u });
  let f;
  try {
    f = await e2.toPlain({ type: "offer", sdp: r });
  } catch {
    sn(i, m), (_a = e2.onJoinError) == null ? void 0 : _a.call(e2, { error: "incorrect room password when decrypting offer", appId: e2.appId, peerId: t, roomId: e2.roomId });
    return;
  }
  if (m.isDead) {
    sn(i, m);
    return;
  }
  let d = await Se(Me(e2.rootTopicPlaintext, t));
  e2.isLeaving() || (m.setHandlers({ signal: (h) => {
    e2.isLeaving() || i.answeringPeer !== m || m.isDead || h.type !== "answer" && h.type !== "candidate" || gr(e2, h, d, o, (p) => {
      let A = { peerId: G };
      return h.type === "answer" ? (i.answerSent = true, A.answer = p) : A.candidate = p, a && (A.offerId = a), e2.isPassive && (A.passive = true), A;
    }, () => i.answeringPeer === m && !m.isDead);
  } }), await m.signal(f), await qo(i, m, a));
}, Jo = async (e2, n, t, r, a) => {
  var _a, _b, _c, _d;
  let s;
  try {
    s = await e2.toPlain({ type: nn, sdp: t });
  } catch {
    return;
  }
  let o = xe(e2.peerStates, n), i = r && (o == null ? void 0 : o.offerPeer) && o.offerId === r ? o.offerPeer : null, c = (_a = o == null ? void 0 : o.answeringPeer) != null ? _a : null, m = !r && (o == null ? void 0 : o.offerPeer) ? o.offerPeer : null, u = a && !a.isDead ? a : (_b = i != null ? i : c) != null ? _b : m;
  if (!u || u.isDead) {
    let f = r != null ? r : Wn;
    ((_d = (_c = o.pendingCandidates)[f]) != null ? _d : _c[f] = []).push(s);
    return;
  }
  u.signal(s);
}, zo = async (e2, n, t, r, a, s) => {
  var _a;
  let o;
  try {
    o = await e2.toPlain({ type: "answer", sdp: r });
  } catch {
    (_a = e2.onJoinError) == null ? void 0 : _a.call(e2, { error: "incorrect room password when decrypting answer", appId: e2.appId, peerId: t, roomId: e2.roomId });
    return;
  }
  if (s) e2.offerPool.claimLeased(s), s.setHandlers({ connect: () => e2.connectPeer(s, t, n), close: () => e2.disconnectPeer(s, t) }), s.signal(o);
  else {
    let i = e2.peerStates[t];
    if (!i || !i.offerPeer || i.offerAnswered || a && i.offerId && a !== i.offerId || i.offerPeer.isDead) return;
    i.offerAnswered = true, hr(e2, i, t, Oo), i.offerPeer.signal(o);
  }
}, Vo = (e2, n, t) => {
  let r = e2.peerStates[n];
  !r || r.connectedPeer || r.offerRelays[t] && (Fn(r, t), e2.checkDeactivate());
}, yr = (e2) => (n) => async (t, r, a) => {
  var _a, _b, _c;
  if (e2.isLeaving()) return;
  let s = Io(r);
  if (!s || xo(s)) return;
  let o = (_a = Ge(s, "peerId")) != null ? _a : "", i = Ge(s, "offer"), c = Ge(s, "answer"), m = Ge(s, "candidate"), u = Ge(s, "offerId"), f = s.peer, d = s.hasOutgoingOffer === true, h = s.passive === true;
  if (!o || o === G) return;
  let [p, A] = await oe([e2.rootTopicP, e2.selfTopicP]);
  if (e2.isLeaving() || t !== p && t !== A || e2.isPassive && h || (e2.isPassive && !e2.isActive && !c && !m && (e2.isActive = true, (_b = e2.requeueAnnounce) == null ? void 0 : _b.call(e2)), e2.isPassive && !e2.isActive)) return;
  let T = e2.peerStates[o], B = T == null ? void 0 : T.connectedPeer;
  if (B && T) {
    let I = ur(B);
    if (I === "live") {
      T.connectedPeerUnhealthySinceMs = null;
      return;
    }
    if (I === "stale") cn(T, o, "message-from-stale-peer");
    else {
      let v = Date.now(), R = (_c = T.connectedPeerUnhealthySinceMs) != null ? _c : v;
      if (T.connectedPeerUnhealthySinceMs = R, v - R < Do) return;
      cn(T, o, "message-from-prolonged-disconnect");
    }
  }
  let w = e2.sharedPeers.get(e2.appId, o);
  w && e2.sharedPeers.getHealth(w.peer) === "stale" && (e2.sharedPeers.clear(e2.appId, o, { destroyPeer: true }), w = void 0);
  let C = !!(o && !i && !c && !m);
  if (C && !w) {
    let I = xe(e2.peerStates, o), v = G < o;
    if (I.answeringPeer || I.connectedPeer || I.offerAnswered) return;
    if (!v && !I.offerPeer) {
      let R = await Se(Me(e2.rootTopicPlaintext, o));
      !e2.isLeaving() && !I.connectedPeer && a(R, Z({ peerId: G }));
      return;
    }
    if (I.offerRelays[n]) return;
    I.offerRelays[n] = an, ae(I);
  }
  if (w && (i || c || m)) {
    if (w.bindings[e2.roomId]) return;
    e2.attachSharedPeerToRoom(o, w);
    return;
  }
  if (C) return Wo(e2, n, o, w, a);
  if (i) return Fo(e2, n, o, i, u, d, a);
  if (m) return Jo(e2, o, m, u, f);
  if (c) return zo(e2, n, o, c, u, f);
};
var ln = 5333, Go = [233, 533, 1333], Zo = 7533, Xo = 123333, Jn = ({ init: e2, subscribe: n, announce: t, deactivate: r }) => {
  let a = {}, s = {}, o = {}, i = {}, c = new dr(), m = () => ye(a).some((v) => Y(v).length > 0), u = (v) => {
    var _a;
    return (_a = s[v]) != null ? _a : s[v] = {};
  }, f = (v) => {
    var _a;
    return (_a = o[v]) != null ? _a : o[v] = {};
  }, d = (v, R, $) => {
    c.getHealth(v.peer) === "live" && c.sendRoomPresence(v, R, $);
  }, h = (v, R) => {
    var _a;
    de((_a = s[v]) != null ? _a : {}).forEach(([$, b]) => {
      if (!b.shouldAdvertise()) return;
      let { roomToken: K, roomTokenPromise: F } = b;
      if (K) {
        d(R, K, true);
        return;
      }
      F.then((j) => {
        var _a2;
        ((_a2 = s[v]) == null ? void 0 : _a2[$]) === b && b.roomToken === j && (c.get(v, R.peerId) !== R || R.isClosing || b.shouldAdvertise() && d(R, j, true));
      });
    });
  }, p = (v, R, $) => ye(c.getMap(v)).forEach((b) => d(b, R, $)), A = (v) => {
    i[v] || (i[v] = c.setRoomPresenceHandler(v, (R, $, b) => {
      var _a, _b, _c;
      if (!b) return;
      let K = c.get(v, R), F = (_a = o[v]) == null ? void 0 : _a[$];
      !K || !F || ((_c = (_b = s[v]) == null ? void 0 : _b[F]) == null ? void 0 : _c.attachSharedPeerToRoom(R, K));
    }));
  }, T = (v) => {
    var _a;
    a[v] && Y(a[v]).length > 0 || ((_a = i[v]) == null ? void 0 : _a.call(i), delete i[v], delete s[v], delete o[v]);
  }, B = false, w = [], C = null, I = z;
  return (v, R, $) => {
    var _a, _b, _c, _d, _e2, _f;
    if (!v) throw _("requires a config map as the first argument");
    if ($ && typeof $ != "object") throw _("third argument must be a callbacks object");
    let { appId: b } = v, K = $ == null ? void 0 : $.onJoinError, F = $ == null ? void 0 : $.onPeerHandshake, j = $ == null ? void 0 : $.handshakeTimeoutMs;
    if (!b) throw _("config map is missing appId field");
    if (!R) throw _("roomId argument required");
    if (j !== void 0 && (!Number.isFinite(j) || j <= 0)) throw _("handshakeTimeoutMs must be a positive number");
    if ((_a = a[b]) == null ? void 0 : _a[R]) return a[b][R];
    A(b);
    let W = Me(V, b, R), Q = Se(W), l = Se(Me(W, G)), y = _t((_b = v.password) != null ? _b : "", b, R), S = Ut(b, R), P = (_c = v._test_only_sharedPeerIdleMs) != null ? _c : Xo, E = false, U = (O) => async (D) => ({ type: D.type, sdp: await O(y, D.sdp) }), q = U(qt), g = U(jt), k = c.getMap(b), H = () => Un(true, v), ee = false;
    C || (C = new Kt(H));
    let ne = C, Ue = async (O) => {
      let D = await O.getOffer(Date.now() - O.created > Fe);
      if (!D || D.type !== "offer") throw _("failed to get offer for peer");
      return (await g(D)).sdp;
    }, Ne = (O, D) => {
      let L = xe(J.peerStates, O);
      L.answeringExpiryTimer = x(L.answeringExpiryTimer), L.answeringPeer = null;
      let { proxy: X, isNew: N } = c.bind(R, S, D, { onDetach: () => {
        let te = J.peerStates[O];
        (te == null ? void 0 : te.connectedPeer) === D.peer && (te.connectedPeer = null, te.connectedPeerUnhealthySinceMs = null, ae(te));
      } });
      L.connectedPeer = D.peer, L.connectedPeerUnhealthySinceMs = null, ae(L), N && yn(X, O), _e(L, ne);
    }, Mr = (O, D, L) => {
      if (E) {
        O.destroy();
        return;
      }
      let X = xe(J.peerStates, D);
      if (X.connectedPeer) {
        let re = k[D];
        if (re && X.connectedPeer === re.peer && re.bindings[R]) return;
        X.connectedPeer !== O && !O.isDead && O.destroy();
        return;
      }
      let N = k[D];
      if (N && c.getHealth(N.peer) === "stale" && (c.clear(b, D, { destroyPeer: true }), N = void 0), N && N.peer !== O) {
        O.isDead || O.destroy(), Ne(D, N);
        return;
      }
      let te = !N;
      N || (N = c.register(b, D, O, P)), Ne(D, N), te && h(b, N);
    }, Br = (O, D) => {
      var _a2;
      if (E) return;
      let L = J.peerStates[D];
      (L == null ? void 0 : L.connectedPeer) === O && (cn(L, D, "close-event"), Xe(), !se && ee && ((_a2 = J.requeueAnnounce) == null ? void 0 : _a2.call(J)));
    }, se = !!v.passive, Te = null, Ae, Qn = z, Xe = () => {
      if (!se || !J.isActive) return;
      let O = false;
      de(J.peerStates).forEach(([D, L]) => {
        L.connectedPeer || L.answeringPeer || L.offerInitPromise || L.offerPeer || L.offerRelays.some(Boolean) ? O = true : L.status === "idle" && delete J.peerStates[D];
      }), O || (J.isActive = false, Ae = x(Ae), Le.forEach(x), Le.length = 0, Qn(), (Te == null ? void 0 : Te.roomToken) && p(b, Te.roomToken, false));
    }, J = { appId: b, roomId: R, config: v, peerStates: {}, rootTopicPlaintext: W, rootTopicP: Q, selfTopicP: l, toPlain: q, toCipher: g, isLeaving: () => E, isPassive: se, isActive: !se, onJoinError: K, sharedPeers: c, offerPool: ne, encryptOffer: Ue, initPeer: Un, connectPeer: Mr, disconnectPeer: Br, attachSharedPeerToRoom: Ne, checkDeactivate: Xe, announceIntervals: [], announceIntervalMs: ln }, dn = { config: v, appId: b, roomId: R, isPassive: se }, Or = yr(J);
    if (!B) {
      let O = e2(v);
      w = (Array.isArray(O) ? O : [O]).map((D) => Promise.resolve(D)), B = true, I = ((_d = v.relayConfig) == null ? void 0 : _d.manualReconnection) ? z : xt();
    }
    !se && !ne.isActive && ne.warmup(), J.announceIntervals = w.map(() => ln);
    let mn = w.map(() => ln), gn = w.map(() => 0), hn = w.map(() => 0), Le = [], et = w.map(async (O, D) => n(await O, await Q, await l, Or(D), (L) => ne.getOffers(L, Ue), dn));
    oe([Q, l]).then(([O, D]) => {
      if (E) return;
      let L = async (X, N) => {
        var _a2, _b2, _c2, _d2;
        if (E || se && !J.isActive) return;
        let te = se ? { passive: true } : void 0, re;
        try {
          re = await t(X, O, D, te, dn), hn[N] = 0;
        } catch (Ir) {
          let st = (_a2 = hn[N]) != null ? _a2 : 0;
          st === 0 && ((_b2 = v.relayConfig) == null ? void 0 : _b2.warnOnRelayFailure) !== false && console.warn(`${V}: announce failed - ${pe(Ir, "")}`), hn[N] = st + 1;
        }
        if (E || se && !J.isActive || re && typeof re != "number" && "stopAnnouncing" in re) return;
        typeof re == "number" ? (J.announceIntervals[N] = re, mn[N] = re) : re && (mn[N] = re.nextAnnounceMs, ee || (ee = re.reannounceOnDisconnect === true));
        let tt = (_c2 = gn[N]) != null ? _c2 : 0;
        gn[N] = tt + 1;
        let rt = (_d2 = mn[N]) != null ? _d2 : ln, ot = Go[tt];
        Le[N] = setTimeout(() => {
          L(X, N);
        }, typeof ot == "number" ? Math.min(rt, ot) : rt);
      };
      Qn = () => {
        r && w.forEach(async (X) => {
          let N = await X;
          E || r(N, O, D, dn);
        });
      }, J.requeueAnnounce = () => {
        Le.forEach(x), Le.length = 0, Ae = x(Ae), ne.isActive || ne.warmup(), (Te == null ? void 0 : Te.roomToken) && p(b, Te.roomToken, true), Ae = setTimeout(Xe, Zo), w.forEach(async (X, N) => {
          let te = await X;
          te && !E && (gn[N] = 0, L(te, N));
        });
      }, et.forEach(async (X, N) => {
        if (await X, E) return;
        let te = await w[N];
        te && !E && (!se || J.isActive) && L(te, N);
      });
    });
    let yn = z, { compose: Cr } = Wt((_e2 = v.password) != null ? _e2 : "", b, R), nt = Cr(F), Dr = { ...nt ? { onPeerHandshake: nt } : {}, ...j === void 0 ? {} : { handshakeTimeoutMs: j }, isPassive: se, onHandshakeError: (O, D) => K == null ? void 0 : K({ error: D.replace(/^handshake failed: /, ""), appId: b, peerId: O, roomId: R }) };
    (_f = a[b]) != null ? _f : a[b] = {};
    let Lr = u(b), Hr = ar((O) => yn = O, (O) => {
      if (E) return;
      let D = J.peerStates[O];
      (D == null ? void 0 : D.connectedPeer) && (D.connectedPeer = null, ae(D), Xe());
    }, () => {
      var _a2, _b2;
      E = true, yn = z;
      let O = (_a2 = s[b]) == null ? void 0 : _a2[R];
      (O == null ? void 0 : O.roomToken) && (p(b, O.roomToken, false), (_b2 = o[b]) == null ? true : delete _b2[O.roomToken], o[b] && !Y(o[b]).length && delete o[b]), s[b] && (delete s[b][R], Y(s[b]).length || delete s[b]), de(J.peerStates).forEach(([D, L]) => {
        if (L.answeringExpiryTimer = x(L.answeringExpiryTimer), L.connectedPeer && !L.connectedPeer.isDead) {
          let X = k[D];
          (!X || X.peer !== L.connectedPeer) && L.connectedPeer.destroy();
        }
        L.answeringPeer && !L.answeringPeer.isDead && L.answeringPeer.destroy(), _e(L, ne), L.connectedPeer = null, L.answeringPeer = null, ae(L);
      }), a[b] && (delete a[b][R], Y(a[b]).length === 0 && delete a[b]), Le.forEach(x), Ae = x(Ae), et.forEach(async (D) => {
        (await D)();
      }), !m() && (B = false, ne.destroy(), C = null, I(), T(b));
    }, Dr);
    return Te = { roomToken: null, roomTokenPromise: S, attachSharedPeerToRoom: Ne, shouldAdvertise: () => !se || J.isActive }, Lr[R] = Te, S.then((O) => {
      var _a2;
      let D = Te;
      !D || E || ((_a2 = s[b]) == null ? void 0 : _a2[R]) !== D || (D.roomToken = O, f(b)[O] = R, ye(k).forEach((L) => {
        L.remoteRoomTokens.has(O) && Ne(L.peerId, L);
      }), (!se || J.isActive) && p(b, O, true));
    }), a[b][R] = Hr;
  };
};
var Yo = ["offer", "answer", "candidate"], Qo = 6e4, es = (e2) => {
  if (typeof e2 == "string") try {
    let n = ge(e2);
    return n && typeof n == "object" ? n : null;
  } catch {
    return null;
  }
  return e2;
}, zn = (e2, n) => typeof e2[n] == "string" && e2[n] ? e2[n] : void 0, ns = (e2) => Yo.some((n) => n in e2 && (typeof e2[n] != "string" || e2[n] === "")), ts = (e2) => {
  let n = es(e2);
  if (!n || ns(n)) return false;
  let t = zn(n, "peerId");
  return !!(t && t !== G && n.passive !== true && !zn(n, "answer") && !zn(n, "candidate"));
}, Vn = (e2) => {
  if (!e2) throw _("topic strategy missing room context");
  return e2;
}, pr = (e2, n, t, r) => ({ kind: n, appId: e2.appId, roomId: e2.roomId, rootTopic: t, selfTopic: r }), Gn = (e2, n, t, r) => ({ kind: n, appId: e2.appId, roomId: e2.roomId, rootTopic: t, selfTopic: r }), Zn = ({ steadyAnnounceIntervalMs: e2 = Qo, reannounceOnDisconnect: n = true, init: t, subscribeTopic: r, publishTopic: a, unpublishTopic: s }) => Jn({ init: t, subscribe: async (o, i, c, m, u, f) => {
  let d = Vn(f), h = (v, R) => {
    a(o, v, R, Gn(d, "signal", i, c));
  }, p = null, A = false, T = null, B = false, w = (v) => {
    A || (A = true, v());
  }, C = () => (T || (T = Promise.resolve(r(o, c, (v, R) => {
    B || m(v, R, h);
  }, pr(d, "self", i, c))).then((v) => {
    p = v, B && w(v);
  })), T);
  d.isPassive || await C();
  let I = await r(o, i, async (v, R) => {
    B || (d.isPassive && ts(R) && await C(), B || await m(v, R, h));
  }, pr(d, "root", i, c));
  return () => {
    B = true, p && w(p), I();
  };
}, announce: async (o, i, c, m, u) => {
  var _a, _b;
  let f = Vn(u), d = await a(o, i, Z({ peerId: G, ...m }), Gn(f, "announce", i, c));
  return typeof d == "number" || d !== void 0 && "stopAnnouncing" in d ? d : { nextAnnounceMs: (_a = d == null ? void 0 : d.nextAnnounceMs) != null ? _a : e2, reannounceOnDisconnect: (_b = d == null ? void 0 : d.reannounceOnDisconnect) != null ? _b : n };
}, ...s ? { deactivate: (o, i, c, m) => {
  let u = Vn(m);
  return s(o, i, Gn(u, "announce", i, c));
} } : {} });
var kr = In((e2) => e2.socket), rs = 5, vr = "x", Sr = "EVENT", { secretKey: os, publicKey: ss } = An.keygen(), as = we(ss), is = {}, cs = {}, fs = {}, wr = 250, un = 6e4, ls = 15 * 6e4, us = 5333, Ze = /* @__PURE__ */ new WeakMap(), Yn = /* @__PURE__ */ new WeakSet(), Ce = /* @__PURE__ */ new WeakMap(), Pr = (e2) => {
  let n = Ze.get(e2), t = Math.min((n == null ? void 0 : n.delayMs) ? Math.max(un, n.delayMs * 2) : un, ls);
  return Ze.set(e2, { delayMs: t, untilMs: Date.now() + t }), t;
}, ds = (e2) => {
  let n = Ze.get(e2);
  if (!n) return 0;
  let t = n.untilMs - Date.now();
  return t > 0 ? t : 0;
}, Xn = (e2) => ({ nextAnnounceMs: e2 }), ms = { stopAnnouncing: true }, gs = (e2) => {
  var _a;
  if (Yn.has(e2)) return false;
  let n = Ce.get(e2);
  return n && (clearTimeout(n.timer), Ce.delete(e2)), Yn.add(e2), Ze.delete(e2), (_a = e2.close) == null ? void 0 : _a.call(e2), true;
}, hs = (e2, n) => {
  var _a;
  let t = Ce.get(e2);
  t && (clearTimeout(t.timer), t.eventIds.add(n));
  let r = (_a = t == null ? void 0 : t.eventIds) != null ? _a : /* @__PURE__ */ new Set([n]), a = setTimeout(() => {
    Ce.delete(e2);
  }, us);
  Ce.set(e2, { eventIds: r, timer: a });
}, ys = (e2, n) => {
  let t = Ce.get(e2);
  return (t == null ? void 0 : t.eventIds.has(n)) ? (clearTimeout(t.timer), Ce.delete(e2), true) : false;
}, br = () => Math.floor(Date.now() / 1e3), Tr = (e2) => {
  var _a;
  return (_a = fs[e2]) != null ? _a : fs[e2] = tn(e2, 1e4) + 2e4;
}, ps = async (e2, n) => {
  let t = { kind: Tr(e2), tags: [[vr, e2]], created_at: br(), content: n, pubkey: as }, r = await Be("SHA-256", Z([0, t.pubkey, t.created_at, t.kind, t.tags, t.content]));
  return Z([Sr, { ...t, id: we(r), sig: we(await An.signAsync(r, os)) }]);
};
var De = {}, Ar = (e2) => {
  e2.flushWaiters.forEach((n) => n()), e2.flushWaiters.clear();
}, ws = (e2, n, t) => {
  var _a, _b;
  let r = (_b = De[_a = e2.url]) != null ? _b : De[_a] = { subIds: [], topics: /* @__PURE__ */ new Map(), updateTimer: null, flushWaiters: /* @__PURE__ */ new Set() };
  r.topics.set(n, t), Rr(e2, r);
}, Ps = (e2, n) => {
  let t = De[e2.url];
  t && (t.topics.delete(n), t.topics.size === 0 ? (t.updateTimer !== null && (clearTimeout(t.updateTimer), t.updateTimer = null), Ar(t), t.subIds.forEach((r) => e2.send(Z(["CLOSE", r]))), delete De[e2.url]) : Rr(e2, t));
}, Rr = (e2, n) => {
  n.updateTimer === null && (n.updateTimer = setTimeout(() => {
    n.updateTimer = null;
    try {
      Er(e2);
    } finally {
      Ar(n);
    }
  }, 0));
}, ks = (e2) => {
  let n = De[e2.url];
  return !n || n.updateTimer === null ? Promise.resolve() : new Promise((t) => n.flushWaiters.add(t));
}, Er = (e2) => {
  let n = De[e2.url];
  if (!n || n.topics.size === 0) return;
  let t = [...n.topics.keys()], r = [], a = br();
  for (let s = 0; s < t.length; s += wr) r.push(t.slice(s, s + wr));
  for (; n.subIds.length > r.length; ) {
    let s = n.subIds.pop();
    s && e2.send(Z(["CLOSE", s]));
  }
  r.forEach((s, o) => {
    var _a, _b;
    let i = (_b = (_a = n.subIds)[o]) != null ? _b : _a[o] = ce(64);
    e2.send(Z(["REQ", i, { kinds: [...new Set(s.map(Tr))], since: a, "#x": s }]));
  });
}, vs = (e2) => {
  let n = De[e2.url];
  n && n.topics.size > 0 && Er(e2);
}, Ss = Zn({ init: (e2) => Cn(e2, bs, rs, true).map((n) => {
  let t = kr.register(n, () => Hn(n, (r) => {
    var _a, _b, _c;
    let [a, s, o, i] = ge(r);
    if (a !== Sr) {
      let c = `${V}: relay failure from ${t.url} - `, m = a === "CLOSED" && typeof o == "string" ? o : i, u = a === "OK" && o === false, f = u && (m == null ? void 0 : m.startsWith("rate-limited:")), d = u && (m == null ? void 0 : m.startsWith("duplicate:")), h = a === "CLOSED" || u && !f && !d, p = a === "OK" && ys(t, s);
      if (h && !gs(t)) return;
      f ? Pr(t) : p && Ze.delete(t), !d && ((_a = e2.relayConfig) == null ? void 0 : _a.warnOnRelayFailure) !== false && (a === "NOTICE" ? console.warn(c + s) : (u || a === "CLOSED") && console.warn(c + m));
      return;
    }
    if (o && typeof o == "object" && "content" in o) {
      let { content: c } = o, m = cs[s];
      if (m) {
        m((_b = is[s]) != null ? _b : "", c);
        return;
      }
      let u = De[t.url];
      if ((u == null ? void 0 : u.subIds.includes(s)) && o.tags) {
        let f = o.tags.find((d) => d[0] === vr);
        (f == null ? void 0 : f[1]) && ((_c = u.topics.get(f[1])) == null ? void 0 : _c(f[1], c));
      }
    }
  }, () => vs(t)));
  return t.ready;
}), subscribeTopic: (e2, n, t, r) => {
  ws(e2, n, (o, i) => {
    t(o, i);
  });
  let s = () => {
    Ps(e2, n);
  };
  return r.kind === "root" ? ks(e2).then(() => s) : s;
}, publishTopic: async (e2, n, t, r) => {
  if (Yn.has(e2) || e2.isClosed) return r.kind === "announce" ? ms : void 0;
  if (r.kind === "announce") {
    let i = ds(e2);
    if (i > 0) return Xn(Math.max(un, i));
  }
  let a = await ps(n, typeof t == "string" ? t : Z(t)), s = e2.socket.readyState === 1;
  if (e2.send(a), r.kind !== "announce") return;
  if (!s) return Xn(Pr(e2));
  let o = ge(a)[1].id;
  return hs(e2, o), Xn(un);
} }), ba = kr.getSockets, bs = ["basspistol.org", "bucket.coracle.social", "chorus.pjv.me", "koru.bitcointxoko.org", "nos.lol", "nostr-01.uid.ovh", "nostr-01.yakihonne.com", "nostr-relay.corb.net", "nostr.data.haus", "nostr.islandarea.net", "nostr.sathoarder.com", "nostr.tegila.com.br", "nostr.vulpem.com", "purplerelay.com", "relay-can.zombi.cloudrodion.com", "relay-rpi.edufeed.org", "relay.agorist.space", "relay.artio.inf.unibe.ch", "relay.mostr.pub", "relay.mostro.network", "relay.sigit.io", "relay02.lnfi.network", "schnorr.me", "social.amanah.eblessing.co", "staging.yabu.me", "strfry.shock.network", "top.testrelay.top", "yabu.me/v2"].map((e2) => "wss://" + e2);
/*! Bundled license information:

@noble/secp256k1/index.js:
  (*! noble-secp256k1 - MIT License (c) 2019 Paul Miller (paulmillr.com) *)
*/
export {
  Ss as joinRoom,
  G as selfId
};
