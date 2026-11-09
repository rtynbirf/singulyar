// АУДИТ ДОСТУПНОСТИ (ТЗ-3 аудита владельца 2026-10-14; такт v11.47 «СЛОЙ», С125).
// Playwright Chromium + axe-core: WCAG 2.0/2.1 A/AA по каждой двери реестра
// data/versions.json («двери»). Нарушения печатаются как markdown — backlog Волны 2.
// Подготовка: npm i -g playwright axe-core  (NODE_PATH=$(npm root -g))
// Запуск: BASE=http://127.0.0.1:8911 AXE_SRC=$(npm root -g)/axe-core/axe.min.js \
//         node ИНСТРУМЕНТЫ/аудит_доступности.mjs   (стенд: python3 -m http.server 8911)
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const BASE = process.env.BASE || 'http://127.0.0.1:8911';
const AXE_SRC = process.env.AXE_SRC;
if (!AXE_SRC) { console.error('Нужен AXE_SRC (путь к axe.min.js)'); process.exit(1); }
const axeSource = readFileSync(AXE_SRC, 'utf8');
const реестр = JSON.parse(readFileSync('data/versions.json', 'utf8'));
const двери = реестр['двери'];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
const ТЕГИ = ['wcag2a', 'wcag21a', 'wcag2aa', 'wcag21aa'];
const свод = [];

for (const д of двери) {
  const файл = д['файл'];
  const url = BASE + '/' + encodeURIComponent(файл);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(400);
    await page.addScriptTag({ content: axeSource });
    const res = await page.evaluate(async (теги) => {
      const r = await window.axe.run(document, {
        runOnly: { type: 'tag', values: теги },
        resultTypes: ['violations'],
      });
      return r.violations.map(v => ({ id: v.id, impact: v.impact, узлов: v.nodes.length }));
    }, ТЕГИ);
    const серьёзных = res.filter(v => v.impact === 'serious' || v.impact === 'critical').reduce((a, v) => a + v.узлов, 0);
    const всего = res.reduce((a, v) => a + v.узлов, 0);
    свод.push({ дверь: д['номер'], имя: д['имя'], файл, всего, серьёзных, нарушения: res });
    console.log(`| ${д['номер']} | ${д['имя']} | ${файл} | ${всего} | ${серьёзных} |`);
  } catch (e) {
    свод.push({ дверь: д['номер'], имя: д['имя'], файл, всего: -1, серьёзных: -1, нарушения: [], ошибка: String(e).slice(0, 120) });
    console.log(`| ${д['номер']} | ${д['имя']} | ${файл} | ОШИБКА | ${String(e).slice(0, 60)} |`);
  }
}
await browser.close();
const чистых = свод.filter(s => s.всего === 0).length;
const грязных = свод.filter(s => s.всего > 0);
const топ = {};
for (const s of грязных) for (const v of s.нарушения) {
  топ[v.id] = топ[v.id] || { id: v.id, impact: v.impact, дверей: 0, узлов: 0 };
  топ[v.id].дверей += 1; топ[v.id].узлов += v.узлов;
}
console.log('');
console.log(`**Итог:** дверей ${свод.length}, чистых ${чистых}, с нарушениями ${грязных.length}; мест всего ${свод.reduce((a, s) => a + Math.max(s.всего, 0), 0)}.`);
console.log('');
console.log('**Топ правил (backlog Волны 2):**');
for (const t of Object.values(топ).sort((a, b) => b.узлов - a.узлов).slice(0, 12))
  console.log(`- \`${t.id}\` (${t.impact}): ${t.узлов} мест на ${t.дверей} дверях`);
console.log('');
console.log('**Ошибки прогона:**');
for (const s of свод.filter(s => s.всего === -1)) console.log(`- ${s.дверь} ${s.файл}: ${s.ошибка || 'н/д'}`);
process.exit(0);
