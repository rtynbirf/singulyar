// open-model-adapter.mjs — ЛАДОМ·СИНГУЛЯР, такт v10.88 «АДАПТЕР», строка Л5-P4.1:
// локальный open-model адаптер (layout-conditioned baseline, fallback без Reve).
//
// ЗАКОН ЧЕСТНОСТИ: весов модели в доме нет (правда платформы: файл ≤100 МБ,
// Pages ≤1 ГБ) — адаптер не тащит, не качает и не запускает веса. Модель живёт
// ЛОКАЛЬНО у владельца и приходит в адаптер готовой — через runner по контракту
// ниже. Статус модели без pinned-хэша — EXPERIMENTAL, честно (родня строки А3:
// контракты без пиннинга не называются проверенными). Адаптер не притворяется,
// что думает: он переводит ответ модели в маску контракта дома, а что не
// переводится — честный отказ.
//
// КОНТРАКТ RUNNER (синхронный, чистый):
//   runner(промпт: string) → { ответ: string } | { отказ: причина }
//   - детерминированный: один вход → один ответ (агентный цикл синхронен);
//   - 0 сети: runner ничего не качает — веса уже локальны у владельца;
//   - асинхронные рантаймы (WebLLM, transformers.js, локальный сервер вывода)
//     гоняются ЗА пределами агентного цикла и приносят «замороженный ответ»:
//     runner = () => ({ ответ: '<текст модели>' }) — детерминизм по построению.
//   Нет runner'а — нет proposer'а: адаптер не выдумывает ответы за модель.
//
// РАЗДЕЛЕНИЕ ТРУДА (критерий P4.1 «layout-conditioned baseline, fallback без Reve»):
//   модель решает ГДЕ  — какие регионы чинить (маска id'ов),
//   дом решает КАК     — позиции (их baselineDerive из их канона v10.81),
//   применение — только их applyMaskedRepair через их batchRepair (агент v10.85).
//   Гарантия нетронутости удержанных остаётся ИХ, а модель не изобретает bbox'ов.
//
// КОНТРАКТ PROPOSER (тот же, что у стоковых — сигнатура одинакова):
//   proposer(имя, project, память) → { маска: [id…] } | { маска: [] } | { отказ: причина }.
//   Никогда не бросает: любая беда — честный отказ в конверте (агент пишет его в
//   память раунда и продолжает). Вход не мутируется (проверяется тестом).
//
// ФОРМАТ ОТВЕТА МОДЕЛИ (строгий, единственный):
//   JSON-массив id'ов:  ["b","a"]            — маска к ремонту;
//   JSON-объект:        { "маска": ["b"] }   — то же, в конверте дома;
//   пустой массив / { "маска": [] }          — «нечего чинить».
//   Всё прочее (проза, рваный JSON, не-строки в массиве) — честный отказ.
//   Имя «маска» сообразно конвертам дома; «mask» в парсер не тащено — один формат.
//
// Честные границы:
//   - маска проходит ЕЩЁ ОДИН рубеж в агентном цикле: planMaskedRepair пересобирает
//     план и честно отказывает на неизвестном id/замке — двойная проверка;
//   - замки фильтруются ДО агента (их закон «замки не чинятся никогда»); если
//     модель назвала одни замки — честное «нечего чинить», не отказ;
//   - ledger адаптера — не канон А3: здесь модель владельца с её хэшем; pinned-
//     хэш обязателен только для статуса «pinned», работа без него — EXPERIMENTAL;
//   - снапшот проекта адаптеру присылает агент (снимок) — двойная страховка от
//     мутаций; адаптер, кроме того, сам не пишет во вход;
//   - разбор ответа НЕ угадывает: ни частичных масок из прозы, ни «похожих» id.
//
// Экспорт: только ESM; импорт — ровно один, канон дома: ./repair-agent.mjs
// (registerProposer — та же дверь, что обещана в шапке канона v10.85).

