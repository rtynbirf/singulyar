// СИНГУЛЯР · ЕДИНОЕ ОКНО — переводчик дома (0.6.0 «ГОЛОС КАЖДОГО — НА ЯЗЫКЕ КАЖДОГО»).
//
// МИР (круг 8 ВЭБ-СЕТИ, docs/МИРОВЫЕ-ПРАКТИКИ-2026-11-12.md п.16):
// с июня 2025 в Chrome 138 стабильно работает Translator API + LanguageDetector API —
// перевод НА УСТРОЙСТВЕ: модель пары скачивается один раз, дальше работает офлайн,
// текст не покидает устройство, ключей и квот нет. Edge 148+ даёт 145+ языков.
// Источники: developer.chrome.com/docs/ai/translator-api · MDN «Translator and Language
// Detector APIs» · webmachinelearning/translation-api. Firefox — API нет (отрицательная
// позиция Mozilla), WebKit — API нет: дом не притворяется, граница честная (README).
//
// Ядро без DOM — инъекция движка для стража tests/translate.test.mjs:
//   * перевод идёт СТРОГО ПОСЛЕДОВАТЕЛЬНО (мировая практика API: запросы обрабатываются
//     по очереди — своя очередь защищает разговор от наводнения);
//   * кэш переводов — на устройстве, тот же текст не переводится дважды;
//   * письмо входящего определяет LanguageDetector; уверенность ниже 0.25 — перевод не
//     запускается (короткие «ок», «ага» не портим);
//   * модель пары НЕ скачивается без явной кнопки человека (требование API: активация
//     пользователя) — дом не ставит гигабайты молча;
//   * нет API / недоступная пара / не установлен движок — честный отказ, никакого
//     фейкового перевода: дом не выдумывает.

export const LANGS = [
  { code: "ar", name: "арабский" }, { code: "bg", name: "болгарский" },
  { code: "bn", name: "бенгальский" }, { code: "cs", name: "чешский" },
  { code: "da", name: "датский" }, { code: "de", name: "немецкий" },
  { code: "el", name: "греческий" }, { code: "en", name: "английский" },
  { code: "es", name: "испанский" }, { code: "fi", name: "финский" },
  { code: "fr", name: "французский" }, { code: "he", name: "иврит" },
  { code: "hi", name: "хинди" }, { code: "hr", name: "хорватский" },
  { code: "hu", name: "венгерский" }, { code: "id", name: "индонезийский" },
  { code: "it", name: "итальянский" }, { code: "ja", name: "японский" },
  { code: "kn", name: "каннада" }, { code: "ko", name: "корейский" },
  { code: "lt", name: "литовский" }, { code: "mr", name: "маратхи" },
  { code: "nl", name: "нидерландский" }, { code: "no", name: "норвежский" },
  { code: "pl", name: "польский" }, { code: "pt", name: "португальский" },
  { code: "ro", name: "румынский" }, { code: "ru", name: "русский" },
  { code: "sk", name: "словацкий" }, { code: "sl", name: "словенский" },
  { code: "sv", name: "шведский" }, { code: "ta", name: "тамильский" },
  { code: "te", name: "телугу" }, { code: "th", name: "тайский" },
  { code: "tr", name: "турецкий" }, { code: "uk", name: "украинский" },
  { code: "vi", name: "вьетнамский" }, { code: "zh", name: "китайский" },
  { code: "zh-Hant", name: "китайский (традиционный)" }
];

export const langName = code => LANGS.find(l => l.code === code)?.name || code;

/* Порог уверенности автоопределения: ниже — считаем, что письма не поняли. */
export const DETECT_CONFIDENCE_MIN = 0.25;

