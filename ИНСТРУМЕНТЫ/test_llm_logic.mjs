#!/usr/bin/env node
/* ТЕСТ логики LLM-среза (правило №10: против живых файлов).
   БИБЛИОТЕКИ/adapter-os/llm.mjs — чистый ESM без window/document:
   — словарь фраз вшит (версия ≥ v0.3, ≥ 41 фраза, намерение load_model);
   — нормализация речи (регистр, ё/е, пунктуация) не ломает команды;
   — разобрать() возвращает намерение для всех команд словаря;
   — префиксные намерения (send, llm) извлекают текст после префикса;
   — неизвестная фраза → null (уходит модели или честному «не поняла»);
   — адаптер llm.local без загрузки честно UNAVAILABLE с причиной;
   — адаптер input.speech честен о среде;
   — правило-слой исполняет команды без модели.
Запуск: node ИНСТРУМЕНТЫ/test_llm_logic.mjs   (пути от файла) */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(HERE);
const { ФРАЗЫ, СЛОВАРЬ_ВЕРСИЯ, ПРАВИЛА_ТЕКСТ, нормализовать, разобрать,
        создатьLlmАдаптер, создатьРечьАдаптер, создатьПравилоСлой } = await import('file://' + join(ROOT, 'БИБЛИОТЕКИ', 'adapter-os', 'llm.mjs'));

let ok = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) { ok++; console.log('  OK   ' + name); }
  else { fail++; console.log('  FAIL ' + name + ' ' + extra); }
}

/* 1. Словарь жив, версионирован и покрывает все намерения */
check('словарь ≥ 41 фраза (37 v0.2 + загрузка модели)', Array.isArray(ФРАЗЫ) && ФРАЗЫ.length >= 41, String(ФРАЗЫ && ФРАЗЫ.length));
const НАМЕРЕНИЯ = new Set(['stop', 'status', 'send', 'read', 'clear', 'clear_field', 'read_log', 'help', 'llm', 'load_model']);
check('намерения словаря из известного набора', ФРАЗЫ.every(f => НАМЕРЕНИЯ.has(f.намерение)));
check('намерение load_model присутствует (загрузка модели голосом)', ФРАЗЫ.some(f => f.намерение === 'load_model'));
check('версия словаря ≥ v0.3', typeof СЛОВАРЬ_ВЕРСИЯ === 'string' && СЛОВАРЬ_ВЕРСИЯ >= 'v0.3', СЛОВАРЬ_ВЕРСИЯ);
check('правила (инструкционный слой) вшиты: ≥ 9 пунктов', typeof ПРАВИЛА_ТЕКСТ === 'string' && (ПРАВИЛА_ТЕКСТ.match(/^\d+\./gm) || []).length >= 9);

/* 2. Все фразы словаря разбираются */
let неразобранных = 0;
for (const f of ФРАЗЫ) {
  if (f.намерение === 'llm') continue; /* фразы llm — примеры свободной речи, не команды */
  const r = разобрать(f.фраза);
  if (!r || r.намерение !== f.намерение) { неразобранных++; console.log('       не разобрано: «' + f.фраза + '» → ' + JSON.stringify(r)); }
}
check('все команды словаря (кроме примеров llm) дают своё намерение', неразобранных === 0, String(неразобранных));

/* 3. Живая речь не ломает команды */
const живые = [
  ['СТОП', 'stop'],
  ['Статус!', 'status'],
  ['что у тебя работает?', 'status'],
  ['Очисти журнал.', 'clear'],
  ['ё… прочитай журнал', null], /* мусор перед фразой — не команда */
  ['ЗАМОЛЧИ', 'stop'],
  ['какие каналы работают', 'status'],
  ['отправь: привет из голоса', 'send'],
  ['Отправь: тест', 'send'],
  ['загрузи модель', 'load_model'],
  ['Загрузи модель!', 'load_model'],
  ['скачай модель', 'load_model'],
];
for (const [фраза, ожид] of живые) {
  const r = разобрать(фраза);
  check('речь «' + фраза + '» → ' + ожид, (r ? r.намерение : null) === ожид, JSON.stringify(r));
}

