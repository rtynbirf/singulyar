// intent-seed-fikstura.mjs — ЛАДОМ·СИНГУЛЯР, такт v10.80 «ХВОСТЫ», тестовая фикстура для Л3 (не прод).
//
// КРИТЕРИЙ СТРОКИ: «из текстового описания собирается черновик регионов без сети».
//
// Что делает модуль:
//   parseIntent(text) — офлайн-лексические правила (словарь ru+en, детерминированный сид) →
//   черновик регионов, валидный под контракт Region из ТЗ (LADOM_SINGULAR_TZ_AND_ROADMAP.md §5.2:
//   id, type "visual"|"music"|"event", label, prompt, role, bbox 0..1, zIndex, locked).
//
//   toLayoutProject(parsed) — экспорт в формат 04_LAYOUT_EXAMPLE.json (schemaVersion
//   "ladom.project.v1"; в студийной схеме нет type/role/metadata — они честно снимаются).
//   toComposition(parsed) — экспорт в ladom.composition.v1 (полный Region + adapters).
//
// Честные границы:
//   - правила ЛЕКСИЧЕСКИЕ: словарь ограничен, всё непонятое попадает на полку unknown
//     («не понял: …») и НЕ выдумывается в регионы;
//   - сид детерминирован (FNV-1a от текста): один текст → один черновик;
//   - «слева/справа/центр/вверху/внизу» и «треть/половина/четверть» задают геометрию по
//     ЗАФИКСИРОВАННОЙ конвенции (описана ниже) — это черновик для человека, не истина;
//   - 0 сети: модуль не делает ни одного запроса и не импортирует ничего внешнего.

// ---------------------------------------------------------------------------
// Конвенция геометрии (зафиксирована, детерминирована):
//   - «фон»                → визуальный регион на весь кадр {0,0,1,1}, zIndex 0;
//   - «потолок»            → горизонтальная полоса: width=1, height=величина (default 0.25), y=0;
//   - «заголовок»          → полоса подписи: width=0.8, height=величина (default 0.16),
//                            x=(1-w)/2, y=снизу (1-h-0.08) или сверху (0.05) по привязке;
//   - прочие зоны          → width=величина (default из сетки варианта), height=width*0.75;
//                            x по горизонтальной привязке (left→0, right→1-w, center→(1-w)/2),
//                            y по вертикальной (top→0, bottom→1-h, центр→(1-h)/2);
//   - «музыка»             → music-регион-полоса {0,0.9,1,0.1}, role "melody", metadata.seed;
//   - «голос»              → event-регион-полоса {0,0.8,1,0.08}, role "voice";
//   - зоны без привязок    → раскладываются по сетке варианта (seed % 3), в порядке упоминания.
// ---------------------------------------------------------------------------

export const LAYOUT_SCHEMA = 'ladom.project.v1';
export const COMPOSITION_SCHEMA = 'ladom.composition.v1';

const MIN_SIZE = 0.02; // минимум живого валидатора ladom.composition.v1

// --- словарь (ru + en): только точные словоформы, без стемминга — детерминизм важнее охвата ---
const ZONES = {
  screen: {
    label: 'Экран', type: 'visual',
    match: ['экран', 'экрана', 'экране', 'экраном', 'экраны', 'экранов', 'экрану', 'screen', 'screens', 'display'],
    prompt: (d) => 'Экран: ' + d,
  },
  window: {
    label: 'Окно', type: 'visual',
    match: ['окно', 'окна', 'окне', 'окном', 'окон', 'окну', 'window', 'windows'],
    prompt: (d) => 'Окно: ' + d,
  },
  wall: {
    label: 'Стена', type: 'visual',
    match: ['стена', 'стены', 'стене', 'стену', 'стеной', 'стен', 'wall', 'walls'],
    prompt: (d) => 'Стена: ' + d,
  },
  table: {
    label: 'Стол', type: 'visual',
    match: ['стол', 'стола', 'столе', 'столом', 'столы', 'table', 'tables', 'desk'],
    prompt: (d) => 'Стол: ' + d,
  },
  ceiling: {
    label: 'Потолок', type: 'visual',
    match: ['потолок', 'потолка', 'потолке', 'потолком', 'потолки', 'ceiling', 'ceilings'],
    prompt: (d) => 'Потолок: ' + d,
  },
  title: {
    label: 'Область заголовка', type: 'visual',
    match: ['заголовок', 'заголовка', 'заголовке', 'заголовком', 'заголовки', 'title', 'headline', 'надпись', 'надписи'],
    prompt: (d) => 'Спокойное пустое место для заголовка (' + d + '); буквы не генерировать',
  },
  object: {
    label: 'Главный объект', type: 'visual',
    match: ['объект', 'объекта', 'объекте', 'объектом', 'объекты', 'герой', 'героя', 'hero', 'object', 'subject'],
    prompt: (d) => 'Один выразительный объект (' + d + '), мягкий свет, без букв и логотипов',
  },
};

