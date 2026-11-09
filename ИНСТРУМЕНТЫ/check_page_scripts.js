#!/usr/bin/env node
/* Синтакс-проверка всех <script>-блоков страницы (без <script src>).
   Запуск: node ИНСТРУМЕНТЫ/check_page_scripts.js СИНГУЛЯР_19_ЧЕЛОВЕК.html */
import fs from 'node:fs';
import vm from 'node:vm';

const файл = process.argv[2];
if (!файл) { console.error('укажи файл'); process.exit(1); }
const html = fs.readFileSync(файл, 'utf-8');
const блоки = [];
const ре = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let м;
while ((м = ре.exec(html)) !== null) {
  const тип = /type\s*=\s*"module"/i.test(м[0]) ? 'module' : 'classic';
  блоки.push({ тип, код: м[1] });
}
let ошибки = 0;
блоки.forEach(function (б, i) {
  try {
    if (б.тип === 'module') {
      /* module: синтаксис проверяем компиляцией в функции с ограничением —
         import внутри module-блока допустим, поэтому парсим как module через vm.SourceTextModule нельзя без флага;
         компромисс: заменяем import-выражения и проверяем как классический скрипт */
      const код = б.код.replace(/\bimport\s*\(/g, 'IMPORT_ВЫЗОВ(').replace(/^\s*import\s.+?;$/gm, '/*import*/;').replace(/\bawait\s+/g, '');
      new vm.Script(код, { filename: файл + '#блок' + (i + 1) + '(module-as-classic)' });
    } else {
      new vm.Script(б.код, { filename: файл + '#блок' + (i + 1) });
    }
    console.log('блок ' + (i + 1) + ' (' + б.тип + '): OK');
  } catch (е) {
    ошибки++;
    console.log('блок ' + (i + 1) + ' (' + б.тип + '): СИНТАКС-ОШИБКА — ' + е.message);
    const строки = б.код.split('\n');
    const совп = /:(\d+)$/.exec(е.stack.split('\n')[0] || '') || /:(\d+)/.exec(е.stack || '');
    if (совп) {
      const н = parseInt(совп[1], 10);
      console.log('  контекст: ' + (строки[н - 2] || '').trim() + ' ← ' + (строки[н - 1] || '').trim());
    }
  }
});
console.log(ошибки === 0 ? '✓ все блоки валидны: ' + блоки.length : '✗ блоков с ошибками: ' + ошибки);
process.exit(ошибки === 0 ? 0 : 1);