/* 4. Префиксные намерения извлекают текст */
const р1 = разобрать('отправь: проверка связи — раз');
check('send извлекает текст после префикса', р1 && р1.намерение === 'send' && р1.текст === 'проверка связи — раз', JSON.stringify(р1));
const р2 = разобрать('скажи получателю: до связи');
check('send вариант «скажи получателю:»', р2 && р2.намерение === 'send' && р2.текст === 'до связи', JSON.stringify(р2));
const р3 = разобрать('объясни: зачем смысл и представление');
check('llm-префикс «объясни:» проходит сквозь', р3 && р3.намерение === 'llm' && /зачем смысл/.test(р3.текст), JSON.stringify(р3));
const р4 = разобрать('перепиши короче: длинный текст тут');
check('llm-префикс «перепиши короче:»', р4 && р4.намерение === 'llm' && /длинный текст/.test(р4.текст), JSON.stringify(р4));
check('нормализация: регистр, ё→е, знаки', нормализовать('Статус!') === 'статус' && нормализовать('Ёжик') === 'ежик');

/* 5. Неизвестное — честный null */
check('свободная фраза без модели → null', разобрать('какая завтра погода') === null);
check('пустая строка → null', разобрать('   ') === null);
check('пусто не команда', разобрать('') === null);

/* 6. Адаптер llm.local: честный статус до загрузки */
const llm = создатьLlmАдаптер();
const ст0 = llm.status();
check('llm.local: state UNAVAILABLE до загрузки', ст0.state === 'UNAVAILABLE', JSON.stringify(ст0));
check('llm.local: причина названа', !!(ст0.reason && ст0.reason.length > 4), JSON.stringify(ст0));
check('llm.local: privacy local', ст0.privacy === 'local');
check('llm.local: kind llm, есть id', llm.id === 'llm.local' && llm.kind === 'llm');
let генОшибка = null;
try { await llm.generate('привет'); } catch (e) { генОшибка = e; }
check('generate до загрузки бросает честную ошибку', генОшибка !== null);

/* 7. Адаптер input.speech: честный статус среды */
const речь = создатьРечьАдаптер();
check('input.speech: id/kind', речь.id === 'input.speech' && речь.kind === 'input');
const стР = речь.status();
check('input.speech: состояние из набора STATUS', ['READY', 'UNAVAILABLE', 'BROWSER_DEPENDENT', 'PERMISSION_REQUIRED'].includes(стР.state), JSON.stringify(стР));

/* 8. Правило-слой: исполнение без модели */
const вызовы = [];
const исполнитель = {
  send: (т) => вызовы.push(['send', т]),
  read: () => вызовы.push(['read']),
  clear: () => вызовы.push(['clear']),
  clearField: () => вызовы.push(['clearField']),
  readLog: () => вызовы.push(['readLog']),
  status: () => вызовы.push(['status']),
  help: () => вызовы.push(['help']),
  stop: () => вызовы.push(['stop']),
  loadModel: () => вызовы.push(['loadModel']),
  say: (т) => вызовы.push(['say', т]),
};
const слой = создатьПравилоСлой(исполнитель);
await слой.исполнить('статус');
await слой.исполнить('отправь: привет, как дела');
await слой.исполнить('очисти журнал');
await слой.исполнить('стоп');
check('исполнитель получил команды', JSON.stringify(вызовы.slice(0, 4)) === JSON.stringify([['status'], ['send', 'привет, как дела'], ['clear'], ['stop']]), JSON.stringify(вызовы));
const свободный = await слой.исполнить('какая завтра погода');
check('свободная фраза вне модели → null, без выдумок', свободный === null);

console.log('\nИТОГ: ' + ok + ' OK / ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
