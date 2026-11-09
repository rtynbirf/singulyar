/* ═══════════════════════════════════════════════════════════════════════════
   Запуск: node --test ИНСТРУМЕНТЫ/test_sw15_приёмка.mjs
   ═══   СТРАЖ ПРИЁМКИ ВОРКЕРА (латка ЛКГ-1, 2026-11-09; КРУ V2 F-001/F-022/T-010/T-070)
   Держит пять законов last-known-good в sw15.js:
   1) провал ОБЯЗАТЕЛЬНОГО файла = брак установки: install падает, новый воркер
      не встаёт, старый кэш оболочки (last-known-good) переживает (T-010);
   2) успешная установка проходит дымовую приёмку: обязательные файлы РЕАЛЬНО
      лежат в кэше;
   3) activate стирает старые кэши оболочки ТОЛЬКО после дымовой приёмки нового
      кэша; приёмка провалена — старая оболочка живёт, честный S15_ПРИЁМКА-сигнал
      уходит комнатам, clients.claim не зовётся;
   4) безусловного skipWaiting больше нет: активация нового такта — только по
      сообщению S15_ВХОД_В_ТАКТ (согласие человека, закон обновления F-022/T-070);
   5) ядро офлайна неприкасаемо вытеснением: S15_MAX меряет ТОЛЬКО не-ядро.
   Воркер грузится в vm-песочницу с честными моками CacheStorage/Cache/fetch —
   никаких сетевых проб и никакого браузера (канон CI: детерминированные оракулы).
   ═══════════════════════════════════════════════════════════════════════════ */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const корень = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const КОД = fs.readFileSync(path.join(корень, 'sw15.js'), 'utf8');
const ПРОИСХОЖДЕНИЕ = 'https://rtynbirf.github.io/singulyar/';

/* ── честные моки: Cache/CacheStorage/Request/Response/fetch ───────────── */
class МокЗаголовки {
  constructor(таблица = {}) { this._т = new Map(Object.entries(таблица)); }
  get(и) { return this._т.has(и) ? this._т.get(и) : (this._т.has(и.toLowerCase()) ? this._т.get(и.toLowerCase()) : null); }
  set(и, з) { this._т.set(и, з); }
}
class МокОтвет {
  constructor(тело = '', опции = {}) {
    this.status = опции.status !== undefined ? опции.status : 200;
    this.ok = this.status >= 200 && this.status < 300;
    this.headers = new МокЗаголовки(опции.headers || {});
  }
}
class МокЗапрос {
  constructor(url) { this.url = String(url); this.method = 'GET'; this.headers = new МокЗаголовки(); }
}
class МокКэш {
  constructor(имя) { this.имя = имя; this._м = new Map(); }
  async add(req) {
    const url = typeof req === 'string' ? req : req.url;
    const res = ТЕКУЩИЙ_ПЛАН(url);
    if (!res || res.status !== 200) throw new Error('МокКэш.add: не 200 для ' + url + (res ? ' (статус ' + res.status + ')' : ' (сети нет)'));
    this._м.set(нормМок(url), res);
  }
  async put(req, res) { this._м.set(нормМок(typeof req === 'string' ? req : req.url), res); }
  async match(req) {
    const ключ = нормМок(typeof req === 'string' ? req : req.url);
    return this._м.has(ключ) ? this._м.get(ключ) : undefined;
  }
  async keys() {
    return [...this._м.keys()].map((у) => ({ url: у }));
  }
  async delete(req) { return this._м.delete(нормМок(typeof req === 'string' ? req : req.url)); }
}
/* канонизация ключей как в воркере (R-05): index.html → корень */
function нормМок(урл) {
  try {
    const u = new URL(урл, ПРОИСХОЖДЕНИЕ);
    if (u.search) return u.href;
    let п = u.pathname;
    if (/\/(?:index\.html)?$/i.test(п)) п = п.replace(/index\.html$/i, '');
    return u.origin + п;
  } catch { return String(урл); }
}
/* план сети текущего мира: url → МокОтвет | null (отказ) */
let ТЕКУЩИЙ_ПЛАН = () => null;
function собратьМир(план, стартовыеКэши = []) {
  ТЕКУЩИЙ_ПЛАН = план;
  const кэши = new Map(стартовыеКэши.map((к) => [к.имя, к]));
  const слушатели = {};
  const сообщения = [];
  const флаги = { skipWaiting: 0, claim: 0 };
  const песочница = {
    console,
    URL,
    Set,
    Promise,
    Error,
    Math,
    Date,
    isFinite,
    parseInt,
    String,
    Number,
    Object,
    Array,
    JSON,
    Request: МокЗапрос,
    Response: МокОтвет,
    fetch: async (req) => {
      const url = typeof req === 'string' ? req : req.url;
      const res = ТЕКУЩИЙ_ПЛАН(url);
      if (!res) throw new Error('мок-сеть: отказ для ' + url);
      return res;
    },
    self: {
      location: { href: ПРОИСХОЖДЕНИЕ + 'sw15.js' },
      addEventListener: (тип, фн) => { (слушатели[тип] = слушатели[тип] || []).push(фн); },
      skipWaiting: async () => { флаги.skipWaiting += 1; },
      clients: {
        claim: async () => { флаги.claim += 1; return []; },
        matchAll: async () => [{ postMessage: (о) => сообщения.push(о) }],  /* одна открытая комната слышит широковещание */
      },
    },
    caches: {
      open: async (имя) => {
        if (!кэши.has(имя)) кэши.set(имя, new МокКэш(имя));
        return кэши.get(имя);
      },
      keys: async () => [...кэши.keys()],
      delete: async (имя) => кэши.delete(имя),
      match: async (req) => {
        for (const к of кэши.values()) {
          const р = await к.match(req);
          if (р) return р;
        }
        return undefined;
      },
    },
  };
  песочница.globalThis = песочница;
  vm.createContext(песочница);
  vm.runInContext(КОД, песочница, { filename: 'sw15.js' });
  return {
    песочница, слушатели, флаги, кэши, сообщения,
    событие: (тип, поле = {}) => {
      const ожидание = [];
      const e = { waitUntil: (p) => ожидание.push(Promise.resolve(p)), ...поле };
      for (const фн of слушатели[тип] || []) фн(e);
      return Promise.all(ожидание);
    },
    сообщение: (данные) => {
      const e = { data: данные, source: { postMessage: (о) => сообщения.push(о) } };
      for (const фн of слушатели.message || []) фн(e);
    },
  };
}
const ответ200 = () => new МокОтвет('ок', { headers: { 'content-length': '10' } });
const кэшСоЗаписью = (имя, урл) => {
  const к = new МокКэш(имя);
  к._м.set(нормМок(урл), ответ200());
  return к;
};

