// test_takt_11.35_lico.mjs — такт v11.35 «ЛИЦО» (С113, ключ ㉕; СТОП-ГОРН ×2: их v11.33 «ГЕРМЕТИЧНО» (С111, 862b715) и их v11.34 «ЛИК» (С112, 14039de) приняты целиком, перенумеровано честно v11.33→v11.35/С111→С113/v184→v186/летопись 120→122).
//
// Приказ владельца (trace 1a13a87b2ecf7185): «ТЫ В ПОТЕРЯШКАХ КТО ТЕБЕ СКАЗАЛ
// ТЯНУТЬ СВОЙ ДИЗАЙН И ПОРТИТЬ ЛИЦО ЧЕЛОВЕКА? СТИЛЬ ЧЕЛОВЕКА НА ВСЕХ СТРАНИЦАХ
// ДОЛЖЕН БЫТЬ УЗНАВАЕМЫМ=) НА ТЕЛЕВИЗОРЕ НЕ РАБОТАЕТ МУЗЫКА НА ПК ЕСТЬ НА ТВ
// НЕТ=) ДОБИВАЙ ВСЕ ХВОСТЫ ПО ДОРОЖНОЙ КАРТЕ»
//
// Проверяется:
//   1. лицо дома: ·54 и ·53 носят канон СТЕКЛО·СЕРЕБРО·ЗОЛОТО (design-v3 подключён,
//      чужая бежево-бирюзовая краска снята), их k12/k13/функционал целы,
//      футер ·54 говорит правду;
//   2. ТВ-музыка (мой хвост поверх их ТБ-1): minus/prosto-lubi.mp3 жив в репо,
//      оба ТВ-пути караоке-дома ·31 на свою песню, их SG_ЗВУК_ТВ не тронут,
//      ЗДОРОВЬЕ/APP честные;
//   3. их канон цел: qr-token/0.1 (ГЕРМЕТИЧНО), k13-сессия, ТБ-1 зонд ·31;
//   4. обвязка: sw15 v186, versions 11.35/ЛИЦО/v186/летопись 122 (их [121] ЛИК целы),
//      CHANGELOG [11.35], ЗК ПВ4-пометка, карты RU/EN №44/3а.28, README одна правда.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ЗДЕСЬ = path.dirname(fileURLToPath(import.meta.url));
const КОРЕНЬ = path.resolve(ЗДЕСЬ, '..', '..', '..', '..');
const читать = (п) => fs.readFileSync(path.join(КОРЕНЬ, п), 'utf8');

describe('такт v11.35 «ЛИЦО» — лицо дома (·54 и ·53 в каноне)', () => {
  const п54 = читать('СИНГУЛЯР_54_ПИР.html');
  const п53 = читать('СИНГУЛЯР_53_СВЯЗЬ_ЧЕЛОВЕКА.html');
  const канон = ['singulyar-design-v3.css', '#0A0A0C', '#D4AF37'];

  for (const [имя, байт] of [['·54 ПИР', п54], ['·53 СВЯЗЬ ЧЕЛОВЕКА', п53]]) {
    it(имя + ': канон подключён (design-v3, void, золото)', () => {
      for (const к of канон) assert.ok(байт.includes(к), имя + ' несёт ' + к);
    });
    it(имя + ': чужая бежево-бирюзовая краска снята', () => {
      assert.ok(!байт.includes('--bg:#f4f2ec'), 'фон #f4f2ec снят');
      assert.ok(!байт.includes('--accent:#155e59'), 'акцент #155e59 снят');
      assert.ok(!байт.includes('--panel:#fffdf8'), 'панель #fffdf8 снята');
    });
    it(имя + ': штамп на правду такта (ЛИЦО/v186)', () => {
      assert.ok(байт.includes('>ЛИЦО<'), 'штамп такта ЛИЦО');
      assert.ok(байт.includes('>v186<'), 'штамп кэша v186');
    });
  }
  it('·54: функционал цел (модуль pir-core, глухой режим, IDs не тронуты)', () => {
    for (const ид of ['войтиКнопка', 'глухойКод', 'чатВвод', 'видеоСетка', 'глобальныйСтатус']) {
      assert.ok(п54.includes('id="' + ид + '"'), 'ID ' + ид + ' жив');
    }
    assert.ok(п54.includes("from './js/pir-core.js'"), 'провод pir-core жив');
  });
  it('·54: футер говорит правду (рождена v11.32, лицо v11.35)', () => {
    assert.ok(п54.includes('рождена тактом v11.32'), 'правда о рождении');
    assert.ok(!п54.includes('связи такта v11.29'), 'ложь «такта v11.29» снята');
  });
  it('·53: их байты целы (k12 v1.2 машина состояний + k13 v1.3 ГЕРМЕТИЧНО + qr-token)', () => {
    for (const ид of ['k12-init', 'k12-accept', 'k12-handshake', 'k12-offer', 'globalStatus', 'saveBtn', 'k13-сессия', 'k13-qrкнопка', 'k13-qrхолст']) {
      assert.ok(п53.includes('id="' + ид + '"'), 'ID ' + ид + ' жив');
    }
    assert.ok(п53.includes("draft → locally_saved → queued"), 'машина состояний k12 цела');
    assert.ok(п53.includes('<script src="./js/qr-token.js">'), 'их qr-token подключён');
    assert.ok(п53.includes('КОНТУР v1.3'), 'их k13 блок цел');
  });
  it('дубль снят честно: моего qr-core и k12-qr-камеры в доме нет («один факт — одно место»)', () => {
    assert.ok(!fs.existsSync(path.join(КОРЕНЬ, 'js', 'qr-core.js')), 'js/qr-core.js снят');
    assert.ok(!п53.includes('k12-qr-show'), 'k12-qr UI снят');
    assert.ok(!fs.existsSync(path.join(КОРЕНЬ, 'ИНСТРУМЕНТЫ', 'test_takt_11.33_lico.mjs')), 'старый тест снят');
  });
});