import { registerProposer } from './repair-agent.mjs';

export const ver = 'open-model-adapter/0.1';
export const LEDGER_SCHEMA = 'ladom.open-model.v1';

// Паттерн id модели: буквы/цифры Unicode (дом говорит и по-русски) плюс точка,
// подчёркивание, дефис — имя proposer'а 'open-model/<id>' должно читаться
// однозначно (без «/» внутри id, без хитрых начал).
const ПАТТЕРН_ID = /^[\p{L}\p{N}][\p{L}\p{N}._-]*$/u;
// pinned-хэш — sha256 в шестнадцатеричном виде (64 знака); обещание пиннинга
// обязано быть проверяемой строкой, а не словом.
const ПАТТЕРН_ХЭША = /^[0-9a-f]{64}$/i;

// ---------------------------------------------------------------------------
// LEDGER моделей. На импорте пуст — моделей в доме нет, и это честно.
// ---------------------------------------------------------------------------
const ledger = new Map();

export function списокМоделей() {
  return [...ledger.keys()].sort().map((id) => {
    const запись = ledger.get(id);
    return {
      id,
      имя: запись.имя,
      задача: запись.задача,
      статус: запись.pinned
        ? `pinned sha256:${запись.pinned.toLowerCase()}`
        : 'EXPERIMENTAL: без pinned-хэша — модель владельца, дом не проверял веса',
    };
  });
}

// ---------------------------------------------------------------------------
// ПРОМПТ (layout-conditioned, детерминированный). Один вход → один выход,
// байт-в-байт: фиксированный порядок полей, регионы сортированы по id, ни часов,
// ни случайности. Модель получает картину раскладки и строгую инструкцию формата.
// ---------------------------------------------------------------------------
export function собратьПромпт(project) {
  if (!project || typeof project !== 'object' || Array.isArray(project)) {
    throw new TypeError(`open-model-adapter: собратьПромпт — project ожидается объектом, получено ${JSON.stringify(project ?? null)}`);
  }
  if (!Array.isArray(project.regions)) {
    throw new TypeError(`open-model-adapter: собратьПромпт — project.regions ожидается массивом, получено ${typeof project.regions}`);
  }
  const холст = project.canvas && typeof project.canvas === 'object' ? project.canvas : {};
  const регионы = [...project.regions]
    .filter((r) => r && typeof r === 'object')
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((r) => ({
      id: String(r.id),
      label: r.label === undefined ? null : String(r.label),
      locked: r.locked === true,
      bbox: {
        x: Number(r.bbox && r.bbox.x),
        y: Number(r.bbox && r.bbox.y),
        width: Number(r.bbox && r.bbox.width),
        height: Number(r.bbox && r.bbox.height),
      },
    }));
  const картина = {
    задача: 'layout-repair: выбрать регионы для ремонта позиции',
    формат_ответа: 'JSON: ["id", …] или {"маска": ["id", …]}; пустой массив — нечего чинить',
    границы: 'замки (locked: true) не чинятся никогда; незнакомые id недопустимы',
    title: project.title === undefined ? null : String(project.title),
    canvas: { width: Number(холст.width), height: Number(холст.height) },
    regions: регионы,
  };
  return JSON.stringify(картина, null, 2);
}

