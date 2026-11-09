// repair-agent.mjs — ЛАДОМ·СИНГУЛЯР, такт v10.85 «АРХИТЕКТОР», строка Л5-P4 (остаток):
// agentic repair planner.
//
// КРИТЕРИЙ СТРОКИ (P4 из LADOM_SINGULAR_TZ_AND_ROADMAP.md; роль 9 из
// 09_ARCHITECTURE_BLUEPRINT_RU.md): «Repair Planner — определяет, какую область/
// сущность исправить, и выбирает повторный layout edit, masked inpainting или
// композитинг». Граница v10.81 «ЛАТКА» принята честно: их planMaskFromOverlaps —
// детерминированная ЭВРИСТИКА, не агент. Этот модуль достраивает P4: агентный ЦИКЛ
// (опрос proposer'ов → применение их средствами → мера → их выбор → память раундов).
//
// ЗАКОН ЧЕСТНОСТИ: агента-модели в доме нет — реестр proposer'ов пуст от моделей;
// стоковые proposer'ы детерминированы; адаптеры (Л1 Reve, P4.1 локальная модель)
// встанут сюда ЧЕРЕЗ registerProposer, когда будут честны. Модуль не притворяется,
// что думает: он ведёт протокол раундов и честно пишет отказы в память.
//
// КОНТРАКТ PROPOSER: proposer(имя, project, память) →
//   { план: ladom.repair.v1 } | { маска: [] } («нечего чинить») | { отказ: причина }.
// Чистая функция: 0 мутаций входа. Агент подстраховывает: proposer'у уходят снимок
// проекта и копия журнала прошлых раундов — мутация от proposer'а не дойдёт ни до
// входа, ни до журнала (проверяется тестом).
//
// v10.88 «АДАПТЕР» (Л5-P4.1): к реестру встал ПЕРВЫЙ модельный адаптер —
// ./open-model-adapter.mjs (локальная open-модель владельца). Его proposer
// отдаёт { маска } по тому же контракту; пометка listProposers() честна в обоих
// состояниях (свежее — дословно прежнее). Экспорты и импорты не менялись.
//
// Что делает модуль:
//   registerProposer(имя, fn)     — реестр proposer'ов; дубликат имени/плохой вход —
//                                   честный false, не бросок;
//   listProposers()               — отсортированные имена + честная пометка
//                                   «стоковые: heuristic, lattice; моделей нет»;
//   proposeHeuristic(...)         — стоковый proposer: обёртка их planMaskFromOverlaps
//                                   (v10.81: жертва пересечения — поздний в списке,
//                                   замки не чинятся никогда);
//   proposeLattice(...)           — стоковый proposer: детерминированный план из их
//                                   baselineDerive (ступени × решётка в фиксированном
//                                   порядке); маска — все разблокированные регионы,
//                                   отсортированные по id (конвенции «свежих/unfixed»
//                                   в их каноне v10.81 нет — регион несёт только
//                                   id/label/prompt/bbox/zIndex/locked, проверено
//                                   по исходнику; честный fallback); нет чинимых
//                                   пересечений — честная пустая маска (иначе план
//                                   выродился бы в kept по всем шагам);
//   runRepairAgent(project, opts) — агентный цикл по раундам (rounds ≤ 8, клампится):
//                                   (1) каждый proposer даёт план/маску/отказ
//                                       (порядок опроса: имя лексикографически);
//                                   (2) их batchRepair применяет планы (по варианту,
//                                       derive — их baselineDerive; отказ варианта —
//                                       запись в памяти, не бросок в никуда);
//                                   (3) scoreFn меряет результат (меньше — лучше;
//                                       дефолт scoreRepair);
//                                   (4) их pickBest выбирает лучший вариант раунда
//                                       (мера «меньше — лучше» → инверсия знака
//                                       внутри цикла);
//                                   (5) память раундов {раунд, proposer, исход:
//                                       план|пусто|отказ, счёт, причина} — БЕЗ
//                                       timestamps;
//                                   (6) стоп: раунды кончились ИЛИ все proposer'ы
//                                       вернули маску []/отказ — «нечего чинить»
//                                       честно, без единого применения;
//   scoreRepair(project, отчёт)   — дефолтная мера (меньше — лучше): новое пересечение
//                                   с удержанными (их bboxIoU > 0 → штраф; только шаги
//                                   со сдвигом — их же грань «наследованное — не вина
//                                   ремонта»), число blocked, число не-отказов.
//
// Честные границы:
//   - 0 сети, 0 часов, 0 случайности: один вход → один выход, байт-в-байт (тест);
//   - применение НЕ изобретается: гарантия нетронутости удержанных — ИХ
//     applyMaskedRepair (удержанные — те же объекты, байт-в-байт); агент сам регионы
//     не двигает и во вход не пишет — если применений не было, проект в результате
//     является тем же объектом-ссылкой (проверяется тестом);
//   - счёт в памяти — сырой счёт scoreFn («меньше — лучше»); pickBest работает
//     с инверсией знака, чтобы брать их детерминированный максимум;
//   - счёт для «пусто»/«отказ» — честный null: мерить нечего, выдуманного числа нет;
//   - пересечение отремонтированных МЕЖДУ СОБОЙ их applyMaskedRepair не гарантирует
//     (задокументировано у них) — мера честно считает только пары «шаг × удержанный»;
//   - останов «нечего-чинить» после раунда с отказами планов — тоже честная остановка:
//     причины каждой неудачи лежат в памяти;
//   - нарушение контракта ВХОДА (плохой проект, proposers не массив, rounds не число,
//     scoreFn не функция) — честный отказ броском, как у их канона.
//
// Экспорт: только ESM; импорты — ровно два, оба канон дома: ./masked-repair.mjs
// (их v10.81 «ЛАТКА», не правится) и ./qa-metrics.mjs (их мера Л3, v10.80).

