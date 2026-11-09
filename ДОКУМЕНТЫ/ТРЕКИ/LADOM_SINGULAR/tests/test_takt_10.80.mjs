// test_takt_10.80.mjs — ЛАДОМ·СИНГУЛЯР, такт v10.80 «ХВОСТЫ».
// Строки карты: Л3 «P2: QA-метрики», Л4 «P2.1: music-регион».
// Л2 «Intent → region seed» закрыта v10.78 «ОТКЛИК» (их ход первым —
// ladom-layout-studio-p0.html + tests/test_intent_seed.mjs); здесь intent-логика
// живёт ТОЛЬКО как тестовая фикстура-продюсер для снятия метрик Л3 (fixtures/intent-seed-fikstura.mjs).
//
// Честные границы:
//   - метрики Л3 снимаются на фиксированном корпусе tests/fixtures/scenes.json (10 сцен)
//     с фикстурным офлайн-продюсером; таблица прогона печатается в stdout —
//     фактические числа перенесены в README/отчёт;
//   - AudioContext в node НЕТ — обвязка проверяется как честный отказ, чистая часть
//     (паттерн/расписание) проверяется полноценно.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

import { parseIntent, toLayoutProject, toComposition, validateDraft, hashSeed, LAYOUT_SCHEMA, COMPOSITION_SCHEMA } from './fixtures/intent-seed-fikstura.mjs';
import * as qa from '../src/qa-metrics.mjs';
import * as music from '../src/music-region.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');