describe('такт v11.35 «ЛИЦО» — ТВ-музыка (мой хвост поверх их ТБ-1)', () => {
  const зал = читать('СИНГУЛЯР_31_ЛАДОМ.html');
  it('их ТБ-1 зонд не тронут (SG_ЗВУК_ТВ жив)', () => {
    assert.ok(зал.includes('window.SG_ЗВУК_ТВ'), 'их зонд цел');
    assert.ok(зал.includes("canPlayType('audio/webm; codecs=\"opus\"')==='probably'"), 'их canPlayType-проверка целая');
  });
  it('minus/prosto-lubi.mp3 жив в репо (9 370 651 Б — транскод 320k МАКС-мастера)', () => {
    const п = path.join(КОРЕНЬ, 'minus', 'prosto-lubi.mp3');
    assert.ok(fs.existsSync(п), 'файл существует');
    const вес = fs.statSync(п).size;
    assert.ok(вес > 8_000_000 && вес < 12_000_000, 'вес разумный: ' + вес);
  });
  it('оба ТВ-пути караоке-дома поют СВОЮ песню (не флагман-заглушку)', () => {
    assert.equal((зал.match(/"\.\/minus\/prosto-lubi\.mp3"/g) || []).length >= 2, true, 'обе ТВ-ветки на prosto-lubi.mp3');
    assert.ok(!зал.includes('КАРАОКЕ_ID ? "./minus/9ys_TVEtda8.mp3"'), 'заглушка 9ys в караоке-пути снята');
    assert.ok(зал.includes('v11.35 «ЛИЦО» (С113): караоке-дом на ТВ поёт СВОЮ песню'), 'честный коммент на месте');
  });
  it('RUM23-7 «ДИЕТА»: ПК-лестница на фондах дома (голос/чистый-минус), webm-мастера ушли', () => {
    assert.ok(зал.includes('"./minus/чистый-минус/"+ПЕСНИ[i][0]+".mp3"'), 'МИН-ветка = натуральная минусовка');
    assert.ok(зал.includes('"./minus/голос/"+ПЕСНИ[i][0]+".mp3"'), 'МАКС-ветка = оригинал с голосом автора');
    assert.ok(зал.includes('pole==="мин" ? "./minus/чистый-минус/prosto-lubi.mp3" : "./minus/prosto-lubi.mp3"'), 'караокеПуть ПК цел (mp3-шасси)');
    assert.ok(!зал.includes('"./minus/"+ПЕСНИ[i][0]+".max.webm"'), 'webm-мастера сняты с лестницы');
  });
  it('ЗДОРОВЬЕ говорит правду о ТВ-режиме; APP/титул на правду такта', () => {
    assert.ok(зал.includes('minus/prosto-lubi.mp3 (ТВ-режим MP3)'), 'проба шасси честная');
    assert.ok(зал.includes("window.APP = { v:'11.35', такт:'ЛИЦО', кэш:'s15-orkestrator-v186'"), 'APP честный');
    assert.ok(зал.includes('СИНГУЛЯР ·31 v11.35 «ЛИЦО»'), 'титул честный');
  });
});

