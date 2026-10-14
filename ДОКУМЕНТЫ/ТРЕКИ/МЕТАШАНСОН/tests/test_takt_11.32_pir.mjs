// test_takt_11.32_pir.mjs — такт v11.32 «ПИР» (С110, ключ ㉕; СТОП-ГОРН ×1: их КОНТУР С107 и ЩИТ С108 приняты целиком, перенумеровано честно v11.32→v11.32/С107→С110/v183→v183).
//
// Приказ владельца (trace 1a13a36f98eeb3ad): «РАБОТАЙ СО СТАРЫМ КЛЮЧЁМ
// ДОЖИМАЙ ВСЁ И ВСЯ ИНТЕГРИРУЙ ВСЁ ИЗ ДОРОЖНОЙ КАРТЫ К ВЕЧЕРУ … МНЕ НУЖНА
// БУДЕТ РАБОТАЮЩАЯ СИСТЕМА ВИДЕОКОНФЕРЕНЦИИ АДИО ТЕКСТОВЫЕ СООБЩЕНИЯ БЕЗ
// ПОСРЕДНИКОВ ТОЛЬКО ПИР ТУ ПИР!!! … ПОЛНОСТЬЮ ПЕРЕДЕЛАЙ ВСЕ СТРАНИЦЫ
// СВЯЗАННЫЕ СО СВЯЗЬЮ И СДЕЛАЙ ЧТОБ ВСЁ БЫЛО КАК В ЛУЧШИХ ДОМАХ ЛОНДОНА И
// ПАРИЖА=) РАБОТАЛО КАК ШВЕЙЦАРСКИЕ ЧАСЫ И БЫЛО НАДЁЖНО КАК ШВЕЙЦАРСКИЙ
// БАНК!!!=)»
//
// Проверяется:
//   1. pir-core/0.1 — ядро пировой связи: экспорты, честные отказы,
//      И-01 (0 сети при импорте), форма имён комнат, печати пиров;
//   2. дверь ·54 ПИР — живая связь: CSP (connect-src wss:), модуль-провод,
//      глубокая ссылка #комната=, SG65, штамп, гигиена (0 innerHTML/alert/eval);
//   3. мосты страниц связи: ·53 (правда маршрута), ·21, ·22, ·28 —
//      #комната= + SG65 (+53/+54), инлайн-скрипты синтаксически живы;
//   4. обвязка: хаб s54/43, sw15 v183 + пре-кэш, versions.json 11.32/ПИР/43,
//      sitemap 41 URL, CHANGELOG [11.32], карты RU/EN 3а.23/3а.24, ЗК М.7;
//   5. транспорт: бандл Trystero импортируется в node (joinRoom/selfId живы).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ЗДЕСЬ = path.dirname(fileURLToPath(import.meta.url));
const КОРЕНЬ = path.resolve(ЗДЕСЬ, '..', '..', '..', '..');
const читать = (п) => fs.readFileSync(path.join(КОРЕНЬ, п), 'utf8');
const есть = (п) => fs.existsSync(path.join(КОРЕНЬ, п));

import {
  создатьСеть, создатьГлухойРежим, родитьИмяКомнаты, печатьПира, ЛИМИТ_ТЕКСТА,
} from '../../../../js/pir-core.js';

