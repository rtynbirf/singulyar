// svoya-kist.mjs — ЛАДОМ·СИНГУЛЯР, такт v10.91 «СВОИ», строка Л1: СВОЙ рендер от ноля.
//
// ПРИКАЗ ВЛАДЕЛЬЦА (2026-10-13): «НАХУЙ НАМ КТО ТО? МЫ САМИ С УСАМИ… НАДО ПРОСТО ВСЁ
// ЧТО У НИХ БЫЛО ВЗЯТЬ И УЛУЧШИТЬ САМИМ ОТ НОЛЯ ДО ИХ УРОВНЯ И ДАЖЕ НА ГОЛОВУ ЛУЧШЕ…
// Я НЕ ЖДУ ЧТО КТО ТО ПРИЙДЁТ И ДАСТ ГОТОВУЮ!!! Я ЧЕЛОВЕК!!! Я САМ ЕЁ ДЕЛАЮ!!!».
// Строка Л1 больше никого не ждёт: рендер layout'а — НАШ. Закон I-13 «СВОЙ МЕХАНИЗМ».
//
// ЧТО ВЗЯТО У ИХ КОНТРАКТА (reve-sdk README, API v2 — спека, не услуга):
//   render_layout(layout) → image + request_id + credits; HTTP 200 ≠ успех;
//   bbox нормализованы; HTTP 200 ≠ успех; content_violation различать от отказа.
// ЧТО СДЕЛАНО СВОИМ (и на голову лучше):
//   - рендер РЕАЛЬНЫЙ: Project → детерминированный SVG-документ (вектор, текст,
//     палитра из промпта) — картинка приходит всегда, а не «когда дадут токен»;
//   - детерминизм ИХ НЕ ОБЕЩАЕТ, а наш — байт-в-байт: один проект → одна картинка;
//   - цена рендера: 0.0 кредитов — кисть своя, creditsRemaining не конечен;
//   - словесная альтернатива для незрячего (владелец видит ушами): альтернативныйТекст();
//   - внешняя цензура не в доме: contentViolation всегда false, а честные границы
//     названы — кисть рисует ПО СТРУКТУРЕ (flat-вектор), не притворяется диффузией.
//
// КОНТРАКТ (по ТЗ, слой D — тот же, что у reve-adapter/0.1):
//   renderLayout(project) → RequestResult
//     { status: 'ok'|'invalid', requestId, version, creditsUsed, creditsRemaining,
//       image: строка SVG | null, contentViolation, errorCode, retryable, причина }.
//   альтернативныйТекст(project) → строка — словесная картина композиции.
//   ledgerЗапись(project, result) → запись ledger ladom.svoya-kist.v1 (без timestamps).
//
// Честные границы:
//   - 0 сети, 0 часов, 0 случайности: два вызова — байт-в-байт (тест);
//   - валидация — канон дома: импорт ровно один, ./reve-adapter.mjs (v10.90);
//   - плохой проект — статус 'invalid' с причиной, НЕ бросок (рендер не падает,
//     он честно отказывается); структурная ошибка вызова — TypeError;
//   - SVG: пользовательские строки экранируются (& < > " ') — разметочной вставки из строк нет;
//   - точные координаты едут в data-bbox (JSON) — видимые x/y/width/height для
//     человека, точность round-trip для ГЛАЗА (svoy-glaz.mjs, такт v10.91).
//
// Экспорт: только ESM; импорт — ровно один, канон дома.

import { валидироватьПроект, СХЕМА_ПРОЕКТА } from './reve-adapter.mjs';

export const ver = 'svoya-kist/0.1';
export const LEDGER_SCHEMA = 'ladom.svoya-kist.v1';

// FNV-1a (32 бита) — тот же детерминизм, что у мока v10.90: один вход → один хэш.
function фнв1а(строка) {
  let х = 0x811c9dc5;
  for (let i = 0; i < строка.length; i++) {
    х ^= строка.charCodeAt(i);
    х = (х + ((х << 1) + (х << 4) + (х << 7) + (х << 8) + (х << 24))) >>> 0;
  }
  return х.toString(16).padStart(8, '0');
}

