/* ═══ Такт v10.84 «КРУГ СВОИХ» (С59) · Л5-P3.1: тесты krug-profiles ═══
   Канон один: ДОКУМЕНТЫ/ТРЕКИ/LADOM_SINGULAR/src/krug-profiles.js —
   тесты грузят ЕГО ЖЕ через node:vm (зал ·17 берёт его классическим
   <script>). 0 сети · 0 eval (vm.runInNewContext — только наш файл).
   Часы не участвуют: ts передаётся фиксированный. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', 'src', 'krug-profiles.js');
const code = readFileSync(SRC, 'utf8');

/* Загрузчик канона в песочнице — тот же файл, что зал ·17 грузит скриптом. */
function load() {
  const sandbox = { self: {}, module: { exports: {} }, console };
  vm.runInNewContext(code, sandbox, { filename: 'krug-profiles.js' });
  const api = sandbox.self.КругПрофили || sandbox.module.exports;
  assert.ok(api && api.встреча, 'канон не встал в песочницу');
  return api;
}

/* Массивы из vm-realm сравниваются только через JSON (realms разные). */
const rt = (x) => JSON.parse(JSON.stringify(x));

/* Адаптер-память: честный JSON-адаптер без DOM/localStorage. */
function память(начальное) {
  let ж = начальное === undefined ? null : JSON.parse(JSON.stringify(начальное));
  return {
    load: () => (ж === null ? null : JSON.parse(JSON.stringify(ж))),
    save: (с) => { ж = JSON.parse(JSON.stringify(с)); },
    сырой: () => JSON.parse(JSON.stringify(ж))
  };
}

const А = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const Б = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const В = 'cccccccccccccccccccccccccccccccc';
const Т1 = 1700000000000, Т2 = 1700000600000, Т3 = 1700001200000;

test('00 · канон грузится в песочнице и честно версионируется', () => {
  const К = load();
  assert.equal(К.ver, 'krug-profiles/0.1');
  assert.equal(typeof К.встреча, 'function');
  assert.equal(typeof К.повторныйКонтакт, 'function');
});

test('01 · ключ: 32 hex, форма держится, рандомный путь честный', () => {
  const К = load();
  const к1 = К.новыйКлюч(() => 0);            /* нули → 32 нуля */
  assert.ok(/^[0-9a-f]{32}$/.test(к1), 'ключ по форме');
  const к2 = К.новыйКлюч();
  assert.ok(/^[0-9a-f]{32}$/.test(к2), 'ключ по форме без ран');
  assert.notEqual(к1, к2);
});

test('02 · устройство: ключ переживает перезагрузку (persist)', () => {
  const К = load();
  const хр = память();
  const у1 = К.устройство(хр, undefined, Т1);
  const у2 = К.устройство(хр, undefined, Т2);
  assert.equal(у1.key, у2.key, 'тот же ключ после «перезагрузки»');
  assert.ok(/^[0-9a-f]{32}$/.test(у1.key));
  const свеж = К.устройство(память(), undefined, Т1);
  assert.notEqual(свеж.key, у1.key, 'у другого устройства свой ключ');
});

test('03 · устройство: битая запись в памяти не роняет — честная новая', () => {
  const К = load();
  const хр = память({ key: 'мусор', имя: 'х' });
  const у = К.устройство(хр, undefined, Т1);
  assert.ok(/^[0-9a-f]{32}$/.test(у.key));
});

test('04 · первая встреча создаёт профиль с согласием «спрошено»', () => {
  const К = load();
  const а = память();
  const р = К.встреча(а, { key: Б, имя: 'ЗАЛ ·17', роль: 'зал' }, Т1);
  assert.equal(р.первая, true);
  assert.equal(rt(р.профиль).согласие, 'спрошено');
  assert.equal(rt(р.профиль).встреч, 1);
  assert.equal(rt(р.профиль).первая, Т1);
  assert.equal(rt(р.профиль).последняя, Т1);
});

test('05 · повторная встреча: встреч++, первая не трогается', () => {
  const К = load();
  const а = память();
  К.встреча(а, { key: Б, имя: 'ЗАЛ ·17', роль: 'зал' }, Т1);
  const р2 = К.встреча(а, { key: Б, имя: 'ЗАЛ ·17', роль: 'зал' }, Т2);
  assert.equal(р2.первая, false);
  const п = rt(К.профиль(а, Б));
  assert.equal(п.встреч, 2);
  assert.equal(п.первая, Т1, 'первая встреча неизменна');
  assert.equal(п.последняя, Т2);
});