export function createTranslatorCore({ Translator = null, LanguageDetector = null } = {}) {
  const pairs = new Map();   // "src>tgt" → созданный переводчик (держать модель дёргать нельзя)
  const cache = new Map();   // "src>tgt\0text" → перевод; только память устройства человека
  const CACHE_MAX = 300;
  let chain = Promise.resolve();           // очередь: мир требует последовательной обработки
  let busy = 0, maxBusy = 0;               // доказательство последовательности для стража
  let detectorP = null;   // общий промис создания детектора: первый вызов строит, остальные ждут

  const hasApi = () => !!Translator;

  function availability(src, tgt) {
    if (!hasApi()) return Promise.resolve("no-api");
    return Promise.resolve().then(() =>
      Translator.availability({ sourceLanguage: src, targetLanguage: tgt })
    ).catch(() => "unavailable");
  }

  async function detect(text) {
    if (!LanguageDetector) return null;
    if (!detectorP) {
      detectorP = Promise.resolve().then(() => LanguageDetector.create()).catch(() => null);
    }
    const detector = await detectorP;
    if (!detector) return null;
    try {
      const r = await detector.detect(text);
      if (!r?.length) return null;
      return r[0].confidence >= DETECT_CONFIDENCE_MIN ? r[0].detectedLanguage : null;
    } catch { return null; }
  }

  async function ensurePair(src, tgt, onProgress) {
    const k = src + ">" + tgt;
    if (pairs.has(k)) return pairs.get(k);
    const tr = await Translator.create({
      sourceLanguage: src, targetLanguage: tgt,
      monitor(m) { m?.addEventListener?.("downloadprogress", e => onProgress?.(e.loaded || 0)); }
    });
    const rec = { tr };
    pairs.set(k, rec);
    return rec;
  }

  function runQueued(task) {
    const run = () => { busy++; maxBusy = Math.max(maxBusy, busy); return task().finally(() => { busy--; }); };
    const p = chain.then(run, run);
    chain = p.catch(() => {});
    return p;
  }

  async function translateText(src, tgt, text) {
    const ck = src + ">" + tgt + "\u0000" + text;
    if (cache.has(ck)) return cache.get(ck);
    const { tr } = await ensurePair(src, tgt);
    const out = await tr.translate(text);
    const val = typeof out === "string" ? out : (out?.text ?? "");
    cache.set(ck, val);
    if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
    return val;
  }

  /* Обычный путь: автоопределение письма → пара есть — переводим; модель не установлена
     или нужна активация — возвращаем статус, UI покажет кнопку человека. */
  async function translate(text, { tgt } = {}) {
    if (!hasApi()) return { status: "no-api" };
    if (!tgt) return { status: "no-source" };
    const src = await detect(text);
    if (!src) return { status: "no-source" };
    if (src === tgt) return { status: "same", src };
    const av = await availability(src, tgt);
    if (av === "no-api" || av === "unavailable" || av === "downloadable" || av === "downloading")
      return { status: av === "no-api" ? "no-api" : av, src };
    return runQueued(() => translateText(src, tgt, text))
      .then(out => ({ status: "translated", src, text: out }))
      .catch(e => e?.name === "NotAllowedError"
        ? { status: "need-action", src }
        : { status: "error", src, message: e?.message || String(e) });
  }

  /* Путь по явной кнопке человека (клик = активация пользователя, как требует API):
     модель пары ставится на устройство с показом прогресса, потом — перевод. */
  async function translateWithInstall(text, src, tgt, onProgress) {
    if (!hasApi()) return { status: "no-api" };
    return runQueued(async () => {
      try {
        return { status: "translated", src, text: await translateText(src, tgt, text) };
      } catch (e) {
        if (e?.name !== "NotAllowedError")
          return { status: "error", src, message: e?.message || String(e) };
        pairs.delete(src + ">" + tgt);                 // пересоздаём пару по кнопке
        try {
          await ensurePair(src, tgt, onProgress);
          return { status: "translated", src, text: await translateText(src, tgt, text) };
        } catch (e2) {
          return e2?.name === "NotAllowedError"
            ? { status: "need-action", src }
            : { status: "error", src, message: e2?.message || String(e2) };
        }
      }
    });
  }

  function stats() { return { busy, maxBusy, cache: cache.size, pairs: pairs.size }; }

  function destroy() {
    for (const p of pairs.values()) { try { p.tr?.destroy?.(); } catch {} }
    pairs.clear();
    if (detectorP) {
      detectorP.then(d => { try { d?.destroy?.(); } catch {} });
      detectorP = null;
    }
  }

  return { translate, translateWithInstall, detect, availability, stats, destroy, hasApi };
}
