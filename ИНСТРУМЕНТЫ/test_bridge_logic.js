#!/usr/bin/env node
/* test_bridge_logic.js — контракт моста ·21⇄·22 + регрессия ядер (S21/S22 из отгруженных файлов)
   Запуск: node ИНСТРУМЕНТЫ/test_bridge_logic.js   (читает живые файлы репо, пути от файла) */
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const REPO = path.join(__dirname, '..');
const F21 = path.join(REPO, 'СИНГУЛЯР_21_ОБЩЕНИЕ.html');
const F22 = path.join(REPO, 'СИНГУЛЯР_22_СВЯЗЬ.html');
const s21 = fs.readFileSync(F21, 'utf8');
const s22 = fs.readFileSync(F22, 'utf8');

let ok = 0, fail = 0;
function T(имя, cond) {
  if (cond) { ok++; console.log('  ok ' + ok + ' — ' + имя); }
  else { fail++; console.log('  FAIL ' + fail + ' — ' + имя); }
}
function core(text, begin, end) {
  const a = text.indexOf(begin), b = text.indexOf(end);
  if (a < 0 || b < 0 || b <= a) throw new Error('маркеры ядра не найдены: ' + begin);
  return text.slice(a, b + end.length);
}

console.log('== КОНТРАКТ МОСТА ==');
T('канал один и тот же в обоих файлах',
  s21.includes("singular-most-21-22-v1") && s22.includes("singular-most-21-22-v1"));
T('конверт мост:"21-22" и v:1 в обоих',
  s21.includes("д.мост = '21-22'") && s22.includes("д.мост = '21-22'"));
T('·22 излучает incoming', /мостПослать\(\{ тип: 'incoming'/.test(s22));
T('·22 обрабатывает presented', /д\.тип === 'presented'/.test(s22));
T('·22 обрабатывает tohall', /д\.тип === 'tohall'/.test(s22));
T('·21 обрабатывает incoming', /д\.тип === 'incoming'/.test(s21));
T('·21 излучает presented', /mostPost\(\{ тип:'presented'/.test(s21));
T('·21 излучает tohall', /mostPost\(\{ тип:'tohall'/.test(s21));
T('·22 НЕ переизлучает tohall (нет петли)', !/мостПослать\(\{ тип: 'tohall'/.test(s22));
T('·21 НЕ переизлучает incoming (нет петли)', !/mostPost\(\{ тип:'incoming'/.test(s21));
T('hello с двух сторон (side 22 и side 21)',
  s22.includes("side: '22'") && s21.includes("side:'21'"));
T('bye с двух сторон',
  s22.includes("тип: 'bye'") && s21.includes("тип:'bye'"));
T('в ·22 есть панель моста (stMost/mostLog)',
  s22.includes('id="stMost"') && s22.includes('id="mostLog"'));
T('в ·21 есть панель моста (mostStatus/mostLog/btnToHall)',
  s21.includes('id="mostStatus"') && s21.includes('id="mostLog"') && s21.includes('id="btnToHall"'));
T('в ·22 нет присваиваний innerHTML (0 innerHTML в коде)', !/\.innerHTML\s*=/.test(s22));
T('в ·21 нет присваиваний innerHTML (0 innerHTML в коде)', !/\.innerHTML\s*=/.test(s21));

console.log('== ВЕРСИИ ==');
T('S22.VERSION 1.1.0', s22.includes("const VERSION = '1.1.0';"));
T('S21.VERSION 0.4.0', s21.includes("const VERSION = '0.4.0';"));
T('footer ·22 v1.1', s22.includes('«СВЯЗЬ» v1.1'));
T('footer ·21 v0.4.0', s21.includes('«ОБЩЕНИЕ» v0.4.0'));

console.log('== ЯДРО S22 (из отгруженного файла, в песочнице) ==');
const ctx22 = {};
vm.runInNewContext(core(s22, '/* S22:CORE-BEGIN */', '/* S22:CORE-END */') + ';this.S22EX = S22;', ctx22);
const S22 = ctx22.S22EX;
T('S22 определён', !!S22 && !!S22.маршрут);
T('маршрут voice без устройств → text (тупика нет)',
  S22.маршрут('voice', { микрофон: false, камера: false, дисплей: false, синтезРечи: false, распознаваниеРечи: false, вибрация: false, сеть: false }).канал === 'text');
T('выборЧеловека недоступного канала не подменяется молча',
  S22.выборЧеловека('voice', {}).канал === null && /недоступно/.test(S22.выборЧеловека('voice', {}).причина));
T('адаптация19: «не решено» ≠ «решено: нет»',
  S22.адаптация19('{}').вибрация === null && S22.адаптация19('{"haptic":false}').вибрация === false);

console.log('== ЯДРО S21 (из отгруженного файла, в песочнице) ==');
const ctx21 = { window: undefined };
vm.runInNewContext(core(s21, '/* S21:CORE-BEGIN */', '/* S21:CORE-END */') + ';this.S21EX = S21;', ctx21);
const S21 = ctx21.S21EX;
T('S21 определён', !!S21 && !!S21.route);
const rts = S21.route({ output: ['braille', 'speech', 'text'], voice: { preference: 'any', lang: 'ru-RU', rate: 1 } }, 'ok');
T('route строит представления по числу каналов', rts.length === 3);
T('Брайль кодирует (o→⠕, k→⠅)', rts[0].view === '⠕⠅');
T('речь несёт голос получателя', !!rts[1].voice && rts[1].voice.preference === 'any');
T('смысл один — вид другой: текст во всех не-брайль видах совпадает',
  rts[1].view === 'ok' && rts[2].view === 'ok');

console.log('== РЕГРЕСС ТРАНСПОРТА ·22 ==');
T('зал ·22 на месте (singular-svyaz-v1-)', s22.includes("'singular-svyaz-v1-' + код"));
T('протокольный фильтр принять() на месте', /м\.v !== S22\.PROTO/.test(s22));
T('принять21вЗал пишет в журнал с входящее:true',
  /входящее: true, канал: 'text'/.test(s22));
T('мостОткрыть вызывается в boot', /boot[\s\S]{0,80}мостОткрыть\(\);/.test(s22));

console.log('');
if (fail) { console.log('ИТОГ: FAIL ' + fail + ' (ok ' + ok + ')'); process.exit(1); }
console.log('ИТОГ: ВСЕ ПРОШЛИ (' + ok + ')');
