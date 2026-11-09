#!/usr/bin/env node
/* СТОРОЖ ТВ-76 · такт v1.49.4 «ТВ-ЗАЛ»
   Цель: ни одной страницы дома, способной дать чёрный экран на Samsung UE55AU7170U
   (Tizen 6.5, браузер ~Chromium 76, ES2019, ESM есть, top-level await НЕТ, ?./?? НЕТ).
   Три слоя:
   L1 esbuild parse (--target=chrome76) — жёсткие ошибки: TLA, невалидный синтаксис.
   L2 esbuild diff (esnext vs chrome76) — выходы совпали = синтаксис уже ES2019.
      Ловит ?. ?? ||= &&= и прочее понижаемое БЕЗ ложных срабатываний на строки/тексты.
   L3 лексика по коду со снятыми строками/комментариями — API-ловушки:
      structuredClone( replaceAll( .at( ( .at( только помечается — бывает своим методом ).
   Запуск: node ИНСТРУМЕНТЫ/check_tv76.js   (esbuild берётся из рабочего места через NODE_PATH) */
'use strict';
const fs = require('fs');
const path = require('path');

let esbuild;
try { esbuild = require('esbuild'); }
catch (e) {
  console.error('НЕТ ESBUILD: поставь на рабочем месте: npm install --no-save esbuild (репо не трогается)');
  process.exit(2);
}
const ROOT = path.resolve(__dirname, '..');

/* ---------- сбор целей ---------- */
function listHtml() {
  return fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).sort();
}
function listExternal() {
  const out = [];
  for (const f of fs.readdirSync(ROOT)) {
    if (f.endsWith('.js')) out.push({ file: f, abs: path.join(ROOT, f), module: false });
  }
  const walk = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if ((e.name.endsWith('.mjs') || e.name.endsWith('.js')) && !/LICENSE/i.test(e.name)) {
        out.push({ file: path.relative(ROOT, p), abs: p, module: e.name.endsWith('.mjs') });
      }
    }
  };
  walk(path.join(ROOT, 'БИБЛИОТЕКИ'));
  return out.sort((a, b) => a.file.localeCompare(b.file));
}

/* ---------- снятие строк/комментариев для L3 ---------- */
function stripStringsComments(src) {
  let out = '', i = 0, n = src.length;
  let mode = 'code'; // code | sq | dq | tpl | line | block
  let tplDepth = 0;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (mode === 'code') {
      if (c === '/' && d === '/') { mode = 'line'; out += '  '; i += 2; continue; }
      if (c === '/' && d === '*') { mode = 'block'; out += '  '; i += 2; continue; }
      if (c === "'") { mode = 'sq'; out += ' '; i++; continue; }
      if (c === '"') { mode = 'dq'; out += ' '; i++; continue; }
      if (c === '`') { mode = 'tpl'; out += ' '; i++; continue; }
      out += c; i++; continue;
    }
    if (mode === 'line') { if (c === '\n') { mode = 'code'; out += '\n'; } else out += ' '; i++; continue; }
    if (mode === 'block') { if (c === '*' && d === '/') { mode = 'code'; out += '  '; i += 2; } else { out += c === '\n' ? '\n' : ' '; i++; } continue; }
    if (mode === 'sq') { if (c === '\\') { out += '  '; i += 2; continue; } if (c === "'") { mode = 'code'; out += ' '; i++; continue; } out += c === '\n' ? '\n' : ' '; i++; continue; }
    if (mode === 'dq') { if (c === '\\') { out += '  '; i += 2; continue; } if (c === '"') { mode = 'code'; out += ' '; i++; continue; } out += c === '\n' ? '\n' : ' '; i++; continue; }
    if (mode === 'tpl') {
      if (c === '\\') { out += '  '; i += 2; continue; }
      if (c === '`') { mode = 'code'; out += ' '; i++; continue; }
      if (c === '$' && d === '{') { tplDepth++; out += '  '; i += 2; continue; }
      out += c === '\n' ? '\n' : ' '; i++; continue;
    }
  }
  void tplDepth;
  return out;
}

