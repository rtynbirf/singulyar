#!/usr/bin/env node
/* ТЕСТ роутера смыслов — срез 6 (правило №10 дома: сначала тесты против
   живых файлов, потом проводка).
   Закрывает открытую границу среза 2 (ДОКУМЕНТЫ/ADAPTER_OS.md): «при
   смешении нескольких кандидатов на один смысл роутер подключится
   следующим срезом».

   Что проверяется (против живых БИБЛИОТЕКИ/adapter-os/*.mjs):
   (a) два адаптера претендуют на один смысл → выбран ровно один,
       выбор детерминированный (порядок регистрации не влияет);
   (b) политика выбора: полное совпадение capability (canUse объявлен
       и вернул истину) > приоритет (больше) > стабильный tiebreak —
       лексикографический по id (возрастание); предпочтение человека
       (preferred) остаётся выше автоматики (правило ·19);
   (c) одиночный кандидат идёт как раньше — поведение срезов 1–5
       (router.route / os.routeOut) не меняется;
   (d) след в шине честный: конверт meaning.router с via:'router',
       выбранным и ПОЛНЫМ списком кандидатов — и в возврате, и в bus.log();
   (e) ни один адаптер не подходит → честный отказ (selected:null,
       reason:'no-usable-adapter', delivered:false), без выдуманных
       доставок (render не зовётся ни разу).

   Node-прогон честно помечает среду: localStorage в node отсутствует —
   тест ставит in-memory заглушку ТОЛЬКО для зеркала лога шины (в браузере
   мост пишет в настоящий localStorage, wire-тесты среза 2 это уже
   проверяют против живых страниц).
Запуск: node ИНСТРУМЕНТЫ/test_meaning_router.mjs   (пути от файла; node ≥ 18) */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(HERE);
const OS = 'file://' + join(ROOT, 'БИБЛИОТЕКИ', 'adapter-os');

const { CapabilityModel, AdapterRegistry, MeaningRouter, STATUS } = await import(OS + '/src/core.mjs');
const bridge = await import(OS + '/bridge.mjs');
const { textOutput } = await import(OS + '/adapters/basic.mjs');

let ok = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) { ok++; console.log('  OK   ' + name); }
  else { fail++; console.log('  FAIL ' + name + ' ' + extra); }
}

/* Заглушка localStorage — только чтобы bus.log() можно было прочитать в node */
if (typeof localStorage === 'undefined') {
  const м = new Map();
  globalThis.localStorage = {
    getItem: k => (м.has(k) ? м.get(k) : null),
    setItem: (k, v) => { м.set(k, String(v)); },
    removeItem: k => { м.delete(k); },
    clear: () => { м.clear(); }
  };
}
const BUS_KEY = 'singulyar.meaningbus.v1';

/* Адаптер по контракту реестра (как в adapters/basic.mjs) */
function адаптер(id, { priority = 0, ready = true, canUse = null } = {}) {
  const a = {
    id, kind: 'output', priority,
    renderCount: 0,
    status: () => ({ state: ready ? STATUS.READY : STATUS.UNAVAILABLE, privacy: 'local' }),
    render(message, target) { this.renderCount++; if (target && 'textContent' in target) target.textContent = message.text != null ? message.text : ''; }
  };
  if (canUse) a.canUse = canUse;
  return a;
}
function собрать(...адаптеры) {
  const c = new CapabilityModel();
  const r = new AdapterRegistry();
  адаптеры.forEach(a => r.register(a));
  return new MeaningRouter({ capabilities: c, registry: r });
}

const СМЫСЛ = { text: 'смысл без формы' };

console.log('— (a) СМЕШЕНИЕ: два кандидата — ровно один победитель, детерминизм —');
{
  const beta = адаптер('output.beta', { priority: 50 });
  const alpha = адаптер('output.alpha', { priority: 50 });
  const r1 = собрать(beta, alpha);   // порядок регистрации: beta, alpha
  const r2 = собрать(alpha, beta);   // порядок регистрации: alpha, beta
  const s1 = r1.route(СМЫСЛ, { direction: 'output' }).selected;
  const s2 = r2.route(СМЫСЛ, { direction: 'output' }).selected;
  check('выбран ровно один из двух', s1 === 'output.alpha' || s1 === 'output.beta', String(s1));
  check('выбор не зависит от порядка регистрации (детерминизм)', s1 === s2, `r1=${s1} r2=${s2}`);
  const again = r1.route(СМЫСЛ, { direction: 'output' }).selected;
  check('повтор на тех же входах — тот же выбор', again === s1, `again=${again} s1=${s1}`);
}

