// qa-metrics.mjs — ЛАДОМ·СИНГУЛЯР, такт v10.80 «ХВОСТЫ», строка Л3 «P2: QA-метрики».
//
// КРИТЕРИЙ СТРОКИ: «метрики сняты на фиксированном корпусе сцен» (08_EXPERIMENT_PLAN_RU.md).
//
// Метрики (по плану экспериментов):
//   - entity recall — доля эталонных сущностей, найденных в разметке
//     (жадное сопоставление по IoU нормализованных bbox);
//   - spatial error — IoU bbox + центроидная ошибка; медианная ошибка центра сравнивается
//     с acceptance-порогом плана «≤ 0.08 диагонали кадра» (диагональ единичного кадра = √2);
//   - exact count — доля сцен с точным числом объектов (сцены «с явным количеством»);
//   - sceneScore — сводная оценка сцены: 0.6 * entityRecall + 0.4 * spatialScore,
//     где spatialScore = max(0, 1 - (центроид/диагональ) / 0.25); порог 0.08 диагонали
//     из плана даёт spatialScore 0.68 — формула зафиксирована здесь и в README.
//
// Честные границы:
//   - сопоставление по IoU без семантики: «экран» vs «окно» с пересекающимися bbox
//     считаются совпавшими геометрически (тип/метка НЕ проверяются) — так решено,
//     потому что черновик из intent-seed называет зоны своим словарём; расхождение
//     имён видно в таблице прогона;
//   - центроидные ошибки считаются по СОПОСТАВЛЕННЫМ парам; ненайденные сущности
//     караются entityRecall, лишние — ничего не портят (как и в плане: recall);
//   - 0 сети, без внешних импортов.

export const FRAME_DIAGONAL = Math.SQRT2; // единичный кадр 1×1
export const ACCEPTANCE = {
  entityRecallMin: 0.9,          // план: entity recall ≥ 0.90 на простом наборе
  medianCentroidDiagMax: 0.08,   // план: медианная ошибка центра ≤ 0.08 диагонали
};

const round4 = (v) => Math.round(v * 10000) / 10000;

export function bboxArea(b) {
  return Math.max(0, b.width) * Math.max(0, b.height);
}

export function bboxIoU(a, b) {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const uni = bboxArea(a) + bboxArea(b) - inter;
  return uni > 0 ? Math.min(1, inter / uni) : 0;
}

