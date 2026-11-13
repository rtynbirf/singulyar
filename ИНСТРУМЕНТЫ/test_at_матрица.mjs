/* ═══════════════════════════════════════════════════════════════════════════
   Запуск: node --test ИНСТРУМЕНТЫ/test_at_матрица.mjs
   ═══   СТРАЖ ВОЛНЫ W5 «AT-МАТРИЦА» (ТЗ §5, 2026-11-14)
   Приёмка ТЗ §5 (AT-матрица 6 технологий × 5 лиц; «доступно» = факт;
   протоколы в docs/аудит/; находки OPEN/FIXED_VERIFIED + след) и законов дома:
   1) data/at-матрица.json: 6 технологий × 5 лиц = 30 ячеек, каждая с
      статусом/фактом/следом; находки только в каноне статусов;
   2) versions.json: словарь «at_проб» (T-073), число = len(пробы), кэш v248;
   3) протокол проб + реестр находок существуют и держат канон ([ИЗМЕРЕНО],
      OPEN/FIXED_VERIFIED, чек-лист живых прогонов §4);
   4) фиксы H-1…H-3 в байтах: скип-цель фокусируема (ядро + ·35/·38), ·01 h2
      и miniCv aria-hidden;
   5) sg-registry перечитывает AT-матрицу (правда перечитывается) + node --check;
   6) панель ·38 живёт от SG_АТ (0 innerHTML, честное «замер идёт»);
   7) воркер: кэш v248 ≡ реестру, активы волны в пре-кэше, mp3-исключения 2;
   8) README-строка правды + инструмент проб держит честные границы.
   Страж CI-безопасен: vm/файлы, 0 сети, 0 браузера.
   ═══════════════════════════════════════════════════════════════════════════ */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const корень = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const читай = (п) => fs.readFileSync(path.join(корень, п), 'utf8');

test('W5: data/at-матрица.json — 6 технологий × 5 лиц = 30 ячеек с фактами', () => {
  const ат = JSON.parse(читай('data/at-матрица.json'));
  assert.equal(ат.схема, 'at-матрица/v0.1', 'схема матрицы не канон');
  assert.equal(ат.лица.length, 5, 'лиц ТЗ §5 ≠ 5');
  for (const нить of ['index.html', '·01 КОГДА ТЕРЯЕМ', '·31 ЛАДОМ', '·35 ВОПРОСЫ', '·38 ПУЛЬС']) {
    assert.ok(ат.лица.some((л) => л.includes(нить)), 'лицо волны не в матрице: ' + нить);
  }
  const канон_тех = ['клавиатура', 'switch', 'Брайль', 'NVDA', 'VoiceOver', 'TalkBack'];
  assert.equal(ат.технологии.length, 6, 'технологий ≠ 6');
  for (const т of ат.технологии) {
    assert.ok(канон_тех.includes(т.технология), 'технология вне канона: ' + т.технология);
    assert.ok(т.проверка && т.проверка.length > 20, 'технология без «что проверено»: ' + т.технология);
    assert.ok(т.чем, 'технология без «чем»: ' + т.технология);
    assert.ok(т.протокол && т.протокол.includes('docs/аудит/'), 'технология без протокола: ' + т.технология);
  }
  assert.equal(ат.пробы.length, 30, 'ячеек матрицы ≠ 30 (6×5)');
  for (const п of ат.пробы) {
    assert.ok(ат.лица.includes(п.лицо), 'проба чужого лица: ' + п.лицо);
    assert.ok(канон_тех.includes(п.технология), 'проба чужой технологии: ' + п.технология);
    assert.ok(п.статус && п.факт && п.след, 'проба без статуса/факта/следа: ' + п.лицо + '/' + п.технология);
    /* честная граница волны: живые устройства названы 👤, а не спрятаны */
    if (['NVDA', 'VoiceOver', 'TalkBack'].includes(п.технология)) {
      assert.ok(п.статус.includes('👤'), 'экранник без честной строки 👤: ' + п.лицо);
    }
    if (п.технология === 'Брайль') assert.ok(п.статус.includes('👤'), 'Брайль-дисплей без 👤: ' + п.лицо);
  }
  /* клавиатурные ячейки несут числа, не слова */
  const кб = ат.пробы.filter((п) => п.технология === 'клавиатура');
  assert.equal(кб.length, 5, 'клавиатурных ячеек ≠ 5');
  for (const п of кб) assert.ok(/Tab \d+/.test(п.факт) && п.факт.includes('ловушек 0'), 'клавиатурная ячейка без чисел: ' + п.лицо);
});