console.log('— (b) ПОЛИТИКА: capability-full > priority > id (лексикографически) —');
{
  const большой = адаптер('output.big', { priority: 100 });
  const умный = адаптер('output.smart', { priority: 10, canUse: () => true });
  check('полное совпадение capability сильнее приоритета',
    собрать(большой, умный).route(СМЫСЛ, { direction: 'output' }).selected === 'output.smart');
  const a = адаптер('output.a', { priority: 100 });
  const b = адаптер('output.b', { priority: 10 });
  check('при равном match побеждает больший приоритет',
    собрать(b, a).route(СМЫСЛ, { direction: 'output' }).selected === 'output.a');
  const zeta = адаптер('output.zeta', { priority: 50 });
  const alpha = адаптер('output.alpha', { priority: 50 });
  check('при равных match и приоритете — лексикографический tiebreak по id (возрастание)',
    собрать(zeta, alpha).route(СМЫСЛ, { direction: 'output' }).selected === 'output.alpha');
  check('предпочтение человека (preferred) всё ещё выше автоматики (правило ·19)',
    собрать(a, b).route(СМЫСЛ, { direction: 'output', preferred: ['output.b'] }).selected === 'output.b');
  check('canUse = false → адаптер не full-match и не usable',
    собрать(большой, адаптер('output.no', { priority: 200, canUse: () => false }))
      .route(СМЫСЛ, { direction: 'output' }).selected === 'output.big');
}

console.log('— (c) ОДИНОЧНЫЙ КАНДИДАТ: срезы 1–5 не меняются —');
{
  const r = собрать(textOutput, адаптер('output.tts-мёртв', { priority: 80, ready: false }));
  const out = r.route({ text: 'hello' }, { direction: 'output', preferred: ['output.text'] });
  check('router.route: выбранным остаётся единственный READY', out.selected === 'output.text', String(out.selected));
  check('router.route: форма ответа прежняя (message/selected/candidates)',
    'message' in out && 'selected' in out && Array.isArray(out.candidates));
  check('router.route: candidates держат всех претендентов с честным state',
    out.candidates.length === 2 && out.candidates.every(x => typeof x.id === 'string' && typeof x.state === 'string'));
}

console.log('— (d) ЧЕСТНЫЙ СЛЕД: конверт meaning.router {via:\'router\'} в шине —');
{
  localStorage.removeItem(BUS_KEY);
  // приоритет выше стоковых (textOutput 100) — чтобы состязание шло
  // между двумя моими кандидатами на фоне живого моста (стоковые в реестре всегда)
  const beta = адаптер('output.beta', { priority: 400 });
  const alpha = адаптер('output.alpha', { priority: 400 });
  const os = await bridge.bootAdapterOS({ page: 'тест-срез6', expose: false, adapters: [beta, alpha] });
  check('мост поднялся в node (state ready)', os.state === 'ready', String(os.state));
  check('os.routeMixed существует (роутер подключён к шине)', typeof os.routeMixed === 'function');

  if (typeof os.routeMixed === 'function') {
    const res = os.routeMixed(СМЫСЛ);
    const env = res.envelope;
    check('возврат: выбран ровно один', res.selected === 'output.alpha' || res.selected === 'output.beta', String(res.selected));
    check('выбор детерминирован (равные приоритеты → id лексикографически)', res.selected === 'output.alpha', String(res.selected));
    check('конверт существует и семейство meaning.*', !!env && typeof env.type === 'string' && env.type.startsWith('meaning.'), env && env.type);
    check('конверт несёт честную пометку via:\'router\'', !!env && env.payload && env.payload.via === 'router', JSON.stringify(env && env.payload));
    check('конверт несёт выбранного и полный список кандидатов',
      !!env && env.payload.selected === res.selected && Array.isArray(env.payload.candidates)
      && env.payload.candidates.some(x => x.id === 'output.alpha') && env.payload.candidates.some(x => x.id === 'output.beta')
      && env.payload.candidates.every(x => typeof x.state === 'string'),
      JSON.stringify(env && env.payload && env.payload.candidates));
    check('конверт назвает политику выбора', !!env && typeof env.payload.policy === 'string' && /capability/i.test(env.payload.policy), env && env.payload && env.payload.policy);
    check('конверт — настоящий конверт шины (id/type/payload/createdAt/author)',
      !!env && !!env.id && !!env.createdAt && env.author === 'тест-срез6');
    const вЛоге = os.bus.log().find(e => e.id === env.id);
    check('конверт лежит в bus.log() (зеркало шины)', !!вЛоге && вЛоге.payload.via === 'router', String(!!вЛоге));
    check('доставка без цели честно not-delivered (delivered:false)', res.delivered === false && env.payload.delivered === false);
    const renderВсего = beta.renderCount + alpha.renderCount;
    check('render без цели не зовётся', renderВсего === 0, String(renderВсего));

    // доставка ровно одному — с целью
    const цель = { textContent: '' };
    const res2 = os.routeMixed(СМЫСЛ, { target: цель });
    const renderПосле = beta.renderCount + alpha.renderCount;
    check('доставка уходит ровно одному адаптеру', res2.delivered === true && renderПосле === 1 && res2.adapter.id === res2.selected,
      `delivered=${res2.delivered} renders=${renderПосле}`);
    check('проигравший кандидат не доставлял', (res2.selected === 'output.alpha' ? beta.renderCount : alpha.renderCount) === 0);
    check('смысл дошёл без искажений', цель.textContent === 'смысл без формы', JSON.stringify(цель.textContent));
  }

  // детерминизм на уровне моста: другой порядок регистрации — тот же победитель
  localStorage.removeItem(BUS_KEY);
  const os2 = await bridge.bootAdapterOS({ page: 'тест-срез6-2', expose: false, adapters: [alpha, beta] });
  if (typeof os2.routeMixed === 'function') {
    check('мост: выбор не зависит от порядка регистрации', os2.routeMixed(СМЫСЛ).selected === os.routeMixed(СМЫСЛ).selected);
  }
  // routeOut срезов 1–5 не изменился: возвращает маршрут, не публикует конверт
  localStorage.removeItem(BUS_KEY);
  const до = os.bus.log().length;
  const прям = os.routeOut(СМЫСЛ, ['output.alpha']);
  check('routeOut (срезы 1–5): прежняя форма, прежний выбор', прям.selected === 'output.alpha' && !('envelope' in прям));
  check('routeOut не публикует конвертов в шину', os.bus.log().length === до, `было ${до}, стало ${os.bus.log().length}`);
}

