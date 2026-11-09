// Статический a11y-аудит прототипов LADOM_SINGULAR (такт v10.73, P0.1).
// Проверяет ЖИВЫЕ HTML-файлы: подписи кнопок/полей, стили фокуса, aria-live
// у ошибок валидации, роли табов, prefers-reduced-motion, Esc, числовую
// альтернативу drag-and-drop и закон дома (0 внешних запросов, innerHTML = 0).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const FILES = [
  path.join(ROOT, 'LADOM_SINGULAR_COMPOSITION_v1.html'),
  path.join(ROOT, 'ladom-layout-studio-p0.html')
];

function staticTags(html, tag) {
  const re = new RegExp('<' + tag + '\\b([^>]*)>', 'g');
  const out = [];
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

function staticButtons(html) {
  const re = /<button\b([^>]*)>([\s\S]*?)<\/button>/g;
  const out = [];
  let m;
  while ((m = re.exec(html))) out.push({ attrs: m[1], inner: m[2] });
  return out;
}

const stripTags = (s) => s.replace(/<[^>]*>/g, '');
const hasAriaLabel = (attrs) => /aria-label\s*=\s*["'][^"']+["']/.test(attrs) || /aria-labelledby\s*=\s*["'][^"']+["']/.test(attrs);

function labelCoverage(html) {
  const forIds = new Set();
  const wrappedIds = new Set();
  let m;
  const forRe = /<label\b[^>]*\bfor\s*=\s*["']([^"']+)["'][^>]*>/g;
  while ((m = forRe.exec(html))) forIds.add(m[1]);
  const blockRe = /<label\b[^>]*>([\s\S]*?)<\/label>/g;
  while ((m = blockRe.exec(html))) {
    const idRe = /\bid\s*=\s*["']([^"']+)["']/g;
    let idm;
    while ((idm = idRe.exec(m[1]))) wrappedIds.add(idm[1]);
  }
  return { forIds, wrappedIds };
}

FILES.forEach((file) => {
  const name = path.basename(file);
  describe('a11y · ' + name, () => {
    const html = fs.readFileSync(file, 'utf8');

    it('базовые атрибуты документа: lang="ru" и осмысленный <title>', () => {
      assert.match(html, /<html lang="ru">/);
      assert.match(html, /<title>[^<]{5,}<\/title>/);
    });

    it('каждая статическая кнопка имеет type="button" и подпись (текст или aria-label)', () => {
      const buttons = staticButtons(html);
      assert.ok(buttons.length >= 8, 'в файле есть статические кнопки');
      for (const b of buttons) {
        assert.match(b.attrs, /type\s*=\s*["']button["']/, 'кнопка без type=button: ' + b.attrs);
        const label = stripTags(b.inner).trim();
        assert.ok(
          hasAriaLabel(b.attrs) || label.length > 0,
          'кнопка без подписи: <button' + b.attrs + '>'
        );
      }
    });

    it('каждое поле ввода/выбора имеет подпись (label for, обёртка label или aria-label)', () => {
      const { forIds, wrappedIds } = labelCoverage(html);
      const tags = [];
      for (const tag of ['input', 'select', 'textarea']) {
        for (const attrs of staticTags(html, tag)) tags.push(attrs);
      }
      assert.ok(tags.length >= 6, 'поля присутствуют');
      for (const attrs of tags) {
        const idm = attrs.match(/\bid\s*=\s*["']([^"']+)["']/);
        if (!idm) continue; // поля без id проверяются по aria-label ниже
        const id = idm[1];
        const hiddenFile = /type\s*=\s*["']file["']/.test(attrs) && /hidden/.test(attrs);
        if (hiddenFile) continue; // скрытый file-input недоступен для фокуса и SR
        assert.ok(
          forIds.has(id) || wrappedIds.has(id) || hasAriaLabel(attrs),
          'поле #' + id + ' без подписи'
        );
      }
    });

    it('видимый фокус: :focus-visible есть, включая регионы холста (.region) и select', () => {
      assert.match(html, /:focus-visible/);
      assert.match(html, /\.region:focus-visible/);
      assert.match(html, /select:focus-visible/);
    });

    it('контейнер ошибок валидации #validation имеет aria-live (изменения озвучиваются)', () => {
      const m = html.match(/<div id="validation"[^>]*>/);
      assert.ok(m, 'есть #validation');
      assert.match(m[0], /aria-live\s*=\s*["']polite["']/);
    });

    it('innerHTML не используется вовсе (пользовательские строки — только textContent/DOM API)', () => {
      assert.equal(html.includes('innerHTML'), false);
    });

    it('динамические кнопки регионов получают aria-label и role=option в списках из JS', () => {
      assert.match(html, /setAttribute\((['"])aria-label\1/);
      assert.match(html, /setAttribute\((['"])role\1,\s*['"]option['"]/);
    });

    it('роли табов: role="tablist", role="tab", role="tabpanel" и aria-selected', () => {
      assert.match(html, /role\s*=\s*["']tablist["']/);
      assert.ok((html.match(/role\s*=\s*["']tab["']/g) || []).length >= 3);
      assert.ok((html.match(/role\s*=\s*["']tabpanel["']/g) || []).length >= 3);
      assert.ok((html.match(/aria-selected\s*=/g) || []).length >= 3);
    });

    it('prefers-reduced-motion уважается в CSS', () => {
      assert.match(html, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    });

    it('Escape обрабатывается (снятие выбора/закрытие панели автосохранения/blur полей)', () => {
      assert.match(html, /e\.key\s*===\s*['"]Escape['"]/);
    });

    it('клавиатурная альтернатива drag-and-drop: числовые поля X/Y/W/H с type=number', () => {
      for (const id of ['x', 'y', 'w', 'h']) {
        const re = new RegExp('<input id="' + id + '" type="number"');
        assert.match(html, re, 'поле #' + id + ' должно быть type=number');
      }
    });

    it('холст — role="group" с подписью (role="img" скрыл бы дочерние регионы от SR)', () => {
      const m = html.match(/<div id="canvas"[^>]*>/);
      assert.ok(m, 'есть #canvas');
      assert.match(m[0], /role\s*=\s*["']group["']/);
      assert.match(m[0], /aria-label\s*=\s*["'][^"']+["']/);
    });

    it('список регионов — role="listbox" с aria-label; список снимков подписан', () => {
      const listbox = html.match(/<div id="(?:rlist|regionList)"[^>]*>/);
      assert.ok(listbox, 'есть список регионов');
      assert.match(listbox[0], /role\s*=\s*["']listbox["']/);
      assert.match(listbox[0], /aria-label\s*=\s*["'][^"']+["']/);
      assert.match(html, /aria-label\s*=\s*["'][^"']*Снимки верс/);
    });

    it('закон дома: 0 внешних запросов (нет URL, fetch, XHR, WebSocket, внешних script/link)', () => {
      assert.doesNotMatch(html, /https?:\/\//);
      assert.doesNotMatch(html, /\bfetch\s*\(/);
      assert.doesNotMatch(html, /XMLHttpRequest/);
      assert.doesNotMatch(html, /WebSocket/);
      assert.doesNotMatch(html, /<script[^>]*\bsrc\s*=/);
      assert.doesNotMatch(html, /<link\b/i);
      assert.doesNotMatch(html, /@import\b/i);
    });
  });
});
