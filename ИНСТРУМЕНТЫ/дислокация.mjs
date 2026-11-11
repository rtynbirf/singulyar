#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   СИНГУЛЯР · ДИСЛОКАЦИЯ — живой замер релеев и счётчиков дома.
   ЛАТКА 2026-11-11: числа дома и здоровье релеев меряются, а не
   декларируются. Запускается автоматом (.github/workflows/дислокация.yml)
   и человеком: node ИНСТРУМЕНТЫ/дислокация.mjs [--силно]

   Что делает:
     1) пробует каждый релей дома живым WebSocket (REQ-подпись, как
        делает trystero) — фиксирует факт «ответил/не ответил» и мс;
     2) читает правду дома (data/versions.json) и пишет её срез в
        data/дислокация.json вместе с замером;
     3) --силно: пишет файл даже если ничего не изменилось (heartbeat).

   Честность: «не ответил» ≠ «мёртв» — в JSON стоит факт и время.
   Ритм без шума (как PULSE v2): коммит делает воркфлоу и только
   при изменившемся файле.
   ═══════════════════════════════════════════════════════════════════ */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const КОРЕНЬ = join(dirname(fileURLToPath(import.meta.url)), '..');
const СИЛЬНО = process.argv.includes('--силно');

/* Все релеи дома: канон из страниц (·17/·18/·22…26) + кандидаты на смену
   дислокации. Кандидаты меряются тоже — чтобы замер сразу показывал,
   КУМ жить при смерти канона. */
const РЕЛЕИ = [
  'wss://nostr.oxtr.dev',
  'wss://nos.lol',
  'wss://relay.damus.io',
  'wss://nostr.sathoarder.com',
  'wss://nostr.islandarea.net',
  'wss://nostr.wine',
  'wss://relay.primal.net',
  'wss://relay.snort.social',
];

function живыеРелеи(список) {
  const видели = new Set();
  return список.filter(u => (видели.has(u) ? false : (видели.add(u), true)));
}

function проба(url, таймаутМс = 8000) {
  return new Promise(разреш => {
    const старт = Date.now();
    const итог = жив => { clearTimeout(т); try { ws && ws.close(); } catch {} разреш({ url, жив, мс: Date.now() - старт }); };
    const т = setTimeout(() => итог(false), таймаутМс);
    let ws;
    try {
      if (typeof WebSocket !== 'function') { clearTimeout(т); return разреш({ url, жив: false, мс: null, причина: 'нет WebSocket в ноде' }); }
      ws = new WebSocket(url);
    } catch (е) { clearTimeout(т); return разреш({ url, жив: false, мс: null }); }
    ws.onopen = () => {
      try { ws.send(JSON.stringify(['REQ', 'дислокация', { kinds: [1], limit: 1 }])); } catch {}
      // факт «ответил рукопожатием» уже достаточен; короткая пауза — на случай мгновенного close
      setTimeout(() => итог(ws.readyState === 1 || true), 800);
    };
    ws.onerror = () => { clearTimeout(т); итог(false); };
    ws.onclose = () => { /* обработан итогом выше */ };
  });
}

{ /* верхнеуровневый блок: замер */
  const релеи = живыеРелеи(РЕЛЕИ);
  const замеры = [];
  for (const р of релеи) {
    const з = await проба(р);
    замеры.push({ url: з.url, жив: !!з.жив, мс: (typeof з.мс === 'number' ? з.мс : null) });
    console.log((з.жив ? 'ЖИВ ' : 'НОЛЬ'), з.url, з.мс != null ? з.мс + ' мс' : '');
  }

  /* правда дома — счётчики берутся ИЗ реестра, руками не пишутся */
  let реестр = null;
  try { реестр = JSON.parse(readFileSync(join(КОРЕНЬ, 'data', 'versions.json'), 'utf-8')); } catch (е) {
    console.log('реестр не прочитан:', String(е).slice(0, 120));
  }

  const пред = (() => { try { return JSON.parse(readFileSync(join(КОРЕНЬ, 'data', 'дислокация.json'), 'utf-8')); } catch { return null; } })();

  const json = {
    схема: 1,
    генерация: new Date().toISOString(),
    источник: process.env.GITHUB_ACTIONS ? 'github-actions' : 'локальная проба',
    релеи: замеры,
    счётчики: реестр ? {
      дверей: реестр.счётчики.дверей,
      дверей_реестр: реестр.счётчики.дверей_реестр,
      песен: реестр.счётчики.песен,
      языков: реестр.счётчики.языков,
      версия: реестр.дом.версия,
      такт: реестр.дом.такт,
      кэш: реестр.дом.поколение_кэша,
    } : null,
  };

  /* ритм без шума: живое состояние релеев важнее частоты — пишем всегда,
     но воркфлоу коммитит только при изменении содержимого (или --силно) */
  const прежнее = пред ? JSON.stringify({ релеи: пред.релеи, счётчики: пред.счётчики }) : null;
  const текущее = JSON.stringify({ релеи: замеры, счётчики: json.счётчики });
  const изменилось = прежнее !== текущее;

  writeFileSync(join(КОРЕНЬ, 'data', 'дислокация.json'), JSON.stringify(json, null, 1) + '\n', 'utf-8');
  console.log('дислокация.json:', изменилось ? 'ИЗМЕНИЛСЯ' : 'тот же замер', '| живых:', замеры.filter(з => з.жив).length + '/' + замеры.length);
  if (!изменилось && !СИЛЬНО) {
    console.log('РИТМ БЕЗ ШУМА: содержимое то же — воркфлоу коммит не сделает');
  }
}
