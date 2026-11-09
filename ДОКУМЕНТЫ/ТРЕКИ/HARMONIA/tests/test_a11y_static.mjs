/**
 * A11y-самотест плеера (player/index.html) — статический программный чек-лист
 * вместо axe-core (дом не тащит зависимостей). Фаза 2, такт v10.73 «СВОД».
 *
 * Проверяется (по элементам разметки, без вычисления пикселей):
 *  1. доступное имя у каждого button / input / select / region;
 *  2. видимая фокусировка — стили :focus-visible/:focus объявлены;
 *  3. контрастные токены (--paper/--ink/--soft/--accent-bg/--accent-ink/--focus)
 *     объявлены в :root, каждой сцене и режиме высокого контраста
 *     (объявленность; сами отношения контраста считает tests/player-a11y.test.mjs);
 *  4. язык документа lang="ru";
 *  5. у каждого интерактивного элемента есть type;
 *  6. нет tabindex > 0.
 *
 * Ноль зависимостей. Разметка разбирается регэкспами до первого <script> —
 * это честно для статического самотеста (динамика плеера покрывается
 * tests/player-a11y.test.mjs и живым прогоном фазы 1).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../player/index.html', import.meta.url), 'utf8');
const MARKUP = html.slice(0, html.indexOf('<script')); // статическая разметка до скриптов

/* ---------- мелкая разборка ---------- */
const attrs = (tag) => Object.fromEntries(
  [...tag.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)].map((m) => [m[1].toLowerCase(), m[2]]),
);
const stripTags = (s) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

// кнопки (не самозакрываются, не вложены в этом документе)
const BUTTONS = [...MARKUP.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)]
  .map((m) => ({ tag: m[1], inner: m[2], a: attrs(m[1]) }));
// поля ввода и списки (void/простые теги)
const FIELDS = [...MARKUP.matchAll(/<(input|select|textarea)\b([^>]*)>/g)]
  .map((m) => ({ el: m[1], a: attrs(m[2]), raw: m[0] }));
// <label>…</label> (в этом документе не вложены)
const LABELS = [...MARKUP.matchAll(/<label\b([^>]*)>([\s\S]*?)<\/label>/g)]
  .map((m) => ({ a: attrs(m[1]), body: m[2], text: stripTags(m[2]) }));
const LABEL_FOR = new Set(LABELS.map((l) => l.a.for).filter(Boolean));
const LABEL_TEXT_FOR = new Map(LABELS.map((l) => [l.a.for, l.text]).filter(([k]) => Boolean(k)));

function hasExplicitName(a) {
  return (a['aria-label'] && a['aria-label'].trim() !== '')
    || (a['aria-labelledby'] && a['aria-labelledby'].trim() !== '');
}

/* ---------- 1. язык, заголовок, зум, каркас ---------- */
test('документ: lang="ru", непустой <title>, зум не запрещён, каркас main/header/footer', () => {
  const htmlTag = MARKUP.match(/<html\b[^>]*>/)[0];
  assert.match(htmlTag, /\blang="ru"/, 'язык документа объявлен (WCAG 3.1.1)');
  const title = MARKUP.match(/<title>([\s\S]*?)<\/title>/);
  assert.ok(title && title[1].trim() !== '', 'title есть и непустой');
  const vp = MARKUP.match(/<meta name="viewport" content="([^"]*)"/);
  assert.ok(vp, 'viewport-мета есть');
  assert.ok(!/user-scalable\s*=\s*no/i.test(vp[1]), 'зум не отключён (WCAG 1.4.4)');
  assert.ok(!/maximum-scale\s*=\s*(0|0?\.[0-9]+)/i.test(vp[1]), 'масштаб не зажат (WCAG 1.4.4)');
  assert.equal((MARKUP.match(/<h1\b/g) || []).length, 1, 'один h1 — ровно один заголовок страницы');
  assert.match(MARKUP, /<main\b/, 'есть main-ориентир');
  assert.match(MARKUP, /<header\b/, 'есть header-ориентир');
  assert.match(MARKUP, /<footer\b/, 'есть footer-ориентир');
});

/* ---------- 2. доступные имена ---------- */
test('каждый button имеет доступное имя: aria-label/labelledby или непустой текст', () => {
  assert.ok(BUTTONS.length >= 10, 'кнопки в разметке найдены');
  for (const b of BUTTONS) {
    const name = b.a['aria-label'] || (b.a['aria-labelledby'] ? `#${b.a['aria-labelledby']}` : '') || stripTags(b.inner);
    assert.ok(String(name).trim() !== '', `кнопка без имени: <button${b.tag}>`);
  }
});