export function centroid(b) {
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

export function centroidDistance(a, b) {
  const ca = centroid(a);
  const cb = centroid(b);
  return Math.hypot(ca.x - cb.x, ca.y - cb.y);
}

export function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((x, y) => x - y);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Жадное сопоставление expected↔got по IoU: пары сортируются по убыванию IoU,
 * каждая сущность участвует максимум в одной паре.
 * @returns {Array<{eIndex, gIndex, iou}>}
 */
export function matchRegions(expected, got, { iouMin = 0.3 } = {}) {
  const pairs = [];
  (expected || []).forEach((e, eIndex) => {
    (got || []).forEach((g, gIndex) => {
      const iou = bboxIoU(e.bbox, g.bbox);
      if (iou >= iouMin) pairs.push({ eIndex, gIndex, iou });
    });
  });
  pairs.sort((a, b) => b.iou - a.iou || a.eIndex - b.eIndex);
  const usedE = new Set();
  const usedG = new Set();
  const matched = [];
  for (const p of pairs) {
    if (usedE.has(p.eIndex) || usedG.has(p.gIndex)) continue;
    usedE.add(p.eIndex);
    usedG.add(p.gIndex);
    matched.push(p);
  }
  return matched;
}

/**
 * Entity recall: найденные эталонные сущности / все эталонные.
 * Пустой эталон: пустой ответ → 1, непустой → 0 (зафиксировано).
 */
export function entityRecall(expected, got, opts) {
  const n = (expected || []).length;
  if (n === 0) return (got || []).length === 0 ? 1 : 0;
  return matchRegions(expected, got, opts).length / n;
}

/**
 * Spatial error по сопоставленным парам: IoU + центроидная ошибка.
 * Возвращает агрегаты; medianCentroidDiag — медианная центроидная ошибка,
 * нормированная на диагональ кадра (сравнивать с ACCEPTANCE.medianCentroidDiagMax).
 */
export function spatialError(expected, got, opts = {}) {
  const pairs = matchRegions(expected, got, opts);
  const ious = pairs.map((p) => p.iou);
  const cds = pairs.map((p) => centroidDistance(expected[p.eIndex].bbox, got[p.gIndex].bbox));
  const medianCentroid = median(cds);
  return {
    matched: pairs.length,
    expectedTotal: (expected || []).length,
    gotTotal: (got || []).length,
    meanIoU: ious.length ? ious.reduce((s, v) => s + v, 0) / ious.length : 0,
    medianCentroid: round4(medianCentroid),
    meanCentroid: cds.length ? round4(cds.reduce((s, v) => s + v, 0) / cds.length) : 0,
    medianCentroidDiag: round4(medianCentroid / FRAME_DIAGONAL),
  };
}

/** Точность количества: 1, если число объектов совпало, иначе 0. */
export function countAccuracy(expected, got) {
  return (expected || []).length === (got || []).length ? 1 : 0;
}

/** Сводная оценка сцены: 0.6*recall + 0.4*spatialScore (формула в шапке файла). */
export function sceneScore(recall, spatial) {
  const spatialScore = Math.max(0, 1 - (spatial.medianCentroidDiag ?? 1) / 0.25);
  return round4(0.6 * recall + 0.4 * spatialScore);
}

/**
 * Снятие метрик по корпусу сцен.
 * @param scenes  [{id, expected:[{label,bbox}]}]
 * @param produce (scene) => [{label,bbox}] — чья-то разметка (например, черновик intent-seed)
 * @returns {rows, summary} — строки по сценам + сводка корпуса
 */
export function evaluateCorpus(scenes, produce, opts = {}) {
  const rows = scenes.map((scene) => {
    const got = produce(scene) || [];
    const recall = round4(entityRecall(scene.expected, got, opts));
    const spatial = spatialError(scene.expected, got, opts);
    return {
      id: scene.id,
      expectedCount: scene.expected.length,
      gotCount: got.length,
      recall,
      meanIoU: round4(spatial.meanIoU),
      medianCentroidDiag: spatial.medianCentroidDiag,
      countAccuracy: countAccuracy(scene.expected, got),
      score: sceneScore(recall, spatial),
    };
  });
  const summary = {
    scenes: rows.length,
    meanEntityRecall: round4(rows.reduce((s, r) => s + r.recall, 0) / rows.length),
    medianCentroidDiag: round4(median(rows.map((r) => r.medianCentroidDiag))),
    meanIoU: round4(rows.reduce((s, r) => s + r.meanIoU, 0) / rows.length),
    exactCountShare: round4(rows.filter((r) => r.countAccuracy === 1).length / rows.length),
    meanSceneScore: round4(rows.reduce((s, r) => s + r.score, 0) / rows.length),
    acceptance: ACCEPTANCE,
  };
  return { rows, summary };
}

/** Текстовая таблица прогона (для отчёта/консоли, моноширинная). */
export function formatTable(rows, summary) {
  const head = ['id', 'эталон', 'черновик', 'recall', 'IoU', 'центр/диаг', 'count', 'score'];
  const lines = [];
  lines.push(head.map((h) => h.padEnd(11)).join(''));
  lines.push('-'.repeat(head.length * 12));
  for (const r of rows) {
    lines.push([
      r.id.padEnd(11),
      String(r.expectedCount).padEnd(11),
      String(r.gotCount).padEnd(11),
      r.recall.toFixed(2).padEnd(11),
      r.meanIoU.toFixed(2).padEnd(11),
      r.medianCentroidDiag.toFixed(3).padEnd(11),
      r.countAccuracy ? 'ok'.padEnd(11) : 'мимо'.padEnd(11),
      r.score.toFixed(2).padEnd(11),
    ].join(''));
  }
  lines.push('-'.repeat(head.length * 12));
  lines.push('СВОДКА: сцен ' + summary.scenes
    + ' · entityRecall среднее ' + summary.meanEntityRecall.toFixed(3)
    + ' · медиана центра/диагональ ' + summary.medianCentroidDiag.toFixed(3)
    + ' (порог ' + summary.acceptance.medianCentroidDiagMax + ')'
    + ' · IoU среднее ' + summary.meanIoU.toFixed(3)
    + ' · exact count ' + summary.exactCountShare
    + ' · sceneScore среднее ' + summary.meanSceneScore.toFixed(3));
  return lines.join('\n');
}