/* ---------- L3 лексика ---------- */
const L3_RULES = [
  { name: 'structuredClone(', re: /structuredClone\s*\(/g, judge: 'ловушка' },
  { name: 'replaceAll(', re: /\.replaceAll\s*\(/g, judge: 'ловушка' },
  { name: '.at(', re: /\.at\s*\(/g, judge: 'пометка' },
  { name: '||=', re: /\|\|=/g, judge: 'ловушка' },
  { name: '&&=', re: /&&=/g, judge: 'ловушка' }
];
function lexicalScan(code) {
  const stripped = stripStringsComments(code);
  const hits = [];
  for (const r of L3_RULES) {
    r.re.lastIndex = 0;
    let m;
    while ((m = r.re.exec(stripped))) {
      const line = stripped.slice(0, m.index).split('\n').length;
      hits.push({ rule: r.name, line, judge: r.judge, ctx: stripped.split('\n')[line - 1].trim().slice(0, 90) });
      if (m.index === r.re.lastIndex) r.re.lastIndex++;
    }
  }
  return hits;
}

/* ---------- esbuild ---------- */
async function tr(code, target, module) {
  const opts = { loader: 'js', target, sourcefile: 'x.js', logLevel: 'silent' };
  if (module) opts.format = 'esm';
  return esbuild.transform(code, opts);
}

async function checkBlock(id, code, module, report) {
  report.blocks++;
  // L1 parse
  try { await tr(code, ['chrome76'], module); }
  catch (e) {
    const msg = String(e.errors ? e.errors.map(x => x.text).join('; ') : e);
    if (/Top-level await/i.test(msg)) report.fail(id, 'TLA', msg);
    else report.fail(id, 'PARSE', msg);
    return;
  }
  // L2 diff: esnext vs chrome76
  try {
    const a = await tr(code, ['esnext'], module);
    const b = await tr(code, ['chrome76'], module);
    if (a.code !== b.code) report.fail(id, 'СИНТАКСИС-НОВЕЕ-ES2019', 'esbuild понизил синтаксис для chrome76 — есть ?. ?? || = и т.п.');
  } catch (e) { report.fail(id, 'DIFF', String(e)); }
  // L3
  for (const h of lexicalScan(code)) report.lex(id, h);
}

async function main() {
  const report = {
    blocks: 0, externals: 0, bad: [], lexHits: [],
    fail(id, kind, msg) { this.bad.push({ id, kind, msg: String(msg).slice(0, 160) }); },
    lex(id, h) { this.lexHits.push(Object.assign({ id }, h)); }
  };

  for (const f of listHtml()) {
    const src = fs.readFileSync(f, 'utf8');
    const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    let m, idx = 0;
    while ((m = re.exec(src))) {
      const attrs = m[1] || '', body = m[2] || '';
      idx++;
      if (/\bsrc\s*=/.test(attrs)) continue;
      if (/type\s*=\s*["'](application\/(ld\+)?json|text\/template|importmap)["']/.test(attrs)) continue;
      const isModule = /type\s*=\s*["']module["']/.test(attrs);
      if (!body.trim()) continue;
      await checkBlock(`${f}#inline${idx}${isModule ? '(module)' : ''}`, body, isModule, report);
    }
  }
  for (const e of listExternal()) {
    report.externals++;
    const code = fs.readFileSync(e.abs, 'utf8');
    await checkBlock(e.file, code, e.module, report);
  }

  console.log(`БЛОКОВ ПРОВЕРЕНО: ${report.blocks} (все inline-блоки страниц + ${report.externals} внешних js/mjs)`);
  if (report.bad.length) {
    console.log(`\nПРОВАЛЫ: ${report.bad.length}`);
    for (const b of report.bad) console.log(`  [${b.kind}] ${b.id}\n         ${b.msg}`);
  } else console.log('ПРОВАЛОВ: 0 — весь синтаксис дома парсится и уже ES2019 для chrome76');
  const realLex = report.lexHits.filter(h => h.judge === 'ловушка');
  const marks = report.lexHits.filter(h => h.judge === 'пометка');
  if (realLex.length) {
    console.log(`\nAPI-ЛОВУШКИ (лексика): ${realLex.length}`);
    for (const h of realLex) console.log(`  ${h.id}:${h.line} [${h.rule}] ${h.ctx}`);
  } else console.log('API-ЛОВУШЕК: 0 (structuredClone/replaceAll/||=/&&=)');
  if (marks.length) {
    console.log(`\nПОМЕТКИ .at( (проверить глазами, может быть своим методом): ${marks.length}`);
    for (const h of marks) console.log(`  ${h.id}:${h.line} ${h.ctx}`);
  }
  const ok = report.bad.length === 0 && realLex.length === 0;
  console.log(ok ? '\nИТОГ: ГОДЕН — ни одна страница не даст чёрный экран (Директива-2)' : '\nИТОГ: НЕ ГОДЕН — править список выше');
  process.exit(ok ? 0 : 1);
}
main().catch(e => { console.error('Сторож упал:', e); process.exit(2); });