import {
  REPAIR_SCHEMA, assertProjectShape,
  planMaskedRepair, planMaskFromOverlaps,
  batchRepair, pickBest, baselineDerive,
} from './masked-repair.mjs';
import { bboxIoU } from './qa-metrics.mjs';

export const ver = 'repair-agent/0.1';

// Потолок раундов агента: цикл не должен тихо разрастаться (родня их MAX_ATTEMPTS=73).
const MAX_ROUNDS = 8;
const СТОКОВЫЕ = ['heuristic', 'lattice'];

// ---------------------------------------------------------------------------
// Реестр proposer'ов. В нём НЕТ моделей — только детерминированные функции;
// модельный адаптер (Л1 Reve, P4.1) встанет сюда через registerProposer,
// когда будет честным.
// ---------------------------------------------------------------------------
const реестр = new Map();

export function registerProposer(имя, fn) {
  if (typeof имя !== 'string' || !имя) return false; // честный false, не бросок
  if (typeof fn !== 'function') return false;
  if (реестр.has(имя)) return false; // дубликат имени — честный false
  реестр.set(имя, fn);
  return true;
}

export function listProposers() {
  const имена = [...реестр.keys()].sort(); // лексикографический порядок (детерминизм)
  // v10.88 «АДАПТЕР» (Л5-P4.1): пометка честна в обоих состояниях. Свежее состояние
  // (одни стоковые) — текст прежний дословно; адаптеры (open-model/…, см.
  // ./open-model-adapter.mjs) названы поимённо, а их ledger/статусы (pinned или
  // EXPERIMENTAL) живут у их модулей: реестр агентного цикла хранит функции, не
  // происхождение, — приписывать ему знание о моделях было бы нечестно.
  const чужие = имена.filter((n) => !СТОКОВЫЕ.includes(n));
  return {
    имена,
    пометка: чужие.length === 0
      ? 'стоковые: heuristic, lattice; моделей нет — реестр пуст от моделей'
      : `стоковые: heuristic, lattice; адаптеры: ${чужие.join(', ')} — статусы и ledger моделей у их модулей`,
    модели: [], // реестр агентного цикла моделей не различает — ledger моделей живёт у адаптеров (P4.1)
  };
}

const текстОшибки = (ошибка) => (ошибка && ошибка.message ? ошибка.message : String(ошибка));
const глубокаяКопия = (x) => JSON.parse(JSON.stringify(x));

// ---------------------------------------------------------------------------
// СТОКОВЫЕ PROPOSER'Ы (детерминированные; сигнатура — контракт proposer'а:
// имя и память стоковым не нужны, но контракт один для всех).
// ---------------------------------------------------------------------------