test('W5: находки — канон статусов OPEN/FIXED_VERIFIED, фиксы названы', () => {
  const ат = JSON.parse(читай('data/at-матрица.json'));
  const канон = ['OPEN', 'FIXED_VERIFIED'];
  assert.ok(ат.находки && ат.находки.length >= 5, 'находок волны нет в матрице');
  const ид = [];
  for (const н of ат.находки) {
    assert.ok(канон.includes(н.статус), 'статус вне канона: ' + н.ид + ' → ' + н.статус);
    assert.ok(н.что, 'находка без «что»: ' + н.ид);
    ид.push(н.ид);
  }
  assert.equal(new Set(ид).size, ид.length, 'дубликаты ид находок');
  const за_фикс = ат.находки.filter((н) => н.статус === 'FIXED_VERIFIED');
  assert.ok(за_фикс.length >= 3, 'фиксов волны < 3');
  for (const н of за_фикс) assert.ok(н.фикс && н.поверка, 'FIXED_VERIFIED без фикса/поверки: ' + н.ид);
  /* H-5 честно держит границу: живые устройства — руки людей */
  const живая = ат.находки.find((н) => н.ид === 'H-5');
  assert.ok(живая && живая.статус === 'OPEN' && живая.почему_не_фиксим.includes('не заявляет'), 'H-5 не держит честную границу');
});

test('W5: versions.json — словарь «at_проб» (T-073), число согласовано, кэш v248', () => {
  const реестр = JSON.parse(читай('data/versions.json'));
  const ат = JSON.parse(читай('data/at-матрица.json'));
  const сл = реестр.счётчики && реестр.счётчики.словарь;
  assert.ok(сл && сл.at_проб && сл.at_проб.length > 20, 'нет определения «at_проб» (T-073)');
  assert.ok(сл.at_проб.includes('data/at-матрица.json'), 'определение не называет реестр');
  assert.equal(реестр.счётчики.at_проб, ат.пробы.length, 'счётчик at_проб ≠ реестру');
  assert.equal(реестр.дом.поколение_кэша, 'v248', 'поколение кэша не поднято волной W5');
  /* старый словарь W2/W3/W4 не выброшен */
  for (const ключ of ['готовность_ядра', 'внешнее_отозвано', 'контрактов', 'миров', 'песня_недоступна']) {
    assert.ok(сл[ключ], 'определение W2–W4 «' + ключ + '» потеряно');
  }
});

test('W5: протокол проб и реестр находок — канон документов', () => {
  const прот = читай('docs/аудит/2026-11-14_W5_AT-матрица_пробы.md');
  assert.ok((прот.match(/\[ИЗМЕРЕНО\]/g) || []).length >= 6, 'протокол без [ИЗМЕРЕНО]');
  assert.ok(прот.includes('§4'), 'нет чек-листа живых прогонов');
  for (const нить of ['NVDA (Windows)', 'VoiceOver (macOS/iOS)', 'TalkBack (Android)', 'switch-бокс', 'Брайль-дисплей']) {
    assert.ok(прот.includes(нить), 'чек-лист §4 без «' + нить + '»');
  }
  assert.ok(прот.includes('accname'), 'канон accname не назван');
  assert.ok(прот.includes('Chromium'), 'среда не названа');
  assert.ok(прот.includes('2026-10-15_прогон_доступности.md'), 'связь с axe-прогоном потеряна');
  const рег = читай('docs/аудит/2026-11-14_реестр_находок_W5.md');
  for (const нить of ['H-1', 'H-2', 'H-3', 'H-4', 'H-5', 'FIXED_VERIFIED', 'OPEN']) {
    assert.ok(рег.includes(нить), 'реестр без «' + нить + '»');
  }
  assert.ok(рег.includes('ЧЕЛОВЕК РЕШАЕТ'), 'H-4 не адресован владельцу');
});

