'use strict';
/* Логический тест ·21 «ОБЩЕНИЕ» (репо).
   Достаёт ядро из СИНГУЛЯР_21_ОБЩЕНИЕ.html между маркерами S21:CORE
   и проверяет ровно отгруженный код: маршрутизацию, Брайль, подписи,
   инвариант смысла, гигиену DOM-фабрики и отсутствие ярлыков.
   Запуск: node ИНСТРУМЕНТЫ/test_s21_logic.js */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const file = path.join(root, 'СИНГУЛЯР_21_ОБЩЕНИЕ.html');
const html = fs.readFileSync(file, 'utf8');

let passed = 0;
const ok = (cond, name) => { if (!cond) throw new Error('FAIL: ' + name); passed++; };

/* ── Файл и структура ── */
ok(fs.statSync(file).size > 25000 && fs.statSync(file).size < 82000, 'размер модуля в норме (граница поднята честно: страховочный КОРД +16.6 КБ, такт v1.42.0)');
ok(/<!DOCTYPE html>/i.test(html), 'доктайп на месте (не quirks)');
ok(/<html lang="ru">/.test(html), 'язык страницы объявлен');
ok(html.includes('СИНГУЛЯР ·21 «ОБЩЕНИЕ»'), 'имя модуля чёткое');
ok(html.includes('S21:CORE-BEGIN') && html.includes('S21:CORE-END'), 'маркеры ядра для тестов');

/* ── Ядро ── */
const m = html.match(/\/\* S21:CORE-BEGIN \*\/([\s\S]*?)\/\* S21:CORE-END \*\//);
ok(m, 'ядро извлечено');
const S21 = new Function(m[1] + '\nreturn S21;')();

ok(S21.VERSION === '0.4.0', 'версия 0.4.0 (след маршрутизации — синтез Human Runtime)');
ok(S21.braille('abc') === '⠁⠃⠉', 'брайль: abc');
ok(S21.braille('Hello') === '⠓⠑⠇⠇⠕', 'брайль: регистр приводится');
ok(S21.braille('ж') === 'ж' && S21.braille('') === '', 'брайль: вне таблицы не теряется, пусто → пусто');

const A = { id:'x', output:['text','speech','haptic','braille'], voice:{ rate:0.9, lang:'ru-RU' } };
const r = S21.route(A, 'Привет');
ok(r.length === 4, 'маршрут: по числу доступных каналов');
ok(r[0].view === 'Привет' && r[1].view === 'Привет', 'инвариант: текст и речь сохраняют смысл');
ok(r[3].view === S21.braille('привет'), 'брайль-маршрут согласован с ядром');
ok(r[1].voice.rate === 0.9 && A.voice.rate === 0.9, 'голос получателя копируется без мутации профиля');
r[1].voice.rate = 9; ok(A.voice.rate === 0.9, 'профиль не мутируется через маршрут');
ok(S21.route({ output: [] }, 'х').length === 0 && S21.route(null, 'х').length === 0, 'без каналов/профиля — без падения');
const ord = S21.route({ output: ['braille','text'] }, 'z');
ok(ord[0].ch === 'braille' && ord[1].ch === 'text', 'порядок представлений задаёт человек');

/* ── След маршрутизации (синтез Human Runtime v0.1, AD-S1) ── */
ok(r.every(function(п){ return п.trace && п.trace.источник === 'выбор человека' && п.trace.смыслСохранён === true && п.trace.канал === п.ch; }),
  'след: каждое представление объясняет источник канала');
ok(r.след && r.след.каналов === 4 && r.след.человек === 'x', 'след: маршрут несёт человека и число каналов');
ok(Array.isArray(r.след.порядокПриоритета) && r.след.порядокПриоритета[0] === 'выбор человека',
  'след: порядок приоритета уважен (explicit первым)');
ok(Array.isArray(r) && r.length === 4, 'контракт не сломан: route возвращает массив');
ok(S21.РАНГ && S21.РАНГ[0] === 'выбор человека' && Object.isFrozen(S21.РАНГ), 'РАНГ экспортирован и заморожен');
ok(S21.route(null, 'х').след.каналов === 0, 'след: пустой маршрут честен');

ok(S21.channelLabel('text') === 'Текст' && S21.channelLabel('haptic') === 'Вибросигнал', 'подписи каналов');
ok(S21.channelLabel('aac') === 'ААК-символы' && S21.channelLabel('sign') === 'Жесты', 'подписи каналов: аак/жесты');
ok(S21.prefLabel('female') === 'женский' && S21.prefLabel('custom') === 'конкретный голос', 'подписи пожеланий');
ok(S21.langLabel('ru-RU') === 'русский' && S21.langLabel('en-US') === 'английский', 'подписи языков');
ok(S21.statusLabel('created') === 'создано' && S21.statusLabel('presented') === 'показано', 'подписи состояний');
ok(S21.PRESETS.slow.rate === 0.75 && S21.PRESETS.clear.rate === 0.9, 'профили звучания');

/* ── Гигиена: чёткие обозначения, никаких наклеек ── */
ok(!/\.innerHTML|insertAdjacentHTML|outerHTML|document\.write/.test(html), '0 innerHTML (реального использования нет)');
/* v1.42.0: КОРД вшит первым — берём все скрипты; «наклейка Prototype» ищется
   по ВИДИМОМУ тексту (в коде законно живут Storage.prototype и т.п.) */
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x => x[1]).join('\n;\n');
const видимыйТекст = html.replace(/<script>[\s\S]*?<\/script>/g, '');
ok(!/\b(blind|deaf|mute)\b/i.test(script), 'в коде нет классификации людей');
ok(!/prototype/i.test(видимыйТекст), 'нет наклейки «Prototype»');
ok(!html.includes('Human Communication'), 'нет чужого англоязычного имени на инструменте');
ok(!html.includes('manifest.json'), 'осиротевший манифест вычищен');
ok(/Человек А[\s\S]*Человек Б[\s\S]*Человек В/.test(html), 'участники — по-русски и грамотно');
ok(/без классификации человека/.test(html), 'принцип объявлен в бейдже');
ok(/id="state"/.test(html) === false, 'JSON-дамп состояния убран из интерфейса');

/* ── Интерфейс: органы управления подписаны ── */
for (const s of ['От кого','Кому','Текст сообщения','Для человека','Пожелание к голосу','Конкретный голос устройства','Язык','Темп','Высота голоса','Громкость','Профиль звучания'])
  ok(html.includes(s), 'подпись органа управления: ' + s);
for (const b of ['Отправить','Прочитать введённое вслух','Прослушать','Остановить речь','Сбросить примеры'])
  ok(html.includes(b), 'подпись кнопки: ' + b);
for (const p of ['Приятный / мягкий','Чёткий / разборчивый','Медленный / спокойный','Быстрый / компактный','Мои настройки'])
  ok(html.includes(p), 'профиль: ' + p);

/* ── Честные границы ── */
ok(html.includes('Честные границы') && html.includes('не угадывает характер голоса'), 'границы объявлены');
ok(html.includes('aria-live') && html.includes('role="status"'), 'доступность: aria-live и status');

console.log('PASS ' + passed + '/' + passed);