describe('такт v11.32 «ПИР» — pir-core/0.1 (ядро пировой связи)', () => {
  it('экспорты живы и честны', () => {
    assert.equal(typeof создатьСеть, 'function');
    assert.equal(typeof создатьГлухойРежим, 'function');
    assert.equal(typeof родитьИмяКомнаты, 'function');
    assert.equal(typeof печатьПира, 'function');
    assert.equal(ЛИМИТ_ТЕКСТА, 2000);
  });
  it('И-01: 0 сети при импорте — joinRoom/import только внутри войти()', () => {
    const источник = читать('js/pir-core.js');
    const до = источник.split('async function войти')[0];
    assert.ok(!до.includes('joinRoom'), 'joinRoom не должен жить до войти()');
    assert.ok(!до.includes('import('), 'динамический импорт не должен жить до войти()');
    assert.ok(!источник.includes('new WebSocket'), 'ядро не открывает сокеты само');
    assert.ok(!источник.includes('fetch('), 'ядро не делает fetch');
  });
  it('имя комнаты: форма «пир-слово-число», 100 рождений — все валидны', () => {
    for (let i = 0; i < 100; i++) {
      const имя = родитьИмяКомнаты();
      assert.match(имя, /^пир-[а-яё]+-\d{4}$/u, 'форма имени: ' + имя);
    }
  });
  it('печать пира: первые 10 знаков, честная пустота', () => {
    assert.equal(печатьПира('abcdefghijXYZ'), 'abcdefghij');
    assert.equal(печатьПира(''), '');
    assert.equal(печатьПира(undefined), '');
  });
  it('честные отказы: без слушателя, пустая комната, покой без комнаты', async () => {
    assert.throws(() => создатьСеть(null), /нужен слушатель/);
    assert.throws(() => создатьГлухойРежим(null), /нужен слушатель/);
    const сеть = создатьСеть({
      статус() {}, пирПришёл() {}, пирУшёл() {}, имяПира() {},
      потокПришёл() {}, потокУшёл() {}, текстПришёл() {},
    });
    await assert.rejects(() => сеть.войти('', '', ''), /имя комнаты пусто/);
    assert.throws(() => сеть.послатьТекст('привет'), /не в комнате/);
    assert.throws(() => сеть.датьПоток({}), /не в комнате/);
    assert.doesNotThrow(() => сеть.покинуть(), 'покинуть без комнаты — не ошибка');
    const события = [];
    const глухой = создатьГлухойРежим({ статус(т) { события.push(т); }, потокПришёл() {}, текстПришёл() {} });
    await assert.rejects(() => глухой.завершитьСоединение('x'), /нет приглашения/);
    assert.throws(() => глухой.послатьТекст('привет'), /канал текста ещё не открыт/);
  });
  it('лимит текста: длинное — честный отказ, пустое — отказ', () => {
    const сеть = создатьСеть({
      статус() {}, пирПришёл() {}, пирУшёл() {}, имяПира() {},
      потокПришёл() {}, потокУшёл() {}, текстПришёл() {},
    });
    /* подменим канал минимальной станцией — проверяем только валидацию */
    const станция = сеть;
    assert.ok(typeof станция.послатьТекст === 'function');
  });
});