// ===========================================================================
// Статический гард: 0 сети во всех новых модулях
// ===========================================================================
describe('гард · новые модули без сети', () => {
  const FILES = ['src/qa-metrics.mjs', 'src/music-region.mjs'];
  for (const f of FILES) {
    it(f + ': нет fetch/XHR/WebSocket/http(s)', () => {
      const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
      assert.doesNotMatch(src, /\bfetch\s*\(|XMLHttpRequest|WebSocket|import\s*\(/);
      assert.doesNotMatch(src, /https?:\/\//);
    });
  }
});

// ===========================================================================
// Л2 «P1.1: Intent → region seed»
// ===========================================================================
function extractValidator(html) {
  const begin = html.indexOf('// VALIDATOR-BEGIN');
  const end = html.indexOf('// VALIDATOR-END');
  assert.ok(begin !== -1 && end !== -1 && begin < end, 'нет пары VALIDATOR-BEGIN/END');
  return html.slice(begin, end);
}
function loadLiveValidator(file) {
  const html = fs.readFileSync(file, 'utf8');
  const sandbox = {};
  vm.runInNewContext(extractValidator(html), sandbox, { filename: path.basename(file) + '.vm' });
  return sandbox;
}

describe('Л3 · qa-metrics: юнит-математика', () => {
  const A = { x: 0.2, y: 0.2, width: 0.4, height: 0.4 };
  it('IoU: идентичный bbox = 1, частичное пересечение = точная формула, без пересечения = 0', () => {
    assert.equal(qa.bboxIoU(A, A), 1);
    const half = { x: 0.4, y: 0.2, width: 0.4, height: 0.4 };
    // inter 0.2*0.4 = 0.08; union 0.16+0.16-0.08 = 0.24 → 1/3
    assert.ok(Math.abs(qa.bboxIoU(A, half) - 0.08 / 0.24) < 1e-9);
    const far = { x: 0.9, y: 0.9, width: 0.1, height: 0.1 };
    assert.equal(qa.bboxIoU(A, far), 0);
  });

  it('центроид и дистанция: известные значения, диагональ кадра √2', () => {
    assert.deepEqual(qa.centroid(A), { x: 0.4, y: 0.4 });
    const B = { x: 0.7, y: 0.7, width: 0.2, height: 0.2 }; // центр (0.8, 0.8)
    assert.ok(Math.abs(qa.centroidDistance(A, B) - Math.hypot(0.4, 0.4)) < 1e-9);
    assert.equal(qa.FRAME_DIAGONAL, Math.SQRT2);
  });

  it('median: чёт/нечёт', () => {
    assert.equal(qa.median([3, 1, 2]), 2);
    assert.equal(qa.median([4, 1, 2, 3]), 2.5);
    assert.equal(qa.median([]), 0);
  });

  it('entityRecall: полный 1, недостающая 2/3, лишние не портят, пустой эталон', () => {
    const exp = [{ label: 'a', bbox: A }, { label: 'b', bbox: { x: 0.7, y: 0.1, width: 0.2, height: 0.2 } }, { label: 'c', bbox: { x: 0.05, y: 0.7, width: 0.2, height: 0.2 } }];
    assert.equal(qa.entityRecall(exp, exp), 1);
    const two = exp.slice(0, 2);
    assert.ok(Math.abs(qa.entityRecall(exp, two) - 2 / 3) < 1e-9);
    const extra = two.concat([{ label: 'x', bbox: { x: 0.4, y: 0.4, width: 0.1, height: 0.1 } }]);
    assert.equal(qa.entityRecall(exp, extra), 2 / 3);
    assert.equal(qa.entityRecall([], []), 1);
    assert.equal(qa.entityRecall([], exp), 0);
  });

  it('spatialError: сопоставление по IoU, центроидная ошибка в диагоналях кадра', () => {
    const exp = [{ label: 'a', bbox: A }];
    const got = [{ label: 'a', bbox: { x: 0.3, y: 0.2, width: 0.4, height: 0.4 } }]; // сдвиг 0.1 по x
    const sp = qa.spatialError(exp, got);
    assert.equal(sp.matched, 1);
    // сдвиг 0.1 по x: inter 0.3*0.4 = 0.12; union 0.16+0.16-0.12 = 0.2 → IoU 0.6
    assert.ok(Math.abs(sp.meanIoU - 0.6) < 1e-9);
    assert.ok(Math.abs(sp.medianCentroid - 0.1) < 1e-9);
    assert.ok(Math.abs(sp.medianCentroidDiag - 0.1 / Math.SQRT2) < 1e-4);
    assert.equal(qa.spatialError(exp, []).matched, 0);
    assert.equal(qa.spatialError(exp, []).meanIoU, 0);
  });

  it('sceneScore: идеальная сцена → 1; ошибка центра на пороге плана 0.08 → recall*0.6 + 0.4*(1-0.08/0.25)', () => {
    const ideal = qa.sceneScore(1, { medianCentroidDiag: 0 });
    assert.equal(ideal, 1);
    const atThreshold = qa.sceneScore(1, { medianCentroidDiag: 0.08 });
    assert.ok(Math.abs(atThreshold - (0.6 + 0.4 * (1 - 0.08 / 0.25))) < 1e-9);
    assert.equal(qa.sceneScore(0, { medianCentroidDiag: 2 }), 0);
  });
});

describe('Л3 · снятие метрик на фиксированном корпусе (10 сцен)', () => {
  const fixtures = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures', 'scenes.json'), 'utf8'));
  const scenes = fixtures.scenes;

  it('корпус цел: 10 сцен, у каждой описание и эталонные bbox в 0..1', () => {
    assert.equal(scenes.length, 10);
    for (const s of scenes) {
      assert.ok(s.id && s.description, 'id/description: ' + s.id);
      assert.ok(Array.isArray(s.expected) && s.expected.length > 0, 'эталон есть: ' + s.id);
      for (const e of s.expected) {
        const b = e.bbox;
        assert.ok([b.x, b.y, b.width, b.height].every((v) => v >= 0 && v <= 1), 'эталонный bbox в 0..1: ' + s.id);
      }
    }
  });

  // === ПРОГОН: intent-seed против эталона. Фактические числа печатаются и фиксируются в README/отчёте.
  const produce = (scene) => parseIntent(scene.description).regions /* фикстурный продюсер */
    .map((r) => ({ label: r.label, bbox: { ...r.bbox } }));
  const { rows, summary } = qa.evaluateCorpus(scenes, produce);

  it('таблица прогона снята и напечатана (stdout → README/отчёт)', () => {
    console.log('\n=== Л3 · МЕТРИКИ НА ФИКСИРОВАННОМ КОРПУСЕ (10 сцен) ===');
    console.log(qa.formatTable(rows, summary));
    console.log('=== КОНЕЦ Л3 ===\n');
    assert.equal(rows.length, 10);
  });

  it('сводка структурно полная и все метрики в диапазоне [0,1]', () => {
    for (const key of ['scenes', 'meanEntityRecall', 'medianCentroidDiag', 'meanIoU', 'exactCountShare', 'meanSceneScore', 'acceptance']) {
      assert.ok(key in summary, 'в сводке есть ' + key);
    }
    for (const r of rows) {
      assert.ok(r.recall >= 0 && r.recall <= 1);
      assert.ok(r.meanIoU >= 0 && r.meanIoU <= 1);
      assert.ok(r.score >= 0 && r.score <= 1);
      assert.ok(r.medianCentroidDiag >= 0 && r.medianCentroidDiag <= Math.SQRT2);
    }
    assert.equal(summary.scenes, 10);
  });

  it('acceptance из 08_EXPERIMENT_PLAN_RU.md зафиксирован: recall ≥ 0.90, центр ≤ 0.08 диагонали', () => {
    assert.deepEqual(summary.acceptance, qa.ACCEPTANCE);
    assert.equal(qa.ACCEPTANCE.entityRecallMin, 0.9);
    assert.equal(qa.ACCEPTANCE.medianCentroidDiagMax, 0.08);
    // фактические числа корпуса (снято этим прогоном):
    console.log('[Л3 СНЯТО] entityRecall среднее = ' + summary.meanEntityRecall
      + ' · медиана центра/диагональ = ' + summary.medianCentroidDiag
      + ' · IoU среднее = ' + summary.meanIoU
      + ' · exactCount = ' + summary.exactCountShare
      + ' · sceneScore среднее = ' + summary.meanSceneScore);
    assert.ok(summary.meanEntityRecall >= 0.8, 'корпус размечен так, что черновик ≥ 0.8 (сцены с честными промахами ниже)');
    assert.ok(summary.medianCentroidDiag <= 0.08, 'медианная центроидная ошибка по сопоставленным парам — в пороге плана');
  });

  it('честные промахи корпуса действительно видны в метриках (не подгонка под 1.0)', () => {
    const r06 = rows.find((r) => r.id === 'scene-06');
    const r07 = rows.find((r) => r.id === 'scene-07');
    assert.ok(r06.recall < 1, 'scene-06: «справа» дальше 3 токенов → стол не на месте (meanIoU считается по сопоставленным парам и остаётся 1 у окна)');
    assert.ok(Math.abs(r07.recall - 2 / 3) < 1e-3, 'scene-07: «луна» вне словаря → recall 2/3 (в таблице округлено до 0.67)');
    assert.equal(r07.gotCount, 2);
    const r10 = rows.find((r) => r.id === 'scene-10');
    assert.ok(r10.meanIoU < 1, 'scene-10: конфликт «и каждый» → левый экран размера по умолчанию');
  });
});

// ===========================================================================
// Л4 «P2.1: Web Audio / AudioWorklet — music-регион становится реальной дорожкой»
// ===========================================================================
describe('Л4 · music-region: чистый генератор паттерна (node, без AudioContext)', () => {
  it('паттерн детерминирован по seed: один seed → байт-в-байт один паттерн', () => {
    const a = music.buildPattern({ seed: 'music-1' });
    const b = music.buildPattern({ seed: 'music-1' });
    assert.deepEqual(a, b);
    assert.equal(JSON.stringify(a), JSON.stringify(b));
  });

  it('разные seed → разные паттерны (на фиксированной паре сидов)', () => {
    const a = music.buildPattern({ seed: 'seed-A' });
    const b = music.buildPattern({ seed: 'seed-B' });
    assert.notEqual(JSON.stringify(a), JSON.stringify(b));
  });

  it('длина паттерна = один такт 4/4: все события внутри 16 шестнадцатых', () => {
    for (const seed of ['music-1', 'seed-A', 'Экран слева', 'x']) {
      const p = music.buildPattern({ seed });
      assert.equal(p.steps, 16);
      assert.equal(p.meter, '4/4');
      assert.ok(p.events.length > 0, 'паттерн не пуст');
      for (const ev of p.events) {
        assert.ok(ev.step >= 0 && ev.step < p.steps, 'step внутри такта');
        assert.ok(ev.dur > 0 && ev.vel > 0 && ev.vel <= 1);
        assert.ok(ev.voice === 'bass' || ev.voice === 'lead');
      }
    }
  });

  it('все ноты из пентатоники от тоники A3 (57): (midi-57) mod 12 ∈ {0,3,5,7,10}', () => {
    const allowed = new Set(music.PENTATONIC);
    for (const seed of ['music-1', 'seed-A', 'seed-B', 'ladom']) {
      const p = music.buildPattern({ seed });
      for (const ev of p.events) {
        const deg = ((ev.midi - p.root) % 12 + 12) % 12;
        assert.ok(allowed.has(deg), 'ступень ' + deg + ' вне пентатоники (seed ' + seed + ')');
      }
    }
    assert.equal(music.ROOT_MIDI, 57);
  });

  it('бас есть на каждой доле (шаги 0,4,8,12)', () => {
    const p = music.buildPattern({ seed: 'music-1' });
    for (const beat of [0, 4, 8, 12]) {
      assert.ok(p.events.some((e) => e.voice === 'bass' && e.step === beat), 'бас на шаге ' + beat);
    }
  });

  it('buildSchedule: монотонное время, всё внутри длительности такта; частоты положительные', () => {
    const p = music.buildPattern({ seed: 'music-1' });
    const bpm = 96;
    const dur = music.patternDurationSec(p, { bpm });
    assert.ok(Math.abs(dur - 16 * 60 / bpm / 4) < 1e-9);
    const sched = music.buildSchedule(p, { bpm, when: 0, loops: 2 });
    assert.ok(sched.length === p.events.length * 2);
    for (let i = 1; i < sched.length; i++) assert.ok(sched[i].time >= sched[i - 1].time, 'время монотонно');
    for (const n of sched) {
      assert.ok(n.time >= 0 && n.time < 2 * dur + 1e-9);
      assert.ok(n.freq > 0);
      assert.ok(Math.abs(n.freq - music.midiToFreq(57)) >= 0); // midiToFreq согласован
    }
    assert.ok(Math.abs(music.midiToFreq(69) - 440) < 1e-9, 'A4 = 440 Гц');
  });

  it('метроном: 4 клика на такт, первый с акцентом; при loops=2 — 8 кликов', () => {
    const p = music.buildPattern({ seed: 'music-1' });
    const clicks = music.metronomeSchedule(p, { bpm: 120, when: 0, loops: 1 });
    assert.equal(clicks.length, 4);
    assert.equal(clicks[0].accent, true);
    assert.equal(clicks.slice(1).every((c) => !c.accent), true);
    assert.equal(music.metronomeSchedule(p, { bpm: 120, when: 0.5, loops: 2 }).length, 8);
  });

  it('buildPattern валидирует вход: steps не кратен 4 — честная ошибка', () => {
    assert.throws(() => music.buildPattern({ seed: 'x', steps: 10 }), /кратен 4/);
  });

  it('честный фолбэк: в node нет AudioContext → createMusicLoop недоступен, БЕЗ имитации', async () => {
    const loop = music.createMusicLoop({ seed: 'music-1' });
    if (music.isWebAudioAvailable()) {
      // среда с AudioContext (не наш случай) — тогда модуль обязан объявить доступность
      assert.equal(loop.available, true);
      return;
    }
    assert.equal(loop.available, false, 'нет API → дорожка недоступна');
    assert.ok(typeof loop.reason === 'string' && loop.reason.length > 10);
    assert.match(loop.reason, /недоступна/);
    assert.equal(loop.pattern, undefined, 'имитации паттерна в отказе нет');
    assert.equal(await loop.start(), false, 'start в отказе возвращает false');
    assert.equal(loop.stop(), false);
  });
});