test('06 · ЗАКОН СОГЛАСИЯ: незнакомец → вопрос', () => {
  const К = load();
  const а = память();
  const р = К.повторныйКонтакт(а, Б);
  assert.equal(rt(р).ok, false);
  assert.equal(rt(р).причина, 'незнакомец');
  assert.equal(rt(р).вопрос, true);
});

test('07 · ЗАКОН: «спрошено» → вопрос (по умолчанию после первой встречи)', () => {
  const К = load();
  const а = память();
  К.встреча(а, { key: Б, имя: 'ЗАЛ', роль: 'зал' }, Т1);
  const р = К.повторныйКонтакт(а, Б);
  assert.equal(rt(р).ok, false);
  assert.equal(rt(р).вопрос, true);
});

test('08 · ЗАКОН: «разрешено» → контакт идёт без вопроса, рендеву отдаётся', () => {
  const К = load();
  const а = память();
  К.встреча(а, { key: Б, имя: 'ЗАЛ', роль: 'зал' }, Т1);
  К.согласие(а, Б, 'разрешено');
  const р = К.повторныйКонтакт(а, Б);
  assert.equal(rt(р).ok, true);
  assert.equal(rt(р).рендеву, 'krug-' + Б);
  assert.equal(rt(р).вопрос, undefined);
});

test('09 · ЗАКОН: «запрещено» → честный отказ БЕЗ вопроса', () => {
  const К = load();
  const а = память();
  К.встреча(а, { key: Б, имя: 'ЗАЛ', роль: 'зал' }, Т1);
  К.согласие(а, Б, 'запрещено');
  const р = К.повторныйКонтакт(а, Б);
  assert.equal(rt(р).ok, false);
  assert.equal(rt(р).причина, 'запрещено');
  assert.equal(rt(р).вопрос, false);
});

test('10 · «забыть» удаляет по-настоящему: повторный контакт снова незнакомец', () => {
  const К = load();
  const а = память();
  К.встреча(а, { key: Б, имя: 'ЗАЛ', роль: 'зал' }, Т1);
  assert.equal(К.забыть(а, Б), true);
  assert.equal(К.забыть(а, Б), false, 'второй раз удалять нечего — честно false');
  const р = К.повторныйКонтакт(а, Б);
  assert.equal(rt(р).причина, 'незнакомец');
});

test('11 · рендеву детерминирован: один ключ — одно имя встречи', () => {
  const К = load();
  assert.equal(К.рендеву(А), 'krug-' + А);
  assert.equal(К.рендеву(А), К.рендеву(А));
  assert.throws(() => К.рендеву('мусор'), /не по форме/);
});

test('12 · согласие о незнакомце не выдумывается', () => {
  const К = load();
  const а = память();
  assert.throws(() => К.согласие(а, Б, 'разрешено'), /незнакомц/);
  assert.throws(() => К.согласие(а, Б, 'навсегда'), /нет такого согласия/);
});

test('13 · список детерминирован: сорт по ключу, дважды одинаково', () => {
  const К = load();
  const а = память();
  К.встреча(а, { key: В, имя: 'телефон', роль: 'телефон' }, Т1);
  К.встреча(а, { key: Б, имя: 'ЗАЛ', роль: 'зал' }, Т2);
  К.встреча(а, { key: А, имя: 'гость', роль: 'гость' }, Т3);
  const с1 = rt(К.список(а)).map((п) => п.key);
  const с2 = rt(К.список(а)).map((п) => п.key);
  assert.deepEqual(с1, [А, Б, В], 'сорт по ключу');
  assert.deepEqual(с1, с2);
});

test('14 · лимит круга честный: 64-й +1 — отказ с внятной причиной', () => {
  const К = load();
  const а = память();
  for (let i = 0; i < К.лимит; i++) {
    const к = ('0'.repeat(32) + (i + 1).toString(16)).slice(-32);
    К.встреча(а, { key: к, имя: 'г' + i, роль: 'гость' }, Т1);
  }
  assert.equal(rt(К.список(а)).length, К.лимит);
  assert.throws(() => К.встреча(а, { key: Б, имя: 'лишний', роль: 'гость' }, Т2), /круг полон/);
  /* свой (уже в круге) не вылетает — счётчик растёт честно */
  const в1 = К.встреча(а, { key: ('0'.repeat(32) + (1).toString(16)).slice(-32), имя: 'старый знакомый' }, Т3);
  assert.equal(rt(в1.профиль).встреч, 2);
});