export function proposeHeuristic(имя, project, память) {
  try {
    const план = planMaskFromOverlaps(project); // их эвристика v10.81
    return план.mask.length === 0 ? { маска: [] } : { план };
  } catch (ошибка) {
    return { отказ: `heuristic: ${текстОшибки(ошибка)}` };
  }
}

export function proposeLattice(имя, project, память) {
  try {
    // Факт «есть чинимые пересечения» берётся у ИХ планировщика — один факт,
    // одно место. Пересечений нет → план из baselineDerive выродился бы в kept
    // по всем шагам (их попытка 0 возвращает место, свободное от удержанных,
    // а пересечений нет вовсе) → честное «нечего чинить».
    if (planMaskFromOverlaps(project).mask.length === 0) return { маска: [] };
    const маска = project.regions
      .filter((r) => r.locked !== true)
      .map((r) => r.id)
      .sort(); // лексикографический порядок — детерминизм
    if (маска.length === 0) return { маска: [] }; // одни замки — не наше дело
    const план = planMaskedRepair(project, маска, {
      reason: 'решётка базлайна: ступени × сдвиги в фиксированном порядке (их baselineDerive)',
    });
    return { план };
  } catch (ошибка) {
    return { отказ: `lattice: ${текстОшибки(ошибка)}` };
  }
}

// Стоковые регистрируются на загрузке модуля; повторно имя не займёшь.
registerProposer('heuristic', proposeHeuristic);
registerProposer('lattice', proposeLattice);

// ---------------------------------------------------------------------------
// ДЕФОЛТНАЯ МЕРА (меньше — лучше). Числа — только из их функций/структур:
// пересечение меряется их bboxIoU (qa-metrics, Л3), blocked/статусы — из их
// отчёта ladom.repair-report.v1. Ничего не выдумано.
// ---------------------------------------------------------------------------
const sameBbox = (a, b) =>
  a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;

export function scoreRepair(project, отчёт) {
  assertProjectShape(project, 'project');
  if (!отчёт || typeof отчёт !== 'object' || Array.isArray(отчёт) || !Array.isArray(отчёт.steps)) {
    throw new TypeError(`repair-agent: scoreRepair — отчёт ожидается объектом ladom.repair-report.v1 со steps, получено ${JSON.stringify(отчёт ?? null)}`);
  }
  const маска = new Set();
  for (const шаг of отчёт.steps) {
    if (!шаг || typeof шаг !== 'object' || typeof шаг.id !== 'string' || !шаг.id || typeof шаг.status !== 'string') {
      throw new TypeError(`repair-agent: scoreRepair — шаг отчёта без честных {id, status}: ${JSON.stringify(шаг ?? null)}`);
    }
    if (шаг.status !== 'repaired' && шаг.status !== 'kept' && шаг.status !== 'blocked') {
      throw new TypeError(`repair-agent: scoreRepair — статус шага "${шаг.id}" не из их отчёта (repaired|kept|blocked): ${JSON.stringify(шаг.status)}`);
    }
    if (шаг.status === 'repaired') {
      for (const край of [шаг.from, шаг.to]) {
        if (!край || typeof край !== 'object') {
          throw new TypeError(`repair-agent: scoreRepair — repaired-шаг "${шаг.id}" без from/to — мера не определена`);
        }
        for (const ключ of ['x', 'y', 'width', 'height']) {
          if (typeof край[ключ] !== 'number' || !Number.isFinite(край[ключ])) {
            throw new TypeError(`repair-agent: scoreRepair — repaired-шаг "${шаг.id}": край.${ключ} — не конечное число`);
          }
        }
      }
    }
    маска.add(шаг.id);
  }
  // Удержанные — их конвенция applyMaskedRepair: регионы вне маски плана/отчёта.
  const удержанные = project.regions.filter((r) => !маска.has(r.id));

  // 1) Новое пересечение с удержанными: только шаги СО СДВИГОМ — их же грань
  //    «наследованное пересечение — не вина ремонта» (applyMaskedRepair бьёт так же).
  let пересечений = 0;
  for (const шаг of отчёт.steps) {
    if (шаг.status !== 'repaired' || sameBbox(шаг.from, шаг.to)) continue;
    for (const другой of удержанные) {
      if (bboxIoU(шаг.to, другой.bbox) > 0) пересечений += 1;
    }
  }
  // 2) Число blocked: их поле отчёта; отчёт без поля — пересчёт по их же статусам.
  const заблокировано = (typeof отчёт.blockedCount === 'number' && Number.isFinite(отчёт.blockedCount))
    ? отчёт.blockedCount
    : отчёт.steps.filter((шаг) => шаг.status === 'blocked').length;
  // 3) Число не-отказов: шаги, где derive не отказался (repaired + kept) —
  //    мера адресности: раздутая маска дороже точной.
  const неОтказов = отчёт.steps.filter((шаг) => шаг.status !== 'blocked').length;

  return пересечений + заблокировано + неОтказов;
}

