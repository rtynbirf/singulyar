/**
 * Тесты плеера (player/index.html) — доступность, приватность и офлайн по докам:
 *  - вшитый demo.harm.json байт-в-байт равен доки/demo.harm.json (0 запросов);
 *  - CSP: default-src 'none', connect-src 'none', без unsafe-inline/unsafe-eval,
 *    inline-скрипт и стиль разрешены точными sha256-хэшами (05_PRIVACY_THREAT_MODEL.md);
 *  - ноль внешних ссылок: ни одного http(s)://, src/href только data: и ../src/*.mjs;
 *  - контраст всех пар «текст/фон» всех сцен ≥ 4.5:1, фокус ≥ 3:1 (WCAG 1.4.3/1.4.11);
 *  - focus-visible, prefers-reduced-motion, aria-live, подписи полей, data-motion=none.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const html = readFileSync(new URL('player/index.html', ROOT), 'utf8');
const demoFile = readFileSync(new URL('доки/demo.harm.json', ROOT), 'utf8');

/* ---------- вшитое событие ---------- */
test('demo.harm.json вшит в плеер и байт-в-байт равен доки/demo.harm.json (0 запросов за событием)', () => {
  const m = html.match(/<script type="application\/json" id="harm-demo">([\s\S]*?)<\/script>/);
  assert.ok(m, 'data-блок с событием на месте');
  assert.equal(m[1], demoFile, 'точная копия файла');
  const doc = JSON.parse(m[1]);
  assert.equal(doc.schema, 'harm/0.1');
  assert.equal(doc.timeline.length, 6);
});

/* ---------- CSP ---------- */
function cspDirectives() {
  const m = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
  assert.ok(m, 'CSP-мета присутствует');
  const d = {};
  for (const part of m[1].split(';').map((s) => s.trim()).filter(Boolean)) {
    const [name, ...rest] = part.split(/\s+/);
    d[name] = rest.map((t) => t.replace(/^'|'$/g, '')); // снимаем кавычки источников
  }
  return d;
}

test('CSP: default-src none, соединения запрещены, без unsafe-inline/unsafe-eval', () => {
  const d = cspDirectives();
  assert.deepEqual(d['default-src'], ['none']);
  assert.deepEqual(d['connect-src'], ['none'], 'fetch/XHR/WS запрещены — 0 запросов enforced');
  assert.deepEqual(d['img-src'], ['none']);
  assert.deepEqual(d['object-src'], ['none']);
  assert.deepEqual(d['base-uri'], ['none']);
  assert.deepEqual(d['form-action'], ['none']);
  const all = JSON.stringify(d);
  assert.ok(!all.includes('unsafe-inline'), 'без unsafe-inline (чек-лист релиза 05_PRIVACY)');
  assert.ok(!all.includes('unsafe-eval'), 'без unsafe-eval');
});

test('CSP: inline-скрипт и стиль разрешены точными sha256-хэшами', () => {
  const d = cspDirectives();
  const style = html.match(/<style>([\s\S]*?)<\/style>/)[1];
  const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
  const hash = (s) => 'sha256-' + crypto.createHash('sha256').update(Buffer.from(s, 'utf8')).digest('base64');
  assert.deepEqual(d['style-src'], [hash(style)], 'хэш <style>');
  assert.deepEqual(d['script-src'].slice(1), [hash(script)], 'хэш <script type="module"> (плюс self для ../src)');
  assert.deepEqual(d['script-src'][0], 'self');
});

/* ---------- сеть: ноль внешних ссылок и сетевых API ---------- */
test('ни одного http(s):// и ни одного сетевого API в плеере', () => {
  assert.ok(!/https?:\/\//.test(html), 'внешние URL не встречаются даже в комментариях');
  for (const api of ['fetch(', 'XMLHttpRequest', 'WebSocket', 'sendBeacon', 'EventSource(', 'importScripts']) {
    assert.ok(!html.includes(api), `нет ${api}`);
  }
  const imports = [...html.matchAll(/import\('([^']+)'\)/g)].map((m) => m[1]);
  assert.ok(imports.length >= 4, 'модули подключены динамически');
  for (const i of imports) assert.ok(i.startsWith('../src/'), `импорт только из ../src/: ${i}`);
  const srcs = [...html.matchAll(/\ssrc="([^"]*)"/g)].map((m) => m[1]);
  for (const s of srcs) assert.ok(s.startsWith('data:') || s.startsWith('../'), `src только данные/свои модули: ${s}`);
  const hrefs = [...html.matchAll(/\shref="([^"]*)"/g)].map((m) => m[1]);
  for (const h of hrefs) assert.ok(h.startsWith('data:'), `href только data: (favicon-заглушка): ${h}`);
});

/* ---------- контраст (WCAG 1.4.3): все пары всех сцен ≥ 4.5:1, фокус ≥ 3:1 ---------- */
const LUM = (hex) => {
  const c = hex.replace('#', '');
  const rgb = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
};
const ratio = (fg, bg) => {
  const [a, b] = [LUM(fg), LUM(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
};

function tokenBlocks() {
  const blocks = [];
  const root = html.match(/:root\s*\{([^}]*)\}/);
  if (root) blocks.push([':root', root[1]]);
  const re = /html\[data-(scene|contrast)="([a-z]+)"\]\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(html)) !== null) blocks.push([`${m[1]}=${m[2]}`, m[3]]);
  return blocks.map(([name, body]) => {
    const vars = {};
    for (const [, k, v] of body.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})/g)) vars[k] = v;
    return { name, vars };
  });
}