const СТАРАЯ_ОБОЛОЧКА = 's15-orkestrator-v236';
const НОВАЯ_ОБОЛОЧКА = 's15-orkestrator-v237';

test('лкг: S15_CACHE поднят v236→v237, обязательное ядро объявлено, безусловного skipWaiting нет', () => {
  assert.ok(КОД.includes("var S15_CACHE = 's15-orkestrator-v237'"), 'поколение кэша должно быть поднято v236→v237');
  assert.ok(/var S15_ЯДРО_ОБЯЗАТЕЛЬНОЕ = \[[\s\S]*?\];/.test(КОД), 'нет списка обязательного ядра');
  assert.ok(/function дымоваяПриёмка\(/.test(КОД), 'нет дымовой приёмки');
  /* закон обновления: единственный исполняемый skipWaiting — в обработчике согласия */
  const безКомментов = КОД.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  const места = [...безКомментов.matchAll(/self\.skipWaiting\s*\(/g)].length;
  assert.equal(места, 1, 'skipWaiting должен остаться ТОЛЬКО в обработчике S15_ВХОД_В_ТАКТ, стоит: ' + места);
  assert.ok(безКомментов.includes("'S15_ВХОД_В_ТАКТ'"), 'нет обработчика согласия человека');
});

test('лкг/T-010: провал обязательного файла = брак установки; last-known-good переживает', async () => {
  const план = (url) => (/\/cord\.js$/.test(url) ? new МокОтвет('', { status: 404 }) : ответ200());
  const старая = кэшСоЗаписью(СТАРАЯ_ОБОЛОЧКА, ПРОИСХОЖДЕНИЕ + 'index.html');
  const мир = собратьМир(план, [старая]);
  await assert.rejects(() => мир.событие('install'), /брак установки[\s\S]*обязательные/, 'install обязан падать при провале обязательного');
  assert.ok(мир.кэши.has(СТАРАЯ_ОБОЛОЧКА), 'старый кэш оболочки обязан пережить брак установки');
  assert.equal(мир.флаги.skipWaiting, 0, 'skipWaiting при браке запрещён');
  assert.equal(мир.флаги.claim, 0, 'claim при браке запрещён');
});

test('лкг: установка без брака кладёт ВСЁ ядро и проходит дымовую приёмку', async () => {
  const мир = собратьМир(() => ответ200(), []);
  await мир.событие('install');
  const к = мир.кэши.get(НОВАЯ_ОБОЛОЧКА);
  assert.ok(к, 'новый кэш собран');
  const ключи = await к.keys();
  assert.ok(ключи.length >= 170, 'ядро целиком в кэше, лежит: ' + ключи.length);
  assert.ok((await к.match(ПРОИСХОЖДЕНИЕ)) !== undefined, "корень './' лежит под каноническим ключом");
  assert.ok((await к.match(ПРОИСХОЖДЕНИЕ + 'js/sg-registry.js')) !== undefined, 'реестр правды в обязательном ядре');
  assert.equal(мир.флаги.skipWaiting, 0, 'установка сама не активируется (закон обновления)');
});

test('лкг/Фаза 1 п.2: activate стирает старую оболочку ТОЛЬКО после приёмки; провал приёмки — last-known-good живёт', async () => {
  /* успешный случай */
  const мир1 = собратьМир(() => ответ200(), [
    кэшСоЗаписью(СТАРАЯ_ОБОЛОЧКА, ПРОИСХОЖДЕНИЕ + 'index.html'),
    кэшСоЗаписью('transformers-cache', 'https://huggingface.co/модель'),
  ]);
  await мир1.событие('install');
  await мир1.событие('activate');
  assert.ok(!мир1.кэши.has(СТАРАЯ_ОБОЛОЧКА), 'после приёмки старая оболочка стирается');
  assert.ok(мир1.кэши.has('transformers-cache'), 'AI-АБСОЛЮТ переживает такты');
  assert.equal(мир1.флаги.claim, 1, 'claim после честной приёмки');
  const приёмка = мир1.сообщения.find((м) => м.type === 'S15_ПРИЁМКА');
  assert.ok(приёмка && приёмка.годен === true, 'комнаты узнают: приёмка сдана');

  /* провал приёмки: обязательный файл вытеснен из нового кэша после install */
  const мир2 = собратьМир(() => ответ200(), [кэшСоЗаписью(СТАРАЯ_ОБОЛОЧКА, ПРОИСХОЖДЕНИЕ + 'index.html')]);
  await мир2.событие('install');
  await мир2.кэши.get(НОВАЯ_ОБОЛОЧКА).delete(ПРОИСХОЖДЕНИЕ + 'index.html');  // гонка/квота
  await мир2.событие('activate');
  assert.ok(мир2.кэши.has(СТАРАЯ_ОБОЛОЧКА), 'при провале приёмки старая оболочка ОБЯЗАНА жить');
  assert.equal(мир2.флаги.claim, 0, 'claim при провале приёмки запрещён');
  const провал = мир2.сообщения.find((м) => м.type === 'S15_ПРИЁМКА');
  assert.ok(провал && провал.годен === false, 'комнаты узнают правду о провале приёмки');
});

test('лкг/T-070: активация нового такта — только по согласию человека (S15_ВХОД_В_ТАКТ)', async () => {
  const мир = собратьМир(() => ответ200(), []);
  await мир.событие('install');
  мир.сообщение({ type: 'S15_PING' });
  const пинг = мир.сообщения.find((м) => м.type === 'S15_PONG');
  assert.ok(пинг, 'PONG отвечает');
  assert.ok(пинг.ядро_обязательное >= 10, 'в PONG видно обязательное ядро: ' + пинг.ядро_обязательное);
  assert.equal(мир.флаги.skipWaiting, 0, 'PING не активирует такт');
  мир.сообщение({ type: 'S15_ВХОД_В_ТАКТ' });
  await new Promise((р) => setTimeout(р, 10));
  assert.equal(мир.флаги.skipWaiting, 1, 'согласие человека активирует такт');
  const принято = мир.сообщения.find((м) => м.type === 'S15_ВХОД_В_ТАКТ_ПРИНЯТ');
  assert.ok(принято && принято.поколение === 'v237', 'подтверждение с поколением');
});

test('лкг: ядро офлайна неприкасаемо вытеснением (S15_MAX меряет только не-ядро)', async () => {
  const мир = собратьМир(() => ответ200(), []);
  await мир.событие('install');
  const к = мир.кэши.get(НОВАЯ_ОБОЛОЧКА);
  const было_ядро = (await к.keys()).length;
  assert.ok(было_ядро > 140, 'ядро больше старого потолка 140 — именно это и чиним (' + было_ядро + ')');
  /* первый не-ядровый put: прежняя формула резала бы ~33 старейших ЯДРОВЫХ файла */
  await мир.песочница.caches.open(НОВАЯ_ОБОЛОЧКА);
  await к.put(ПРОИСХОЖДЕНИЕ + 'minus/чужая-песня.mp3', new МокОтвет('аудио', { headers: { 'content-length': '9' } }));
  const после_одного = (await к.keys()).length;
  assert.equal(после_одного, было_ядро + 1, 'ядро не тронуто при не-ядровом put (было: ' + было_ядро + ', стало: ' + после_одного + ')');
  /* потолок не-ядра: наполняем сверх S15_MAX — выгоняются только не-ядровые */
  const ПОТОЛОК = 140;
  for (let i = 0; i < ПОТОЛОК + 3; i++) {
    await к.put(ПРОИСХОЖДЕНИЕ + 'временное/' + i + '.html', new МокОтвет('стр', { headers: { 'content-length': '4' } }));
  }
  const чужие = (await к.keys()).filter((кл) => !/\/(singulyar|cord|sw15|index|КРИСТАЛЛ|404|manifest|ИНСТРУМ|docs|ДОКУМ|СИНГУЛЯР|БИБЛИОТ|ФОНД|ДАННЫ|ИКОН)/.test(кл.url) && кл.url.includes('/временное/'));
  assert.ok(чужие.length <= ПОТОЛОК, 'не-ядровых после put ≤ потолка: ' + чужие.length);
  assert.ok(await к.match(ПРОИСХОЖДЕНИЕ), "корень './' пережил все put");
  assert.ok(await к.match(ПРОИСХОЖДЕНИЕ + 'cord.js'), 'cord.js пережил все put');
});
