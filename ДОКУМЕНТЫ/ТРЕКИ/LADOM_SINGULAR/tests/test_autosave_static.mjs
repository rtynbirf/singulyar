// Статическая проверка модуля автосохранения LADOM_SINGULAR (такт v10.73, P0.1).
// Проверяет ЖИВЫЕ HTML-файлы: модуль между // AUTOSAVE-BEGIN и // AUTOSAVE-END,
// IndexedDB (база ladom-singular, store projects, ключ = имя файла), debounce 800 мс,
// транзакционность (невалидный проект не записывается), честный статус при
// недоступности IndexedDB, баннер восстановления/сброса и 0 сетевых обращений.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const SPECS = [
  {
    file: path.join(ROOT, 'LADOM_SINGULAR_COMPOSITION_v1.html'),
    key: 'LADOM_SINGULAR_COMPOSITION_v1.html',
    renderFn: 'full' // хук автосохранения внутри full()
  },
  {
    file: path.join(ROOT, 'ladom-layout-studio-p0.html'),
    key: 'ladom-layout-studio-p0.html',
    renderFn: 'renderAll'
  }
];

SPECS.forEach((spec) => {
  const name = path.basename(spec.file);
  describe('автосохранение · ' + name, () => {
    const html = fs.readFileSync(spec.file, 'utf8');
    const b = html.indexOf('// AUTOSAVE-BEGIN');
    const e = html.indexOf('// AUTOSAVE-END');
    const block = b !== -1 && e > b ? html.slice(b, e) : '';

    it('маркеры AUTOSAVE-BEGIN/END: ровно по одному, BEGIN раньше END', () => {
      assert.equal((html.match(/\/\/ AUTOSAVE-BEGIN/g) || []).length, 1);
      assert.equal((html.match(/\/\/ AUTOSAVE-END/g) || []).length, 1);
      assert.ok(b !== -1 && e > b);
    });

    it('IndexedDB: база ladom-singular, store projects, ключ = имя файла-приложения', () => {
      assert.match(block, /AUTOSAVE_DB\s*=\s*['"]ladom-singular['"]/);
      assert.match(block, /AUTOSAVE_STORE\s*=\s*['"]projects['"]/);
      assert.match(block, new RegExp(`AUTOSAVE_KEY\\s*=\\s*['"]${spec.key.replace(/\./g, '\\.')}['"]`));
      assert.match(block, /indexedDB\.open/);
    });

    it('debounce 800 мс после валидной транзакции', () => {
      assert.match(block, /AUTOSAVE_DEBOUNCE_MS\s*=\s*800/);
      assert.match(block, /setTimeout/);
    });

    it('хук автосохранения стоит в ' + spec.renderFn + '() и вызывается после транзакций', () => {
      const calls = (html.match(/scheduleAutosave\(\)/g) || []).length;
      assert.ok(calls >= 3, 'scheduleAutosave() должен вызываться минимум в ' + spec.renderFn + ', autosaveInit и factoryReset; найдено: ' + calls);
      const renderFn = html.match(new RegExp('function ' + spec.renderFn + '\\([\\s\\S]{0,900}?scheduleAutosave\\(\\);'));
      assert.ok(renderFn, 'внутри ' + spec.renderFn + '() есть вызов scheduleAutosave()');
    });

    it('транзакционность: невалидный проект НЕ записывается (гейт validateProject до idbPut)', () => {
      assert.match(block, /validateProject\(project\)\.length/);
      assert.match(block, /Автосохранение пропущено/);
      const gate = block.indexOf('validateProject(project).length');
      const put = block.indexOf('idbPut(autosaveDb');
      assert.ok(gate !== -1 && put !== -1 && gate < put, 'гейт валидации должен идти до записи в IndexedDB');
    });

    it('восстановление при открытии: только валидное сохранение, баннер «Проект восстановлен из автосохранения»', () => {
      assert.match(block, /Проект восстановлен из автосохранения/);
      assert.match(block, /validateProject\(saved\.project\)\.length/);
      const banner = html.match(/<div id="autosaveBanner"[^>]*>/);
      assert.ok(banner, 'есть панель autosaveBanner');
      assert.match(banner[0], /hidden/);
      assert.match(banner[0], /aria-live\s*=\s*["']polite["']/);
      assert.match(html, /id="autosaveMsg"/);
      assert.match(html, /id="autosaveStatus"[^>]*aria-live/);
    });

    it('кнопка сброса к заводскому примеру (в баннере и на панели) с функцией factoryReset', () => {
      assert.match(block, /function factoryReset/);
      assert.match(block, /factoryProject\(\)/);
      assert.match(html, /id="autosaveReset"[^>]*>Сброс к заводскому примеру</);
      assert.match(html, /id="(autosaveReset|btnFactoryReset)"/);
      assert.match(block, /addEventListener\('click',\s*factoryReset\)/);
    });

    it('честный статус при недоступности IndexedDB (file://, приватный режим): без молчаливого падения', () => {
      const unavailable = (block.match(/недоступн/g) || []).length;
      assert.ok(unavailable >= 3, 'минимум 3 честных сообщения о недоступности; найдено: ' + unavailable);
      assert.match(block, /typeof indexedDB === 'undefined'/);
      assert.match(block, /работа как раньше/);
      assert.match(block, /catch/);
    });

    it('0 сетевых обращений в модуле и во всём файле (закон дома)', () => {
      assert.doesNotMatch(block, /\bfetch\s*\(/);
      assert.doesNotMatch(block, /XMLHttpRequest/);
      assert.doesNotMatch(block, /WebSocket/);
      assert.doesNotMatch(html, /\bfetch\s*\(/);
      assert.doesNotMatch(html, /XMLHttpRequest/);
      assert.doesNotMatch(html, /WebSocket/);
      assert.doesNotMatch(html, /https?:\/\//);
    });

    it('нет innerHTML в модуле автосохранения', () => {
      assert.equal(block.includes('innerHTML'), false);
    });

    it('инициализация модуля запускается при открытии файла (autosaveInit)', () => {
      assert.match(block, /async function autosaveInit/);
      assert.match(html, /autosaveInit\(\);/);
    });
  });
});
