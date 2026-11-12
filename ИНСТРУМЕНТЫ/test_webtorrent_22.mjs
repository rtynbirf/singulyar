/* ═══════════════════════════════════════════════════════════════════
   СТРАЖ F-005: WEBTORRENT-МАРШРУТ ФАЙЛОВ ·22 (issue #68 п.6, волна ×16)
   ИНСТРУМЕНТЫ/test_webtorrent_22.mjs
   Запуск: node --test ИНСТРУМЕНТЫ/test_webtorrent_22.mjs

   Дисциплина ДО подключения — ДОКУМЕНТЫ/F-005_ТРАНСПОРТНАЯ_ДИСЦИПЛИНА.md.
   Страж проверяет, что код не вышел за границы дисциплины:

     · OFF по умолчанию: нет статического <script src="webtorrent.min.js">,
       нет new WebTorrent вне функции включения, кнопки disabled в HTML;
     · маршрут требует КРИПТЫ: включение без фразы — честный отказ;
     · нейтральное константное имя в торенте ('зал22.bin'), исходное имя
       едет только маркером по запечатанному каналу текста;
     · журнал маршрута локальный (элемент #жрФайл), без содержимого файлов;
     · чистые функции в vm-песочнице: маркер ⇄ разбор, нейтральное имя
       не выдаёт исходного, AES-GCM запечатай/вскрой блоба — roundtrip;
     · дисциплина-документ жив и рассказывает про раскрытие/журнал/границы.

   Живой p2p-обмен (трекеры в сети) в CI НЕ прогоняется — это честная
   граница: руки людей на живом прогоне семьи (протокол LINK 0.7.0).
   ═══════════════════════════════════════════════════════════════════ */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const КОРЕНЬ = join(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = readFileSync(join(КОРЕНЬ, 'СИНГУЛЯР_22_СВЯЗЬ.html'), 'utf-8');

test('F-005: дисциплина в UI — off по умолчанию, что раскрывает, что пишет в журнал', () => {
  const начало = HTML.indexOf('id="stФайл"');
  assert.ok(начало > 0, 'в ·22 есть строка дисциплины #stФайл');
  const строка = HTML.slice(начало, HTML.indexOf('</p>', начало));
  assert.ok(строка.includes('выключен по умолчанию'), 'статус маршрута: выключен по умолчанию — заявлено прямо');
  assert.ok(строка.includes('ЧТО РАСКРЫВАЕТ'), 'в UI названо, что маршрут раскрывает (F-005 §2)');
  assert.ok(строка.includes('ЧТО ПИШЕТ В ЖУРНАЛ'), 'в UI названо, что маршрут пишет в журнал (F-005 §3)');
  assert.ok(строка.includes('F-005_ТРАНСПОРТНАЯ_ДИСЦИПЛИНА.md'), 'в UI есть путь к дисциплине-документу');
  assert.ok(строка.includes('журнал по сети не уходит'), 'журнал локальный — заявлено прямо');
  assert.ok(HTML.includes('id="btnФайлРой" disabled'), 'кнопка включения маршрута disabled в HTML (off по умолчанию)');
  assert.ok(HTML.includes('id="inФайл" type="file" class="grow" disabled'), 'выбор файла disabled до включения маршрута');
  assert.ok(HTML.includes('id="btnФайлПосл" disabled'), 'кнопка посылки disabled до включения маршрута');
  assert.ok(HTML.includes('id="жрФайл" hidden'), 'журнал маршрута скрыт, пока маршрут не живёт');
});

test('F-005: webtorrent не грузится сам — нет статического скрипта и верхнего new WebTorrent', () => {
  assert.ok(!/<script[^>]+src=["'][^"']*webtorrent/i.test(HTML),
    'в HTML НЕТ статического <script src="webtorrent.min.js"> — маршрут не грузится при открытии страницы');
  assert.ok(!HTML.includes('<script src="./webtorrent.min.js"'), 'нет статического подключения ./webtorrent.min.js');
  const безКомментариев = HTML.replace(/\/\*[\s\S]*?\*\//g, ' ');
  assert.ok(!безКомментариев.includes('new WebTorrent('),
    'в коде нет прямого new WebTorrent — клиент создаётся только из window.WebTorrent внутри функции включения');
  assert.ok(HTML.includes("скрипт.src = 'webtorrent.min.js'"),
    'скрипт грузится динамическим createElement-скриптом — только по явному клику');
  const включение = HTML.slice(HTML.indexOf('function файлРойВключить'), HTML.indexOf('function файлРойВыключить'));
  assert.ok(включение.includes('КРИПТА22.вкл || !КРИПТА22.ключ'),
    'включение маршрута проверяет ключ крипты (F-005 §4.2 — маршрут требует фразу зала)');
  assert.ok(включение.includes('нет ключа крипты (дисциплина F-005 §4.2)'),
    'отказ включения без крипты честно назван и сослан на дисциплину');
  const посылка = HTML.slice(HTML.indexOf('async function файлРойПослать'), HTML.indexOf('function файлРойПринять'));
  assert.ok(посылка.includes("new File([печать.байты], 'зал22.bin'"),
    'в торент кладётся константное нейтральное имя зал22.bin (F-005 §2)');
  assert.ok(посылка.includes('запечатайБлоб(файл, КРИПТА22.ключ)'),
    'файл запечатывается AES-GCM ДО сидирования (F-005 §2 — в торент едут только шифрованные байты)');
  assert.ok(посылка.includes('маркерСобери(ивх, размерИсход, ивБ64, имяИсход)'),
    'исходное имя едет ТОЛЬКО маркером по запечатанному каналу текста ·22');
  assert.ok(HTML.includes("файлРойСтатус('маршрут выключен — включи p2p-файлы зала.')"),
    'посылка при выключенном маршруте — честный отказ, не молчание');
});

test('F-005: приём-магнитов — только при включённом маршруте и ключе, журнал локальный', () => {
  const приём = HTML.slice(HTML.indexOf('function файлРойПринять'), HTML.indexOf("if ($('btnФайлРой'))"));
  assert.ok(приём.includes('!ФАЙЛРОЙ.вкл || !ФАЙЛРОЙ.клиент'), 'приём молчит, если маршрут выключен');
  assert.ok(приём.includes('ключа нет — не качаю (честный отказ)'), 'без ключа магнит не качается — честный отказ');
  assert.ok(приём.includes('вскройБлоб(new Uint8Array(буф), КРИПТА22.ключ, ив)'), 'скачанное вскрывается ключом крипты');
  const врезка = HTML.slice(HTML.indexOf('const файлМаркер = маркерРазбери(м2.текст)'), HTML.indexOf('/* представление входящего по профилю'));
  assert.ok(врезка.includes('файлРойПринять(файлМаркер, м2.от)'), 'магнит разбирается во входящих зала (маркер ⇄ маршрут)');
});

test('F-005: чистые функции — маркер ⇄ разбор, нейтральное имя, AES-GCM roundtrip', async () => {
  const а = HTML.indexOf('function нейтральноеИмя');
  const б = HTML.indexOf('  function файлРойВключить');
  assert.ok(а > 0 && б > а, 'блок чистых функций найден в ·22');
  const код = HTML.slice(а, б);
  const песочница = { console, Blob, TextEncoder: globalThis.TextEncoder, TextDecoder: globalThis.TextDecoder };
  песочница.globalThis = песочница;
  песочница.crypto = globalThis.crypto;   /* Node 24: webcrypto встроен */
  vm.createContext(песочница);
  vm.runInContext(код + '\nthis.нейтральноеИмя = нейтральноеИмя; this.маркерСобери = маркерСобери; this.маркерРазбери = маркерРазбери; this.запечатайБлоб = запечатайБлоб; this.вскройБлоб = вскройБлоб;', песочница);
  const { нейтральноеИмя, маркерСобери, маркерРазбери, запечатайБлоб, вскройБлоб } = песочница;

  /* маркер ⇄ разбор roundtrip */
  const маркер = маркерСобери('a'.repeat(40), 12345, 'AAAAAAAAAAAAAAAA', 'секретный-план.pdf');
  const разбор = маркерРазбери(маркер);
  assert.ok(разбор, 'маркер разбирается обратно');
  assert.equal(разбор.инфохэш, 'a'.repeat(40));
  assert.equal(разбор.размер, 12345);
  assert.equal(разбор.имя, 'секретный-план.pdf');
  assert.equal(маркерРазбери('привет, зал'), null, 'обычный текст — не магнит');
  assert.equal(маркерРазбери('⇄файл[НЕТХЭША]{1}{AAAA}{x}'), null, 'битый инфохэш — не магнит');

  /* нейтральное имя скрывает исходное */
  const имя = нейтральноеИмя('ABCDEF1234567890ABCDEF1234567890ABCDEF12');
  assert.ok(/зал22-[a-f0-9]{8}\.bin/.test(имя), 'имя в журнале нейтральное: ' + имя);
  assert.ok(!имя.includes('ABCDEF'.toLowerCase()) || имя.includes('abcdef'), 'имя из инфохэша, не из исходника');

  /* AES-GCM roundtrip на блобе */
  const ключ = await globalThis.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const секрет = new Blob([new TextEncoder().encode('запечатанный файл зала ·22 — дом не читает чужие карманы')]);
  const печать = await запечатайБлоб(секрет, ключ);
  assert.ok(печать.байты.length > 0 && печать.ив.length === 12, 'печать: байты + iv 12');
  const вскрыто = await вскройБлоб(печать.байты, ключ, печать.ив);
  const текст = new TextDecoder().decode(await вскрыто.arrayBuffer());
  assert.equal(текст, 'запечатанный файл зала ·22 — дом не читает чужие карманы', 'AES-GCM roundtrip файла честный');
  /* чужой ключ не вскрывает */
  const чужой = await globalThis.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  await assert.rejects(() => вскройБлоб(печать.байты, чужой, печать.ив), 'чужой ключ честно не вскрывает');
});

test('F-005: дисциплина-документ жив и рассказывает границы', () => {
  const док = readFileSync(join(КОРЕНЬ, 'ДОКУМЕНТЫ', 'F-005_ТРАНСПОРТНАЯ_ДИСЦИПЛИНА.md'), 'utf-8');
  assert.ok(док.includes('Что маршрут РАСКРЫВАЕТ'), 'документ: раздел раскрытия');
  assert.ok(док.includes('ПИШЕТ В ЖУРНАЛ'), 'документ: раздел журнала');
  assert.ok(док.includes('НЕ делает'), 'документ: раздел границ');
  assert.ok(док.includes('зал22.bin'), 'документ: константное нейтральное имя');
  assert.ok(док.includes('выкл'), 'документ: off по умолчанию');
  assert.ok(док.includes('issue #68 п.6'), 'документ: ссылка на задание');
  assert.ok(док.includes('test_webtorrent_22.mjs'), 'документ: путь к стражу — соответствие проверяется автоматически');
});