// ---------------------------------------------------------------------------
// ПАРСЕР ОТВЕТА. Строгий: один формат, никакого угадывания. Возвращает
// отсортированную маску без дублей и без замков. Пустая маска — валидный
// «нечего чинить». Беда — честный TypeError (proposer завернёт в отказ).
// ---------------------------------------------------------------------------
export function разобратьОтвет(ответ, project) {
  if (typeof ответ !== 'string' || ответ.trim() === '') {
    throw new TypeError(`open-model-adapter: разобратьОтвет — ответ ожидается непустой строкой, получено ${JSON.stringify(ответ ?? null)}`);
  }
  if (!project || typeof project !== 'object' || !Array.isArray(project.regions)) {
    throw new TypeError('open-model-adapter: разобратьОтвет — project без массива regions не разбирается');
  }
  let сырое;
  try {
    сырое = JSON.parse(ответ);
  } catch (ошибка) {
    throw new TypeError(`open-model-adapter: ответ не JSON — ${ошибка && ошибка.message ? ошибка.message : String(ошибка)}`);
  }
  let список;
  if (Array.isArray(сырое)) {
    список = сырое;
  } else if (сырое && typeof сырое === 'object' && Array.isArray(сырое['маска'])) {
    список = сырое['маска'];
  } else {
    throw new TypeError(`open-model-adapter: ответ не по формату (жду ["id", …] или {"маска": […]}) — получено ${JSON.stringify(сырое).slice(0, 200)}`);
  }
  const вПроекте = new Map(project.regions.filter((r) => r && typeof r === 'object').map((r) => [String(r.id), r]));
  const виденные = new Set();
  for (const элемент of список) {
    if (typeof элемент !== 'string' || !элемент) {
      throw new TypeError(`open-model-adapter: в маске не-id: ${JSON.stringify(элемент ?? null)}`);
    }
    if (!вПроекте.has(элемент)) {
      throw new TypeError(`open-model-adapter: id "${элемент}" не в проекте — модель назвала незнакомый регион`);
    }
    виденные.add(элемент);
  }
  // Замки не чинятся никогда (их закон) — фильтруются молча: модель назвала
  // существующий регион, дом просто не даст его тронуть. Одни замки → пустая маска.
  return [...виденные]
    .filter((id) => вПроекте.get(id).locked !== true)
    .sort();
}

// ---------------------------------------------------------------------------
// РЕГИСТРАЦИЯ МОДЕЛИ. Честный true/false, не бросок (как их registerProposer).
// ---------------------------------------------------------------------------
export function registerOpenModel(описание) {
  if (!описание || typeof описание !== 'object' || Array.isArray(описание)) return false;
  const { id, runner, pinned, задача } = описание;
  if (!id || typeof id !== 'string' || !ПАТТЕРН_ID.test(id)) return false;
  if (typeof runner !== 'function') return false;
  if (pinned !== undefined && (typeof pinned !== 'string' || !ПАТТЕРН_ХЭША.test(pinned))) return false;
  if (задача !== undefined && (typeof задача !== 'string' || !задача)) return false;
  if (ledger.has(id)) return false; // дубликат id — честный false

  const имя = `open-model/${id}`;
  const цель = задача === undefined ? 'repair-mask' : задача;

  // PROPOSER: контракт тот же, что у стоковых; никогда не бросает.
  const proposeOpenModel = function proposeOpenModel(имяАгента, project, память) {
    try {
      const промпт = собратьПромпт(project);
      const ответ = runner(промпт);
      if (!ответ || typeof ответ !== 'object' || Array.isArray(ответ)) {
        return { отказ: `${имя}: runner вернул не конверт ({ответ}|{отказ})` };
      }
      if (typeof ответ.отказ === 'string') {
        return { отказ: `${имя}: модель отказалась — ${ответ.отказ}` };
      }
      if (typeof ответ.ответ !== 'string') {
        return { отказ: `${имя}: в конверте runner'а нет строки «ответ»` };
      }
      const маска = разобратьОтвет(ответ.ответ, project);
      return маска.length === 0 ? { маска: [] } : { маска };
    } catch (ошибка) {
      const текст = ошибка && ошибка.message ? ошибка.message : String(ошибка);
      return { отказ: `${имя}: ${текст}` };
    }
  };

  if (!registerProposer(имя, proposeOpenModel)) return false; // имя занято — честный false
  ledger.set(id, { имя, runner, pinned: pinned ? pinned.toLowerCase() : null, задача: цель });
  return true;
}
