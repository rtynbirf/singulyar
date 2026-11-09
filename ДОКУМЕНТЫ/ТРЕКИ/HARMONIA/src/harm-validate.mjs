/**
 * ГАРМОНИЯ · format/harm — валидатор события .harm (Фаза 1)
 * ------------------------------------------------------------------
 * Проверка документа по 07_HARM_FORMAT.md + schema/harm.schema.json:
 *  - тег схемы harm/<майор>.<минор>; более новая МАЖОРНАЯ версия не открывается (правило 5);
 *  - bpm 30–240, beatsPerLine — целое ≥ 1;
 *  - маркеры: beat ≥ 0, type из перечня, data — объект;
 *  - alt обязательна для text и prompt (правило 1);
 *  - у text data.words — массив слов, слово — массив пар [слог, доля > 0];
 *  - prompt без явной альтернативы жесту — предупреждение (правило 2).
 * Ноль зависимостей, чистая логика — проверяется в node:test.
 */

const SCHEMA_RE = /^harm\/(\d+)\.(\d+)$/;
const MARKER_TYPES = ['text', 'accent', 'scene', 'prompt', 'pause'];
const SUPPORTED_MAJOR = 0;

function validateHarm(doc) {
  const errors = [];
  const warnings = [];

  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    return { ok: false, errors: ['документ: ожидался объект .harm'], warnings };
  }

  const m = typeof doc.schema === 'string' ? SCHEMA_RE.exec(doc.schema) : null;
  if (!m) {
    errors.push(`schema: ожидался вид «harm/<майор>.<минор>», получено ${JSON.stringify(doc.schema ?? null)}`);
  } else if (Number(m[1]) > SUPPORTED_MAJOR) {
    errors.push(`schema: мажорная версия ${m[1]} новее поддерживаемой ${SUPPORTED_MAJOR} — плеер отказывается открывать (правило 5 формата)`);
  }

  if (typeof doc.title !== 'string' || doc.title.trim() === '') {
    errors.push('title: обязательная непустая строка');
  }

  if (typeof doc.bpm !== 'number' || !Number.isFinite(doc.bpm) || doc.bpm < 30 || doc.bpm > 240) {
    errors.push('bpm: число в диапазоне 30–240');
  }

  if (doc.beatsPerLine !== undefined
    && (!Number.isInteger(doc.beatsPerLine) || doc.beatsPerLine < 1)) {
    errors.push('beatsPerLine: целое число ≥ 1');
  }

  if (!Array.isArray(doc.timeline)) {
    errors.push('timeline: обязательный массив маркеров');
  } else {
    doc.timeline.forEach((mk, i) => {
      const at = `timeline[${i}]`;
      if (!mk || typeof mk !== 'object' || Array.isArray(mk)) {
        errors.push(`${at}: ожидался объект-маркер`);
        return;
      }
      if (typeof mk.beat !== 'number' || !Number.isFinite(mk.beat) || mk.beat < 0) {
        errors.push(`${at}.beat: число ≥ 0`);
      }
      if (!MARKER_TYPES.includes(mk.type)) {
        errors.push(`${at}.type: один из ${MARKER_TYPES.join(', ')}`);
      }
      if (!mk.data || typeof mk.data !== 'object' || Array.isArray(mk.data)) {
        errors.push(`${at}.data: обязательный объект`);
      }
      if ((mk.type === 'text' || mk.type === 'prompt') && typeof mk.alt !== 'string') {
        errors.push(`${at}.alt: обязательна для text и prompt (правило 1 формата)`);
      }
      if (mk.type === 'text' && mk.data && typeof mk.data === 'object') {
        const words = mk.data.words;
        if (!Array.isArray(words)) {
          errors.push(`${at}.data.words: массив слов (словарь долей)`);
        } else {
          words.forEach((w, wi) => {
            if (!Array.isArray(w)) {
              errors.push(`${at}.data.words[${wi}]: слово — массив слогов`);
              return;
            }
            w.forEach((s, si) => {
              const okPair = Array.isArray(s) && typeof s[0] === 'string' && Number(s[1]) > 0;
              if (!okPair) errors.push(`${at}.data.words[${wi}][${si}]: ожидается пара [слог, доля > 0]`);
            });
          });
        }
      }
      if (mk.type === 'prompt' && mk.data && typeof mk.data === 'object') {
        const hasKeyboardAlt = typeof mk.data.keyboardAlt === 'string' && mk.data.keyboardAlt.trim() !== '';
        if (!hasKeyboardAlt && mk.data.keyboard !== true) {
          warnings.push(`${at}.prompt: нет явной альтернативы жесту (кнопка/клавиша — правило 2)`);
        }
      }
    });
  }

  return { ok: errors.length === 0, errors, warnings };
}

export { validateHarm, MARKER_TYPES, SUPPORTED_MAJOR };