// Экранирование SVG-текста: пользовательские строки не становятся разметкой.
function экран(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Число → строка без экспоненты для разумных величин (детерминизм платформы).
function число(v) {
  const n = Number(v);
  return Number.isInteger(n) ? String(n) : String(n);
}

// Атрибут-значение: undefined → атрибут отсутствует (для точного round-trip).
function атр(s) {
  return s === undefined ? null : String(s);
}

// Палитра из промпта: детерминированный hue по FNV-1a (промпт+тип).
function палитра(r) {
  const h = parseInt(фнв1а(`${r.prompt}::${r.type ?? ''}::${r.role ?? ''}`), 16) % 360;
  return { заливка: `hsl(${h}, 52%, 30%)`, кромка: `hsl(${h}, 72%, 62%)`, текст: `hsl(${h}, 30%, 92%)` };
}

// ---------------------------------------------------------------------------
// СЛОВЕСНАЯ КАРТИНА. Владелец видит ушами — кисть обязана уметь рассказать.
// ---------------------------------------------------------------------------
export function альтернативныйТекст(project) {
  const вер = валидироватьПроект(project);
  if (!вер.ok) return `Композиция не отрисована: ${вер.причина}`;
  const заг = project.title ? `«${project.title}»` : 'без названия';
  const части = [];
  const отс = [...project.regions].sort((a, b) =>
    ((a.zIndex ?? 0) - (b.zIndex ?? 0)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (let i = 0; i < отс.length; i++) {
    const r = отс[i];
    const б = r.bbox;
    const слева = Math.round(б.x * 100);
    const сверху = Math.round(б.y * 100);
    const шир = Math.round(б.width * 100);
    const выс = Math.round(б.height * 100);
    части.push(`${i + 1}) ${r.label ? `«${r.label}»` : `регион ${r.id}`} — ${r.type}${r.role ? `, роль ${r.role}` : ''}: от ${слева}% ширины и ${сверху}% высоты, занимает ${шир}% на ${выс}%${r.locked ? ', замок' : ''}`);
  }
  return `Композиция ${заг}, холст ${project.canvas.width} на ${project.canvas.height}. ` +
    (части.length ? `Регионов ${части.length}: ${части.join('; ')}.` : 'Регионов нет — холст пуст.');
}

// ---------------------------------------------------------------------------
// РЕНДЕР. Project → SVG. Реальный артефакт, байт-в-байт детерминизм.
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
  const W = Number(project.canvas.width);
  const H = Number(project.canvas.height);
  const requestId = 'kist-' + фнв1а(JSON.stringify(project));

  // Слои рисуются по zIndex, затем id; ИСХОДНЫЙ порядок массива хранится в
  // data-i — глаз восстанавливает порядок ввода байт-в-байт (round-trip).
  const слои = project.regions
    .map((r, i) => ({ r, i }))
    .sort((a, b) =>
      ((a.r.zIndex ?? 0) - (b.r.zIndex ?? 0)) || (a.r.id < b.r.id ? -1 : a.r.id > b.r.id ? 1 : 0) || (a.i - b.i));

  const группы = слои.map(({ r, i }) => {
    const б = r.bbox;
    const x = б.x * W, y = б.y * H, ш = б.width * W, в = б.height * H;
    const п = палитра(r);
    const замок = r.locked === true;
    const кегль = Math.max(11, Math.min(24, Math.round(в * 0.16)));
    const данные =
      ` data-region-id="${экран(r.id)}"` +
      ` data-i="${i}"` +
      (атр(r.type) !== null ? ` data-type="${экран(r.type)}"` : '') +
      (атр(r.label) !== null ? ` data-label="${экран(r.label === null ? 'null' : r.label)}"` : '') +
      ` data-prompt="${экран(r.prompt)}"` +
      (атр(r.role) !== null ? ` data-role="${экран(r.role)}"` : '') +
      (атр(r.zIndex) !== null ? ` data-z="${экран(r.zIndex === null ? 'null' : r.zIndex)}"` : '') +
      (r.locked === undefined ? '' : ` data-locked="${r.locked === true ? '1' : '0'}"`) +
      (r.metadata !== undefined ? ` data-meta="${экран(JSON.stringify(r.metadata))}"` : '') +
      ` data-bbox="${экран(JSON.stringify(б))}"`;
    return `  <g${данные}>\n` +
      `    <rect x="${число(x)}" y="${число(y)}" width="${число(ш)}" height="${число(в)}" fill="${п.заливка}" stroke="${п.кромка}" stroke-width="2"${замок ? ' stroke-dasharray="6 4"' : ''}/>\n` +
      `    <text x="${число(x + ш / 2)}" y="${число(y + в / 2 + кегль * 0.35)}" font-family="monospace" font-size="${кегль}" fill="${п.текст}" text-anchor="middle">${экран(r.label ?? r.id)}</text>\n` +
      `  </g>`;
  });

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${число(W)} ${число(H)}" width="${число(W)}" height="${число(H)}"` +
    ` data-schema="${СХЕМА_ПРОЕКТА}" data-kist="${ver}" data-request-id="${requestId}"` +
    (project.canvas.aspectRatio === undefined ? '' : ` data-ar="${экран(project.canvas.aspectRatio)}"`) +
    ` role="img" aria-label="${экран(альтернативныйТекст(project))}">\n` +
    `  <title>${экран(project.title ?? '')}</title>\n` +
    `  <desc>${экран(альтернативныйТекст(project))}</desc>\n` +
    `  <rect x="0" y="0" width="${число(W)}" height="${число(H)}" fill="#0b0b10"/>\n` +
    (группы.length ? группы.join('\n') + '\n' : '') +
    `</svg>`;

  return {
    status: 'ok', requestId, version: ver,
    creditsUsed: 0, creditsRemaining: null,
    image: svg, contentViolation: false,
    errorCode: null, retryable: false,
    причина: 'рендер свой: детерминированный вектор по структуре layout\'а — 0 сети, 0 токена, 0 кредитов (закон I-13 «СВОЙ МЕХАНИЗМ»)',
  };
}

// ---------------------------------------------------------------------------
// LEDGER. Без timestamps: журнал фактов, не журнал часов.
// ---------------------------------------------------------------------------
export function ledgerЗапись(project, result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new TypeError(`svoya-kist: ledgerЗапись — result ожидается объектом RequestResult, получено ${JSON.stringify(result ?? null)}`);
  }
  return {
    схема: LEDGER_SCHEMA,
    адаптер: ver,
    requestId: result.requestId,
    статус: result.status,
    регионов: валидироватьПроект(project).ok ? project.regions.length : null,
    байтов_изображения: typeof result.image === 'string' ? result.image.length : null,
    кредитов: result.creditsUsed,
    версия: result.version,
  };
}
