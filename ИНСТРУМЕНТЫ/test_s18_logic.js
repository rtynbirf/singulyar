#!/usr/bin/env node
/* Тесты логики ·18 СОБЫТИЕ — реальный код страницы (без DOM).
   1) ЯДРО: коды/машина фаз/часы/GC/имена/манифест
   2) QR-энкодер: структура матрицы (углы-файндеры, тишина)
   3) КОМНАТА: симуляция хост+гость на мок-транспорте (HI/RDY/SGG/CD/FIN/DN/миграция)
   Запуск: node test_s18_logic.js                                     */
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'СИНГУЛЯР_18_СОБЫТИЕ.html'), 'utf8');
/* v1.42.0: КОРД вшит первым скриптом каждой страницы — берём ВСЕ inline-скрипты,
   чтобы инварианты кода комнаты не зависели от порядка скриптов */
const блоки = [...HTML.matchAll(/<script>\n?([\s\S]*?)\n?<\/script>/g)].map(x => x[1]);
if (!блоки.length) { console.error('FAIL: script-блоки не найдены'); process.exit(1); }
const src = блоки.join('\n;\n');

function slice(a, b) {
  const i = src.indexOf(a), j = src.indexOf(b);
  if (i < 0 || j < 0 || j < i) throw new Error('маркеры не найдены: ' + a + ' / ' + b);
  return src.slice(i, j + b.length);
}
const ЯДРО = slice('/*<ЯДРО>*/', '/*</ЯДРО>*/');
const КОМНАТА = slice('/*<КОМНАТА>*/', '/*</КОМНАТА>*/');
const iQ = src.indexOf('const QR_CAPL'), iЯ = src.indexOf('/*<ЯДРО>*/');
if (iQ < 0 || iЯ < 0 || iЯ < iQ) throw new Error('QR-сегмент не найден');
const QR = src.slice(iQ, iЯ);

const песочница = { Math, Date, JSON, console, isFinite, parseInt, TextEncoder, TextDecoder, setTimeout, setInterval, clearInterval, clearTimeout, Promise };
vm.createContext(песочница);
vm.runInContext(ЯДРО + '\n' + QR + '\n' + КОМНАТА, песочница, { filename: 's18-core.js' });

let passed = 0, failed = 0;
function ок(name, cond) {
  if (cond) { passed++; console.log('  ✓ ' + name); }
  else { failed++; console.log('  ✗ FAIL: ' + name); }
}
function сек(t) { console.log('— ' + t); }