console.log('— (e) ЧЕСТНЫЙ ОТКАЗ: никого — никакой выдуманной доставки —');
{
  localStorage.removeItem(BUS_KEY);
  // стоковые output-адаптеры моста временно глушим подменой статуса
  // (паттерн wire-теста среза 2: __origStatus + восстановление)
  const СТОКОВЫЕ_ID = ['output.text', 'output.tts', 'output.vibration', 'output.braille'];
  const os = await bridge.bootAdapterOS({ page: 'тест-срез6-отказ', expose: false, adapters: [] });
  const стоковые = СТОКОВЫЕ_ID.map(id => os.registry.get(id)).filter(Boolean);
  стоковые.forEach(a => { a.__origStatus = a.status; a.status = () => ({ state: 'UNAVAILABLE', privacy: 'local' }); });
  const мёртв1 = адаптер('output.мёртв1', { priority: 900, ready: false });
  const мёртв2 = адаптер('output.мёртв2', { priority: 800, ready: true, canUse: () => false });
  os.registerAdapter(мёртв1); os.registerAdapter(мёртв2);

  if (typeof os.routeMixed === 'function') {
    const цель = { textContent: '' };
    const res = os.routeMixed(СМЫСЛ, { target: цель });
    check('отказ: selected:null', res.selected === null, String(res.selected));
    check('отказ: reason честный (no-usable-adapter)', res.reason === 'no-usable-adapter', String(res.reason));
    check('отказ: delivered:false — доставки НЕ БЫЛО', res.delivered === false && res.envelope.payload.delivered === false);
    check('отказ: render не зовётся ни разу (0 выдуманных доставок)', мёртв1.renderCount + мёртв2.renderCount === 0);
    check('отказ: цель не тронута', цель.textContent === '');
    check('отказ: конверт в шине тоже честный (via:\'router\', selected:null)',
      res.envelope.payload.via === 'router' && res.envelope.payload.selected === null
      && os.bus.log().some(e => e.id === res.envelope.id));
    check('отказ: список кандидатов в конверте есть (след честный)',
      Array.isArray(res.envelope.payload.candidates) && res.envelope.payload.candidates.length >= 4);
  }
  // восстановление статусов стоковых — мост снова жив
  стоковые.forEach(a => { if (a.__origStatus) a.status = a.__origStatus; });
  if (typeof os.routeMixed === 'function') {
    const живой = os.routeMixed(СМЫСЛ, {});
    check('после восстановления статусов реестр снова обслуживает (не застряли в отказе)', живой.selected !== null, String(живой.selected));
  } else {
    check('os.routeMixed существует (роутер подключён к шине)', false);
  }
  // и router.route сам по себе отказывает честно (как и в срезах 1–5)
  check('router.route без usable → selected:null (как раньше)',
    собрать(мёртв1).route(СМЫСЛ, { direction: 'output' }).selected === null);
}

console.log('');
if (fail) { console.log('ИТОГ: FAIL ' + fail + ' (ok ' + ok + ')'); process.exit(1); }
console.log('ИТОГ: ВСЕ ПРОШЛИ (' + ok + ')');
/* BroadcastChannel (шина) в node держит цикл событий живым — выходим явно,
   честно указывая код. В браузере канал закрывается вместе со страницей. */
process.exit(0);
