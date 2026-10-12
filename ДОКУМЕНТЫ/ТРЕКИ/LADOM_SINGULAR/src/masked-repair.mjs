// masked-repair.mjs — ЛАДОМ·СИНГУЛЯР, такт v10.81 «ЛАТКА», строка Л5 «P3–P4: поочерёдное».
//
// КРИТЕРИЙ СТРОКИ (P4 из LADOM_SINGULAR_TZ_AND_ROADMAP.md): «адресный ремонт региона
// без полной перегенерации». Модуль закрывает первые два пункта P4 — masked repair и
// batch experiments; agentic repair planner остаётся честно открытым (здесь —
// детерминированный ЭВРИСТИЧЕСКИЙ планировщик маски planMaskFromOverlaps, не агент).
//
// Что делает модуль:
//   planMaskedRepair(project, mask, opts)   — план ремонта: какие регионы чиним,
//                                             их текущие bbox фиксируются в шагах;
//   planMaskFromOverlaps(project, opts)     — эвристический планировщик: маска из
//                                             пересечений с НЕЗАБЛОКИРОВАННЫМИ соседями;
//   applyMaskedRepair(project, plan, opts)  — применение плана: ЧИНИТСЯ ТОЛЬКО МАСКА,
//                                             нетронутые регионы остаются теми же
//                                             объектами (байт-в-байт), каждый
//                                             отремонтированный не пересекается с
//                                             удержанными; план устарел — честный отказ;
//   batchRepair(project, variants, opts)    — серия вариантов (batch experiments);
//   pickBest(results, scoreFn)              — детерминированный выбор лучшего;
//   baselineDerive(ctx)                     — офлайн-базлайн размещения без сети
//                                             (fallback «без Reve», сосед P4.1 —
//                                             открыт, это его детерминированная основа).
//
// Контракты: проект — ladom.project.v1 (04_LAYOUT_EXAMPLE.json) или composition-IR с тем
// же Region-ядром (id/label/prompt/bbox 0..1/zIndex/locked); план — ladom.repair.v1;
// отчёт — ladom.repair-report.v1. Модуль НЕ заменяет канонический валидатор студии —
// он держит лёгкий shape-гард, а финальную валидацию делает валидатор студии.
//
// Честные границы:
//   - 0 сети, 0 весов, 0 timestamps (в отчёте нет часов — один вход → один выход,
//     байт-в-байт; детерминизм проверяется тестом);
//   - перекрытие отремонтированных МЕЖДУ СОБОЙ не гарантируется (маска чинится
//     по порядку шагов, каждый сверяется только с УДЕРЖАННЫМИ) — это задокументировано,
//     а не спрятано;
//   - грань «ремонт не наехал на удержанных» бьёт только НОВОЕ перекрытие: шаг,
//     который сдвинул bbox, обязан лечь свободно; НАСЛЕДОВАННОЕ пересечение
//     (bbox не менялся — например, prompt-ремонт без сдвига) — не вина ремонта,
//     его видит планировщик planMaskFromOverlaps и метрики Л3;
//   - locked-регионы не чинятся никогда: в маску их не взять (план откажется),
//     и на них не наедут (грань перекрытия считается по удержанным, включая locked);
//   - «ремонт, который не нужен» не делается: если derive вернул null или тот же bbox —
//     шаг честно помечается kept/blocked, а не притворяется ремонтом;
//   - экспорт: только ESM, единственный внутренний импорт — bboxIoU из ./qa-metrics.mjs
//     (связка с Л3: грань «ремонт помешал соседу» меряется той же мерой, что метрики).

import { bboxIoU } from './qa-metrics.mjs';

export const REPAIR_SCHEMA = 'ladom.repair.v1';
export const REPORT_SCHEMA = 'ladom.repair-report.v1';
export const GENERATED_BY = 'masked-repair/0.1';

// Минимум живого региона — зеркало константы канонического валидатора
// ladom.composition.v1 (та же величина, что у фикстуры и студии).
export const MIN_SIZE = 0.02;