/* ─── 0. v1.22: UI memory.decide (решение человека = неизменяемое событие) ─── */
сек('v1.22: memory.decide UI');
{
  ок('мостРешение определена в ·18', /function мостРешение\(/.test(HTML));
  ок('решение remember привязано к «❤️ сохранить»', /мостРешение\('remember', rec\)/.test(HTML));
  ок('решение expire привязано к «🔥 удалить»', /мостРешение\('expire', rec\)/.test(HTML));
  ок('решение строится bridges.memoryDecisionEvent', /memoryDecisionEvent\(решение/.test(HTML));
  ок('решение идёт через опубликуй (makeBridge)', /МОСТ18\.б\.опубликуй\(п\.event\)\.then\(function \(р\) \{\s*if \(р\.ok\) лог\('решение записано/.test(HTML));
  ок('дедуп-ответ не спамит статус', /р\.reason !== 'DUPLICATE'/.test(HTML));
  ок('цель решения = запись, комната из манифеста', /цельId: запись\.id/.test(HTML) && /комната: \(запись\.manifest && запись\.manifest\.room\)/.test(HTML));
}

/* ─── 1. ЯДРО ─── */
сек('ЯДРО: код зала');
{
  const кодЗала = песочница.кодЗала;
  const АЛФАВИТ_КОДА = vm.runInContext('АЛФАВИТ_КОДА', песочница);   /* const не попадает в глобал */
  ок('длина 5', кодЗала().length === 5);
  ок('только безопасный алфавит', [...кодЗала()].every(c => АЛФАВИТ_КОДА.includes(c)));
  ок('без похожих 0O1IL', !/[0O1IL]/.test(кодЗала()));
  const seen = new Set(); for (let i = 0; i < 5000; i++) seen.add(кодЗала());
  /* парадокс дней рождения: в 28.6M ключей на 5000 вытягиваний ~0.4 коллизии
     — ждём ≥4995 уникальных, «все 5000 разные» было бы лживым тестом */
  ок('5000 кодов: ≥4995 уникальных (' + seen.size + ')', seen.size >= 4995);
  ок('детерминированный rnd', (() => { let i = 0; return кодЗала(() => (i++ / 5) * 0.9999).length === 5; })());
}
сек('ЯДРО: машина фаз');
{
  const { фазаДопустима } = песочница;
  ок('LOBBY→READY', фазаДопустима('LOBBY', 'READY'));
  ок('READY→COUNTDOWN', фазаДопустима('READY', 'COUNTDOWN'));
  ок('COUNTDOWN→SINGING', фазаДопустима('COUNTDOWN', 'SINGING'));
  ок('SINGING→FINISH', фазаДопустима('SINGING', 'FINISH'));
  ок('FINISH→REVIEW', фазаДопустима('FINISH', 'REVIEW'));
  ок('REVIEW→LOBBY (спеть ещё)', фазаДопустима('REVIEW', 'LOBBY'));
  ок('LOBBY→SINGING запрещён', !фазаДопустима('LOBBY', 'SINGING'));
  ок('SINGING→LOBBY запрещён', !фазаДопустима('SINGING', 'LOBBY'));
  ок('REVIEW→SINGING запрещён', !фазаДопустима('REVIEW', 'SINGING'));
  ок('мусор-фаза → false', !фазаДопустима('ХАОС', 'LOBBY'));
}
сек('ЯДРО: часы');
{
  const { смещениеЧасов } = песочница;
  const точные = [0, 1, 2, 3, 4].map(i => ({ t0: i * 10, t1: i * 10 + 40, t2: i * 10 + 80 }));
  const р0 = смещениеЧасов(точные);
  ок('синхронные часы → offset 0', Math.abs(р0.offset) < 0.01);
  ок('rtt медиана 80', р0.rtt === 80);
  /* хост впереди на 250 мс */
  const сдвиг = точные.map(z => ({ t0: z.t0, t1: z.t1 + 250, t2: z.t2 }));
  ок('offset = +250', Math.abs(смещениеЧасов(сдвиг).offset - 250) < 0.01);
  /* один негодный RTT отброшен */
  const сМусором = сдвиг.concat([{ t0: 0, t1: 9000, t2: 1 }]);
  ок('мусорный RTT отфильтрован', Math.abs(смещениеЧасов(сМусором).offset - 250) < 0.01);
  ок('пусто → offset 0, n=0', смещениеЧасов([]).n === 0);
}
сек('ЯДРО: GC 7 дней');
{
  const { gcРазделить } = песочница;
  const СРОК_ВРЕМЕННОЙ_MS = vm.runInContext('СРОК_ВРЕМЕННОЙ_MS', песочница);   /* const — лексический */
  const now = 1000000000000;
  const записи = [
    { id: 'a', state: 'TEMPORARY', expiresAt: now - 1 },
    { id: 'b', state: 'TEMPORARY', expiresAt: now + СРОК_ВРЕМЕННОЙ_MS },
    { id: 'c', state: 'MEMORY', expiresAt: now - 99999 },
    { id: 'd', state: 'TEMPORARY' }                 /* битая запись без срока — тоже мусор */
  ];
  const р = gcРазделить(записи, now);
  ок('просрочены ровно две (a и d)', р.просроченные.length === 2 && р.просроченные.some(r => r.id === 'a') && р.просроченные.some(r => r.id === 'd'));
  ок('память ❤️ не тронута', р.живые.some(r => r.id === 'c'));
  ок('TEMPORARY в сроке живёт', р.живые.some(r => r.id === 'b'));
}
сек('ЯДРО: имена и время');
{
  const { нормИмя, фмс, фДней } = песочница;
  ок('управляющие символы срезаны', нормИмя('Ба\u0000б\u007fушка') === 'Бабушка');
  ок('обрез до 24', нормИмя('х'.repeat(100)).length === 24);
  ок('пустое → Участник', нормИмя('   ') === 'Участник');
  ок('фмс(0)=00:00.0', фмс(0) === '00:00.0');
  ок('фмс(65000)=01:05.0', фмс(65000) === '01:05.0');
  ок('фДней(1 день)', /^1 день$/.test(фДней(86400000)));
  ок('фДней(3 дня)', /^3 дня$/.test(фДней(3 * 86400000)));
}
сек('ЯДРО: манифест события');
{
  const { манифестЗала } = песочница;
  const ст = { code: '7K4P2', participants: [{ id: 'h', name: 'Бабушка', emoji: '👵', micReady: true }, { id: 'g', name: 'Мама', emoji: '👩', micReady: false }], song: { id: 'abc', title: 'Песня' }, startAt: 1000, endedAt: 61000, savePolicy: 'all' };
  const ман = манифестЗала(ст, { transport: 'relay' });
  ок('kind singular-event', ман.kind === 'singular-event');
  ок('длительность 60000', ман.durationMs === 60000);
  ок('слушатель помечен', ман.participants[1].listener === true);
  ок('песня и политика', ман.song.title === 'Песня' && ман.savePolicy === 'all');
  ок('доп-поля проходят', ман.transport === 'relay');
}

/* ─── 2. QR ─── */
сек('QR-энкодер: структура');
{
  const SingulyarQR = vm.runInContext('SingulyarQR', песочница);   /* class — лексический */
  const q = new SingulyarQR();
  const r = q.encode('https://rtynbirf.github.io/singulyar/СИНГУЛЯР_18_СОБЫТИЕ.html?зал=7K4P2');
  const s = r.size;
  const cornerDark = (rr, cc) => r.modules[rr][cc] === 1;
  ок('версия в 1..40', r.version >= 1 && r.version <= 40);
  ок('левый-верх угол', cornerDark(0, 0) && cornerDark(6, 0) && cornerDark(3, 3));
  ок('правый-верх угол', cornerDark(0, s - 1) && cornerDark(0, s - 7) && cornerDark(3, s - 4));
  ок('левый-низ угол', cornerDark(s - 1, 0) && cornerDark(s - 7, 0) && cornerDark(s - 4, 3));
  ок('размер ≥ 21', s >= 21);
}

/* ─── 3. КОМНАТА: симуляция двух участников ─── */
сек('КОМНАТА: хост+гость на мок-транспорте');
{
  function мокТранспорт(id) {
    const т = {
      id, _cb: [], peers: new Map(),
      onData(cb) { this._cb.push(cb); },
      onMedia() {}, onPeers() {}, sendMedia() {},
      send(d) { if (т._друг) setTimeout(() => т._друг._cb.forEach(cb => cb(JSON.parse(JSON.stringify(d)), id)), 0); },
      sendTo(d, до) { if (т._друг && до === т._друг.id) т.send(d); },
      init() { return Promise.resolve(); },
      leave() {}
    };
    return т;
  }
  function запусти(fn) { return new Promise(r => setTimeout(r, 5)).then(fn); }
  /* детерминированное ожидание условия (поллинг вместо фиксированной паузы) */
  function ждать(fn, мс) {
    const t0 = Date.now();
    return new Promise(function res(resolve, reject) {
      if (fn()) return resolve();
      if (Date.now() - t0 > (мс || 2000)) return reject(new Error('таймаут ожидания'));
      setTimeout(function () { res(resolve, reject); }, 10);
    });
  }

  (async () => {
    const тХост = мокТранспорт('h-1'), тГость = мокТранспорт('g-1');
    тХост._друг = тГость; тГость._друг = тХост;
    let хФаза = null, гФаза = null, хЛог = [], гЛог = [];
    const песняПoId = id => id === 'song1' ? { id: 'song1', title: 'Когда теряем' } : null;

    const комХост = песочница.КОМНАТА({ транспорт: тХост, имя: 'Бабушка', эмодзи: '👵', микрофон: true, код: 'AAA11', хост: true, песняПoId, onФаза: f => { хФаза = f; }, onЛог: (t, тип) => хЛог.push(t) });
    const комГость = песочница.КОМНАТА({ транспорт: тГость, имя: 'Мама', эмодзи: '👩', микрофон: true, код: 'AAA11', хост: false, песняПoId, onФаза: f => { гФаза = f; }, onЛог: (t) => гЛог.push(t) });

    await комХост.старт(); await комГость.старт();
    await ждать(() => комХост.state.participants.some(p => p.id === 'g-1'));
    let ст = комХост.state;
    ок('хост назначен', ст.host === 'h-1');
    ок('гость в списке', ст.participants.some(p => p.id === 'g-1' && p.name === 'Мама' && p.emoji === '👩'));
    ок('гость получил снимок', комГость.state.participants.length === 2);

    комГость.готов(true); await ждать(() => комХост.state.participants.find(p => p.id === 'g-1') && комХост.state.participants.find(p => p.id === 'g-1').ready === true);
    ок('готовность дошла до хоста', комХост.state.participants.find(p => p.id === 'g-1').ready === true);

    комХост.выбратьПесню('song1'); await ждать(() => комГость.state.song && комГость.state.song.title === 'Когда теряем');
    ок('песня выбрана и дошла', комГость.state.song && комГость.state.song.title === 'Когда теряем');

    комГость.предложитьПесню('song2'); await запусти();
    ок('предложение при занятой песне игнор', комГость.state.song.id === 'song1');

    const startAt = комХост.стартОтсчёта(3400);
    await ждать(() => хФаза === 'COUNTDOWN' && гФаза === 'COUNTDOWN');
    ок('COUNTDOWN у обоих', хФаза === 'COUNTDOWN' && гФаза === 'COUNTDOWN');
    ок('startAt в будущем', startAt > Date.now() && комГость.state.startAt === startAt);
    ок('повторный отсчёт запрещён', комХост.стартОтсчёта(3400) === null);

    комХост.петь(); await ждать(() => хФаза === 'SINGING' && гФаза === 'SINGING');
    ок('SINGING у обоих', хФаза === 'SINGING' && гФаза === 'SINGING');

    комГость.яДослушал(); await запусти();
    ок('один DN не завершает', хФаза === 'SINGING');
    комХост.яДослушал(); await ждать(() => хФаза === 'FINISH');
    ок('все finished → FINISH', хФаза === 'FINISH');
    await запусти();
    ок('манифест собран', комХост.итоговыйМанифест().song.id === 'song1' && комХост.итоговыйМанифест().durationMs === комХост.итоговыйМанифест().endedAt - комХост.итоговыйМанифест().startedAt);

    /* миграция хоста */
    комГость.хостОтвалился('h-1');
    ок('гость взял руль', комГость.state.host === 'g-1' && комГость.этохост());
    ок('участник-хост удалён', !комГость.state.participants.some(p => p.id === 'h-1'));

    /* BYE гостя */
    комХост.покинуть(); /* хост уходит — у мока нет onPeers, проверяем только отсутствие исключений */

    console.log('\nИТОГО: passed=' + passed + ' failed=' + failed);
    process.exit(failed ? 1 : 0);
  })().catch(e => { console.error('FAIL: исключение', e); process.exit(1); });
}
