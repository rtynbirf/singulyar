/**
 * ГАРМОНИЯ · render/text — TextPulse (Фаза 1)
 * ------------------------------------------------------------------
 * Четыре гранулярности события по данным .harm: строка / слово / слог / фонема.
 * Формат .harm несёт слоги с весами (долями), фонем как данных нет — самая
 * мелкая гранула строится по графемам слога (в ТЗ этот уровень назван «буква»,
 * в профиле — ось gran: letter). Время — в ДОЛЯХ (beat), темп пользователя
 * на разметку не влияет (07_HARM_FORMAT.md): конвертация в секунды — дело PulseEngine.
 *
 * Ноль зависимостей, чистая логика — проверяется в node:test.
 */

const LEVELS = ['line', 'word', 'syllable', 'phoneme'];
// ТЗ F2 говорит «буква», спецификация профиля — gran: letter. Фонема = тот же уровень.
const ALIASES = { letter: 'phoneme', char: 'phoneme', grapheme: 'phoneme' };

class TextPulse {
  /**
   * @param {Array} markers  маркеры timeline из .harm (используются type:'text')
   * @param {Object} [opts]
   * @param {number} [opts.beatsPerLine=4]
   */
  constructor(markers = [], { beatsPerLine = 4 } = {}) {
    this._beatsPerLine = Number.isFinite(+beatsPerLine) && +beatsPerLine > 0 ? +beatsPerLine : 4;
    this._lines = [];
    this._segs = { line: [], word: [], syllable: [], phoneme: [] };
    this._order = 0;

    const texts = (Array.isArray(markers) ? markers : [])
      .filter((m) => m && m.type === 'text')
      .slice()
      .sort((a, b) => (a.beat - b.beat));
    texts.forEach((m, li) => this._buildLine(m, li));

    for (const key of Object.keys(this._segs)) {
      this._segs[key].sort((a, b) => (a.startBeat - b.startBeat) || (a.order - b.order));
    }
  }

  _push(level, seg) { this._segs[level].push({ ...seg, level, order: this._order++ }); }

  _buildLine(marker, lineIndex) {
    const words = Array.isArray(marker?.data?.words) ? marker.data.words : [];
    if (!words.length && typeof marker?.alt !== 'string') return;
    const startBeat = Number.isFinite(+marker.beat) ? +marker.beat : 0;
    let cursor = startBeat;
    const wordTexts = [];
    const lineAlt = typeof marker.alt === 'string' ? marker.alt : null;

    for (const rawWord of words) {
      const syls = Array.isArray(rawWord) ? rawWord : [];
      const wStart = cursor;
      let wText = '';
      const sylDefs = [];
      for (const rawSyl of syls) {
        const pair = Array.isArray(rawSyl) ? rawSyl : [String(rawSyl ?? ''), 1];
        const glyph = typeof pair[0] === 'string' ? pair[0] : String(pair[0] ?? '');
        const weightRaw = Number(pair[1]);
        const weight = Number.isFinite(weightRaw) && weightRaw > 0 ? weightRaw : 1;
        const seg = { startBeat: cursor, endBeat: cursor + weight, text: glyph, lineIndex };
        if (glyph !== '') sylDefs.push(seg);
        cursor = seg.endBeat;
        wText += glyph;
      }
      if (wText !== '') {
        wordTexts.push(wText);
        this._push('word', { ...{ startBeat: wStart, endBeat: cursor, text: wText, lineIndex }, wordIndex: wordTexts.length - 1 });
        for (const s of sylDefs) {
          this._push('syllable', { ...s, wordIndex: wordTexts.length - 1 });
          const chars = Array.from(s.text);
          const span = (s.endBeat - s.startBeat) / chars.length;
          chars.forEach((ch, ci) => {
            this._push('phoneme', {
              startBeat: s.startBeat + span * ci,
              endBeat: s.startBeat + span * (ci + 1),
              text: ch,
              lineIndex: s.lineIndex,
              wordIndex: wordTexts.length - 1,
            });
          });
        }
      }
    }

    const lineText = wordTexts.join(' ');
    // Строка без слогов (только alt) не должна схлопываться в нулевой интервал —
    // иначе её не увидит ни подсветка, ни at(): даём ей длину одной строки.
    const endBeat = cursor > startBeat ? cursor : startBeat + this._beatsPerLine;
    if (!words.length && !lineText && !lineAlt) return;
    const line = {
      index: lineIndex,
      startBeat,
      endBeat,
      text: lineText || lineAlt || '',
      alt: lineAlt || lineText || '',
      marker: marker,
    };
    this._lines.push(line);
    this._push('line', { startBeat, endBeat, text: line.text, lineIndex, alt: line.alt });
  }

  /** Нормализация имени уровня: 'letter' → 'phoneme'; бросает TypeError на неизвестное. */
  static normalizeLevel(level) {
    const lv = LEVELS.includes(level) ? level : ALIASES[level];
    if (!lv) {
      throw new TypeError(`TextPulse: неизвестная гранулярность «${level}» (есть: ${LEVELS.join(', ')}; буква = phoneme)`);
    }
    return lv;
  }

  /** Активный сегмент уровня в данной доле (конец интервала — открытый). null = тишина. */
  at(beat, level = 'syllable') {
    const lv = TextPulse.normalizeLevel(level);
    return TextPulse._find(this._segs[lv], +beat || 0);
  }

  /** Активная гранула на всех уровнях сразу — для подсветки. */
  activeAt(beat) {
    const b = +beat || 0;
    return {
      line: TextPulse._find(this._segs.line, b),
      word: TextPulse._find(this._segs.word, b),
      syllable: TextPulse._find(this._segs.syllable, b),
      phoneme: TextPulse._find(this._segs.phoneme, b),
    };
  }

  /** Все сегменты уровня, пересекающие интервал [from, to). */
  range(level, from, to) {
    const lv = TextPulse.normalizeLevel(level);
    const a = +from || 0;
    const b = +to || 0;
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    return this._segs[lv].filter((s) => s.startBeat < hi && s.endBeat > lo);
  }

  lines() { return this._lines.map((l) => ({ ...l, marker: undefined })); }

  /** Расшифровка текстовых строк (F5): доступна без темпа и без запуска. */
  transcript() { return this._lines.map((l) => ({ beat: l.startBeat, text: l.text, alt: l.alt })); }

  stats() {
    return {
      lines: this._lines.length,
      line: this._segs.line.length,
      word: this._segs.word.length,
      syllable: this._segs.syllable.length,
      phoneme: this._segs.phoneme.length,
    };
  }

  static _find(segs, beat) {
    let lo = 0, hi = segs.length - 1, ans = null;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const s = segs[mid];
      if (s.startBeat <= beat) {
        if (beat < s.endBeat) ans = s;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return ans;
  }
}

export { TextPulse, LEVELS, ALIASES };