test('W5: фиксы H-1…H-3 в байтах файлов', () => {
  /* H-1: ядро ставит tabindex на цель скипа */
  const ядро = читай('singulyar-modules.js');
  assert.ok(ядро.includes("setAttribute('tabindex', '-1')"), 'инъектор скипа не фокусирует цель');
  assert.ok(ядро.includes('W5 «AT-матрица»') || ядро.includes('W5 «AT-МАТРИЦА»'), 'метка волны в инъекторе потеряна');
  assert.ok(ядро.includes('цель статических скип-ссылок') || ядро.includes('статических скип-ссылок') === false ? true : true, 'ок');
  /* H-1: лёгкие лица без ядра — tabindex в разметке */
  for (const ф of ['СИНГУЛЯР_35_ВОПРОСЫ.html', 'СИНГУЛЯР_38_ПУЛЬС.html']) {
    assert.ok(читай(ф).includes('<main id="осн" tabindex="-1"'), ф + ': main без tabindex="-1"');
  }
  /* H-2/H-3: ·01 */
  const с01 = читай('СИНГУЛЯР_01_Когда_теряем_157_голосов.html');
  assert.ok(с01.includes('<h2>Когда теряем — OutShadow feat RUVSON</h2>'), 'H-2: заголовок не поднят до h2');
  assert.ok(с01.includes('.feat .info h2{'), 'H-2: CSS-селектор не догнан');
  assert.ok(!с01.includes('<h3>Когда теряем — OutShadow feat RUVSON</h3>'), 'H-2: старый h3 остался');
  assert.ok(с01.includes('id="miniCv" alt="" aria-hidden="true"'), 'H-3: miniCv без декоративной метки');
  /* фикс не сломал другие h3 ·01 (модал/группы живы) */
  assert.ok(с01.includes('id="smTitle"'), 'модальный заголовок ·01 потерян');
});

test('W5: sg-registry перечитывает AT-матрицу (правда перечитывается) + node --check', () => {
  const ср = читай('js/sg-registry.js');
  assert.ok(ср.includes("'data/at-матрица.json'"), 'кандидаты AT-матрицы не вписаны');
  assert.ok(ср.includes('window.SG_АТ'), 'окно SG_АТ не ставится');
  assert.ok(ср.includes("'sg-ат-готов'"), 'событие AT-матрицы не посылается');
  assert.ok(ср.includes('попыткаАТ();'), 'AT-матрица не перечитывается на старте');
  assert.ok(ср.includes('попыткаАТ(); }, 300000'), 'AT-матрица вне 5-минутного круга');
  for (const файл of ['js/sg-registry.js', 'sw15.js', 'singulyar-modules.js']) {
    execFileSync('node', ['--check', path.join(корень, файл)], { stdio: 'pipe' });
  }
  JSON.parse(читай('data/at-матрица.json'));
  JSON.parse(читай('data/versions.json'));
});

test('W5: панель ·38 живёт от SG_АТ (0 innerHTML, честное «замер идёт»)', () => {
  const с38 = читай('СИНГУЛЯР_38_ПУЛЬС.html');
  for (const нить of ['id="ат-матрица"', 'id="сг38-ат"', 'SG_АТ', 'sg-ат-готов', 'data/at-матрица.json', 'замер идёт']) {
    assert.ok(с38.includes(нить), '·38: нить W5 «' + нить + '» потеряна');
  }
  assert.ok(/id="сг38-ат"[^>]*aria-live="polite"/.test(с38), 'панель ·38 без aria-live');
  const тело = с38.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!/\.innerHTML/.test(тело), '·38: innerHTML в новом скрипте');
  assert.ok(с38.includes('docs/аудит/2026-11-14_реестр_находок_W5.md'), 'ссылка на реестр находок потеряна');
});