test('контраст: каждая сцена — текст ≥ 4.5:1, фокус ≥ 3:1 (QA-план, автопроверка)', () => {
  const blocks = tokenBlocks();
  const names = blocks.map((b) => b.name);
  for (const need of [':root', 'scene=day', 'scene=party', 'scene=kids', 'scene=romantic', 'contrast=high']) {
    assert.ok(names.includes(need), `блок токенов ${need} описан`);
  }
  // блок высокого контраста объявлен после сцен — иначе сцены его перебьют
  assert.ok(names.indexOf('contrast=high') > Math.max(...names.map((n, i) => (n.startsWith('scene=') ? i : -1))), 'data-contrast перекрывает сцены');
  for (const { name, vars } of blocks) {
    for (const [fgKey, bgKey] of [['ink', 'paper'], ['soft', 'paper'], ['accent-ink', 'accent-bg']]) {
      const r = ratio(vars[fgKey], vars[bgKey]);
      assert.ok(r >= 4.5, `${name}: ${fgKey} на ${bgKey} = ${r.toFixed(2)}:1 (нужно ≥ 4.5:1)`);
    }
    const f = ratio(vars.focus, vars.paper);
    assert.ok(f >= 3, `${name}: фокус на фоне = ${f.toFixed(2)}:1 (нужно ≥ 3:1, WCAG 1.4.11)`);
  }
});

/* ---------- доступность разметки ---------- */
test('разметка: focus-visible, prefers-reduced-motion, motion=none, aria-live, подписи полей, lang', () => {
  assert.ok(html.includes(':focus-visible'), 'видимый фокус по клавиатуре');
  assert.ok(html.includes('@media (prefers-reduced-motion: reduce)'), 'системная настройка движения уважается');
  assert.ok(html.includes('html[data-motion="none"]'), 'режим «без анимации» отключает переходы CSS');
  assert.ok((html.match(/aria-live="polite"/g) || []).length >= 2, 'текущая строка и журнал озвучиваются');
  assert.ok(html.includes('<html lang="ru"'), 'язык страницы объявлен');
  for (const id of ['seek', 'tempo', 'size', 'offset', 'sound', 'haptic', 'motion', 'scene-sel']) {
    assert.ok(html.includes(`for="${id}"`), `у поля #${id} есть <label for>`);
    assert.ok(html.includes(`id="${id}"`), `поле #${id} существует`);
  }
  assert.ok(html.includes('<kbd>'), 'клавиатурные подсказки показаны текстом');
  assert.ok(html.includes('min-height: 44px'), 'цели нажатия ≥ 44 px (ТЗ §4)');
});

test('профиль загружается с автоначальными значениями из системных настроек (F8)', () => {
  assert.ok(
    html.includes('Profile.load(Profile.detectEnv())'),
    'matchMedia-настройки читаются при загрузке профиля (prefers-reduced-motion / prefers-contrast)',
  );
  assert.ok(
    html.includes('Profile.detectEnv(), profile._store'),
    'импорт профиля сохраняет env того же устройства (автонастройка не теряется)',
  );
});

test('стартовая последовательность модуля живая: applyAll() после объявления аудио-состояния (регрессия TDZ)', () => {
  // Регрессия живого прогона: applyProfile('sound') читает master; если `let master`
  // объявлен ПОСЛЕ первого top-level applyAll(), модуль умирает от ReferenceError
  // (TDZ) — кнопки, расшифровка и rAF не устанавливаются, плеер мёртв.
  const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
  const masterDecl = script.indexOf('let ctx = null, master = null');
  const applyAllCall = script.indexOf('applyAll();');
  assert.ok(masterDecl >= 0, 'аудио-состояние объявлено');
  assert.ok(applyAllCall >= 0, 'applyAll() вызывается на старте');
  assert.ok(masterDecl < applyAllCall, 'объявление master стоит ДО первого applyAll()');
});

test('движок плеера соответствует архитектуре: упреждение 120 мс, тик 25 мс, аудио-часы, rAF-визуал', () => {
  assert.ok(html.includes("lookaheadMs: 120"), 'окно упреждения планировщика');
  assert.ok(html.includes('tickMs: 25'), 'тик планировщика 25 мс');
  assert.ok(html.includes("new AudioContext()"), 'аудио-часы AudioContext');
  assert.ok(html.includes('outputLatency'), 'задержка вывода учитывается (§3.3)');
  assert.ok(html.includes('requestAnimationFrame(frame)'), 'визуал в rAF-петле (§3.2)');
  assert.ok(html.includes("document.hidden"), 'уход вкладки в фон — пауза (§3.4)');
  assert.ok(html.includes('navigator.vibrate'), 'вибро через Vibration API (F14)');
  assert.ok(html.includes("profile.get('motion') === 'none'"), 'при motion=none световых вспышек нет (ТЗ §4)');
});