// Предел перебора кандидатов базлайна (1 исходная попытка + 3 ступени × 24 решётки
// = 73) — гарвард от случайного разрастания перебора; после него — честный блок.
export const MAX_ATTEMPTS = 73;

const round6 = (v) => Math.round(v * 1e6) / 1e6;

// ---------------------------------------------------------------------------
// Лёгкий shape-гард. ЭТО НЕ канонический валидатор студии — он ловит только то,
// без чего адресный ремонт не имеет смысла: уникальные id, bbox-числа в [0,1].
// ---------------------------------------------------------------------------
export function assertProjectShape(project, where = 'project') {
  if (!project || typeof project !== 'object' || Array.isArray(project)) {
    throw new TypeError(`masked-repair: ${where} — ожидается объект проекта, получено ${project === null ? 'null' : typeof project}`);
  }
  if (typeof project.schemaVersion !== 'string' || !project.schemaVersion.startsWith('ladom.')) {
    throw new TypeError(`masked-repair: ${where}.schemaVersion — ожидается строка вида "ladom.*", получено ${JSON.stringify(project.schemaVersion ?? null)}`);
  }
  if (!Array.isArray(project.regions)) {
    throw new TypeError(`masked-repair: ${where}.regions — ожидается массив, получено ${typeof project.regions}`);
  }
  const seen = new Set();
  project.regions.forEach((region, i) => {
    if (!region || typeof region !== 'object') {
      throw new TypeError(`masked-repair: ${where}.regions[${i}] — не объект`);
    }
    if (typeof region.id !== 'string' || !region.id) {
      throw new TypeError(`masked-repair: ${where}.regions[${i}].id — ожидается непустая строка`);
    }
    if (seen.has(region.id)) {
      throw new TypeError(`masked-repair: ${where}.regions[${i}] — дубликат id "${region.id}"`);
    }
    seen.add(region.id);
    const b = region.bbox;
    if (!b || typeof b !== 'object') {
      throw new TypeError(`masked-repair: ${where}.regions[${i}] ("${region.id}") — bbox отсутствует`);
    }
    for (const key of ['x', 'y', 'width', 'height']) {
      const num = b[key];
      if (typeof num !== 'number' || !Number.isFinite(num)) {
        throw new TypeError(`masked-repair: ${where}.regions[${i}] ("${region.id}").bbox.${key} — не конечное число: ${JSON.stringify(num ?? null)}`);
      }
    }
    if (b.width < MIN_SIZE || b.height < MIN_SIZE) {
      throw new TypeError(`masked-repair: ${where}.regions[${i}] ("${region.id}") — bbox ${b.width}×${b.height} меньше MIN_SIZE=${MIN_SIZE}: ремонт такого не чинит, честный отказ`);
    }
    if (b.x < 0 || b.y < 0 || b.x + b.width > 1 + 1e-9 || b.y + b.height > 1 + 1e-9) {
      throw new TypeError(`masked-repair: ${where}.regions[${i}] ("${region.id}") — bbox выходит за кадр 0..1: ${JSON.stringify(b)}`);
    }
  });
}

function cloneBbox(b) {
  return { x: b.x, y: b.y, width: b.width, height: b.height };
}

