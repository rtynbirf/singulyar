import test from "node:test";
import assert from "node:assert/strict";
import { createTranslatorCore, LANGS, langName, DETECT_CONFIDENCE_MIN } from "../public/translate.js";

/* 0.6.0 «ГОЛОС КАЖДОГО — НА ЯЗЫКЕ КАЖДОГО»: страж переводчика дома.
   Якоря — не из кода, а из мировой практики API (круг 8 ВЭБ-СЕТИ):
   Chrome docs «Translation with built-in AI» — «Translations are processed sequentially»;
   MDN Translator and Language Detector APIs — активация пользователя, availability().
   Дом не выдумывает: нет API/пары — честный отказ, а не фейковый перевод. */

function fakeTranslator({ availabilityMap = {}, failCreate = false, delay = 0 } = {}) {
  let created = 0;
  const concurrent = { n: 0, max: 0, order: [] };
  const Translator = {
    availability: async ({ sourceLanguage: s, targetLanguage: t }) =>
      availabilityMap[s + ">" + t] ?? "available",
    create: async ({ sourceLanguage: s, targetLanguage: t }) => {
      created++;
      if (failCreate) { const e = new Error("no activation"); e.name = "NotAllowedError"; throw e; }
      return {
        translate: async text => {
          concurrent.n++; concurrent.max = Math.max(concurrent.max, concurrent.n);
          try {
            if (delay) await new Promise(r => setTimeout(r, delay));
            concurrent.order.push(s + ">" + t + ":" + text);
            return `[${s}>${t}] ${text}`;
          } finally { concurrent.n--; }
        }
      };
    }
  };
  return { Translator, created: () => created, concurrent };
}

function fakeDetector(map = {}) {
  return { LanguageDetector: { create: async () => ({ detect: async text => map[text] ?? [{ detectedLanguage: "ru", confidence: 0.9 }] }) } };
}

test("перевод идёт строго по одному — мировая практика «processed sequentially»", async () => {
  const f = fakeTranslator({ delay: 25 });
  const tr = createTranslatorCore({ ...f, ...fakeDetector() });
  const res = await Promise.all([
    tr.translate("один", { tgt: "en" }),
    tr.translate("два", { tgt: "en" }),
    tr.translate("три", { tgt: "en" }),
    tr.translate("четыре", { tgt: "en" })
  ]);
  assert.equal(f.concurrent.max, 1);                       // ни одного параллельного вызова
  assert.equal(f.concurrent.order.length, 4);
  assert.deepEqual(f.concurrent.order, [
    "ru>en:один", "ru>en:два", "ru>en:три", "ru>en:четыре"  // порядок очереди = порядок прихода
  ]);
  for (const r of res) assert.equal(r.status, "translated");
});

test("кэш на устройстве: тот же текст не переводится движком дважды", async () => {
  const f = fakeTranslator();
  const tr = createTranslatorCore({ ...f, ...fakeDetector() });
  const a = await tr.translate("привет", { tgt: "en" });
  const b = await tr.translate("привет", { tgt: "en" });
  assert.equal(f.created(), 1);
  assert.equal(a.text, b.text);
  assert.equal(tr.stats().cache, 1);
});

test("уже мой язык — движок не зовётся, перевод не выдумывается", async () => {
  const f = fakeTranslator();
  const tr = createTranslatorCore({ ...f, ...fakeDetector({ "привет": [{ detectedLanguage: "ru", confidence: 0.99 }] }) });
  const r = await tr.translate("привет", { tgt: "ru" });
  assert.equal(r.status, "same");
  assert.equal(f.created(), 0);
});

test("нет API — честный отказ, никакого текста из ниоткуда", async () => {
  const tr = createTranslatorCore({});
  const r = await tr.translate("привет", { tgt: "en" });
  assert.equal(r.status, "no-api");
  assert.equal(r.text, undefined);
});

test("пара недоступна — честная граница вместо перевода", async () => {
  const f = fakeTranslator({ availabilityMap: { "ru>tlh": "unavailable" } });
  const tr = createTranslatorCore({ ...f, ...fakeDetector() });
  const r = await tr.translate("привет", { tgt: "tlh" });
  assert.equal(r.status, "unavailable");
  assert.equal(f.created(), 0);
});

test("модель не установлена — без кнопки человека перевод не стартует", async () => {
  const f = fakeTranslator({ availabilityMap: { "ru>en": "downloadable" } });
  const tr = createTranslatorCore({ ...f, ...fakeDetector() });
  const r = await tr.translate("привет", { tgt: "en" });
  assert.equal(r.status, "downloadable");
  assert.equal(f.created(), 0);                            // гигабайты не ставим молча
});

test("установка по кнопке (активация пользователя) → модель ставится, перевод приходит", async () => {
  const f = fakeTranslator({ availabilityMap: { "ru>en": "downloadable" } });
  const tr = createTranslatorCore({ ...f, ...fakeDetector() });
  let progress = [];
  const r = await tr.translateWithInstall("привет", "ru", "en", p => progress.push(p));
  assert.equal(r.status, "translated");
  assert.equal(r.text, "[ru>en] привет");
  assert.equal(f.created(), 1);
});

test("нет активации — need-action: дом просит нажать ещё раз, а не переводит молча", async () => {
  const f = fakeTranslator({ failCreate: true });
  const tr = createTranslatorCore({ ...f, ...fakeDetector() });
  const r = await tr.translateWithInstall("привет", "ru", "en");
  assert.equal(r.status, "need-action");
});

test("письмо входящего: определённый язык едет в пару; малая уверенность — не переводим", async () => {
  const f = fakeTranslator();
  const det = fakeDetector({ "hello": [{ detectedLanguage: "en", confidence: 0.88 }], "ок": [{ detectedLanguage: "ru", confidence: 0.1 }] });
  const tr = createTranslatorCore({ ...f, ...det });
  const r1 = await tr.translate("hello", { tgt: "ru" });
  assert.equal(r1.status, "translated");
  assert.equal(r1.text, "[en>ru] hello");                  // источник — из детектора
  const r2 = await tr.translate("ок", { tgt: "en" });
  assert.equal(r2.status, "no-source");                    // короткое «ок» не портим
  assert.equal(f.created(), 1);
});

test("языки дома: 39 кодов Chrome, ключевые живы, имена на месте", () => {
  assert.equal(LANGS.length, 39);
  const codes = LANGS.map(l => l.code);
  assert.equal(new Set(codes).size, codes.length);         // дубликатов нет
  for (const need of ["ru", "en", "uk", "ar", "he", "hi", "zh", "zh-Hant", "ja", "de", "es", "fr"]) assert.ok(codes.includes(need), need);
  for (const l of LANGS) {
    assert.ok(l.name, l.code);
    assert.match(l.code, /^[a-z]{2}(-[A-Z][a-z]+)?$/, l.code);
  }
  assert.equal(langName("ru"), "русский");
  assert.equal(langName("nonexistent-code"), "nonexistent-code");
});

test("порог уверенности — мировой смысл: ниже порога письмо не определено", () => {
  assert.ok(DETECT_CONFIDENCE_MIN > 0 && DETECT_CONFIDENCE_MIN < 1);
});
