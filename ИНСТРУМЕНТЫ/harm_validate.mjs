#!/usr/bin/env node
/* Валидатор .harm (harm/0.1) — маленькая функция в ИНСТРУМЕНТЫ по КОДЕКСу §4.4.
   Та же логика, что __ХАРМ.проверь в доме СИНГУЛЯР_31_ЛАДОМ.html (С36 «СЛОВО»):
   схема/мажорная версия, bpm 30–240, alt у каждого text (правило 1),
   альтернатива жеста у каждого prompt (правило 2), пары [слог, длительность>0],
   число слов в alt = числу слов в words. Первый тестовый файл — демо-событие
   ДОКУМЕНТЫ/ТРЕКИ/HARMONIA/examples/demo.harm.json.
   Запуск: node ИНСТРУМЕНТЫ/harm_validate.mjs <файл.harm.json>            */
import { readFileSync } from 'node:fs';

export function harmПроверь(док) {
  const ош = [], пред = [];
  if (!док || typeof док !== 'object' || Array.isArray(док)) return { ok: false, errors: ['документ не объект'], warnings: пред };
  const м = /^harm\/(\d+)\.(\d+)$/.exec(String(док.schema || ''));
  if (!м) ош.push('schema: нет harm/x.y');
  else if (+м[1] > 0) ош.push('schema: мажорная версия новее плеера (' + док.schema + ') — отказ по правилу 5');
  if (!док.title || typeof док.title !== 'string') ош.push('title: пусто');
  if (typeof док.bpm !== 'number' || !(док.bpm >= 30 && док.bpm <= 240)) ош.push('bpm: вне 30–240');
  const tl = док.timeline;
  if (!Array.isArray(tl) || !tl.length) ош.push('timeline: пусто');
  else for (let i = 0; i < tl.length; i++) {
    const m = tl[i], п = 'маркер ' + i;
    if (typeof m.beat !== 'number' || !(m.beat >= 0)) ош.push(п + ': beat не число или отрицателен');
    if (!['text', 'accent', 'scene', 'prompt', 'pause'].includes(m.type)) ош.push(п + ': неизвестный тип ' + m.type);
    if (!m.data || typeof m.data !== 'object') { ош.push(п + ': нет data'); continue; }
    if (m.type === 'text') {
      if (typeof m.alt !== 'string' || !m.alt.trim()) ош.push(п + ': text без расшифровки alt (правило 1)');
      const сл = m.data.words;
      if (!Array.isArray(сл) || !сл.length) ош.push(п + ': text без words');
      else {
        const сч = String(m.alt || '').split(/\s+/).filter(Boolean).length;
        if (сч !== сл.length) ош.push(п + ': слов в alt (' + сч + ') не равно слов в words (' + сл.length + ')');
        for (let j = 0; j < сл.length; j++) {
          const w = сл[j];
          if (!Array.isArray(w) || !w.length) { ош.push(п + ': слово ' + j + ' пусто'); continue; }
          for (let k = 0; k < w.length; k++) {
            const s = w[k];
            if (!Array.isArray(s) || !s[0] || typeof s[1] !== 'number' || !(s[1] > 0)) ош.push(п + ': слово ' + j + ', слог ' + k + ' — не пара [слог, длительность>0]');
          }
        }
      }
    }
    if (m.type === 'prompt') {
      if (typeof m.alt !== 'string' || !m.alt.trim()) ош.push(п + ': prompt без alt (правило 2)');
      if (!(m.data.keyboardAlt || (Array.isArray(m.data.options) && m.data.options.length))) ош.push(п + ': prompt без альтернативы жесту — кнопка/клавиша (правило 2)');
    }
  }
  for (let q = 1; q < (tl || []).length; q++) if (tl[q].beat < tl[q - 1].beat) { пред.push('timeline не отсортирован по beat'); break; }
  return { ok: ош.length === 0, errors: ош, warnings: пред };
}

/* CLI: node harm_validate.mjs файл1 [файл2 …] */
const argv = process.argv.slice(2);
if (argv.length) {
  let пало = 0;
  for (const ф of argv) {
    try {
      const р = harmПроверь(JSON.parse(readFileSync(ф, 'utf8')));
      console.log((р.ok ? 'ЗАЧЁТ ' : 'ПРОВАЛ ') + ф + (р.errors.length ? ' — ' + р.errors.join('; ') : '') + (р.warnings.length ? ' (предупреждения: ' + р.warnings.join('; ') + ')' : ''));
      if (!р.ok) пало++;
    } catch (e) { console.log('ПРОВАЛ ' + ф + ' — ' + e.message); пало++; }
  }
  process.exit(пало ? 1 : 0);
}