const BACKGROUND = {
  key: 'background', label: 'Фон', type: 'visual',
  match: ['фон', 'фона', 'фоне', 'фоном', 'фоны', 'background', 'backdrop'],
  prompt: 'Фон: спокойная фактура на весь кадр, без текста',
};

const MUSIC = {
  key: 'music', label: 'Музыкальная дорожка', type: 'music', role: 'melody',
  match: ['музыка', 'музыки', 'музыке', 'музыкой', 'музыку', 'music', 'луп', 'loop'],
  prompt: 'Музыкальная дорожка (луп 4/4, пентатоника): см. src/music-region.mjs',
};

const VOICE = {
  key: 'voice', label: 'Голосовая дорожка', type: 'event', role: 'voice',
  match: ['голос', 'голоса', 'голосом', 'голосе', 'voice', 'речь'],
  prompt: 'События голоса/речи (адаптер speech)',
};

const POSITION = {
  left:   { match: ['слева', 'левее', 'лево', 'левая', 'левой', 'левую', 'левый', 'left'] },
  right:  { match: ['справа', 'правее', 'право', 'правая', 'правой', 'правую', 'правый', 'right'] },
  center: { match: ['центр', 'центре', 'центра', 'центру', 'center', 'middle'] },
  top:    { match: ['вверху', 'верх', 'верху', 'верхняя', 'верхней', 'верхнюю', 'верхний', 'сверху', 'top', 'above'] },
  bottom: { match: ['внизу', 'низ', 'низу', 'нижняя', 'нижней', 'нижнюю', 'нижний', 'снизу', 'bottom', 'below'] },
};

const QUANTITY = {
  third:   { value: 1 / 3, match: ['треть', 'трети', 'third', 'thirds'] },
  half:    { value: 0.5,   match: ['половина', 'половины', 'половине', 'половину', 'half'] },
  quarter: { value: 0.25,  match: ['четверть', 'четверти', 'quarter'] },
};

// служебные слова — НЕ попадают на полку «не понял»
const STOPWORDS = new Set([
  'и', 'в', 'на', 'по', 'за', 'под', 'над', 'у', 'к', 'с', 'со', 'от', 'до', 'для', 'при',
  'это', 'эта', 'этот', 'там', 'тут', 'здесь', 'пусть', 'кадр', 'кадра', 'кадре', 'кадром',
  'сцена', 'сцене', 'сцены', 'картинка', 'картинки', 'изображение', 'изображения', 'макет',
  'сделай', 'добавь', 'хочу', 'нужен', 'нужна', 'нужно', 'the', 'a', 'an', 'of', 'in', 'on',
  'at', 'to', 'with', 'and', 'or', 'is', 'are', 'frame', 'scene', 'image', 'layout',
  'обложка', 'обложки', 'теплый', 'теплая', 'спокойная', 'спокойный', 'область', 'области',
  'пустое', 'место',
]);

const DICT_ENTRIES = [
  ...Object.entries(ZONES).map(([key, z]) => ({ key, kind: 'zone', entry: z })),
  { key: BACKGROUND.key, kind: 'background', entry: BACKGROUND },
  { key: MUSIC.key, kind: 'music', entry: MUSIC },
  { key: VOICE.key, kind: 'voice', entry: VOICE },
  ...Object.entries(POSITION).map(([key, p]) => ({ key, kind: 'pos', entry: p })),
  ...Object.entries(QUANTITY).map(([key, q]) => ({ key, kind: 'qty', entry: q })),
];

const WORD_INDEX = new Map(); // словоформа → [{kind, key, entry}]
for (const { kind, key, entry } of DICT_ENTRIES) {
  for (const w of entry.match) {
    if (!WORD_INDEX.has(w)) WORD_INDEX.set(w, []);
    WORD_INDEX.get(w).push({ kind, key, entry });
  }
}

