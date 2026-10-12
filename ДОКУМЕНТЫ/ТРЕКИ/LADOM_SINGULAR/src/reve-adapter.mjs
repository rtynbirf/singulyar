// reve-adapter.mjs — ЛАДОМ·СИНГУЛЯР, такт v10.90 «ЗАКОН», строка Л1 (mock-ход).
//
// РЕШЕНИЕ ВЛАДЕЛЬЦА (2026-10-13): «Л1 — токен Reve: заводим mock и двигаем адаптер
// без них». Адаптер реализует ПОЛНЫЙ контракт ТЗ Reve (reve_sdk_delivery/
// 03_TZ_IMPLEMENTATION.md, слой D) — но на честном моке: 0 сети, 0 токена,
// 0 часов, 0 случайности. Он НЕ притворяется настоящим Reve: статус «mock»,
// image:null, причина названа. Токен придёт — мок выключается флагом, контракт
// не меняется (закон I-08 «АДАПТЕР ЗАМЕНЯЕМ»: замена адаптера не меняет
// смысловой контракт, провайдер не становится заложником).
//
// КОНТРАКТ (по ТЗ, слой D):
//   createLayout(project) → wire-layout          Project → формат выгрузки;
//   extractLayout(wire) → project                обратная посадка (JSON.parse —
//                                                снаружи; структурная валидация —
//                                                здесь, импорт не исполняет код);
//   renderLayout(project) → RequestResult        рендер; на моке — честный отказ
//                                                от ложного успеха;
//   reconcileLayout(project, result) → отчёт     сверка после рендера.
// RequestResult: { status, requestId, version, creditsUsed, creditsRemaining,
//                  image, contentViolation, errorCode, retryable, причина }.
//
// Честные границы (по ТЗ, §4):
//   - редактирование и весь локальный цикл не требуют сети и токена;
//   - HTTP 200 ≠ успех: мок вообще не делает запросов — и не делает вид;
//   - неизвестных полей wire нет: контракт один, чужая схема — честный отказ
//     (расширения — только с новым schemaVersion);
//   - bbox нормализованы 0..1 в локальной модели; выход за границу — отказ.
//
// Экспорт: только ESM; импортов нет (адаптер самодостаточен, 0 зависимостей).

export const ver = 'reve-adapter/0.1';
export const LEDGER_SCHEMA = 'ladom.reve.v1';
export const СХЕМА_ПРОЕКТА = 'ladom.project.v1';
export const СХЕМА_WIRE = 'reve.layout.mock/0.1';
export const МАКС_РЕГИОНОВ = 64;

// FNV-1a (32 бита) поверх сериализованного layout — детерминированный requestId
// без часов и случайности: один вход → один идентификатор, байт-в-байт.
function фнв1а(строка) {
  let х = 0x811c9dc5;
  for (let i = 0; i < строка.length; i++) {
    х ^= строка.charCodeAt(i);
    х = (х + ((х << 1) + (х << 4) + (х << 7) + (х << 8) + (х << 24))) >>> 0;
  }
  return х.toString(16).padStart(8, '0');
}

