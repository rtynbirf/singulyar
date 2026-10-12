/**
 * Движок подсветки строк.
 * Чистые функции + безопасное обновление DOM (без innerHTML).
 */
import { SONG } from '../data/song.js';

export function findLineIndex(time) {
  let idx = -1;
  for (let i = 0; i < SONG.lines.length; i++) {
    if (SONG.lines[i].t <= time) idx = i;
    else break;
  }
  return idx;
}

/**
 * Полная перерисовка списка строк (вызывается редко).
 * Использует только createElement / textContent.
 */
export function buildLyricsDOM(container, activeIndex) {
  // Очистка без innerHTML
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  if (activeIndex < 0) {
    const placeholder = document.createElement('div');
    placeholder.className = 'line placeholder';
    placeholder.textContent = 'Нажми «Начать вечер»';
    container.appendChild(placeholder);
    return;
  }

  SONG.lines.forEach((line, i) => {
    const el = document.createElement('div');
    el.className = 'line';
    if (i === activeIndex) el.classList.add('active');
    else if (i < activeIndex) el.classList.add('past');
    el.textContent = line.text;
    el.dataset.index = String(i);
    container.appendChild(el);
  });

  const active = container.querySelector('.line.active');
  if (active) {
    active.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

/**
 * Быстрое обновление классов без полной перерисовки.
 */
export function updateActiveLine(container, prevIndex, nextIndex) {
  if (prevIndex === nextIndex) return;

  if (prevIndex >= 0) {
    const prev = container.querySelector(`[data-index="${prevIndex}"]`);
    if (prev) {
      prev.classList.remove('active');
      prev.classList.add('past');
    }
  }

  if (nextIndex >= 0) {
    const next = container.querySelector(`[data-index="${nextIndex}"]`);
    if (next) {
      next.classList.add('active');
      next.classList.remove('past');
      next.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}