// --- детерминированный сид: FNV-1a 32 бита по UTF-8-байтам строки ---
export function hashSeed(str) {
  let h = 0x811c9dc5;
  const bytes = new TextEncoder().encode(String(str));
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

const round2 = (v) => Math.round(v * 100) / 100;

export function tokenize(text) {
  return String(text)
    .toLowerCase()
    .replace(/ё/g, 'е')
    .split(/[^0-9a-zа-я]+/i)
    .filter(Boolean);
}

// варианты сетки для зон без привязок: seed % 3 → колонки и размер по умолчанию
const GRID_VARIANTS = [
  { cols: 2, defW: 0.45 },
  { cols: 3, defW: 0.28 },
  { cols: 2, defW: 0.36 },
];

function gridCell(variant, index) {
  const g = GRID_VARIANTS[variant];
  const col = index % g.cols;
  const row = Math.floor(index / g.cols);
  const gap = 0.04;
  const cellW = (1 - gap * (g.cols + 1)) / g.cols;
  const rows = 2; // сетка считана на 2 ряда; зоны сверх 4 продолжают ряд по кругу позиций
  const cellH = (1 - gap * (rows + 1)) / rows;
  const x = round2(gap + col * (cellW + gap));
  const y = round2(gap + (row % rows) * (cellH + gap));
  return { x, y, w: g.defW, h: round2(g.defW * 0.75) };
}

function clampBbox(b) {
  let { x, y, width, height } = b;
  width = Math.max(MIN_SIZE, round2(width));
  height = Math.max(MIN_SIZE, round2(height));
  x = Math.min(Math.max(0, round2(x)), 1 - width);
  y = Math.min(Math.max(0, round2(y)), 1 - height);
  return { x, y, width, height };
}

function describePos(pos, qty) {
  const parts = [];
  if (pos.left) parts.push('слева');
  if (pos.right) parts.push('справа');
  if (pos.top) parts.push('вверху');
  if (pos.bottom) parts.push('внизу');
  if (pos.center) parts.push('по центру');
  if (qty != null) parts.push('доля кадра ' + Math.round(qty * 100) + '%');
  return parts.length ? parts.join(', ') : 'по сетке-черновику';
}

/**
 * parseIntent(text) → черновик сцены.
 * @returns {{input, seed, variant, scene, regions, unknown, notes}}
 */
export function parseIntent(text) {
  const input = String(text);
  const norm = input.toLowerCase().replace(/ё/g, 'е');
  const tokens = tokenize(input);
  const seed = hashSeed(norm);
  const variant = seed % GRID_VARIANTS.length;

  // классификация токенов
  const classes = tokens.map((tok) => {
    const hits = WORD_INDEX.get(tok);
    return hits ? { tok, hits } : null;
  });

  // полка «не понял»
  const unknown = [];
  tokens.forEach((tok) => {
    if (WORD_INDEX.has(tok) || STOPWORDS.has(tok)) return;
    if (/^\d+$/.test(tok)) return;
    if (tok.length < 4) return;
    if (!unknown.includes(tok)) unknown.push(tok);
  });

  const regions = [];

  // 1) фон
  const hasBg = classes.some((c) => c && c.hits.some((h) => h.kind === 'background'));
  if (hasBg) {
    regions.push({
      id: 'background', type: BACKGROUND.type, label: BACKGROUND.label,
      prompt: BACKGROUND.prompt, role: '',
      bbox: { x: 0, y: 0, width: 1, height: 1 },
      zIndex: 0, locked: false,
    });
  }

  // 2) визуальные зоны в порядке упоминания
  const zones = [];
  classes.forEach((c, i) => {
    if (!c) return;
    const zoneHit = c.hits.find((h) => h.kind === 'zone');
    if (zoneHit) zones.push({
      i, hit: zoneHit,
      pos: { left: false, right: false, center: false, top: false, bottom: false },
      qty: null,
    });
  });

  // Якоря («слева/справа/центр/вверху/внизу», «треть/половина/четверть»):
  //   шаг 1 — позиционный якорь идёт к БЛИЖАЙШЕЙ зоне (окно ±3 токена, ничья → ранняя зона);
  //   шаг 2 — величина идёт к зоне СВОЕГО примыкающего позиционного слова («левой половине»,
  //           «вверху треть» — читаются как одна фраза), иначе к ближайшей зоне с свободной
  //           величиной; каждый якорь-токен используется один раз.
  const usedPosTok = new Set();
  const usedQtyTok = new Set();
  const zoneOfPos = new Map(); // индекс токена → зона

  classes.forEach((c, i) => {
    if (!c) return;
    for (const h of c.hits) {
      if (h.kind !== 'pos') continue;
      let best = null;
      for (const z of zones) {
        const d = Math.abs(i - z.i);
        if (d > 3) continue;
        if (!best || d < best.d) best = { z, d };
      }
      if (!best) continue;
      if (h.key === 'center' && best.z.pos.center) continue;
      best.z.pos[h.key] = true;
      // противоречивые привязки: «слева и справа» → левая имеет приоритет (детерминизм)
      if (best.z.pos.left && best.z.pos.right) best.z.pos.right = false;
      usedPosTok.add(i);
      zoneOfPos.set(i, best.z);
    }
  });

  classes.forEach((c, i) => {
    if (!c) return;
    for (const h of c.hits) {
      if (h.kind !== 'qty' || usedQtyTok.has(i)) continue;
      // 2а) величина примыкает к позиционному слову (±1 токен) — та же зона
      let target = null;
      for (const [j, z] of zoneOfPos) {
        if (Math.abs(i - j) <= 1 && z.qty == null) { target = z; break; }
      }
      // 2б) иначе — ближайшая зона со свободной величиной
      if (!target) {
        let best = null;
        for (const z of zones) {
          const d = Math.abs(i - z.i);
          if (d > 3 || z.qty != null) continue;
          if (!best || d < best.d) best = { z, d };
        }
        target = best ? best.z : null;
      }
      if (!target) continue;
      target.qty = h.entry.value;
      usedQtyTok.add(i);
    }
  });

  let zoneOrdinal = 0;
  for (const z of zones) {
    zoneOrdinal += 1;
    const zoneHit = z.hit;
    const pos = z.pos;
    const qty = z.qty;
    const hasPos = pos.left || pos.right || pos.center || pos.top || pos.bottom;

    // «стена фоном» / «стол фоном»: зона рядом с фон-словом и без собственных привязок
    // сливается с фоном (отдельный регион не создаётся, prompt фона уточняется)
    const bgNear = classes.some((n, j) =>
      n && Math.abs(j - z.i) <= 2 && n.hits.some((h) => h.kind === 'background'));
    if (bgNear && !hasPos && qty == null) {
      const bgRegion = regions.find((r) => r.id === 'background');
      if (bgRegion) bgRegion.prompt = 'Фон: ' + zoneHit.entry.label + '. ' + BACKGROUND.prompt;
      zoneOrdinal -= 1; // регион не создаётся — нумерация зон не съедается
      continue;
    }

    const isStrip = zoneHit.key === 'ceiling' || zoneHit.key === 'title';
    const desc = describePos(pos, qty);
    let bbox;
    if (isStrip) {
      const height = qty != null ? qty : (zoneHit.key === 'ceiling' ? 0.25 : 0.16);
      const width = zoneHit.key === 'ceiling' ? 1 : 0.8;
      let x = (1 - width) / 2;
      if (pos.left) x = 0;
      if (pos.right) x = 1 - width;
      let y = (1 - height) / 2;
      if (zoneHit.key === 'ceiling') y = 0;
      if (pos.top) y = zoneHit.key === 'title' ? 0.05 : 0;
      if (pos.bottom) y = 1 - height - 0.08;
      bbox = clampBbox({ x, y, width, height });
    } else {
      const cell = gridCell(variant, zoneOrdinal - 1);
      const width = qty != null ? qty : cell.w;
      const height = round2(width * 0.75);
      let x = (1 - width) / 2;
      if (pos.left) x = 0;
      if (pos.right) x = 1 - width;
      let y = (1 - height) / 2;
      if (pos.top) y = 0;
      if (pos.bottom) y = 1 - height;
      bbox = clampBbox({ x, y, width, height });
    }

    regions.push({
      id: zoneHit.key + '-' + zoneOrdinal,
      type: zoneHit.entry.type, label: zoneHit.entry.label,
      prompt: zoneHit.entry.prompt(desc), role: '',
      bbox, zIndex: zoneOrdinal, locked: false,
    });
  }

  // 3) музыка и голос — дорожки-полосы снизу
  let trackOrdinal = 0;
  for (const kindKey of ['music', 'voice']) {
    const hit = classes.find((c) => c && c.hits.some((h) => h.kind === kindKey));
    if (!hit) continue;
    trackOrdinal += 1;
    const entry = kindKey === 'music' ? MUSIC : VOICE;
    regions.push({
      id: entry.key + '-1', type: entry.type, label: entry.label,
      prompt: entry.prompt, role: entry.role,
      bbox: clampBbox(kindKey === 'music'
        ? { x: 0, y: 0.9, width: 1, height: 0.1 }
        : { x: 0, y: 0.8, width: 1, height: 0.08 }),
      zIndex: 8 + trackOrdinal, locked: false,
      metadata: kindKey === 'music'
        ? { seed: hashSeed(norm + ':music'), meter: '4/4', scale: 'pentatonic-minor' }
        : { seed: hashSeed(norm + ':voice') },
    });
  }

  // если ни одного словарного слова — черновик пуст, это честный результат
  const notes = [];
  if (unknown.length) notes.push('не понял: ' + unknown.join(', '));
  if (!regions.length) notes.push('словарных зон не распознано — черновик пуст, добавьте слова из словаря (экран/окно/стена/стол/потолок/фон/заголовок/объект/музыка/голос…)');

  return {
    input,
    seed,
    variant,
    scene: { title: input.length <= 60 ? input : input.slice(0, 57) + '…', aspectRatio: '1:1' },
    regions,
    unknown,
    notes,
    lexiconHits: classes.filter(Boolean).length,
  };
}

/**
 * Экспорт в формат 04_LAYOUT_EXAMPLE.json (ladom.project.v1).
 * type/role/metadata — поля composition-схемы, в студийном IR их нет: снимаются честно.
 */
export function toLayoutProject(parsed, opts = {}) {
  return {
    schemaVersion: LAYOUT_SCHEMA,
    title: opts.title ?? parsed.scene.title,
    canvas: {
      width: opts.width ?? 1024,
      height: opts.height ?? 1024,
      aspectRatio: opts.aspectRatio ?? parsed.scene.aspectRatio,
    },
    regions: parsed.regions.map((r) => ({
      id: r.id,
      label: r.label,
      prompt: r.prompt,
      bbox: { ...r.bbox },
      zIndex: r.zIndex,
      locked: r.locked,
    })),
  };
}

/** Экспорт в полный Composition IR (ladom.composition.v1) — regions с type/role/metadata. */
export function toComposition(parsed, opts = {}) {
  return {
    schemaVersion: COMPOSITION_SCHEMA,
    title: opts.title ?? parsed.scene.title,
    canvas: {
      width: opts.width ?? 1024,
      height: opts.height ?? 1024,
      aspectRatio: opts.aspectRatio ?? parsed.scene.aspectRatio,
    },
    regions: parsed.regions.map((r) => {
      const out = {
        id: r.id, type: r.type, label: r.label, prompt: r.prompt, role: r.role || '',
        bbox: { ...r.bbox }, zIndex: r.zIndex, locked: r.locked,
      };
      if (r.metadata) out.metadata = { ...r.metadata };
      return out;
    }),
    adapters: opts.adapters ?? { visual: true, speech: true, vibro: true, pulse: true },
  };
}

/** Лёгкая структурная самопроверка черновика (не заменяет живой валидатор HTML-студий). */
export function validateDraft(parsed) {
  const errs = [];
  const ids = new Set();
  for (const r of parsed.regions) {
    if (typeof r.id !== 'string' || !r.id) errs.push(r.id + ': нет id');
    if (ids.has(r.id)) errs.push(r.id + ': дубликат id');
    ids.add(r.id);
    if (!['visual', 'music', 'event'].includes(r.type)) errs.push(r.id + ': неизвестный type');
    if (typeof r.label !== 'string' || typeof r.prompt !== 'string') errs.push(r.id + ': нет label/prompt');
    const b = r.bbox;
    const finite = [b.x, b.y, b.width, b.height].every(Number.isFinite);
    if (!finite) errs.push(r.id + ': bbox не числа');
    else {
      if (b.x < 0 || b.y < 0 || b.width <= 0 || b.height <= 0) errs.push(r.id + ': bbox вне 0..1');
      if (b.x + b.width > 1 + 1e-9 || b.y + b.height > 1 + 1e-9) errs.push(r.id + ': выход за кадр');
      if (b.width < MIN_SIZE || b.height < MIN_SIZE) errs.push(r.id + ': размер < ' + MIN_SIZE);
    }
  }
  return errs;
}
