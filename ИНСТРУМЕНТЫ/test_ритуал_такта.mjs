import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/* СТРАЖ W1 «РИТУАЛ ОБНОВЛЕНИЯ ЧЕЛОВЕКА» (ТЗ §1).
   Детерминированный, без сети. Держит честность ритуала:
   числа — только от воркера, ключ согласия — единственный, EN-зеркала — в пре-кэше. */

const корень = join(dirname(fileURLToPath(import.meta.url)), '..');
const читай = (п) => readFileSync(join(корень, п), 'utf8');

test('W1: карточка ритуала в хабе — диалог канона (role, скрытость, ручки, живая зона)', () => {
  const хаб = читай('index.html');
  assert.ok(хаб.includes('id="ритуалТакта"'), 'нет карточки ритуала в хабе');
  assert.ok(/id="ритуалТакта"[^>]*role="dialog"/.test(хаб), 'карточка не диалог');
  assert.ok(/id="ритуалТакта"[^>]*hidden/.test(хаб), 'карточка не скрыта по умолчанию');
  assert.ok(хаб.includes('id="ритуалВойти"'), 'нет кнопки «Войти в новый такт»');
  assert.ok(хаб.includes('id="ритуалПозже"'), 'нет кнопки «Позже»');
  assert.ok(хаб.includes('id="ритуалЖивая"') && хаб.includes('aria-live="polite"'), 'нет живой зоны a11y');
  assert.ok(хаб.includes('Войти в новый такт') && хаб.includes('>Позже<'), 'текст ручек не по ТЗ');
});

test('W1: числа карточки не морожены — в разметке стоят прочерки, а не поколение', () => {
  const хаб = читай('index.html');
  const разметка = хаб.slice(хаб.indexOf('id="ритуалТакта"'), хаб.indexOf('id="ритуалЖивая"'));
  assert.ok(!/v\d{3}/.test(разметка), 'в разметке карточки мороженое поколение — класс числа-ложь');
  assert.ok(разметка.includes('id="ритуалПоколение">—<'), 'поколение не из прочерка');
  assert.ok(разметка.includes('id="ритуалЯдро">—<'), 'ядро не из прочерка');
});

test('W1: скрипт ритуала честен — ноль innerHTML, сообщение к ожидающему воркеру, фокус-ловушка, Escape', () => {
  const хаб = читай('index.html');
  const скрипт = хаб.slice(хаб.indexOf("id=\"ритуалЖивая\""), хаб.indexOf('var КЛЮЧ=\'kv.удобно\''));
  assert.ok(!скрипт.includes('innerHTML'), 'ритуал строит DOM через innerHTML — запрет канона');
  assert.ok(скрипт.includes("type:'S15_ВЕДОМОСТЬ'"), 'хаб не спрашивает ведомость воркера');
  assert.ok(скрипт.includes('r.waiting'), 'хаб не адресует ожидающего воркера');
  assert.ok(скрипт.includes("type:'S15_ВХОД_В_ТАКТ'"), 'согласие не шлёт ключ ЛКГ-1');
  assert.ok(скрипт.includes('e.shiftKey'), 'нет фокус-ловушки ARIA APG');
  assert.ok(скрипт.includes("e.key==='Escape'"), 'Escape не ведёт себя как «Позже»');
  assert.ok(скрипт.includes("sessionStorage.setItem('ритуал-позже'"), 'отказ «Позже» не помнится на сессию');
  assert.ok(скрипт.includes('S15_ПРИЁМКА') && скрипт.includes('годен===false'), 'честный отказ приёмки не оглашается');
});

test('W1: воркер отвечает ведомостью и держит закон — skipWaiting только по согласию', () => {
  const св = читай('sw15.js');
  assert.ok(св.includes("м.type === 'S15_ВЕДОМОСТЬ'"), 'нет ключа S15_ВЕДОМОСТЬ');
  const ветка = св.slice(св.indexOf("м.type === 'S15_ВЕДОМОСТЬ'"), св.indexOf('S15_ВХОД_В_ТАКТ_ПРИНЯТ'));
  assert.ok(ветка.includes('поколение: S15_ПОКОЛЕНИЕ') && ветка.includes('ядро: S15_CORE.length'), 'ведомость не из фактов воркера');
  /* считаем только КОД: срезаем блочные комментарии (в них закон ЛКГ-1 и упомянут словами) */
  const код = св.replace(/\/\*[\s\S]*?\*\//g, '');
  const скольких = [...код.matchAll(/self\.skipWaiting\(\)/g)].length;
  assert.equal(скольких, 1, 'skipWaiting обязан остаться ровно один — внутри ветки согласия');
  const веткаСогласия = св.slice(св.indexOf("м.type === 'S15_ВХОД_В_ТАКТ'"));
  assert.ok(веткаСогласия.includes('self.skipWaiting()'), 'согласие не ведёт к активации');
});

test('W1: EN-зеркала пакета существуют, ссылаются на RU-оригиналы и лежат в пре-кэше', () => {
  const зеркала = ['ЗАДАНИЕ_АГЕНТАМ_EN.md', 'docs/КАНОН_НАДЗОРА_EN.md', 'docs/ТЗ_АГЕНТАМ_EN.md', 'docs/ДОРОЖНАЯ_КАРТА_АГЕНТОВ_EN.md', 'docs/ПАКЕТ_ДОКУМЕНТОВ_АГЕНТАМ_EN.md'];
  const св = читай('sw15.js');
  for (const з of зеркала) {
    assert.ok(existsSync(join(корень, з)), 'нет зеркала ' + з);
    assert.ok(св.includes("'./" + з + "'"), 'зеркало не в пре-кэше: ' + з);
  }
  assert.ok(читай('ЗАДАНИЕ_АГЕНТАМ_EN.md').includes('ЗАДАНИЕ_АГЕНТАМ.md'), 'EN-задание не ссылается на RU-оригинал');
  assert.ok(читай('docs/КАНОН_НАДЗОРА_EN.md').includes('КАНОН_НАДЗОРА.md'), 'EN-канон не ссылается на RU-оригинал');
  assert.ok(читай('docs/ТЗ_АГЕНТАМ_EN.md').includes('ТЗ_АГЕНТАМ.md'), 'EN-ТЗ не ссылается на RU-оригинал');
});

test('W1: бамп кэша честен — v238 поверх v237', () => {
  const св = читай('sw15.js');
  const м = св.match(/var S15_CACHE = 's15-orkestrator-v(\d+)'/);
  assert.ok(м, 'S15_CACHE не найден');
  const п = Number(м[1]);
  assert.ok(п >= 238, 'кэш не поднят после W1 (ожидалось ≥ 238, стоит v' + п + ')');
});

test('W1: RU-карта погасила строку W1 и дописала журнал', () => {
  const карта = читай('docs/ДОРОЖНАЯ_КАРТА_АГЕНТОВ.md');
  assert.ok(/W1 Ритуал обновления человека.*✅/.test(карта), 'строка W1 не погашена в карте');
  assert.ok(карта.includes('test_ритуал_такта.mjs'), 'страж не вписан в журнал гашения');
});