describe('такт v11.35 «ЛИЦО» — обвязка', () => {
  it('sw15: кэш v186, коммент такта, их v185-цепь целы', () => {
    const sw = читать('sw15.js');
    assert.ok(sw.includes("var S15_CACHE = 's15-orkestrator-v186'"), 'кэш v186');
    assert.ok(sw.includes('такт v11.35 «ЛИЦО»'), 'коммент такта');
    assert.ok(sw.includes('такт v11.33 «ГЕРМЕТИЧНО»'), 'их ГЕРМЕТИЧНО коммент цел');
  });
  it('versions.json: 11.35/ЛИЦО/v186/летопись 122; их [121] ЛИК целы (append-only)', () => {
    const d = JSON.parse(читать('data/versions.json'));
    assert.equal(d.дом.версия, '11.35');
    assert.equal(d.дом.такт, 'ЛИЦО');
    assert.equal(d.дом.поколение_кэша, 'v186');
    assert.equal(d.счётчики.дверей, 43);
    assert.equal(d.летопись.length, 122);
    assert.equal(d.летопись[120].такт, 'ЛИК'); // их [121] целы
    const л = d.летопись[d.летопись.length - 1];
    assert.equal(л.версия, '11.35');
    assert.equal(л.такт, 'ЛИЦО');
    assert.ok(л.сделано[0].includes('С113'));
  });
  it('CHANGELOG [11.35] над их [11.34]/[11.33]; ЗК на правде; README одна правда', () => {
    const ch = читать('CHANGELOG.md');
    const и35 = ch.indexOf('## [11.35] «ЛИЦО»');
    const и34 = ch.indexOf('## [11.34] «ЛИК»');
    const и33 = ch.indexOf('## [11.33] «ГЕРМЕТИЧНО»');
    assert.ok(и35 >= 0 && и34 > и35 && (и33 < 0 || и33 > и34), 'порядок летописи');
    const зк = читать('docs/ЗЕЛЁНАЯ_КАРТА.md');
    assert.ok(зк.includes('Такт v11.35 «ЛИЦО» (С113'), 'ЗК статус');
    assert.ok(зк.includes('погашен ИХ каноном: v11.33 «ГЕРМЕТИЧНО»'), 'ПВ4 пометка');
    const rd = читать('README.md');
    assert.ok(rd.includes('11.35 «ЛИЦО»') && rd.includes('s15-orkestrator-v186'), 'README правда');
  });
  it('карты RU/EN: реестр №44 + 3а.28; их №43/3а.27 целы', () => {
    const ru = читать('docs/ДОРОЖНАЯ_КАРТА.md');
    assert.ok(ru.includes('| 44 | Такт v11.35 «ЛИЦО»'), 'RU реестр №44');
    assert.ok(ru.includes('## 3а.28 · ТАКТ v11.35 «ЛИЦО»'), 'RU 3а.28');
    assert.ok(ru.includes('## 3а.27 · ТАКТ v11.33 «ГЕРМЕТИЧНО»'), 'их 3а.27 целы');
    const en = читать('docs/ДОРОЖНАЯ_КАРТА_EN.md');
    assert.ok(en.includes('| 44 | Tact v11.35 «ЛИЦО»'), 'EN реестр №44');
    assert.ok(en.includes('## 3а.28 · TACT v11.35 «ЛИЦО»'), 'EN 3а.28');
  });
  it('хаб-бирка на правде такта (статический фолбэк 11.35/v186)', () => {
    const хаб = читать('index.html');
    assert.ok(хаб.includes('<span data-реестр="версия">11.35</span> «<span data-реестр="такт">ЛИЦО</span>»'), 'бирка такта');
    assert.ok(хаб.includes('<span data-реестр="кэш">v186</span>'), 'бирка кэша');
  });
  it('инлайн-скрипты ·53/·54 синтаксически живы (vm.Script)', () => {
    for (const [п, порог] of [['СИНГУЛЯР_53_СВЯЗЬ_ЧЕЛОВЕКА.html', 3], ['СИНГУЛЯР_54_ПИР.html', 0]]) {
      const байты = читать(п);
      const блоки = [...байты.matchAll(/<script(?![^>]*src)(?![^>]*type="module")[^>]*>([\s\S]*?)<\/script>/g)];
      let живы = 0;
      for (const б of блоки) {
        const код = б[1].replace(/^\s*<!--/, '').replace(/-->\s*$/, '');
        if (!код.trim()) continue;
        try { new vm.Script(код, { filename: п + ':inline' }); живы++; } catch (e) {
          assert.ok(код.includes('"prefetch"') || код.includes('speculationrules'), п + ': красный блок не JSON: ' + e.message);
        }
      }
      assert.ok(живы >= порог, п + ': живых скриптов ' + живы + ' (порог ' + порог + '; ·54 честно несёт только module + JSON)');
    }
  });
});
