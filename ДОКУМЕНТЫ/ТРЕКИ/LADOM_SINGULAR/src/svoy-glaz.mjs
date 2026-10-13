// svoy-glaz.mjs — ЛАДОМ·СИНГУЛЯР, такт v10.91 «СВОИ», строка Л1: СВОЙ глаз от ноля.
//
// ПРИКАЗ ВЛАДЕЛЬЦА (2026-10-13): «ДЕЛАЙ ЭТОТ МЕХАНИЗМ САМ… МЫ САМИ МОЖЕМ СДЕЛАТЬ ТО
// ЧТО ОНИ СДЕЛАЛИ… ОТ НОЛЯ ДО ИХ УРОВНЯ И ДАЖЕ НА ГОЛОВУ ЛУЧШЕ». Закон I-13.
//
// ЧТО ВЗЯТО У ИХ КОНТРАКТА (reve-sdk README, API v2 — спека, не услуга):
//   extract_layout(image) → layout;   reconcile_layout(оригинал, правка) → layout;
//   команды add / shift / remove / place / keep / change на layout'е;
//   тип Bbox x0/y0/x1/y1, нормализованы [0,1] — мост туда-обратно.
// ЧТО СДЕЛАНО СВОИМ (и на голову лучше):
//   - ГЛАЗ видит СВОЮ картинку: extractLayout разбирает SVG кисти svoya-kist/0.1
//     обратно в Project — round-trip байт-в-байт; чужая картинка — честный отказ,
//     не угадывание (их extract от растра — чёрный ящик; наш — прозрачный парсер);
//   - reconcileLayout: честная геометрическая сверка «оригинал vs правка» —
//     добавлен/удалён/сдвинут/изменён-размер/переименован/изменён-промпт/…;
//     итог отдаёт МАСКУ изменённых разблокированных id — встаёт в их repair-agent;
//   - применитьКоманду: их шесть команд — детерминированной машиной состояний,
//     замки не снимаются никогда (закон дома «замки не чинятся»);
//   - мост toReveWire/fromReveWire: их форма (x0/y0/x1/y1) ↔ наш Project —
//     экспортный контракт; production-совместимость не утверждается (их же
//     правило аудита: без pinned SDK заявлений не делать).
//
// Честные границы:
//   - 0 сети, 0 часов, 0 случайности: два вызова — байт-в-байт (тест);
//   - импорт ровно один — канон дома ./reve-adapter.mjs (валидатор проекта);
//   - extract читает только СВОЙ формат (data-kist="svoya-kist/0.1" +
//     data-schema) — чужой SVG с той же формой атрибутов читается по структуре,
//     рваный/чужой — TypeError с причиной;
//   - команды не мутируют вход; семантическая беда (замок, неизвестный id,
//     выход за 0..1) — { ok: false, отказ }; структурная — TypeError.
//
// Экспорт: только ESM.

import { валидироватьПроект, СХЕМА_ПРОЕКТА } from './reve-adapter.mjs';

export const ver = 'svoy-glaz/0.1';
export const ОТЧЁТ_СХЕМА = 'ladom.glaz-reconcile.v1';
export const WIRE_СХЕМА = 'ladom.reve-bridge.v1';

// ---------------------------------------------------------------------------
// ГЛАЗ: SVG кисти → Project. Round-trip байт-в-байт с renderLayout (v10.91).
// ---------------------------------------------------------------------------
const атрибут = (блок, имя) => {
  const m = блок.match(new RegExp(`${имя}="([^"]*)"`));
  return m ? m[1] : undefined;
};