// ---------------------------------------------------------------------------
// ВАЛИДАЦИЯ ПРОЕКТА. Ничего не чинится молча: беда — честный отказ с причиной.
// ---------------------------------------------------------------------------
export function валидироватьПроект(project) {
  if (!project || typeof project !== 'object' || Array.isArray(project)) {
    return { ok: false, причина: 'project ожидается объектом' };
  }
  if (project.schemaVersion !== СХЕМА_ПРОЕКТА) {
    return { ok: false, причина: `schemaVersion ожидается "${СХЕМА_ПРОЕКТА}", получено ${JSON.stringify(project.schemaVersion ?? null)}` };
  }
  const холст = project.canvas;
  if (!холст || typeof холст !== 'object' || Array.isArray(холст)) {
    return { ok: false, причина: 'project.canvas ожидается объектом' };
  }
  if (!Number.isFinite(холст.width) || !Number.isFinite(холст.height) || холст.width <= 0 || холст.height <= 0) {
    return { ok: false, причина: 'canvas.width/height ожидаются положительными числами' };
  }
  if (!Array.isArray(project.regions)) {
    return { ok: false, причина: 'project.regions ожидается массивом' };
  }
  if (project.regions.length > МАКС_РЕГИОНОВ) {
    return { ok: false, причина: `регионов ${project.regions.length} — больше ${МАКС_РЕГИОНОВ}` };
  }
  const виденные = new Set();
  for (let i = 0; i < project.regions.length; i++) {
    const r = project.regions[i];
    const где = `regions[${i}]`;
    if (!r || typeof r !== 'object' || Array.isArray(r)) {
      return { ok: false, причина: `${где} ожидается объектом` };
    }
    if (typeof r.id !== 'string' || !r.id) {
      return { ok: false, причина: `${где}.id ожидается непустой строкой` };
    }
    if (виденные.has(r.id)) {
      return { ok: false, причина: `${где}.id "${r.id}" повторяется` };
    }
    виденные.add(r.id);
    if (typeof r.prompt !== 'string' || !r.prompt.trim()) {
      return { ok: false, причина: `${где} ("${r.id}").prompt ожидается непустой строкой` };
    }
    const b = r.bbox;
    if (!b || typeof b !== 'object' || Array.isArray(b)) {
      return { ok: false, причина: `${где} ("${r.id}").bbox ожидается объектом` };
    }
    const поля = [['x', b.x], ['y', b.y], ['width', b.width], ['height', b.height]];
    for (const [имя, значение] of поля) {
      if (!Number.isFinite(значение)) {
        return { ok: false, причина: `${где} ("${r.id}").bbox.${имя} ожидается числом, получено ${JSON.stringify(значение ?? null)}` };
      }
      if (значение < 0 || значение > 1) {
        return { ok: false, причина: `${где} ("${r.id}").bbox.${имя}=${значение} вне диапазона 0..1 (локальная модель нормализована)` };
      }
    }
    if (b.width <= 0 || b.height <= 0) {
      return { ok: false, причина: `${где} ("${r.id}").bbox.width/height ожидаются положительными` };
    }
    if (r.locked !== undefined && typeof r.locked !== 'boolean') {
      return { ok: false, причина: `${где} ("${r.id}").locked ожидается boolean или отсутствовать` };
    }
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// PROJECT → WIRE. Неизвестных полей в wire нет: контракт один.
// ---------------------------------------------------------------------------
export function createLayout(project) {
  const вер = валидироватьПроект(project);
  if (!вер.ok) throw new TypeError(`reve-adapter: createLayout — ${вер.причина}`);
  return {
    schemaVersion: СХЕМА_WIRE,
    title: project.title === undefined ? null : String(project.title),
    canvas: { width: Number(project.canvas.width), height: Number(project.canvas.height), aspectRatio: project.canvas.aspectRatio === undefined ? null : String(project.canvas.aspectRatio) },
    regions: project.regions.map((r) => ({
      id: r.id,
      label: r.label === undefined ? null : String(r.label),
      prompt: r.prompt,
      bbox: { x: Number(r.bbox.x), y: Number(r.bbox.y), width: Number(r.bbox.width), height: Number(r.bbox.height) },
      zIndex: r.zIndex === undefined ? null : Number(r.zIndex),
      locked: r.locked === true,
    })),
  };
}

// ---------------------------------------------------------------------------
// WIRE → PROJECT. Импорт не исполняет код: только структура и лимиты.
// ---------------------------------------------------------------------------
export function extractLayout(wire) {
  if (!wire || typeof wire !== 'object' || Array.isArray(wire)) {
    throw new TypeError('reve-adapter: extractLayout — wire ожидается объектом');
  }
  if (wire.schemaVersion !== СХЕМА_WIRE) {
    throw new TypeError(`reve-adapter: extractLayout — schemaVersion ожидается "${СХЕМА_WIRE}", получено ${JSON.stringify(wire.schemaVersion ?? null)}; чужие схемы не угадываются`);
  }
  if (!wire.canvas || typeof wire.canvas !== 'object' || Array.isArray(wire.canvas) || !Array.isArray(wire.regions)) {
    throw new TypeError('reve-adapter: extractLayout — wire.canvas объект и wire.regions массив обязательны');
  }
  const проект = {
    schemaVersion: СХЕМА_ПРОЕКТА,
    title: wire.title === undefined || wire.title === null ? undefined : String(wire.title),
    canvas: {
      width: Number(wire.canvas.width),
      height: Number(wire.canvas.height),
      aspectRatio: wire.canvas.aspectRatio === undefined || wire.canvas.aspectRatio === null ? undefined : String(wire.canvas.aspectRatio),
    },
    regions: wire.regions.map((r) => ({
      id: String(r && r.id),
      label: !r || r.label === undefined || r.label === null ? undefined : String(r.label),
      prompt: String(r && r.prompt),
      bbox: { x: Number(r.bbox && r.bbox.x), y: Number(r.bbox && r.bbox.y), width: Number(r.bbox && r.bbox.width), height: Number(r.bbox && r.bbox.height) },
      zIndex: !r || r.zIndex === undefined || r.zIndex === null ? undefined : Number(r.zIndex),
      locked: r.locked === true,
    })),
  };
  const вер = валидироватьПроект(проект);
  if (!вер.ok) throw new TypeError(`reve-adapter: extractLayout — ${вер.причина}`);
  return проект;
}

// ---------------------------------------------------------------------------
// РЕНДЕР (МОК). Токена нет — честный конверт с названной причиной; детерминизм
// полный: один проект → один requestId (FNV-1a wire), никаких часов.
// ---------------------------------------------------------------------------
export function renderLayout(project) {
  const вер = валидироватьПроект(project);
  if (!вер.ok) {
    return {
      status: 'invalid', requestId: null, version: ver,
      creditsUsed: 0, creditsRemaining: null, image: null,
      contentViolation: false, errorCode: 'INVALID_PAYLOAD', retryable: false,
      причина: вер.причина,
    };
  }
  const wire = createLayout(project);
  const requestId = 'mock-' + фнв1а(JSON.stringify(wire));
  return {
    status: 'mock', requestId, version: ver,
    creditsUsed: 0, creditsRemaining: null,
    image: null, contentViolation: false,
    errorCode: 'MOCK_NO_TOKEN', retryable: true,
    причина: 'MOCK (решение владельца 2026-10-13: «заводим mock и двигаем адаптер без них»): токена Reve нет, сети нет — рендер не выполнялся и не притворялся выполненным; layout прошёл полную валидацию и готов к отправке, когда токен придёт',
  };
}

// ---------------------------------------------------------------------------
// СВЕРКА ПОСЛЕ РЕНДЕРА. На моке — честный отчёт: сверять не с чем.
// ---------------------------------------------------------------------------
export function reconcileLayout(project, result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new TypeError('reve-adapter: reconcileLayout — result ожидается объектом RequestResult');
  }
  const вер = валидироватьПроект(project);
  if (!вер.ok) throw new TypeError(`reve-adapter: reconcileLayout — ${вер.причина}`);
  if (result.status === 'mock') {
    return { сверено: false, причина: 'рендер был моком — сверять не с чем; проект не изменён', projectId: null };
  }
  if (result.status !== 'ok' || !result.requestId) {
    return { сверено: false, причина: `результат без успеха: status=${JSON.stringify(result.status ?? null)}`, projectId: null };
  }
  // настоящий путь: сверка регионов с ответом Reve — войдёт с токеном (тот же контракт)
  return { сверено: false, причина: 'настоящий reconcile появится вместе с pinned SDK (строка Л1, 👤 токен)', projectId: null };
}

export function режим() {
  return 'mock: 0 сети, 0 токена, 0 часов — форма и валидация работают, рендер честно не притворяется';
}
