/* тесты канона crdt-ядро/0.1 (ПВ5, такт v11.36) — node --test */
import { test } from "node:test";
import assert from "node:assert/strict";
import { ЧасыЛампорта, LWWSet, Меркль } from "../src/crdt-ядро.mjs";

/* ── Часы Лампорта ── */
test("Лампорта: тик монотонен", () => {
  const ч = new ЧасыЛампорта();
  assert.equal(ч.тик(), 1); assert.equal(ч.тик(), 2); assert.equal(ч.тик(), 3);
});
test("Лампорта: приём ≥ чужого+1 и монотонен", () => {
  const ч = new ЧасыЛампорта(); ч.тик(); ч.тик();
  assert.equal(ч.приём(10), 11);
  assert.equal(ч.приём(1), 12); /* чужое меньше — часы не откатываются */
});
test("Лампорта: честный отказ на мусоре", () => {
  const ч = new ЧасыЛампорта();
  assert.throws(() => ч.приём(-1)); assert.throws(() => ч.приём("5"));
});

/* ── LWWSet ── */
test("LWW: добавить→живое, удалить→гаснет", () => {
  const с = new LWWSet();
  с.добавить("монета-1", 1, "А");
  assert.deepEqual(с.живые(), ["монета-1"]);
  с.удалить("монета-1", 2, "А");
  assert.deepEqual(с.живые(), []);
});
test("LWW: победа по времени", () => {
  const a = new LWWSet(); a.добавить("х", 5, "А");
  const b = new LWWSet(); b.удалить("х", 9, "Б");
  a.слить(b); assert.deepEqual(a.живые(), []);
  const c = new LWWSet(); c.удалить("х", 9, "Б");
  const d = new LWWSet(); d.добавить("х", 5, "А");
  c.слить(d); assert.deepEqual(c.живые(), []);
});
test("LWW: тай-брейк по узлу детерминирован", () => {
  const a = new LWWSet(); a.добавить("х", 7, "Б");
  const b = new LWWSet(); b.добавить("х", 7, "А");
  a.слить(b);
  const c = new LWWSet(); c.добавить("х", 7, "А");
  const d = new LWWSet(); d.добавить("х", 7, "Б");
  c.слить(d);
  assert.deepEqual(a.живые(), c.живые(), "равные (т, разные узлы) — порядок слияния не влияет");
});
test("LWW CRDT: коммутативность", () => {
  const база = { п: { б: true, т: 1, уз: "А" } };
  const x = { с: { б: true, т: 2, уз: "Б" } };
  const y = { п: { б: false, т: 3, уз: "В" } };
  const xy = new LWWSet().слить(JSON.parse(JSON.stringify(база))).слить(x).слить(y).живые();
  const yx = new LWWSet().слить(JSON.parse(JSON.stringify(база))).слить(y).слить(x).живые();
  assert.deepEqual(xy, yx);
});
test("LWW CRDT: идемпотентность", () => {
  const a = new LWWSet(); a.добавить("к", 1, "А"); a.удалить("к", 2, "Б");
  const b = new LWWSet().слить(a.дифф());
  b.слить(a.дифф());
  assert.deepEqual(a.живые(), b.живые());
  assert.deepEqual(Object.keys(b.дифф()).sort(), Object.keys(a.дифф()).sort());
});
test("LWW CRDT: ассоциативность (три узла)", () => {
  const p = new LWWSet(); p.добавить("э1", 1, "А"); p.удалить("э1", 4, "В");
  const q = new LWWSet(); q.добавить("э1", 2, "Б");
  const r = new LWWSet(); r.удалить("э1", 3, "Б");
  const pq = new LWWSet().слить(p.дифф()).слить(q.дифф()).слить(r.дифф());
  const rp = new LWWSet().слить(r.дифф()).слить(q.дифф()).слить(p.дифф());
  assert.deepEqual(pq.живые(), rp.живые());
});
test("LWW: дифф-экспорт/импорт — полный круг", () => {
  const a = new LWWSet(); a.добавить("м", 1, "А"); a.удалить("м", 2, "А"); a.добавить("н", 3, "А");
  const b = new LWWSet().изДиффа(JSON.parse(JSON.stringify(a.дифф())));
  assert.deepEqual(b.живые(), ["н"]);
});
test("LWW: чистка гробниц старше порога, живые целы", () => {
  const a = new LWWSet();
  a.добавить("ж", 9, "А"); a.добавить("стар", 1, "А"); a.удалить("стар", 2, "А");
  assert.equal(a.чистка(5), 1);
  assert.deepEqual(a.живые(), ["ж"]);
  assert.equal(a.чистка(5), 0, "второй прогон — нечего чистить");
});
test("LWW: честные отказы (время/узел)", () => {
  const a = new LWWSet();
  assert.throws(() => a.добавить("х", -1, "А"));
  assert.throws(() => a.добавить("х", 1, ""));
  assert.throws(() => a.удалить("х", null, "А"));
});