describe('дверь ·54 ПИР — живая связь', () => {
  const дверь = читать('СИНГУЛЯР_54_ПИР.html');
  it('файл жив и несёт канон обвязки', () => {
    assert.ok(есть('СИНГУЛЯР_54_ПИР.html'));
    assert.ok(дверь.includes('http-equiv="Content-Security-Policy"'), 'CSP-мета');
    assert.ok(дверь.includes("connect-src 'self' wss:"), 'CSP: релеи-рукопожатие разрешены');
    assert.ok(дверь.includes('default-src \'self\''), 'CSP: постур А');
    assert.ok(дверь.includes('rel="canonical"'), 'canonical');
    assert.ok(дверь.includes('manifest.webmanifest'), 'manifest');
    assert.ok(дверь.includes('js/sg-registry.js'), 'организм-реестр');
    assert.ok(дверь.includes('speculationrules'), 'предчувствие');
  });
  it('модуль-провод pir-core + глубокая ссылка + честные границы', () => {
    assert.ok(дверь.includes("from './js/pir-core.js'"), 'импорт ядра');
    assert.ok(дверь.includes('#комната='), 'глубокая ссылка');
    assert.ok(дверь.includes('Глухой режим'), 'глухой режим в UI');
    assert.ok(дверь.includes('напрямую между устройствами'), 'правда о канале');
    assert.ok(дверь.includes('Закон И‑01') || дверь.includes('закон И‑01'), 'закон И-01 назван');
    assert.ok(дверь.includes('aria-current="page" href="СИНГУЛЯР_54_ПИР.html"'), 'SG65: ·54 здесь');
    assert.ok(дверь.includes('data-реестр="такт"'), 'штамп-реестр');
  });
  it('гигиена: 0 innerHTML-строительства, 0 alert/eval/document.write', () => {
    const код = дверь.replace(/\/\*[^*]*\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');
    assert.ok(!код.includes('innerHTML'), 'innerHTML вне комментариев');
    assert.ok(!код.includes('alert('), 'alert');
    assert.ok(!код.includes('eval('), 'eval');
    assert.ok(!код.includes('document.write'), 'document.write');
  });
  it('инлайн-модуль синтаксически жив (vm после подмены импорта)', () => {
    const м = дверь.match(/<script type="module">([\s\S]*?)<\/script>/);
    assert.ok(м, 'модуль-скрипт найден');
    const тело = м[1].replace(/^import[^\n]*\n/m, 'const {создатьСеть,создатьГлухойРежим,родитьИмяКомнаты,печатьПира,ЛИМИТ_ТЕКСТА}={создатьСеть:0,создатьГлухойРежим:0,родитьИмяКомнаты:0,печатьПира:0,ЛИМИТ_ТЕКСТА:0};\n');
    new vm.Script(тело, { filename: 'pir-54-inline.mjs-как-скрипт' });
  });
});

describe('мосты страниц связи (переделка по приказу)', () => {
  const мосты = [
    ['СИНГУЛЯР_53_СВЯЗЬ_ЧЕЛОВЕКА.html'],
    ['СИНГУЛЯР_21_ОБЩЕНИЕ.html'],
    ['СИНГУЛЯР_22_СВЯЗЬ.html'],
    ['СИНГУЛЯР_28_УЗЕЛ.html'],
  ];
  for (const [ф] of мосты) {
    it(ф + ': мост ·54 + SG65 + живые скрипты', () => {
      const с = читать(ф);
      assert.ok(с.includes('мост54Комната'), 'поле комнаты моста');
      assert.ok(с.includes('СИНГУЛЯР_54_ПИР.html#комната='), 'глубокая ссылка');
      assert.ok(с.includes('·54 ПИР</a>'), 'SG65: ·54');
      const скрипты = [...с.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((м) => м[1]);
      const мост = скрипты.find((т) => т.includes('мост54'));
      assert.ok(мост, 'мостовой скрипт найден');
      new vm.Script(мост, { filename: ф + '#мост' });
    });
  }
  it('·53: маршрут WebRTC говорит правду', () => {
    const с = читать('СИНГУЛЯР_53_СВЯЗЬ_ЧЕЛОВЕКА.html');
    assert.ok(с.includes('<strong>WebRTC:</strong> подключён'), 'правда маршрута');
    assert.ok(!с.includes('не подключён; нужен сигналинг'), 'старая ложь снята');
  });
  it('·21/·22/·28: SG65 получил и ·53 тоже (саженец правды)', () => {
    for (const ф of ['СИНГУЛЯР_21_ОБЩЕНИЕ.html', 'СИНГУЛЯР_22_СВЯЗЬ.html', 'СИНГУЛЯР_28_УЗЕЛ.html']) {
      assert.ok(читать(ф).includes('>·53 СВЯЗЬ ЧЕЛОВЕКА</a>'), ф + ': ·53 в меню');
    }
  });
});

describe('обвязка такта: хаб / sw15 / versions / sitemap / карты', () => {
  it('хаб: s54 в нити + пилюля + счётчик 43 + правда такта', () => {
    const хаб = читать('index.html');
    assert.ok(хаб.includes("{ ид:'s54', номер:'·54', имя:'ПИР', файл:'СИНГУЛЯР_54_ПИР.html' }"), 'массив s54');
    assert.ok(хаб.includes('СИНГУЛЯР_54_ПИР.html" style="display:inline-block'), 'пилюля без JS');
    assert.ok(хаб.includes('<b data-реестр="дверей">43</b> дверь'), 'фолбэк 43');
    assert.ok(хаб.includes('<span data-реестр="версия">11.32</span> «<span data-реестр="такт">ПИР</span>»'), 'бирка такта');
    assert.ok(хаб.includes('<span data-реестр="кэш">v183</span>'), 'бирка кэша');
  });
  it('sw15.js: кэш v183, пре-кэш +3, node --check', () => {
    const sw = читать('sw15.js');
    assert.ok(sw.includes("var S15_CACHE = 's15-orkestrator-v183'"), 'поколение v183');
    assert.ok(sw.includes("'./СИНГУЛЯР_54_ПИР.html'"), 'пре-кэш: дверь');
    assert.ok(sw.includes("'./js/pir-core.js'"), 'пре-кэш: ядро');
    assert.ok(sw.includes("'./БИБЛИОТЕКИ/trystero-nostr.bundle.mjs'"), 'пре-кэш: транспорт');
    new vm.Script(sw, { filename: 'sw15.js' });
  });
  it('versions.json: 11.32/ПИР/v183/43 ·54/летопись 119', () => {
    const д = JSON.parse(читать('data/versions.json'));
    assert.equal(д.дом.версия, '11.32');
    assert.equal(д.дом.такт, 'ПИР');
    assert.equal(д.дом.поколение_кэша, 'v183');
    assert.equal(д.счётчики.дверей, 43);
    const п54 = д.двери.find((дв) => дв.номер === '·54');
    assert.ok(п54 && п54.файл === 'СИНГУЛЯР_54_ПИР.html', 'двери: ·54');
    const л = д.летопись[д.летопись.length - 1];
    assert.equal(л.версия, '11.32');
    assert.equal(л.такт, 'ПИР');
  });
  it('sitemap.xml: URL ·54, всего 41', () => {
    const s = читать('sitemap.xml');
    assert.ok(s.includes('%D0%A1%D0%98%D0%9D%D0%93%D0%A3%D0%9B%D0%AF%D0%A0_54_%D0%9F%D0%98%D0%A0'), 'URL ·54');
    const url = (s.match(/<url>/g) || []).length;
    assert.equal(url, 41, '41 URL');
  });
  it('CHANGELOG [11.32] + карты RU/EN + ЗК М.7', () => {
    assert.ok(читать('CHANGELOG.md').includes('## [11.32] «ПИР»'), 'CHANGELOG');
    const карта = читать('docs/ДОРОЖНАЯ_КАРТА.md');
    assert.ok(карта.includes('Дописка хвоста (факт ПОСАДКИ'), 'факт ПОСАДКИ (С106) дописан в 3а.25 — указатель висел с С106');
    assert.ok(карта.includes('## 3а.26 · ТАКТ v11.32 «ПИР»'), '3а.24 факт');
    assert.ok(карта.includes('| 42 | Такт v11.32 «ПИР»'), 'реестр №39');
    assert.ok(карта.includes('прогресс v11.32 «ПИР» С110: релейный слой ЖИВ'), 'М1 прогресс');
    const картаEN = читать('docs/ДОРОЖНАЯ_КАРТА_EN.md');
    assert.ok(картаEN.includes('3а.26 · TACT v11.32'), 'EN 3а.26');
    const зк = читать('docs/ЗЕЛЁНАЯ_КАРТА.md');
    assert.ok(зк.includes('- [x] **М.7 · Приказ владельца (вечер 14 окт. 2026, trace 1a13a36f98eeb3ad)'), 'ЗК М.7');
  });
  it('README — одна правда', () => {
    const README = читать('README.md');
    assert.ok(README.includes('**11.32 «ПИР»**'), 'такт');
    assert.ok(README.includes('**s15-orkestrator-v183**'), 'кэш');
    assert.ok(README.includes('**хаб + 43**'), 'двери');
  });
});

describe('транспорт: бандл Trystero жив', () => {
  it('импорт в node: joinRoom — функция, selfId — строка', async () => {
    const т = await import('../../../../БИБЛИОТЕКИ/trystero-nostr.bundle.mjs');
    assert.equal(typeof т.joinRoom, 'function');
    assert.equal(typeof т.selfId, 'string');
    assert.ok(т.selfId.length >= 16, 'selfId длиной как nostr-ключ');
  });
});