// Обратное экранирование кисти (экран в svoya-kist.mjs): сущности → байты.
// Порядок важен: &amp; — последний (кодирует литеральный амперсанд).
// undefined на входе — undefined на выходе (атрибут отсутствует — поле отсутствует).
function разэкран(s) {
  if (s === undefined) return undefined;
  return String(s)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function разборЗначения(сырое) {
  if (сырое === undefined) return undefined;
  return сырое === 'null' ? null : сырое;
}

export function extractLayout(svg) {
  if (typeof svg !== 'string' || !svg) {
    throw new TypeError(`svoy-glaz: extractLayout — ожидается строка SVG, получено ${typeof svg}`);
  }
  if (!svg.includes(`data-kist="svoya-kist/0.1"`)) {
    throw new TypeError('svoy-glaz: extractLayout — это не картинка нашей кисти (нет data-kist="svoya-kist/0.1"); чужое не угадывается');
  }
  if (!svg.includes(`data-schema="${СХЕМА_ПРОЕКТА}"`)) {
    throw new TypeError(`svoy-glaz: extractLayout — схема не ${СХЕМА_ПРОЕКТА}; чужая схема не угадывается`);
  }
  const viewBox = svg.match(/viewBox="0 0 ([0-9.eE+-]+) ([0-9.eE+-]+)"/);
  if (!viewBox) throw new TypeError('svoy-glaz: extractLayout — viewBox не найден; формат кисти нарушен');
  const ширина = Number(viewBox[1]);
  const высота = Number(viewBox[2]);
  if (!Number.isFinite(ширина) || !Number.isFinite(высота) || ширина <= 0 || высота <= 0) {
    throw new TypeError(`svoy-glaz: extractLayout — размеры холста (${viewBox[1]}×${viewBox[2]}) не положительные числа`);
  }
  const титул = svg.match(/<title>([\s\S]*?)<\/title>/);
  const ар = атрибут(svg, 'data-ar');

  const регионыПары = [];
  const куски = svg.split('<g ').slice(1);
  for (const кусок of куски) {
    const голова = кусок.slice(0, кусок.indexOf('>'));
    const id = атрибут(голова, 'data-region-id');
    const бокс = атрибут(голова, 'data-bbox');
    if (id === undefined || бокс === undefined) {
      throw new TypeError('svoy-glaz: extractLayout — группа без data-region-id/data-bbox; формат кисти нарушен');
    }
    const порядокСыр = атрибут(голова, 'data-i');
    if (порядокСыр === undefined || !/^\d+$/.test(порядокСыр)) {
      throw new TypeError('svoy-glaz: extractLayout — группа без data-i; формат кисти нарушен');
    }
    const bbox = JSON.parse(разэкран(бокс));
    // Канонический порядок полей региона (ТЗ 5.2): id, type?, label?, prompt,
    // role?, bbox, zIndex?, locked?, metadata? — round-trip байт-в-байт.
    const регион = { id: разборЗначения(разэкран(id)) };
    const тип = разборЗначения(разэкран(атрибут(голова, 'data-type')));
    if (тип !== undefined) регион.type = тип;
    const label = разборЗначения(разэкран(атрибут(голова, 'data-label')));
    if (label !== undefined) регион.label = label;
    регион.prompt = разборЗначения(разэкран(атрибут(голова, 'data-prompt')));
    const роль = разборЗначения(разэкран(атрибут(голова, 'data-role')));
    if (роль !== undefined) регион.role = роль;
    регион.bbox = bbox;
    const z = разборЗначения(атрибут(голова, 'data-z'));
    if (z !== undefined) регион.zIndex = z === null ? null : Number(z);
    const lockedСыр = атрибут(голова, 'data-locked');
    if (lockedСыр !== undefined) регион.locked = lockedСыр === '1';
    const мета = атрибут(голова, 'data-meta');
    if (мета !== undefined) регион.metadata = JSON.parse(разэкран(мета));
    регионыПары.push({ i: Number(порядокСыр), регион });
  }
  регионыПары.sort((a, b) => a.i - b.i); // исходный порядок массива проекта
  const регионы = регионыПары.map((п) => п.регион);

  // Канонический порядок полей проекта (ТЗ 5.2): schemaVersion, title?,
  // canvas{width,height,aspectRatio?}, regions — round-trip байт-в-байт.
  const проект = { schemaVersion: СХЕМА_ПРОЕКТА };
  if (титул && титул[1] !== '') проект.title = разэкран(титул[1]);
  проект.canvas = { width: ширина, height: высота };
  if (ар !== undefined) проект.canvas.aspectRatio = разборЗначения(разэкран(ар));
  проект.regions = регионы;
  const вер = валидироватьПроект(проект);
  if (!вер.ok) throw new TypeError(`svoy-glaz: extractLayout — разобранное не проект: ${вер.причина}`);
  return проект;
}

// ---------------------------------------------------------------------------
// СВЕРКА (их reconcile_layout). Геометрия и поля — честно, детерминированно.
// ---------------------------------------------------------------------------
const sameBbox = (a, b) => a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;

export function reconcileLayout(оригинал, правка) {
  for (const [имя, п] of [['оригинал', оригинал], ['правка', правка]]) {
    const вер = валидироватьПроект(п);
    if (!вер.ok) throw new TypeError(`svoy-glaz: reconcileLayout — ${имя}: ${вер.причина}`);
  }
  const было = new Map(оригинал.regions.map((r) => [r.id, r]));
  const стало = new Map(правка.regions.map((r) => [r.id, r]));
  const шаги = [];
  const маска = [];
  const idы = [...new Set([...было.keys(), ...стало.keys()])].sort();
  for (const id of idы) {
    const а = было.get(id);
    const б = стало.get(id);
    if (!б) { шаги.push({ id, изменения: ['удалён'] }); маска.push(id); continue; }
    if (!а) { шаги.push({ id, изменения: ['добавлен'] }); маска.push(id); continue; }
    const изм = [];
    if (!sameBbox(а.bbox, б.bbox)) {
      if (а.bbox.width !== б.bbox.width || а.bbox.height !== б.bbox.height) изм.push('изменён-размер');
      if (а.bbox.x !== б.bbox.x || а.bbox.y !== б.bbox.y) изм.push('сдвинут');
    }
    if ((а.label ?? null) !== (б.label ?? null)) изм.push('переименован');
    if (а.prompt !== б.prompt) изм.push('изменён-промпт');
    if ((а.type ?? null) !== (б.type ?? null)) изм.push('изменён-тип');
    if ((а.role ?? null) !== (б.role ?? null)) изм.push('изменён-роль');
    if ((а.zIndex ?? null) !== (б.zIndex ?? null)) изм.push('изменён-слой');
    if ((а.locked === true) !== (б.locked === true)) изм.push('изменён-замок');
    if (изм.length) {
      шаги.push({ id, изменения: изм });
      if (б.locked !== true) маска.push(id); // замки в маску не входят — их не чинят никогда
    }
  }
  return {
    ver, схема: ОТЧЁТ_СХЕМА,
    сверено: true,
    изменений: шаги.length,
    шаги,
    маска: маска.sort(),
  };
}

export function маскаИзОтчёта(отчёт) {
  if (!отчёт || typeof отчёт !== 'object' || Array.isArray(отчёт) || отчёт.схема !== ОТЧЁТ_СХЕМА) {
    throw new TypeError(`svoy-glaz: маскаИзОтчёта — ожидается отчёт ${ОТЧЁТ_СХЕМА}, получено ${JSON.stringify(отчёт && отчёт.схема ? отчёт.схема : typeof отчёт)}`);
  }
  return [...отчёт.маска];
}

// ---------------------------------------------------------------------------
// КОМАНДЫ (их add/shift/remove/place/keep/change) — детерминированная машина.
// Семантическая беда → { ok: false, отказ }; структурная → TypeError; вход чист.
// ---------------------------------------------------------------------------
export function применитьКоманду(project, команда) {
  const вер = валидироватьПроект(project);
  if (!вер.ok) throw new TypeError(`svoy-glaz: применитьКоманду — project: ${вер.причина}`);
  if (!команда || typeof команда !== 'object' || Array.isArray(команда)) {
    throw new TypeError(`svoy-glaz: применитьКоманду — команда ожидается объектом, получено ${JSON.stringify(команда ?? null)}`);
  }
  const op = команда.op;
  if (typeof op !== 'string' || !['add', 'shift', 'remove', 'place', 'keep', 'change'].includes(op)) {
    return { ok: false, проект: project, отказ: `op "${String(op ?? '')}" — не из шести команд (add|shift|remove|place|keep|change)` };
  }

  const индекс = (id) => project.regions.findIndex((r) => r.id === id);

  if (op === 'add') {
    const р = команда.регион;
    if (!р || typeof р !== 'object' || Array.isArray(р)) {
      return { ok: false, проект: project, отказ: 'add: регион ожидается объектом' };
    }
    if (typeof р.id !== 'string' || !р.id) return { ok: false, проект: project, отказ: 'add: id ожидается непустой строкой' };
    if (индекс(р.id) >= 0) return { ok: false, проект: project, отказ: `add: id "${р.id}" уже в проекте — дубль не добавляется` };
    if (project.regions.length >= 64) return { ok: false, проект: project, отказ: 'add: лимит 64 региона (канон валидатора) исчерпан' };
    const проба = { ...project, regions: [...project.regions, JSON.parse(JSON.stringify({ id: р.id, prompt: '', bbox: { x: 0, y: 0, width: 0.1, height: 0.1 }, ...р }))] };
    const вер2 = валидироватьПроект(проба);
    if (!вер2.ok) return { ok: false, проект: project, отказ: `add: ${вер2.причина}` };
    return { ok: true, проект: проба, применено: 'add', id: р.id };
  }

  if (op === 'remove' || op === 'shift' || op === 'place' || op === 'change' || op === 'keep') {
    const id = команда.id;
    if (typeof id !== 'string' || !id) return { ok: false, проект: project, отказ: `${op}: id ожидается непустой строкой` };
    const i = индекс(id);
    if (i < 0) return { ok: false, проект: project, отказ: `${op}: регион "${id}" не найден` };
    const р = project.regions[i];
    if (op === 'keep') return { ok: true, проект: project, применено: 'keep', id, отмечено: 'регион без изменений — намерение держать' };

    if (р.locked === true && op !== 'change') {
      return { ok: false, проект: project, отказ: `${op}: регион "${id}" под замком — замки не снимаются и не двигаются никогда` };
    }
    if (op === 'remove') {
      const проект2 = { ...project, regions: project.regions.filter((r) => r.id !== id) };
      return { ok: true, проект: проект2, применено: 'remove', id };
    }
    if (op === 'shift') {
      const { dx, dy } = команда;
      if (typeof dx !== 'number' || !Number.isFinite(dx) || typeof dy !== 'number' || !Number.isFinite(dy)) {
        return { ok: false, проект: project, отказ: `shift: dx/dy ожидаются конечными числами, получено ${JSON.stringify(dx)}, ${JSON.stringify(dy ?? null)}` };
      }
      const б = { x: р.bbox.x + dx, y: р.bbox.y + dy, width: р.bbox.width, height: р.bbox.height };
      if (б.x < 0 || б.y < 0 || б.x + б.width > 1 || б.y + б.height > 1) {
        return { ok: false, проект: project, отказ: `shift: регион "${id}" выйдет за холст (0..1) — молча не чинится, откажись или place` };
      }
      const проект2 = { ...project, regions: project.regions.map((r, k) => (k === i ? { ...r, bbox: б } : r)) };
      return { ok: true, проект: проект2, применено: 'shift', id };
    }
    if (op === 'place') {
      const б = команда.bbox;
      if (!б || typeof б !== 'object' || Array.isArray(б)) return { ok: false, проект: project, отказ: 'place: bbox ожидается объектом' };
      const проба = { ...project, regions: project.regions.map((r, k) => (k === i ? { ...r, bbox: б } : r)) };
      const вер3 = валидироватьПроект(проба);
      if (!вер3.ok) return { ok: false, проект: project, отказ: `place: ${вер3.причина}` };
      return { ok: true, проект: проба, применено: 'place', id };
    }
    if (op === 'change') {
      const поля = команда.поля;
      if (!поля || typeof поля !== 'object' || Array.isArray(поля)) return { ok: false, проект: project, отказ: 'change: поля ожидается объектом' };
      const неТе = Object.keys(поля).filter((k) => !['label', 'prompt', 'role', 'type', 'zIndex', 'locked'].includes(k));
      if (неТе.length) return { ok: false, проект: project, отказ: `change: поля ${неТе.join(', ')} не меняются командой change (bbox — место команды place)` };
      const проба = { ...project, regions: project.regions.map((r, k) => (k === i ? { ...r, ...JSON.parse(JSON.stringify(поля)) } : r)) };
      const вер3 = валидироватьПроект(проба);
      if (!вер3.ok) return { ok: false, проект: project, отказ: `change: ${вер3.причина}` };
      return { ok: true, проект: проба, применено: 'change', id };
    }
  }
  return { ok: false, проект: project, отказ: 'команда не распознана' };
}

// ---------------------------------------------------------------------------
// МОСТ: наш Project ↔ их форма (Bbox x0/y0/x1/y1, Region label/prompt/bbox).
// Экспортный контракт; production-совместимость не утверждается (их же правило).
// ---------------------------------------------------------------------------
export function toReveWire(project) {
  const вер = валидироватьПроект(project);
  if (!вер.ok) throw new TypeError(`svoy-glaz: toReveWire — ${вер.причина}`);
  return {
    schemaVersion: WIRE_СХЕМА,
    width: Number(project.canvas.width),
    height: Number(project.canvas.height),
    regions: project.regions.map((r) => ({
      label: r.label === undefined ? null : String(r.label),
      prompt: r.prompt,
      bbox: { x0: r.bbox.x, y0: r.bbox.y, x1: r.bbox.x + r.bbox.width, y1: r.bbox.y + r.bbox.height },
      region_type: null,
    })),
  };
}

export function fromReveWire(wire) {
  if (!wire || typeof wire !== 'object' || Array.isArray(wire)) {
    throw new TypeError(`svoy-glaz: fromReveWire — wire ожидается объектом, получено ${typeof wire}`);
  }
  if (wire.schemaVersion !== WIRE_СХЕМА) {
    throw new TypeError(`svoy-glaz: fromReveWire — schemaVersion ожидается "${WIRE_СХЕМА}", получено ${JSON.stringify(wire.schemaVersion ?? null)}; чужие схемы не угадываются`);
  }
  if (!Array.isArray(wire.regions)) {
    throw new TypeError('svoy-glaz: fromReveWire — wire.regions ожидается массивом');
  }
  const проект = {
    schemaVersion: СХЕМА_ПРОЕКТА,
    canvas: { width: Number(wire.width), height: Number(wire.height) },
    regions: wire.regions.map((r, i) => {
      if (!r || typeof r !== 'object' || !r.bbox || typeof r.bbox !== 'object') {
        throw new TypeError(`svoy-glaz: fromReveWire — regions[${i}] без bbox-объекта`);
      }
      const { x0, y0, x1, y1 } = r.bbox;
      for (const [имя, v] of [['x0', x0], ['y0', y0], ['x1', x1], ['y1', y1]]) {
        if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1) {
          throw new TypeError(`svoy-glaz: fromReveWire — regions[${i}].bbox.${имя}=${JSON.stringify(v ?? null)} не конечное число в 0..1`);
        }
      }
      const регион = { id: `r${String(i).padStart(2, '0')}`, prompt: String(r.prompt ?? ''), bbox: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } };
      if (r.label !== undefined && r.label !== null) регион.label = String(r.label);
      return регион;
    }),
  };
  const вер = валидироватьПроект(проект);
  if (!вер.ok) throw new TypeError(`svoy-glaz: fromReveWire — ${вер.причина}`);
  return проект;
}