// ---------------------------------------------------------------------------
// АГЕНТНЫЙ ЦИКЛ.
// ---------------------------------------------------------------------------

export function runRepairAgent(project, opts = {}) {
  assertProjectShape(project, 'project');
  if (!opts || typeof opts !== 'object' || Array.isArray(opts)) {
    throw new TypeError(`repair-agent: opts — ожидается объект, получено ${JSON.stringify(opts ?? null)}`);
  }

  // opts.proposers: имена; дубликаты съедаются (их batchRepair отказывает дубликатам
  // имён вариантов — опрос дважды был бы нечестен); порядок — лексикографический.
  let имена;
  if (opts.proposers === undefined) {
    имена = [...СТОКОВЫЕ];
  } else {
    if (!Array.isArray(opts.proposers)) {
      throw new TypeError(`repair-agent: opts.proposers — ожидается массив имён, получено ${typeof opts.proposers}`);
    }
    const seen = new Set();
    имена = [];
    for (const n of opts.proposers) {
      if (typeof n !== 'string' || !n) {
        throw new TypeError(`repair-agent: opts.proposers — каждое имя непустая строка, получено ${JSON.stringify(n ?? null)}`);
      }
      if (seen.has(n)) continue;
      seen.add(n);
      имена.push(n);
    }
  }
  имена = [...имена].sort();

  // opts.rounds: целое ≤ 8; клампится в 1..8 (гарвард от разрастания цикла).
  let rounds;
  if (opts.rounds === undefined) {
    rounds = MAX_ROUNDS;
  } else {
    if (typeof opts.rounds !== 'number' || !Number.isFinite(opts.rounds)) {
      throw new TypeError(`repair-agent: opts.rounds — ожидается число, получено ${JSON.stringify(opts.rounds ?? null)}`);
    }
    rounds = Math.min(MAX_ROUNDS, Math.max(1, Math.floor(opts.rounds)));
  }

  // opts.scoreFn: (проект, отчёт) → число; МЕНЬШЕ — ЛУЧШЕ (как scoreRepair).
  const мера = opts.scoreFn === undefined ? scoreRepair : opts.scoreFn;
  if (typeof мера !== 'function') {
    throw new TypeError(`repair-agent: opts.scoreFn — ожидается функция, получено ${typeof мера}`);
  }

  if (имена.length === 0) {
    return {
      ver, статус: 'нечего-чинить',
      причина: 'список proposer\'ов пуст — чинить некому (регистрируй через registerProposer)',
      раундов: 0, проект: project, лучший: null, память: [],
    };
  }

  const память = [];
  let база = project;
  let выполнено = 0;
  let статус = null;
  let стопПричина = '';
  let лучший = null;

  for (let раунд = 1; раунд <= rounds; раунд += 1) {
    // (1) ОПРОС: каждому proposer'у — снимок проекта и копия журнала прошлых
    // раундов (текущего в ней нет — он пишется по ходу опроса).
    const снимок = глубокаяКопия(база);
    const журнал = глубокаяКопия(память);
    const планы = []; // {имя, план} — в лексикографическом порядке опроса
    for (const имя of имена) {
      const запись = { раунд, proposer: имя, исход: 'отказ', счёт: null, причина: '' };
      const fn = реестр.get(имя);
      if (!fn) {
        запись.причина = `нет proposer'а "${имя}" в реестре — listProposers() покажет, кто есть`;
      } else {
        try {
          const ответ = fn(имя, снимок, журнал);
          if (!ответ || typeof ответ !== 'object' || Array.isArray(ответ)) {
            запись.причина = `ответ не объект-конверт: ${JSON.stringify(ответ ?? null)} — жду {план}|{маска: []}|{отказ}`;
          } else if (ответ.план !== undefined && ответ.план !== null) {
            const план = ответ.план;
            if (!план || typeof план !== 'object' || план.schemaVersion !== REPAIR_SCHEMA) {
              запись.причина = `план не контракта ${REPAIR_SCHEMA}: ${JSON.stringify((план && план.schemaVersion) ?? null)}`;
            } else if (!Array.isArray(план.steps) || план.steps.length === 0) {
              запись.исход = 'пусто';
              запись.причина = 'план без шагов — нечего чинить';
            } else {
              запись.исход = 'план';
              планы.push({ имя, план });
            }
          } else if (Array.isArray(ответ.маска)) {
            if (ответ.маска.length === 0) {
              запись.исход = 'пусто';
              запись.причина = 'маска пуста — нечего чинить';
            } else {
              try {
                const план = planMaskedRepair(снимок, ответ.маска, { reason: `маска proposer'а "${имя}"` });
                запись.исход = 'план';
                планы.push({ имя, план });
              } catch (ошибка) {
                запись.причина = `маска не собралась в план: ${текстОшибки(ошибка)}`;
              }
            }
          } else if (ответ.отказ !== undefined) {
            запись.причина = typeof ответ.отказ === 'string'
              ? ответ.отказ
              : `отказ не строкой: ${JSON.stringify(ответ.отказ ?? null)}`;
          } else {
            запись.причина = 'неизвестный формат ответа — жду {план}|{маска: []}|{отказ}';
          }
        } catch (ошибка) {
          запись.причина = `proposer бросил: ${текстОшибки(ошибка)}`;
        }
      }
      память.push(запись);
    }

    if (планы.length === 0) {
      статус = 'нечего-чинить';
      стопПричина = 'все proposer\'ы вернули «нечего чинить»/отказ — применения не было, проект не тронут';
      выполнено = раунд;
      break;
    }

    // (2)-(3) ПРИМЕНЕНИЕ и МЕРА — по варианту, порядок лексикографический.
    // Применение — только их batchRepair (derive — их baselineDerive); агент
    // применение не изобретает. Мера получает копии — мутация от scoreFn
    // не дойдёт до проекта, который станет базой следующего раунда.
    const посчитанные = [];
    for (const { имя, план } of планы) {
      const запись = память.find((z) => z.раунд === раунд && z.proposer === имя);
      try {
        const [р] = batchRepair(база, [{ name: имя, plan: план }], { derive: baselineDerive });
        const счёт = мера(глубокаяКопия(р.result.project), глубокаяКопия(р.result.report));
        if (typeof счёт !== 'number' || !Number.isFinite(счёт)) {
          throw new TypeError(`мера вернула ${JSON.stringify(счёт ?? null)} — ожидается конечное число`);
        }
        запись.счёт = счёт;
        посчитанные.push({ имя, план, result: р.result, счёт });
      } catch (ошибка) {
        запись.исход = 'отказ';
        запись.счёт = null;
        запись.причина = `план/счёт не прошли: ${текстОшибки(ошибка)}`;
      }
    }

    if (посчитанные.length === 0) {
      статус = 'нечего-чинить';
      стопПричина = 'ни один план не дошёл до счёта — честная остановка (причины — в памяти)';
      выполнено = раунд;
      break;
    }

    // (4) ВЫБОР — их pickBest: мера «меньше — лучше» → инверсия знака внутри цикла.
    const карта = new Map(посчитанные.map((v) => [v.имя, v.счёт]));
    const выбран = pickBest(
      посчитанные.map((v) => ({ name: v.имя, plan: v.план, result: v.result })),
      (item) => -карта.get(item.name),
    );

    // (5) База следующего раунда — проект победителя (их applyMaskedRepair вернул
    // новый проект: вход не мутирован, удержанные — те же ссылки).
    база = выбран.result.project;
    выполнено = раунд;
    лучший = { раунд, proposer: выбран.name, счёт: карта.get(выбран.name), отчёт: выбран.result.report };
  }

  if (статус === null) {
    статус = 'done';
    стопПричина = `раунды кончились (${выполнено}/${rounds})`;
  }

  return { ver, статус, причина: стопПричина, раундов: выполнено, проект: база, лучший, память };
}