test('15 · битые ключи не проходят ни в одну дверь', () => {
  const К = load();
  const а = память();
  assert.throws(() => К.встреча(а, { key: 'мусор' }, Т1), /не по форме/);
  assert.throws(() => К.забыть(а, ''), /не по форме/);
  assert.throws(() => К.повторныйКонтакт(а, null), /не по форме/);
});

test('16 · повреждённый став не роняет круг — честная пересборка', () => {
  const К = load();
  const а = память({ v: 9, профили: 'мусор' });
  assert.deepEqual(rt(К.список(а)), []);
  const б = память({ v: 1, профили: [
    { key: Б, имя: 'ЗАЛ', роль: 'зал', первая: Т1, последняя: Т1, встреч: 3, согласие: 'невесть-что' },
    { key: 'мусорный-ключ', имя: 'х' },
    { key: Б, имя: 'дубль' }
  ]});
  const с = rt(К.список(б));
  assert.equal(с.length, 1, 'мусор и дубль сняты');
  assert.equal(с[0].согласие, 'спрошено', 'невесть-что → честное «спрошено»');
  assert.equal(с[0].встреч, 3);
});

test('17 · JSON round-trip: став между адаптерами переносится без потерь', () => {
  const К = load();
  const а = память();
  К.встреча(а, { key: Б, имя: 'ЗАЛ', роль: 'зал' }, Т1);
  К.согласие(а, Б, 'разрешено');
  const б = память(а.сырой());
  const р = К.повторныйКонтакт(б, Б);
  assert.equal(rt(р).ok, true);
  assert.equal(rt(р).рендеву, 'krug-' + Б);
});

test('18 · чистота канона: 0 сети · 0 document · 0 eval в исходнике', () => {
  assert.equal(code.includes('fetch('), false, 'нет fetch');
  assert.equal(code.includes('XMLHttpRequest'), false, 'нет XHR');
  assert.equal(code.includes('WebSocket'), false, 'нет WebSocket');
  assert.equal(code.includes('eval('), false, 'нет eval');
  assert.equal(code.includes('document.'), false, 'нет document');
  assert.equal(code.includes('localStorage'), false, 'хранилище снаружи — адаптером');
});

test('19 · встреча идемпотентна по данным внутри одного ts: счётчик живой, мусор не плодится', () => {
  const К = load();
  const а = память();
  К.встреча(а, { key: Б, имя: 'ЗАЛ', роль: 'зал' }, Т1);
  К.встреча(а, { key: Б, имя: 'ЗАЛ', роль: 'зал' }, Т1);
  const с = rt(К.список(а));
  assert.equal(с.length, 1);
  assert.equal(с[0].встреч, 2, 'каждое рукопожатие считается — это встречи, не дедуп сообщений');
});

test('20 · чужой realm: API отдаёт JSON-безопасные значения (сравнение через JSON)', () => {
  const К = load();
  const а = память();
  К.встреча(а, { key: Б, имя: 'ЗАЛ ·17', роль: 'зал' }, Т1);
  const изVm = К.список(а);
  const копия = rt(изVm);
  assert.deepEqual(копия, JSON.parse(JSON.stringify(копия)));
  assert.equal(копия.length, 1);
});

test('21 · устройство и профили в одном хранилище не затирают друг друга (регресс живой поверки)', () => {
  const К = load();
  const а = память();
  const у1 = К.устройство(а, undefined, Т1);
  К.встреча(а, { key: Б, имя: 'ЗАЛ', роль: 'зал' }, Т1);
  К.согласие(а, Б, 'разрешено');
  /* перезагрузка: устройство читается из того же хранилища, профили целы */
  const у2 = К.устройство(а, undefined, Т2);
  assert.equal(у2.key, у1.key, 'ключ устройства пережил запись профилей');
  const р = К.повторныйКонтакт(а, Б);
  assert.equal(rt(р).ok, true, 'согласие пережило чтение устройства');
  assert.equal(rt(К.список(а)).length, 1);
  /* и наоборот: встреча после чтения устройства не стёрла ключ */
  К.встреча(а, { key: Б, имя: 'ЗАЛ', роль: 'зал' }, Т2);
  const у3 = К.устройство(а, undefined, Т3);
  assert.equal(у3.key, у1.key, 'ключ устройства пережил повторную встречу');
  /* устройство-поле переживает мусор в профилях */
  const сырой = а.сырой();
  сырой.профили = 'мусор';
  const б = память(сырой);
  const у4 = К.устройство(б, undefined, Т3);
  assert.equal(у4.key, у1.key, 'устройство живо даже при битых профилях');
});