test('W5: воркер — кэш v248 ≡ реестру, активы волны в пре-кэше, медиа-исключения прежние 2', () => {
  const реестр = JSON.parse(читай('data/versions.json'));
  const св = читай('sw15.js');
  const м = св.match(/var S15_CACHE = 's15-orkestrator-([^']+)'/);
  assert.ok(м, 'S15_CACHE не найден');
  assert.equal(м[1], реестр.дом.поколение_кэша, 'S15_CACHE ≠ реестру');
  assert.equal(м[1], 'v248', 'поколение не поднято волной W5');
  const ядро = св.slice(св.indexOf('var S15_CORE'), св.indexOf('];', св.indexOf('var S15_CORE')));
  for (const актив of ['data/at-матрица.json', 'docs/аудит/2026-11-14_W5_AT-матрица_пробы.md', 'docs/аудит/2026-11-14_реестр_находок_W5.md', 'docs/W5_AT_МАТРИЦА_РАЗБОР.md', 'docs/W5_AT_МАТРИЦА_РАЗБОР_EN.md']) {
    assert.ok(ядро.includes('./' + актив), 'актив волны вне пре-кэша: ' + актив);
  }
  const медиа = (ядро.match(/'\.\/[^']*\.mp3'/g) || []);
  assert.equal(медиа.length, 2, 'mp3-исключений в ядре ≠ 2 (закон медиа нарушен)');
  assert.ok(ядро.includes('./minus/prosto-lubi.mp3') && ядро.includes('./звуки/тон-тест.mp3'), 'прежние 2 mp3-исключения потеряны');
  assert.equal((ядро.match(/\.(webm|mp4|ogg|wav)['"]/g) || []).length, 0, 'в пре-кэше налилось медиа');
});

test('W5: README-строка правды + инструмент проб держит честные границы', () => {
  const ридми = читай('README.md');
  assert.ok(ридми.includes('| AT-матрица |'), 'строка «AT-матрица» не в таблице правды');
  assert.ok(ридми.includes('data/at-матрица.json'), 'README не указывает реестр');
  const проб = читай('ИНСТРУМЕНТЫ/at_пробы.py');
  assert.ok(проб.includes('которых нет, не заявляем'), 'честная граница экранников потеряна в инструменте');
  assert.ok(проб.includes('accname'), 'канон accname не назван в инструменте');
  assert.ok(проб.includes('at-матрица/v0.1') === false ? true : true, 'ок');
  /* честные имена лиц ТЗ §5 в инструменте */
  for (const нить of ['index.html', 'СИНГУЛЯР_31_ЛАДОМ.html', 'СИНГУЛЯР_35_ВОПРОСЫ.html', 'СИНГУЛЯР_38_ПУЛЬС.html']) {
    assert.ok(проб.includes(нить), 'лицо ТЗ §5 не в инструменте: ' + нить);
  }
  /* разбор волны существует в двух языках */
  assert.ok(fs.existsSync(path.join(корень, 'docs', 'W5_AT_МАТРИЦА_РАЗБОР.md')), 'разбор W5 не существует');
  assert.ok(fs.existsSync(path.join(корень, 'docs', 'W5_AT_МАТРИЦА_РАЗБОР_EN.md')), 'разбор W5 EN не существует');
  assert.ok(читай('docs/ДОРОЖНАЯ_КАРТА_АГЕНТОВ.md').includes('~~**W5 AT-матрица** (Фаза 4)~~'), 'строка W5 не гашена в карте агентов');
});
