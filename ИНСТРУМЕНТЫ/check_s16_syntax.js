#!/usr/bin/env node
/* Синтакс-чек всех JS-блоков СИНГУЛЯР_16: главный <script> + worklet-строка (шаблон `...`)
   Запуск: node ИНСТРУМЕНТЫ/check_s16_syntax.js [путь-к-HTML]  (по умолчанию — файл из репо) */
const fs = require('fs'), vm = require('vm'), path = require('path');
const h = fs.readFileSync(process.argv[2] || path.join(__dirname, '..', 'СИНГУЛЯР_16_СУФЛЁР.html'), 'utf8');
let fails = 0;

/* 1) обычные <script> блоки (без src) */
const scripts = [...h.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
scripts.forEach((m, i) => {
    try { new vm.Script(m[1], { filename: `script#${i}` }); console.log(`OK  script#${i} (${m[1].length} chars)`); }
    catch (e) { fails++; console.log(`FAIL script#${i}: ${e.message}`); }
});

/* 2) строковые модули worklet: ищем `...registerProcessor...` шаблоны */
const tpl = [...h.matchAll(/`([^`]{200,}?)`/g)];
tpl.forEach((m, i) => {
    const s = m[1];
    if (!/registerProcessor|AudioWorkletProcessor|process\(/.test(s)) return;
    try { new vm.Script(s, { filename: `worklet#${i}` }); console.log(`OK  worklet#${i} (${s.length} chars)`); }
    catch (e) { fails++; console.log(`FAIL worklet#${i}: ${e.message}`); }
});

/* 3) грубый поиск похожих повреждений вида nsdfaxTau (буква+ax+Буква без скобки) */
const susp = [...h.matchAll(/[a-z\)]ax[A-Z][a-zA-Z]*/g)].map(m => m[0]).filter(w => !/^(max|min)ax/i.test(w));
console.log('suspicious ax-patterns:', [...new Set(susp)]);
process.exit(fails ? 1 : 0);