/* ── Меркль ── */
test("Меркль: корень детерминирован и не зависит от порядка", async () => {
  const к1 = await Меркль.корень(["а", "б", "в"]);
  const к2 = await Меркль.корень(["в", "а", "б"]);
  const к3 = await Меркль.корень(["а", "б", "в"]);
  assert.equal(к1, к2); assert.equal(к1, к3);
  assert.equal(к1.length, 64, "32 байта hex");
});
test("Меркль: пустое множество — честный корень", async () => {
  const к = await Меркль.корень([]);
  assert.equal(к.length, 64);
  assert.equal(к, await Меркль.корень([]));
});
test("Меркль: изменение элемента меняет корень", async () => {
  const к1 = await Меркль.корень(["а", "б"]);
  const к2 = await Меркль.корень(["а", "бб"]);
  assert.notEqual(к1, к2);
});
test("Меркль: дубль элемента не меняет корень", async () => {
  assert.equal(await Меркль.корень(["а", "а", "б"]), await Меркль.корень(["а", "б"]));
});
test("Меркль: нечётный размер — дубль хвоста (3 ≠ 4)", async () => {
  const н = await Меркль.корень(["а", "б", "в"]);
  const ч = await Меркль.корень(["а", "б", "в", "г"]);
  assert.notEqual(н, ч);
});
test("Меркль: сверка равных множеств — равны, 0 диффа", async () => {
  const р = await Меркль.сверка(["а", "б", "в"], ["в", "б", "а"]);
  assert.equal(р.равны, true); assert.deepEqual(р.лишние, []); assert.deepEqual(р.недостающие, []);
});
test("Меркль: 3 фазы находят обе стороны диффа (32 элемента)", async () => {
  const А = Array.from({ length: 32 }, (_, i) => "э" + i);
  const Б = А.filter(э => э !== "э7").concat(["нов1", "нов2"]);
  const р = await Меркль.сверка(А, Б);
  assert.equal(р.равны, false);
  assert.deepEqual(р.лишние, ["э7"]);
  assert.deepEqual(р.недостающие, ["нов1", "нов2"]);
});
test("Меркль: сверка зеркальна", async () => {
  const А = ["а", "б", "в", "г"], Б = ["б", "г", "д"];
  const р1 = await Меркль.сверка(А, Б);
  const р2 = await Меркль.сверка(Б, А);
  assert.deepEqual(р1.лишние, р2.недостающие);
  assert.deepEqual(р1.недостающие, р2.лишние);
});
test("Меркль: proof включается и отвергает подмену", async () => {
  const фонд = ["п1", "п2", "п3", "п4", "п5", "п6", "п7"];
  const пр = await Меркль.доказ(фонд, "п4");
  assert.equal(await Меркль.проверьДоказ(пр), true, "честный proof верен");
  assert.equal(await Меркль.проверьДоказ({ ...пр, элемент: "пX" }), false, "подменённый лист отвергнут");
  assert.equal(await Меркль.проверьДоказ({ ...пр, корень: "0".repeat(64) }), false, "чужой корень отвергнут");
});
test("Меркль: proof отсутствующего листа — честный отказ", async () => {
  await assert.rejects(() => Меркль.доказ(["а", "б"], "в"));
});
test("Меркль: null-вход — честный отказ", async () => {
  await assert.rejects(() => Меркль.корень(null));
});
test("детерминизм: два прогона сверки байт-в-байт", async () => {
  const А = ["х", "у"], Б = ["у", "з"];
  const р1 = JSON.stringify(await Меркль.сверка(А, Б));
  const р2 = JSON.stringify(await Меркль.сверка(А, Б));
  assert.equal(р1, р2);
});
