#!/usr/bin/env node
/**
 * ГАРМОНИЯ · player/обновить-хэши-csp.mjs
 * Пересчитывает sha256-хэши inline-<style> и inline-<script type="module"> в
 * player/index.html и обновляет CSP-мету. Запускать после каждой правки кода
 * или стиля плеера: tests/player-a11y.test.mjs проверяет совпадение хэшей.
 *
 *   node player/обновить-хэши-csp.mjs
 *
 * Ноль зависимостей, ноль сети.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const file = fileURLToPath(new URL('./index.html', import.meta.url));
let html = readFileSync(file, 'utf8');

const style = html.match(/<style>([\s\S]*?)<\/style>/)[1];
const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const hash = (s) => 'sha256-' + createHash('sha256').update(Buffer.from(s, 'utf8')).digest('base64');

const metaRe = /(<meta http-equiv="Content-Security-Policy" content="[^"]*")/;
if (!metaRe.test(html)) throw new Error('CSP-мета не найдена');
html = html.replace(/script-src 'self' 'sha256-[^']+'/g, `script-src 'self' '${hash(script)}'`);
html = html.replace(/style-src 'sha256-[^']+'/g, `style-src '${hash(style)}'`);
writeFileSync(file, html);
console.log('CSP-хэши обновлены:', hash(script), hash(style));