function sameBbox(a, b) {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

// ---------------------------------------------------------------------------
// ПЛАНИРОВАНИЕ
// ---------------------------------------------------------------------------

/**
 * План адресного ремонта маски.
 * @param {object} project — ladom.project.v1 / composition-IR
 * @param {string|string[]} mask — id регионов к ремонту (строка или массив; дубликаты съедаются)
 * @param {{reason?: string}} [opts]
 * @returns план ladom.repair.v1 (детерминированный: один вход → один выход)
 */
export function planMaskedRepair(project, mask, { reason = '' } = {}) {
  assertProjectShape(project, 'project');
  const list = Array.isArray(mask) ? mask : [mask];
  if (list.length === 0) {
    throw new TypeError('masked-repair: маска пуста — прямое планирование без маски не имеет смысла; если «нечего чинить», так и скажет planMaskFromOverlaps (маска []) — честнее, чем притворяться');
  }
  const byId = new Map(project.regions.map((r) => [r.id, r]));
  const seen = new Set();
  const steps = [];
  for (const id of list) {
    if (typeof id !== 'string' || !id) {
      throw new TypeError(`masked-repair: id в маске должен быть непустой строкой, получено ${JSON.stringify(id ?? null)}`);
    }
    if (seen.has(id)) continue; // дубликат маски съедается молча — план тот же
    seen.add(id);
    const region = byId.get(id);
    if (!region) {
      throw new TypeError(`masked-repair: в маске неизвестный id "${id}" — региона с таким id в проекте нет`);
    }
    if (region.locked === true) {
      throw new TypeError(`masked-repair: регион "${id}" locked=true — заблокированное не чинится; снимите замок у владельца, потом планируйте`);
    }
    steps.push({ id, from: cloneBbox(region.bbox) });
  }
  return {
    schemaVersion: REPAIR_SCHEMA,
    generatedBy: GENERATED_BY,
    title: project.title ?? '',
    mask: steps.map((s) => s.id),
    steps,
    reason: String(reason ?? ''),
  };
}

/**
 * Эвристический планировщик маски по пересечениям: для каждой пары
 * (заблокированный-или-удержанный × ремонтируемый) в маску идёт РЕМОНТИРУЕМЫЙ.
 * Правило выбора внутри пары двух неблокированных: в маску идёт ПОЗДНИЙ в списке
 * регионов (детерминированная конвенция, задокументирована — не «умный агент»).
 * @returns план ladom.repair.v1; маска может быть пустой — «нечего чинить» честно.
 */
export function planMaskFromOverlaps(project, { iouMin = 0.0, reason = '' } = {}) {
  assertProjectShape(project, 'project');
  if (typeof iouMin !== 'number' || !Number.isFinite(iouMin) || iouMin < 0 || iouMin > 1) {
    throw new TypeError(`masked-repair: iouMin — число 0..1, получено ${JSON.stringify(iouMin ?? null)}`);
  }
  const regions = project.regions;
  const mask = [];
  const why = [];
  for (let i = 0; i < regions.length; i++) {
    for (let j = i + 1; j < regions.length; j++) {
      const a = regions[i];
      const b = regions[j];
      const iou = bboxIoU(a.bbox, b.bbox);
      if (iou <= iouMin) continue;
      if (a.locked === true && b.locked === true) continue; // оба замка — не наше дело
      let victim;
      if (a.locked === true) victim = b;
      else if (b.locked === true) victim = a;
      else victim = b; // поздний в списке
      if (victim.locked === true) continue; // страховка: замок не чиним
      if (!mask.includes(victim.id)) {
        mask.push(victim.id);
        why.push({ id: victim.id, сосед: victim === a ? b.id : a.id, iou: round6(iou) });
      }
    }
  }
  if (mask.length === 0) {
    // Честное «нечего чинить»: пустой план — валидный ответ планировщика,
    // а не ошибка; применение такого плана вернёт nothing-to-repair.
    return {
      schemaVersion: REPAIR_SCHEMA,
      generatedBy: GENERATED_BY,
      title: project.title ?? '',
      mask: [],
      steps: [],
      reason: String(reason ?? ''),
      overlaps: [],
    };
  }
  const plan = planMaskedRepair(project, mask, { reason: reason || 'пересечения регионов' });
  plan.overlaps = why; // объяснимость планировщика: с кем и насколько пересекались
  return plan;
}

// ---------------------------------------------------------------------------
// ПРИМЕНЕНИЕ
// ---------------------------------------------------------------------------

/**
 * Офлайн-базлайн размещения (детерминированный fallback «без Reve»).
 * Перебирает кандидатов в ФИКСИРОВАННОМ порядке: исходный bbox → три ступени
 * сжатия вокруг центра → решётка сдвигов на каждой ступени. Первый кандидат,
 * который в кадре, не меньше MIN_SIZE и не пересекается с удержанными, — победил.
 * Никакого случайного генератора: один вход → один выход.
 * @param {{region: object, kept: object[]}} ctx
 * @returns {{bbox: object} | null} — null = честный блок (места нет)
 */
export function baselineDerive({ region, kept }) {
  const source = region.bbox;
  let attempts = 0; // гарвард MAX_ATTEMPTS: перебор не должен тихо разрастаться
  const fits = (b) =>
    b.width >= MIN_SIZE &&
    b.height >= MIN_SIZE &&
    b.x >= 0 &&
    b.y >= 0 &&
    b.x + b.width <= 1 + 1e-9 &&
    b.y + b.height <= 1 + 1e-9;
  const free = (b) => kept.every((other) => bboxIoU(b, other.bbox) === 0);
  const room = () => {
    attempts += 1;
    if (attempts > MAX_ATTEMPTS) throw new TypeError('masked-repair: baselineDerive превысил MAX_ATTEMPTS — перебор разросся сверх контракта, честный блок');
    return true;
  };

  // Попытка 0: место уже свободно — ремонта положения не требуется.
  room();
  if (fits(source) && free(source)) return { bbox: cloneBbox(source) };

  // Решётка сдвигов: центр ± решётка, фиксированный порядок обхода.
  const lattice = [];
  for (const dy of [0, -0.2, 0.2, -0.4, 0.4]) {
    for (const dx of [0, -0.2, 0.2, -0.4, 0.4]) {
      if (dx === 0 && dy === 0) continue;
      lattice.push([dx, dy]);
    }
  }
  // Ступени сжатия: 1.0 (только сдвиг), 0.85, 0.7 — с сохранением центра.
  for (const k of [1.0, 0.85, 0.7]) {
    const w = source.width * k;
    const h = source.height * k;
    if (w < MIN_SIZE || h < MIN_SIZE) continue;
    const cx = source.x + source.width / 2;
    const cy = source.y + source.height / 2;
    for (const [dx, dy] of lattice) {
      room();
      const cand = { x: round6(cx + dx - w / 2), y: round6(cy + dy - h / 2), width: round6(w), height: round6(h) };
      if (fits(cand) && free(cand)) return { bbox: cand };
    }
  }
  return null; // честный блок: свободного места не нашли
}

/**
 * Применение плана адресного ремонта.
 * @returns {{project: object, report: object}}
 *   — новый проект: нетронутые регионы = ТЕ ЖЕ объекты (байт-в-байт),
 *     маска = новые объекты; отчёт ladom.repair-report.v1 без timestamps.
 */
export function applyMaskedRepair(project, plan, { derive = baselineDerive } = {}) {
  assertProjectShape(project, 'project');
  if (!plan || typeof plan !== 'object' || plan.schemaVersion !== REPAIR_SCHEMA) {
    throw new TypeError(`masked-repair: plan.schemaVersion — ожидается "${REPAIR_SCHEMA}", получено ${JSON.stringify((plan && plan.schemaVersion) ?? null)}`);
  }
  if (typeof derive !== 'function') {
    throw new TypeError(`masked-repair: derive — ожидается функция, получено ${typeof derive}`);
  }
  if ((plan.title ?? '') !== (project.title ?? '')) {
    throw new TypeError(`masked-repair: план собран для проекта "${plan.title}", применяют к "${project.title}" — честный отказ, пересоберите план`);
  }
  const byId = new Map(project.regions.map((r) => [r.id, r]));
  for (const step of plan.steps) {
    const region = byId.get(step.id);
    if (!region) {
      throw new TypeError(`masked-repair: в плане шаг "${step.id}", в проекте такого региона нет — честный отказ`);
    }
    if (region.locked === true) {
      throw new TypeError(`masked-repair: шаг "${step.id}" нацелен на locked-регион — заблокированное не чинится`);
    }
    if (!sameBbox(step.from, region.bbox)) {
      throw new TypeError(`masked-repair: проект менялся после плана ("${step.id}": план ${JSON.stringify(step.from)}, проект ${JSON.stringify(region.bbox)}) — пересоберите план, применять устаревший не буду`);
    }
  }

  if (plan.steps.length === 0) {
    // Честное «нечего чинить»: проект возвращается без изменений (глубокая копия),
    // отчёт это фиксирует, а не притворяется ремонтом.
    return {
      project: { ...project, regions: [...project.regions] },
      report: {
        schemaVersion: REPORT_SCHEMA,
        generatedBy: GENERATED_BY,
        title: project.title ?? '',
        status: 'nothing-to-repair',
        steps: [],
        repairedCount: 0,
        keptCount: 0,
        blockedCount: 0,
      },
    };
  }

  const maskedIds = new Set(plan.steps.map((s) => s.id));
  const kept = project.regions.filter((r) => !maskedIds.has(r.id)); // удержанные, включая locked
  const steps = [];
  const outcomes = new Map(); // id → новый регион (или тот же объект — нетронутость)

  for (const region of project.regions) {
    if (!maskedIds.has(region.id)) {
      outcomes.set(region.id, region); // та же ссылка — гарантия нетронутости
      continue;
    }
    const outcome = derive({ region, kept, plan });
    if (outcome === null || outcome === undefined) {
      // derive честно отказался — регион не тронут, шаг blocked.
      outcomes.set(region.id, region);
      steps.push({ id: region.id, status: 'blocked', from: cloneBbox(region.bbox), to: cloneBbox(region.bbox) });
      continue;
    }
    if (typeof outcome !== 'object') {
      throw new TypeError(`masked-repair: derive для "${region.id}" вернул ${typeof outcome} — ожидается объект {bbox,...} или null`);
    }
    if (outcome.bbox !== undefined && outcome.bbox !== null) {
      const b = outcome.bbox;
      for (const key of ['x', 'y', 'width', 'height']) {
        if (typeof b[key] !== 'number' || !Number.isFinite(b[key])) {
          throw new TypeError(`masked-repair: derive для "${region.id}" вернул bbox.${key} = ${JSON.stringify(b[key] ?? null)} — не конечное число`);
        }
      }
      if (b.width < MIN_SIZE || b.height < MIN_SIZE) {
        throw new TypeError(`masked-repair: derive для "${region.id}" вернул bbox ${b.width}×${b.height} меньше MIN_SIZE=${MIN_SIZE} — такой ремонт не принимается`);
      }
      if (b.x < 0 || b.y < 0 || b.x + b.width > 1 + 1e-9 || b.y + b.height > 1 + 1e-9) {
        throw new TypeError(`masked-repair: derive для "${region.id}" вернул bbox за кадром: ${JSON.stringify(b)}`);
      }
    }
    const next = { ...region };
    const moved = outcome.bbox !== undefined && outcome.bbox !== null && !sameBbox(outcome.bbox, region.bbox);
    const reprompt = typeof outcome.prompt === 'string' && outcome.prompt !== region.prompt;
    const relabel = typeof outcome.label === 'string' && outcome.label !== region.label;
    if (moved) next.bbox = cloneBbox(outcome.bbox);
    if (reprompt) next.prompt = outcome.prompt;
    if (relabel) next.label = outcome.label;
    if (!moved && !reprompt && !relabel) {
      // derive вернул то же место и те же тексты — ремонта не было, шаг kept.
      outcomes.set(region.id, region);
      steps.push({ id: region.id, status: 'kept', from: cloneBbox(region.bbox), to: cloneBbox(region.bbox) });
      continue;
    }
    outcomes.set(region.id, next);
    steps.push({
      id: region.id,
      status: 'repaired',
      from: cloneBbox(region.bbox),
      to: cloneBbox(next.bbox ?? region.bbox),
    });
  }

  const regions = project.regions.map((region) => outcomes.get(region.id));

  // Грань «ремонт не наехал на удержанных» — та же мера, что у метрик Л3.
  // Бьёт только НОВОЕ перекрытие: шаг со СДВИГОМ bbox обязан лечь свободно;
  // наследованное пересечение (bbox не менялся) — не вина ремонта (см. шапку).
  const violations = [];
  for (const step of steps) {
    if (step.status !== 'repaired') continue;
    if (sameBbox(step.from, step.to)) continue; // сдвига не было — пересечение наследованное
    const repaired = regions.find((r) => r.id === step.id);
    for (const other of kept) {
      const iou = bboxIoU(repaired.bbox, other.bbox);
      if (iou > 0) violations.push({ id: step.id, сосед: other.id, iou: round6(iou) });
    }
  }
  if (violations.length > 0) {
    throw new TypeError(`masked-repair: derive наехал на удержанные регионы: ${JSON.stringify(violations)} — derive обязан давать bbox без перекрытия с kept`);
  }

  const repairedCount = steps.filter((s) => s.status === 'repaired').length;
  const blockedCount = steps.filter((s) => s.status === 'blocked').length;
  const keptCount = steps.filter((s) => s.status === 'kept').length;
  return {
    project: { ...project, regions },
    report: {
      schemaVersion: REPORT_SCHEMA,
      generatedBy: GENERATED_BY,
      title: project.title ?? '',
      status: blockedCount > 0 ? 'partial' : 'done',
      steps,
      repairedCount,
      keptCount,
      blockedCount,
    },
  };
}

// ---------------------------------------------------------------------------
// BATCH EXPERIMENTS
// ---------------------------------------------------------------------------

/**
 * Серия вариантов ремонта (batch experiments из P4). Каждый вариант — свой план
 * (или маска + причина) на ОДНОМ и том же входном проекте; вход не мутируется.
 * @param {object} project
 * @param {Array<{name: string, plan?: object, mask?: string|string[], reason?: string, derive?: Function}>} variants
 * @returns {Array<{name: string, plan: object, result: {project, report}}>} — по порядку вариантов
 */
export function batchRepair(project, variants, { derive = baselineDerive } = {}) {
  if (!Array.isArray(variants)) {
    throw new TypeError(`masked-repair: variants — ожидается массив вариантов, получено ${typeof variants}`);
  }
  const seen = new Set();
  const results = [];
  for (const variant of variants) {
    if (!variant || typeof variant !== 'object') {
      throw new TypeError('masked-repair: вариант — объект {name, plan|mask, ...}');
    }
    if (typeof variant.name !== 'string' || !variant.name) {
      throw new TypeError('masked-repair: у варианта должно быть непустое имя name');
    }
    if (seen.has(variant.name)) {
      throw new TypeError(`masked-repair: дубликат имени варианта "${variant.name}" — имена должны различаться, иначе выбор лучшего нечестен`);
    }
    seen.add(variant.name);
    const plan = variant.plan ?? planMaskedRepair(project, variant.mask, { reason: variant.reason });
    const runDerive = variant.derive ?? derive;
    results.push({ name: variant.name, plan, result: applyMaskedRepair(project, plan, { derive: runDerive }) });
  }
  return results;
}

/**
 * Детерминированный выбор лучшего: максимум scoreFn, при равенстве — ПЕРВЫЙ по
 * порядку массива. scoreFn обязан быть детерминированным (модуль это проверить
 * не может — честно сказано здесь).
 * @returns {{name: string, score: number, result: object} | null}
 */
export function pickBest(results, scoreFn) {
  if (!Array.isArray(results) || results.length === 0) return null;
  if (typeof scoreFn !== 'function') {
    throw new TypeError(`masked-repair: scoreFn — ожидается функция, получено ${typeof scoreFn}`);
  }
  let best = null;
  let bestScore = -Infinity;
  for (const item of results) {
    const score = scoreFn(item);
    if (typeof score !== 'number' || !Number.isFinite(score)) {
      throw new TypeError(`masked-repair: scoreFn("${item.name}") вернул ${JSON.stringify(score ?? null)} — ожидается конечное число`);
    }
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }
  return { name: best.name, score: bestScore, result: best.result };
}