test('каждый input/select имеет доступное имя: aria-label, label for= или оборачивающий label', () => {
  assert.ok(FIELDS.length >= 10, 'поля в разметке найдены');
  for (const f of FIELDS) {
    const ok = hasExplicitName(f.a)
      || (f.a.id && LABEL_FOR.has(f.a.id) && (LABEL_TEXT_FOR.get(f.a.id) || '').trim() !== '')
      || LABELS.some((l) => l.body.includes(f.raw) && l.text.trim() !== '');
    assert.ok(ok, `поле без доступного имени: <${f.el}${JSON.stringify(f.a)}>`);
  }
  // ссылка for= обязана вести на существующий id — битая подпись = безымянное поле
  for (const id of LABEL_FOR) {
    assert.ok(new RegExp(`id="${id}"`).test(MARKUP), `label for="${id}" указывает на существующий id`);
  }
});

test('каждая region/секция именована; у fieldset есть legend; живые области объявлены', () => {
  const sections = [...MARKUP.matchAll(/<section\b([^>]*)>/g)].map((m) => attrs(m[1]));
  assert.ok(sections.length >= 3, 'секции найдены');
  for (const a of sections) {
    assert.ok(hasExplicitName(a), `section без имени: ${JSON.stringify(a)}`);
  }
  const nFieldsets = (MARKUP.match(/<fieldset\b/g) || []).length;
  const legends = [...MARKUP.matchAll(/<legend\b[^>]*>([\s\S]*?)<\/legend>/g)].map((m) => stripTags(m[1]));
  assert.ok(nFieldsets >= 4, 'группы полей есть');
  assert.equal(legends.length, nFieldsets, 'у каждого fieldset есть legend (по одной на группу)');
  for (const l of legends) assert.ok(l.trim() !== '', 'legend непустой');
  assert.ok((MARKUP.match(/aria-live="polite"/g) || []).length >= 2, 'текущая строка и журнал озвучиваются');
  assert.match(MARKUP, /role="status"/, 'статусная строка — живая область');
});

/* ---------- 3. видимая фокусировка ---------- */
test('видимая фокусировка: :focus-visible с ненулевым outline на токене --focus', () => {
  const style = MARKUP.match(/<style>([\s\S]*?)<\/style>/)[1];
  const fv = style.match(/:focus-visible\s*\{([^}]*)\}/);
  assert.ok(fv, 'есть блок стилей :focus-visible (WCAG 2.4.7)');
  assert.match(fv[1], /outline:\s*(?!none|0)/, 'outline не отключён');
  assert.match(fv[1], /var\(--focus\)/, 'цвет фокуса — из контрастного токена');
  assert.match(fv[1], /outline-offset/, 'фокус отнесён от текста — читается на акцентном фоне');
});

/* ---------- 4. контрастные токены объявлены (НЕ вычисляем пиксели) ---------- */
test('контрастные токены объявлены в :root, всех сценах и режиме высокого контраста', () => {
  const style = MARKUP.match(/<style>([\s\S]*?)<\/style>/)[1];
  const blocks = [];
  const root = style.match(/:root\s*\{([^}]*)\}/);
  assert.ok(root, 'блок :root есть');
  blocks.push([':root', root[1]]);
  const re = /html\[data-(scene|contrast)="([a-z]+)"\]\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(style)) !== null) blocks.push([`${m[1]}=${m[2]}`, m[3]]);
  const names = blocks.map(([n]) => n);
  for (const need of [':root', 'scene=day', 'scene=party', 'scene=kids', 'scene=romantic', 'contrast=high']) {
    assert.ok(names.includes(need), `блок токенов ${need} объявлен`);
  }
  const TOKENS = ['--paper', '--ink', '--soft', '--accent-bg', '--accent-ink', '--focus'];
  for (const [name, body] of blocks) {
    for (const t of TOKENS) {
      assert.match(body, new RegExp(`${t}\\s*:`), `${name}: токен ${t} объявлен`);
    }
  }
});

/* ---------- 5. у интерактивных есть type ---------- */
test('у каждого button и input объявлен type (у select атрибута type по спецификации нет)', () => {
  for (const b of BUTTONS) {
    assert.ok(b.a.type === 'button', `кнопка без type="button": <button${b.tag}>`);
  }
  for (const f of FIELDS.filter((x) => x.el === 'input')) {
    assert.ok(f.a.type, `input без type: ${JSON.stringify(f.a)}`);
  }
  // динамическая кнопка расшифровки тоже получает type и текст (доступное имя)
  const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
  assert.match(script, /const b = el\('button'\);\s*\n\s*b\.type = 'button';/, 'динамическая кнопка получает type');
  assert.match(script, /b\.textContent\s*=/, 'динамическая кнопка получает текст — доступное имя');
});

/* ---------- 6. tabindex ---------- */
test('нет tabindex > 0 и aria-hidden на каркасе', () => {
  for (const m of MARKUP.matchAll(/tabindex="([^"]*)"/g)) {
    const v = Number(m[1]);
    assert.ok(Number.isFinite(v) && v <= 0, `tabindex="${m[1]}" > 0 ломает порядок обхода (WCAG 2.4.3)`);
  }
  const htmlTag = MARKUP.match(/<html\b[^>]*>/)[0];
  const bodyTag = MARKUP.match(/<body\b[^>]*>/)[0];
  assert.ok(!/aria-hidden="true"/.test(htmlTag + bodyTag), 'html/body не спрятаны от вспомогательных технологий');
});
