/* Тест двери ·33 ФОНД (такт v1.47.0): манифест + симметрия нитей, конфиг
   общака без секретов, чистые функции счёта, домовой QR == ·17, дверь без
   innerHTML, SW несёт ·33 и конфиг сетью-первой.
   Запуск: node --test ИНСТРУМЕНТЫ/test_s33_fond_logic.js */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const КОРЕНЬ = join(dirname(fileURLToPath(import.meta.url)), '..');
const ч = (п) => readFileSync(join(КОРЕНЬ, п), 'utf-8');

const МОДУЛИ = ч('singulyar-modules.js');
const ДВЕРЬ = ч('СИНГУЛЯР_33_ФОНД.html');
const ОБЩАК = JSON.parse(ч('ФОНД/ОБЩАК.json'));
const SW = ч('sw15.js');
const ИНДЕКС = ч('index.html');
const ЗАЛ = ч('СИНГУЛЯР_17_ЗАЛ.html');

/* ---------- вынуть запись двери из карты модулей ---------- */
function записи() {
  const карта = [];
  const р = /id:\s*'([^']+)'/g;
  let м;
  while ((м = р.exec(МОДУЛИ)) !== null) {
    const старт = м.index;
    const след = МОДУЛИ.indexOf("id: '", старт + 1);
    const кусок = МОДУЛИ.slice(старт, след === -1 ? МОДУЛИ.length : след);
    карта.push({ id: м[1], кусок });
  }
  return карта.filter(з => !['слово', 'голос', 'звук', 'образ', 'такт', 'жест'].includes(з.id));
}
function связиИз(кусок) {
  const м = кусок.match(/связи:\s*\[([^\]]*)\]/);
  if (!м) return [];
  return м[1].split(',').map(с => с.trim().replace(/['"]/g, '')).filter(Boolean);
}
function файлИз(кусок) {
  const м = кусок.match(/файл:\s*'([^']+)'/);
  return м ? м[1] : null;
}

test('карта: двери s33 ФОНД и s34 ДОМ ФОНДА на месте, файлов-дверей 23 + хаб', () => {
  const з = записи().find(х => х.id === 's33');
  assert.ok(з, 'в карте нет s33');
  assert.equal(файлИз(з.кусок), 'СИНГУЛЯР_33_ФОНД.html');
  const з34 = записи().find(х => х.id === 's34');
  assert.ok(з34, 'в карте нет s34');
  assert.equal(файлИз(з34.кусок), 'СИНГУЛЯР_34_ДОМ_ФОНДА.html');
  const файлы = записи().map(з => файлИз(з.кусок)).filter(ф => ф && ф !== 'ДОКУМЕНТАЦИЯ.html');
  assert.equal(файлы.length, 24, 'ожидалось 23 двери + хаб, вышло ' + файлы.length);
});

test('карта: версии ядра подняты до 1.14.0 (v1.49.1: ДОМ ОБНОВИЛСЯ)', () => {
  assert.match(МОДУЛИ, /ЯДРО МОДУЛЕЙ v1\.14\.0/);
  assert.match(МОДУЛИ, /__SINGULYAR_MODULES__ = 'v1\.14\.0'/);
  assert.match(МОДУЛИ, /версия:\s*'1\.14\.0'/);
});

test('закон симметрии нитей: каждая связь имеет обратную', () => {
  const карта = {};
  for (const з of записи()) карта[з.id] = связиИз(з.кусок);
  const дыры = [];
  for (const [от, связь] of Object.entries(карта)) {
    for (const к of связь) {
      if (!карта[к]) { дыры.push(от + '→' + к + ' (цели нет)'); continue; }
      if (!карта[к].includes(от)) дыры.push(от + '→' + к + ' (нет обратной)');
    }
  }
  assert.deepEqual(дыры, [], 'нити несимметричны: ' + дыры.join(', '));
  assert.ok(карта['s25'].includes('s33') && карта['s33'].includes('s25'), 'нить s25⇄s33');
  assert.ok(карта['s28'].includes('s33') && карта['s33'].includes('s28'), 'нить s28⇄s33');
  assert.ok(карта['s32'].includes('s33') && карта['s33'].includes('s32'), 'нить s32⇄s33');
  assert.ok(карта['s25'].includes('s34') && карта['s34'].includes('s25'), 'нить s25⇄s34');
  assert.ok(карта['s28'].includes('s34') && карта['s34'].includes('s28'), 'нить s28⇄s34');
  assert.ok(карта['s33'].includes('s34') && карта['s34'].includes('s33'), 'нить s33⇄s34');
});

test('ФОНД/ОБЩАК.json: схема честная, секретов нет, адреса валидны или пусты', () => {
  assert.equal(ОБЩАК.schema, 'singulyar-fond/obschak/v0.1');
  assert.ok(Array.isArray(ОБЩАК.адреса));
  assert.ok(Array.isArray(ОБЩАК.узлы) && ОБЩАК.узлы.length >= 3, 'узлов разведки мало');
  assert.equal(ОБЩАК.узлы[0].имя, 'mempool.space');
  /* v1.48.0: фонд наш — дом фонда, устав и независимость в конфиге */
  assert.equal(ОБЩАК.дом_фонда, 'СИНГУЛЯР_34_ДОМ_ФОНДА.html');
  assert.equal(ОБЩАК.устав, 'ФОНД/УСТАВ_ФОНДА.md');
  assert.match(ОБЩАК.независимость, /helenkellerfoundation\.org/);
  assert.match(ОБЩАК.независимость, /helenkellerintl\.org/);
  assert.match(ОБЩАК.независимость, /не имеют/);
  assert.ok(existsSync(join(КОРЕНЬ, ОБЩАК.дом_фонда)), 'файл дома фонда на диске');
  assert.ok(existsSync(join(КОРЕНЬ, ОБЩАК.устав)), 'файл устава на диске');
  const секреты = /priv|wif|seed|мнемоник|xprv|5[HJK][1-9A-HJ-NP-Za-km-z]{25,}|L[1-9A-HJ-NP-Za-km-z]{25,}|K[1-9A-HJ-NP-Za-km-z]{25,}/i;
  const текст = JSON.stringify(ОБЩАК);
  assert.equal(секреты.test(текст), false, 'в конфиге общака след секрета!');
  for (const а of ОБЩАК.адреса) {
    assert.match(а, /^(bc1[a-z0-9]{20,71}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/, 'битый адрес в конфиге: ' + а);
  }
});

test('дверь ·33: КОРД стоит, referrer отрезан, ноль innerHTML/eval/документ-писанины, внешних дверей фонда нет', () => {
  assert.match(ДВЕРЬ, /СНГ:КОРД/);
  assert.match(ДВЕРЬ, /<meta name="referrer" content="no-referrer">/);
  assert.equal(/innerHTML/.test(ДВЕРЬ), false, 'в двери есть innerHTML — канон нарушен');
  assert.equal(/document\.write/.test(ДВЕРЬ), false);
  assert.equal(/[^.а-яa-z]eval\(/.test(ДВЕРЬ), false, 'в двери есть eval');
  assert.match(ДВЕРЬ, /referrerPolicy:\s*'no-referrer'/);
  /* v1.48.0: внешние двери «официальных фондов Келлер» убраны словом владельца */
  assert.equal(/href="https:\/\/(www\.)?(hki\.org|helenkellerfoundation\.org)/.test(ДВЕРЬ), false,
    'в ·33 остались внешние двери чужих фондов');
  assert.match(ДВЕРЬ, /СИНГУЛЯР_34_ДОМ_ФОНДА\.html/, 'дверь на хартию фонда ·34 на месте');
});

test('чистые функции двери: арифметика счёта сходится (живые цифры генезис-адреса)', () => {
  const м = ДВЕРЬ.match(/\/\*ТЕСТ:НАЧАЛО\*\/([\s\S]*?)\/\*ТЕСТ:КОНЕЦ\*\//);
  assert.ok(м, 'маркеры ТЕСТ:НАЧАЛО/КОНЕЦ потерялись');
  const песочница = {};
  vm.createContext(песочница);
  vm.runInContext(м[1] + '\nthis.выдача = { валиденАдрес, разборЭсплоры, разборБлоксайфера, разборЦепиИнфо, сатоВБтк, сатоГрупп, бип21, нормУзел, извлечьПриходы };', песочница);
  const Ф = песочница.выдача;

  const генезис = { chain_stats: { funded_txo_sum: 5757895944, spent_txo_sum: 0, tx_count: 66834 }, mempool_stats: { funded_txo_sum: 10224, spent_txo_sum: 0 } };
  const р1 = Ф.разборЭсплоры(генезис);
  assert.equal(р1.подтверждено, 5757895944);
  assert.equal(р1.вПолёте, 10224);
  const р2 = Ф.разборБлоксайфера({ balance: 100, final_balance: 250 });
  assert.equal(р2.подтверждено, 100);
  assert.equal(р2.вПолёте, 150);
  const р3 = Ф.разборЦепиИнфо({ final_balance: 700 });
  assert.equal(р3.подтверждено, 700);
  assert.equal(р3.вПолёте, null);
  assert.equal(Ф.разборЭсплоры({ битое: true }), null, 'битый ответ узла должен быть null');

  assert.equal(Ф.сатоВБтк(5757895944), '57.57895944');
  assert.equal(Ф.сатоВБтк(10224), '0.00010224');
  assert.equal(Ф.сатоВБтк(100000000), '1.0');
  assert.equal(Ф.сатоВБтк(0), '0.0');
  assert.equal(Ф.сатоВБтк(-5), '0');
  assert.equal(Ф.сатоГрупп(5757895944), '5 757 895 944');
  assert.equal(Ф.сатоГрупп(1024), '1 024');
  assert.equal(Ф.бип21('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'), 'bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');

  assert.equal(Ф.нормУзел('https://мой-узел/api/'), 'https://мой-узел/api');
  assert.equal(Ф.нормУзел('localhost:8332'), 'http://localhost:8332');
  assert.equal(Ф.нормУзел('ftp://хитрый'), '');

  assert.equal(Ф.валиденАдрес('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'), true);
  assert.equal(Ф.валиденАдрес('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4'), true);
  assert.equal(Ф.валиденАдрес('bc1'), false);
  assert.equal(Ф.валиденАдрес('вот тут биткоин, верь мне'), false);

  const тхс = [
    { txid: 'аа'.repeat(0) + 'tx1'.padEnd(64, '0'), vout: [{ scriptpubkey_address: 'чужой', value: 999 }, { scriptpubkey_address: 'наш', value: 2100 }], status: { confirmed: true, block_time: 1700000000 } },
    { txid: 'tx2'.padEnd(64, '0'), vout: [{ scriptpubkey_address: 'наш', value: 500 }], status: { confirmed: false } },
    { txid: 'tx3'.padEnd(64, '0'), vout: [{ scriptpubkey_address: 'наш', value: 7000 }], status: { confirmed: true, block_time: 1600000000 } }
  ];
  const приход = Ф.извлечьПриходы('наш', тхс, 2);
  assert.equal(приход.length, 2);
  assert.equal(приход[0].сатоши, 2100);
  assert.equal(приход[0].подтверждено, true);
  assert.equal(приход[1].сатоши, 500);
  assert.equal(приход[1].подтверждено, false);
  assert.equal(Ф.извлечьПриходы('наш', 'мусор', 8).length, 0);
});

test('домовой QR: в ·33 стоит тот же энкодер, что в ·17 (verbatim)', () => {
  const старт = ЗАЛ.indexOf('/* ── 0. QR-ЭНКОДЕР');
  assert.ok(старт >= 0, 'QR-блок не найден в ·17');
  const конец = ЗАЛ.indexOf('/* ── 1. ТРАНСПОРТ', старт);
  assert.ok(конец > старт, 'конец QR-блока не найден в ·17');
  const изЗала = ЗАЛ.slice(старт, конец).trim();
  assert.ok(ДВЕРЬ.includes(изЗала),
    'QR-энкодер ·33 отличается от ·17 — менять его нельзя без прогона test_qr_vs_python');
});

test('летопись: шаблон issue на месте с честной шапкой', () => {
  const т = ч('.github/ISSUE_TEMPLATE/фонд-летопись.md');
  assert.match(т, /^---\n/);
  assert.match(т, /name:\s*Летопись фонда/);
  assert.match(т, /добровольн/i);
});

test('SW v60: несёт ·33, ·34 и конфиг общака, конфиг ходит сетью-первой', () => {
  assert.match(SW, /s15-orkestrator-v60/);
  assert.match(SW, /'\.\/СИНГУЛЯР_33_ФОНД\.html'/);
  assert.match(SW, /'\.\/СИНГУЛЯР_34_ДОМ_ФОНДА\.html'/);
  assert.match(SW, /'\.\/ФОНД\/УСТАВ_ФОНДА\.md'/);
  assert.match(SW, /'\.\/ФОНД\/ОБЩАК\.json'/);
  assert.ok(SW.includes('/\\/ФОНД\\/ОБЩАК\\.json$/.test(путьОбщака)'),
            'SW не ходит за конфигом общака сетью-первой');
});

test('index: счёт дверей 23, устаревших счётчиков нет', () => {
  assert.equal(/20 двер/.test(ИНДЕКС), false, 'в index остались «20 дверей»');
  assert.equal(/22 двер/.test(ИНДЕКС), false, 'в index остались «22 двери»');
  assert.match(ИНДЕКС, /23 двер/);
});
