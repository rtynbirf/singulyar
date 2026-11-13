/* ═══════════════════════════════════════════════════════════════════════════
   СИНГУЛЯР ·38 «ПУЛЬС» — room-38.js (такт v10.28 «ЭМЕРДЖЕНТ», кэш v87)
   Живая диагностика дома: кардиограмма 62 уд/мин, показатели устройства,
   кэши дома, AI на устройстве (transformers.js + whisper-tiny + Qwen 0.5B),
   реестр версий (data/versions.json).

   Канон комнаты:
   • ноль вставок разметки строками — только createElement/textContent (закон репозитория);
   • каждый блок — в try/catch: страница не имеет права уронить себя;
   • сеть — только по клику человека (прогрев слуха) или локально-родную
     (same-origin реестр/кэши); авто-запросов к чужим origin нет (I-01);
   • ES2019: без опциональной цепочки, без нулевого слияния, без логических присваиваний;
     динамический import() разрешён (Chrome 63+);
   • aria-live на строках статуса; reduced-motion — один статичный след.

   Контракты витка (Task 8): кэш s15-orkestrator-v87, защищённые кэши
   (singular-llm-parts-v1, singular-llm-rules-v1, transformers-cache, s15-ai-v1),
   message API {type:'S15_PING'} / {type:'S15_ОТЧЁТ'} (фолбэк — свой перебор),
   data/versions.json (терпим отсутствие файла и лишние поля).
   sg-registry.js может дать window.SG_РЕЕСТР + событие «sg-реестр-готов» —
   используем, но не зависим: своё чтение реестра — честный фолбэк.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var ЗАЩИЩЁННЫЕ_ПО_УМОЛЧАНИЮ = ['singular-llm-parts-v1', 'singular-llm-rules-v1', 'transformers-cache', 's15-ai-v1'];
  var БИБЛИОТЕКА_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.5';
  var СЛУХ_СЛЕД = 'onnx-community/whisper-tiny';
  var СЛУХ_КОРЕНЬ = 'https://huggingface.co/onnx-community/whisper-tiny/';
  var КЭШ_МОЗГА = 'singular-llm-parts-v1';
  var ЧАСТЕЙ_ВСЕГО = 6;
  var УДАРОВ_МИНУТ = 62;

  var живаяРег = null;        /* registration сервис-воркера, если есть */
  var живойРеестр = null;     /* data/versions.json, если открылся */
  var последнийОтчёт = null;  /* ответ воркера на S15_ОТЧЁТ, если сказал */
  var реестрОбещание = null;
  var слухПрогрет = false;    /* поднимается кнопкой прогрева */
  var греем = false;

  /* ── карманные помощники ──────────────────────────────────────────────── */
  function по(id) {
    try { return document.getElementById(id); } catch (е) { return null; }
  }
  function скажи(id, текст) {
    try {
      var эл = по(id);
      if (эл) эл.textContent = текст;
    } catch (е) { /* статус не дороже страницы */ }
  }
  function очистить(эл) {
    try { while (эл && эл.firstChild) эл.removeChild(эл.firstChild); } catch (е) {}
  }
  function весСтрокой(байты) {
    try {
      if (байты === null || байты === undefined) return null;
      var б = Number(байты);
      if (isNaN(б) || б <= 0) return null;
      if (б < 1024) return б + ' Б';
      if (б < 1048576) return (б / 1024).toFixed(1) + ' КБ';
      if (б < 1073741824) return (б / 1048576).toFixed(1) + ' МБ';
      return (б / 1073741824).toFixed(2) + ' ГБ';
    } catch (е) { return null; }
  }
  function ячейка(текст, класс) {
    try {
      var тд = document.createElement('td');
      тд.textContent = текст;
      if (класс) тд.className = класс;
      return тд;
    } catch (е) { return document.createElement('td'); }
  }
  function склонение(н, формы) {   /* 1 песня · 2 песни · 5 песен — дом говорит по-русски */
    try {
      var н1 = Math.abs(Number(н)) % 100, н2 = н1 % 10;
      if (н1 > 10 && н1 < 20) return формы[2];
      if (н2 > 1 && н2 < 5) return формы[1];
      if (н2 === 1) return формы[0];
      return формы[2];
    } catch (е) { return формы[2]; }
  }
  function строкаСообщение(текст, колонок, класс) {
    try {
      var тр = document.createElement('tr');
      var тд = ячейка(текст, класс || 'счёт-под');
      try { тд.colSpan = колонок; } catch (е) {}
      тр.appendChild(тд);
      return тр;
    } catch (е) { return document.createElement('tr'); }
  }

  /* ═══ СЕКЦИЯ 1 · КАРДИОГРАММА: золотая синусоида 62 уд/мин на void ════ */
  function кардиограмма() {
    try {
      var канв = по('пульсКардио');
      if (!канв || !канв.getContext) return;
      var ctx = канв.getContext('2d');
      if (!ctx) return;

      var тихо = false, движок = true;
      try { тихо = (window.SNG_ТИХО === '1'); } catch (е) {}
      try {
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) движок = false;
      } catch (е) {}
      var живо = !тихо && движок;

      var УДАРОВ_СЕК = УДАРОВ_МИНУТ / 60;      /* период золотой волны */
      var ПЕРИОДОВ_НА_ЭКРАН = 2.4;

      function форма(фаза) {                   /* форма удара: P · R · S · T */
        try {
          function колокол(центр, ширина, высота) {
            var р = (фаза - центр) / ширина;
            return высота * Math.exp(-р * р);
          }
          return колокол(0.10, 0.035, 0.16)    /* P — предсердие */
               + колокол(0.215, 0.013, 1.0)    /* R — главный удар */
               - колокол(0.262, 0.020, 0.28)   /* S — спад */
               + колокол(0.44, 0.055, 0.30);   /* T — восстановление */
        } catch (е) { return 0; }
      }

      function размер() {
        try {
          var ш = канв.clientWidth || 600;
          var в = Math.max(220, Math.min(340, Math.round(ш * 0.32)));
          var плот = window.devicePixelRatio || 1;
          if (плот > 2) плот = 2;
          канв.width = Math.round(ш * плот);
          канв.height = Math.round(в * плот);
          канв.style.height = в + 'px';
          ctx.setTransform(плот, 0, 0, плот, 0, 0);
          return { ш: ш, в: в };
        } catch (е) { return { ш: 600, в: 240 }; }
      }

      function кадр(ш, в, т) {
        try {
          /* void */
          var фон = ctx.createLinearGradient(0, 0, 0, в);
          фон.addColorStop(0, '#0C0D11');
          фон.addColorStop(1, '#0A0A0C');
          ctx.fillStyle = фон;
          ctx.fillRect(0, 0, ш, в);

          /* три тихие нити-дыхания */
          ctx.strokeStyle = 'rgba(240,240,248,.06)';
          ctx.lineWidth = 1;
          for (var л = 1; л <= 3; л++) {
            var нить = (в * л) / 4;
            ctx.beginPath();
            ctx.moveTo(0, нить);
            ctx.lineTo(ш, нить);
            ctx.stroke();
          }

          /* золотая синусоида-пульс: бежит к правому краю */
          var центр = в * 0.56;
          var ампл = в * 0.30;
          var град = ctx.createLinearGradient(0, 0, ш, 0);
          град.addColorStop(0, 'rgba(176,141,87,.30)');
          град.addColorStop(0.65, 'rgba(176,141,87,.85)');
          град.addColorStop(1, 'rgba(232,200,156,1)');
          ctx.strokeStyle = град;
          ctx.lineWidth = 2;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          try { ctx.shadowColor = 'rgba(176,141,87,.35)'; ctx.shadowBlur = живо ? 8 : 0; } catch (е) {}
          ctx.beginPath();
          for (var х = 0; х <= ш; х += 2) {
            var фаза = ((т / 1000) * УДАРОВ_СЕК + (х / ш) * ПЕРИОДОВ_НА_ЭКРАН) % 1;
            if (фаза < 0) фаза += 1;
            var у = центр - форма(фаза) * ампл;
            if (х === 0) ctx.moveTo(х, у); else ctx.lineTo(х, у);
          }
          ctx.stroke();
          try { ctx.shadowBlur = 0; } catch (е) {}

          /* ведущая точка удара у правого края */
          var фПрав = ((т / 1000) * УДАРОВ_СЕК + ПЕРИОДОВ_НА_ЭКРАН) % 1;
          var уПрав = центр - форма(фПрав) * ампл;
          ctx.fillStyle = '#E8C89C';
          ctx.beginPath();
          ctx.arc(ш - 4, уПрав, 3, 0, Math.PI * 2);
          ctx.fill();

          /* бирка-глиф: такт дома и счёт ударов с открытия двери */
          var ударов = Math.floor((т / 1000) * УДАРОВ_СЕК);
          ctx.fillStyle = 'rgba(138,144,153,.9)';
          ctx.font = '11px ui-monospace,Consolas,monospace';
          ctx.fillText('◇ ПУЛЬС · 62 УД/МИН · УДАРОВ С ОТКРЫТИЯ: ' + ударов, 14, в - 14);
        } catch (е) { /* холст не рисует — страница держит */ }
      }

      var рм = размер();
      кадр(рм.ш, рм.в, 0);                     /* один кадр — и для статики */

      if (живо) {
        var видима = true;
        try {
          document.addEventListener('visibilitychange', function () {
            try { видима = !document.hidden; } catch (е) {}
          });
        } catch (е) {}
        var петля = function (т) {
          try {
            if (видима) кадр(рм.ш, рм.в, т || 0);   /* document.hidden — пауза */
            window.requestAnimationFrame(петля);
          } catch (е) { /* петля рвётся тихо */ }
        };
        try { window.requestAnimationFrame(петля); } catch (е) {}
      } else {
        скажи('пульсПодпись', (тихо ? 'ТИХИЙ РЕЖИМ' : 'reduced-motion') + ' уважен: один статичный след пульса, без анимации.');
      }

      try {
        window.addEventListener('resize', function () {
          try { рм = размер(); кадр(рм.ш, рм.в, 0); } catch (е) {}
        });
      } catch (е) {}
    } catch (е) { /* кардиограмма не обязана — честные строки ниже */ }
  }

  /* ═══ message API дома: PING → поколение кэша, ОТЧЁТ → кэши + защита ═══ */
  function спроситьВоркера(сообщение, таймаутМс) {
    return new Promise(function (решение) {
      try {
        var св = navigator.serviceWorker;
        var цель = null;
        try {
          цель = (св && св.controller) || (живаяРег && (живаяРег.active || живаяРег.waiting)) || null;
        } catch (е) {}
        if (!цель || typeof цель.postMessage !== 'function') { решение(null); return; }
        var канал = new MessageChannel();
        var закрыто = false;
        var таймер = setTimeout(function () {
          try { if (!закрыто) { закрыто = true; решение(null); } } catch (е) {}
        }, таймаутМс || 1200);
        канал.port1.onmessage = function (с) {
          try {
            if (закрыто) return;
            закрыто = true;
            clearTimeout(таймер);
            решение((с && с.data) || null);
          } catch (е) { решение(null); }
        };
        цель.postMessage(сообщение, [канал.port2]);
      } catch (е) { решение(null); }
    });
  }

  function поколениеИзАдреса() {
    try {
      var у = '';
      try { у = (живаяРег && живаяРег.active && живаяРег.active.scriptURL) || ''; } catch (е) {}
      if (!у) {
        try {
          у = (navigator.serviceWorker && navigator.serviceWorker.controller && navigator.serviceWorker.controller.scriptURL) || '';
        } catch (е) {}
      }
      var м = у.match(/v(\d+)\.js/i);
      if (м) return 'v' + м[1];
      м = у.match(/[?&]v=(\d+)/);
      if (м) return 'v' + м[1];
      return null;
    } catch (е) { return null; }
  }

  /* ═══ СЕКЦИЯ 2 · ПОКАЗАТЕЛИ ДОМА ═══════════════════════════════════════ */
  function шагВоркера() {
    try {
      var св = navigator.serviceWorker;
      if (!св) {
        скажи('свСостояние', 'нет — этот браузер не даёт сервис-воркер');
        скажи('свПоколение', '—');
        return;
      }
      св.getRegistration().then(function (рег) {
        try {
          if (!рег) {
            скажи('свСостояние', 'нет — дом ещё не ставил сторожа');
            скажи('свПоколение', '—');
            return;
          }
          живаяРег = рег;
          var ст = 'active — воркер держит дом';
          if (рег.waiting) ст = 'waiting — новое поколение ждёт смены';
          else if (рег.installing) ст = 'installing — воркер ставится';
          скажи('свСостояние', ст);
          var кноп = по('свОбновить');
          if (кноп) кноп.hidden = false;
          if (рег.waiting) скажи('свПодсказка', 'новое поколение уже скачано и ждёт — жми «ОБНОВИТЬ ДОМ».');
          спроситьВоркера({ type: 'S15_PING' }, 1200).then(function (д) {
            try {
              var пок = д && (д.поколение || д.поколениеКэша || д.кэш || д.версияКэша);
              скажи('свПоколение', пок ? String(пок) : (поколениеИзАдреса() || 'воркер молчит — честно'));
            } catch (е) {}
          }).catch(function () {
            скажи('свПоколение', поколениеИзАдреса() || 'воркер молчит — честно');
          });
        } catch (е) {}
      }).catch(function () {
        скажи('свСостояние', 'нет — браузер отказал в доступе к воркерам');
      });
    } catch (е) {}
  }

  function воркерБлок() {
    try {
      шагВоркера();
      try {
        var св = navigator.serviceWorker;
        if (св && св.ready && typeof св.ready.then === 'function') {
          св.ready.then(function () { try { шагВоркера(); } catch (е) {} }).catch(function () {});
        }
      } catch (е) {}
    } catch (е) {}
  }

  function обновитьДом() {
    try {
      var св = navigator.serviceWorker;
      if (!св) { скажи('свПодсказка', 'воркера нет — обновлять нечего: дом живёт и без сторожа.'); return; }
      св.getRegistration().then(function (рег) {
        try {
          if (!рег) { скажи('свПодсказка', 'воркера нет — обновлять нечего: дом живёт и без сторожа.'); return; }
          живаяРег = рег;
          if (рег.waiting) {
            try { рег.waiting.postMessage({ type: 'SKIP_WAITING' }); } catch (е) {}
            скажи('свПодсказка', 'перезагрузи дважды — так честно просыпается воркер: первый раз он берёт управление, второй показывает новый дом. Обновляю…');
            скажи('свСостояние', 'waiting — перезагрузка…');
            setTimeout(function () { try { location.reload(); } catch (е) {} }, 1200);
          } else {
            скажи('свПодсказка', 'ждущих нет: спрошу сеть, не вышло ли новое поколение (это по твоему клику, не раньше).');
            try {
              рег.update().then(function () {
                скажи('свПодсказка', 'сверился: дом уже последней сборки, которую отдаёт сеть.');
              }).catch(function () {
                скажи('свПодсказка', 'сети нет — дом сверяется только с собой. Это честно.');
              });
            } catch (е) { скажи('свПодсказка', 'браузер не дал спросить сеть — живём тем, что скачано.'); }
          }
        } catch (е) {}
      }).catch(function () {});
    } catch (е) {}
  }

  function связь() {
    try {
      скажи('свСвязь', navigator.onLine ? 'в сети' : 'офлайн — дом всё равно поёт');
    } catch (е) {}
  }

  function память() {
    try {
      var хр = navigator.storage;
      if (!хр || typeof хр.estimate !== 'function') { скажи('свПамять', 'браузер не отдаёт счётчик'); return; }
      хр.estimate().then(function (оц) {
        try {
          if (!оц || (оц.usage === null || оц.usage === undefined) || (оц.quota === null || оц.quota === undefined)) {
            скажи('свПамять', 'браузер не отдаёт счётчик');
            return;
          }
          скажи('свПамять', 'использовано ' + (весСтрокой(оц.usage) || '0 Б') + ' из квоты ' + (весСтрокой(оц.quota) || '—'));
        } catch (е) {}
      }).catch(function () { скажи('свПамять', 'браузер не отдаёт счётчик'); });
    } catch (е) { скажи('свПамять', 'браузер не отдаёт счётчик'); }
  }

  /* ═══ РЕЕСТР: sg-registry.js → событие → свой fetch (фолбэки) ══════════ */
  function взятьРеестр() {
    try {
      if (реестрОбещание) return реестрОбещание;
      реестрОбещание = new Promise(function (решение, отказ) {
        try {
          if (window.SG_РЕЕСТР) { живойРеестр = window.SG_РЕЕСТР; решение(window.SG_РЕЕСТР); return; }
          var готово = false;
          function принять(д) {
            try { if (!готово && д) { готово = true; живойРеестр = д; решение(д); } } catch (е) {}
          }
          try {
            window.addEventListener('sg-реестр-готов', function (с) {
              try {
                if (с && с.detail) принять(с.detail);
                else if (!готово) запастись();
              } catch (е) {}
            });
          } catch (е) {}
          setTimeout(function () {
            try { if (!готово && !window.SG_РЕЕСТР) запастись(); } catch (е) {}
          }, 1500);
          function запастись() {
            try {
              if (готово || typeof fetch !== 'function') { if (!готово) отказ(new Error('реестр недоступен')); return; }
              fetch('data/versions.json').then(function (ответ) {
                if (!ответ.ok) throw new Error('HTTP ' + ответ.status);
                return ответ.json();
              }).then(function (д) { принять(д); }).catch(function (о) { отказ(о || new Error('реестр недоступен')); });
            } catch (е) { отказ(е); }
          }
        } catch (е) { отказ(е); }
      });
      try { реестрОбещание.catch(function () { живойРеестр = null; }); } catch (е) {}
      return реестрОбещание;
    } catch (е) { return Promise.reject(е); }
  }

  function двери() {
    try {
      взятьРеестр().then(function (д) {
        try {
          var с = (д && д.счётчики) || {};
          var части = [];
          if (с.дверей !== undefined && с.дверей !== null) части.push(с.дверей + ' ' + склонение(с.дверей, ['дверь', 'двери', 'дверей']));
          if (с.песен !== undefined && с.песен !== null) части.push(с.песен + ' ' + склонение(с.песен, ['песня', 'песни', 'песен']));
          if (с.языков !== undefined && с.языков !== null) части.push(с.языков + ' ' + склонение(с.языков, ['язык', 'языка', 'языков']));
          скажи('свДвери', части.length ? части.join(' · ') : 'реестр открыт, но чисел не называет — честно');
        } catch (е) {}
      }).catch(function () {
        скажи('свДвери', 'реестр не открыт (file:// или сети нет) — числа молчат');
      });
    } catch (е) {}
  }

  /* ═══ СЕКЦИЯ 3 · КЭШИ ДОМА (свой перебор + данные воркера) ═════════════ */
  function защищённые() {
    try {
      var изОтчёта = последнийОтчёт && последнийОтчёт.защита;
      var список = (изОтчёта && изОтчёта.length)
        ? изОтчёта
        : (живойРеестр && живойРеестр.защищённые_кэши && живойРеестр.защищённые_кэши.length ? живойРеестр.защищённые_кэши : ЗАЩИЩЁННЫЕ_ПО_УМОЛЧАНИЮ);
      var карта = {};
      try { список.forEach(function (имя) { карта[String(имя)] = true; }); } catch (е) {}
      return карта;
    } catch (е) { return {}; }
  }

  function перечитатьКэши() {
    return new Promise(function (решение) {
      try {
        var хр = window.caches;
        if (!хр || typeof хр.keys !== 'function') { решение({ нет: true, строки: [] }); return; }
        хр.keys().then(function (имена) {
          try {
            var обещания = (имена || []).map(function (имя) {
              return хр.open(имя).then(function (к) {
                return к.keys().then(function (ключи) {
                  var известные = 0, сумма = 0;
                  var пробы = (ключи || []).map(function (запрос) {
                    return к.match(запрос).then(function (ответ) {
                      try {
                        if (!ответ) return;
                        var дл = ответ.headers.get('content-length');   /* тела НЕ читаем */
                        var б = дл === null ? NaN : parseInt(дл, 10);
                        if (!isNaN(б) && б > 0) { известные += 1; сумма += б; }
                      } catch (е) {}
                    }).catch(function () { /* ключ не читается — пропускаем */ });
                  });
                  return Promise.all(пробы).then(function () {
                    return { имя: String(имя), ключей: (ключи || []).length, вес: известные ? сумма : null };
                  });
                });
              }).catch(function () { return { имя: String(имя), ключей: 0, вес: null }; });
            });
            Promise.all(обещания).then(function (строки) { решение({ нет: false, строки: строки }); },
              function () { решение({ нет: false, строки: [] }); });
          } catch (е) { решение({ нет: false, строки: [] }); }
        }).catch(function () { решение({ нет: true, строки: [] }); });
      } catch (е) { решение({ нет: true, строки: [] }); }
    });
  }

  function отрисоватьКэши(данные) {
    try {
      var тело = по('телоКэшей');
      if (!тело) return;
      очистить(тело);
      if (данные && данные.нет) {
        тело.appendChild(строкаСообщение('Cache Storage браузер здесь не показывает (file:// или приватный режим) — дом не выдумывает.', 3));
        скажи('кэшиИтог', 'кэши не видны — это граница браузера, не поломка дома.');
        return;
      }
      var строки = (данные && данные.строки) || [];
      if (!строки.length) {
        тело.appendChild(строкаСообщение('кэшей нет — дом пуст; прогрей AI кнопкой ниже или погуляй по дверям.', 3));
        скажи('кэшиИтог', 'дом пустой и честный.');
        return;
      }
      var защ = защищённые();
      var изВоркера = {};
      try {
        var список = (последнийОтчёт && последнийОтчёт.кэши) || [];
        список.forEach(function (с) { try { if (с && с.имя) изВоркера[String(с.имя)] = с; } catch (е) {} });
      } catch (е) {}
      var упор = строки.slice().sort(function (а, б) {
        try {
          var за = защ[а.имя] ? 0 : 1, зб = защ[б.имя] ? 0 : 1;
          if (за !== зб) return за - зб;
          return а.имя < б.имя ? -1 : (а.имя > б.имя ? 1 : 0);
        } catch (е) { return 0; }
      });
      var всего_ключей = 0, весь_вес = 0, вес_известен = false;
      упор.forEach(function (с) {
        try {
          var заща = !!защ[с.имя];
          var свд = изВоркера[с.имя];
          var ключей = (свд && свд.ключей !== undefined && свд.ключей !== null) ? свд.ключей : с.ключей;
          var вес = ((с.вес === null || с.вес === undefined) && свд && свд.вес !== undefined && свд.вес !== null) ? свд.вес : с.вес;
          всего_ключей += Number(ключей) || 0;
          if (вес !== null && вес !== undefined) { весь_вес += Number(вес) || 0; вес_известен = true; }

          var тр = document.createElement('tr');
          if (заща) тр.className = 'защищён';
          var имя = ячейка(с.имя, заща ? 'золото' : '');
          if (заща) {
            var метка = document.createElement('span');
            метка.className = 'метка';
            метка.textContent = 'защищён — переживает такты';
            имя.appendChild(document.createTextNode(' '));
            имя.appendChild(метка);
          }
          тр.appendChild(имя);
          тр.appendChild(ячейка(String(ключей), ''));
          тр.appendChild(ячейка((вес === null || вес === undefined) ? '—' : '≈ ' + (весСтрокой(вес) || '—'), ''));
          тело.appendChild(тр);
        } catch (е) {}
      });
      скажи('кэшиИтог', 'кэшей: ' + упор.length + ' · ключей: ' + всего_ключей +
        (вес_известен ? ' · суммарно видно ≈ ' + (весСтрокой(весь_вес) || '—') + ' (по заголовкам, тела не читались)' : ' · весов браузер не сказал'));
    } catch (е) {}
  }

  function кэшиБлок() {
    try {
      перечитатьКэши().then(function (данные) {
        try { отрисоватьКэши(данные); } catch (е) {}
        спроситьВоркера({ type: 'S15_ОТЧЁТ' }, 1500).then(function (отчёт) {
          try {
            if (отчёт && (отчёт.кэши || отчёт.защита)) {
              последнийОтчёт = отчёт;
              отрисоватьКэши(данные);
            }
          } catch (е) {}
        });
      }).catch(function () {
        try { отрисоватьКэши({ нет: true, строки: [] }); } catch (е) {}
      });
    } catch (е) {}
  }

  /* ═══ СЕКЦИЯ 6 · ДОКУМЕНТЫ ДОМА (v10.55 «ПОТОК»): пробы ЗДОРОВЬЕ на docs/ ═
     Файлы уже в пре-кэше воркера; тела НЕ читаем — вес по content-length,
     «—» если браузер не сказал (канон СЕКЦИИ 3). Ноль сети: только Cache Storage. */
  var ДОКУМЕНТЫ_ПУТИ = [
    './README.md', './CHANGELOG.md', './AGENTS.md',
    './docs/README.md', './docs/ТЗ.md', './docs/ДОРОЖНАЯ_КАРТА.md',
    './docs/АРХИТЕКТУРА.md', './docs/РИТУАЛ_ТАКТА.md', './docs/МАЛЫШ.md',
    './docs/llms.txt', './docs/adr/0001-изоляция-ящиков.md',
    './docs/adr/0002-мост-delete-defineproperty.md', './docs/adr/0003-pwa-без-сборщика.md'
  ];
  function документы() {
    try {
      var хр = window.caches;
      if (!хр || typeof хр.match !== 'function') { скажи('свДоки', 'Cache Storage недоступен — проверить нельзя (file:// или приватный режим)'); return; }
      var живых = 0, пустых = 0;
      var строки = [];
      var цепочка = Promise.resolve();
      ДОКУМЕНТЫ_ПУТИ.forEach(function (путь) {
        цепочка = цепочка.then(function () {
          return хр.match(путь, { ignoreSearch: true }).then(function (нашла) {
            try {
              if (!нашла) { пустых += 1; строки.push('— ' + путь.replace('./', '') + ': нет в кэше'); return; }
              var дл = нашла.headers && нашла.headers.get ? нашла.headers.get('content-length') : null;
              var вес = (дл === null || дл === undefined) ? 'вес —' : весСтрокой(дл);
              живых += 1;
              строки.push('+ ' + путь.replace('./', '') + ' · ' + вес);
            } catch (е) {}
          });
        });
      });
      цепочка.then(function () {
        строки.push('документы дома: ' + живых + ' в кэше' + (пустых ? ' · ' + пустых + ' ещё не докачаны' : '') + ' — ТЗ, дорога, архитектура и Малыш едут вместе с домом');
        скажи('свДоки', строки.join('\n'));
      }).catch(function () { скажи('свДоки', 'проба документов не сошлась — остальное живёт'); });
    } catch (е) { /* проба не дороже страницы */ }
  }

  /* ═══ СЕКЦИЯ 4 · AI НА УСТРОЙСТВЕ — АБСОЛЮТ ════════════════════════════ */
  function айБиблиотека() {
    try {
      var хр = window.caches;
      if (!хр || typeof хр.match !== 'function') {
        скажи('айБиблиотека', 'проверить нельзя — Cache Storage недоступен на этом устройстве');
        return;
      }
      хр.match(БИБЛИОТЕКА_URL, { ignoreSearch: true }).then(function (нашла) {
        скажи('айБиблиотека', нашла
          ? 'прогрета — лежит в кэшах дома (s15-ai-v1/transformers-cache)'
          : 'в кэшах не найдена — прогреется по кнопке ниже, при первом клике');
      }).catch(function () {
        скажи('айБиблиотека', 'в кэшах не найдена — прогреется по кнопке ниже, при первом клике');
      });
    } catch (е) {}
  }

  function слухСтатус() {
    return new Promise(function (решение) {
      try {
        var хр = window.caches;
        if (!хр || typeof хр.keys !== 'function') { решение({ найден: false, файлов: 0 }); return; }
        var кореньЗапрос = new Request(СЛУХ_КОРЕНЬ);
        хр.keys().then(function (имена) {
          try {
            var обещания = (имена || []).map(function (имя) {
              return хр.open(имя).then(function (к) {
                var поКорню = к.match(кореньЗапрос, { ignoreSearch: true, ignoreVary: true })
                  .then(function (н) { return !!н; }).catch(function () { return false; });
                var поКлючам = к.keys().then(function (ключи) {
                  var н = 0;
                  (ключи || []).forEach(function (з) {
                    try { if (String((з && з.url) || '').indexOf(СЛУХ_СЛЕД) !== -1) н += 1; } catch (е) {}
                  });
                  return н;
                }).catch(function () { return 0; });
                return Promise.all([поКорню, поКлючам]).then(function (о) {
                  return { попал: о[0], файлов: о[1] };
                });
              }).catch(function () { return { попал: false, файлов: 0 }; });
            });
            Promise.all(обещания).then(function (спис) {
              try {
                var файлов = 0, найден = false;
                спис.forEach(function (с) { try { if (с.попал) найден = true; файлов += с.файлов; } catch (е) {} });
                решение({ найден: найден || файлов > 0, файлов: файлов });
              } catch (е) { решение({ найден: false, файлов: 0 }); }
            }, function () { решение({ найден: false, файлов: 0 }); });
          } catch (е) { решение({ найден: false, файлов: 0 }); }
        }).catch(function () { решение({ найден: false, файлов: 0 }); });
      } catch (е) { решение({ найден: false, файлов: 0 }); }
    });
  }

  function мозгСтатус() {
    return new Promise(function (решение) {
      try {
        var хр = window.caches;
        if (!хр || typeof хр.has !== 'function') { решение({ частей: 0 }); return; }
        хр.has(КЭШ_МОЗГА).then(function (есть) {
          try {
            if (!есть) { решение({ частей: 0 }); return; }
            хр.open(КЭШ_МОЗГА).then(function (к) {
              к.keys().then(function (ключи) {
                try {
                  var видели = {}, н = 0;
                  (ключи || []).forEach(function (з) {
                    try {
                      var у = String((з && з.url) || '');
                      if (у.indexOf('part-0') !== -1 && !видели[у]) { видели[у] = true; н += 1; }
                    } catch (е) {}
                  });
                  решение({ частей: Math.min(н, ЧАСТЕЙ_ВСЕГО) });
                } catch (е) { решение({ частей: 0 }); }
              }).catch(function () { решение({ частей: 0 }); });
            }).catch(function () { решение({ частей: 0 }); });
          } catch (е) { решение({ частей: 0 }); }
        }).catch(function () { решение({ частей: 0 }); });
      } catch (е) { решение({ частей: 0 }); }
    });
  }

  function айБлок() {
    try {
      айБиблиотека();
      слухСтатус().then(function (с) {
        скажи('айСлух', (с.найден || слухПрогрет)
          ? ('прогрет — whisper-tiny лежит в кэшах дома' + (с.файлов ? (' · файлов: ' + с.файлов) : '') + ', слушает офлайн')
          : 'не прогрет — кнопка ниже греет слух один раз (~60 МБ), потом работает без сети');
      }).catch(function () { скажи('айСлух', 'кэши не читаются — слух не сосчитать'); });
      мозгСтатус().then(function (м) {
        скажи('айМозг', 'знаний: ' + м.частей + ' из ' + ЧАСТЕЙ_ВСЕГО + ' частей' + (м.частей >= ЧАСТЕЙ_ВСЕГО ? ' — мозг цельный, отвечает офлайн' : ' — часть мозга спит'));
      }).catch(function () { скажи('айМозг', 'кэши не читаются — мозг не сосчитать'); });
    } catch (е) {}
  }

  /* ПРОГРЕВ СЛУХА — только по клику человека (I-01 «Человек решает») */
  function прогретьСлух() {
    try {
      if (греем) return;
      var кноп = по('кнопкаПрогреть');
      var прог = по('прогрессСлуха');
      try {
        if (!navigator.onLine) {
          скажи('строкаПрогрева', 'сеть нужна один раз: включи сеть и нажми снова — потом слух живёт офлайн.');
          return;
        }
      } catch (е) {}
      греем = true;
      if (кноп) кноп.disabled = true;
      if (прог) { прог.hidden = false; прог.value = 0; }
      скажи('строкаПрогрева', 'грею слух: беру библиотеку transformers.js @3.7.5 (только по твоему клику — I-01)…');
      var файловГотово = 0;
      function обратный(и) {
        try {
          if (!и) return;
          var ст = String(и.status || '');
          if (ст === 'progress' && и.total) {
            try { if (прог) { прог.max = и.total; прог.value = и.loaded || 0; } } catch (е) {}
            var з = (и.loaded || 0) / 1048576;
            var т = и.total / 1048576;
            скажи('строкаПрогрева', 'файл: ' + (и.file || 'веса') + ' · ' + з.toFixed(1) + ' из ' + т.toFixed(1) + ' МБ · файлов готово: ' + файловГотово + ' — реальный прогресс');
          } else if (ст === 'done') {
            файловГотово += 1;
            скажи('строкаПрогрева', 'в кэш лёг файл: ' + (и.file || 'без имени') + ' (готово: ' + файловГотово + ')');
          } else if (ст === 'initiate') {
            скажи('строкаПрогрева', 'запрашиваю файл: ' + (и.file || 'веса') + '…');
          }
        } catch (е) {}
      }
      import(БИБЛИОТЕКА_URL).then(function (биб) {
        скажи('строкаПрогрева', 'библиотека жива — собираю слух: whisper-tiny, q8, wasm…');
        return биб.pipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny', { dtype: 'q8', device: 'wasm', progress_callback: обратный });
      }).then(function () {
        try {
          слухПрогрет = true;
          скажи('строкаПрогрева', 'СЛУХ АБСОЛЮТЕН: работает офлайн.');
          if (прог) прог.hidden = true;
          if (кноп) { кноп.disabled = false; кноп.textContent = 'СЛУХ ПРОГРЕТ — СВЕРИТЬ КЭШИ'; }
          айБлок();
          кэшиБлок();
        } catch (е) {}
        греем = false;
      }).catch(function (ошибка) {
        try {
          var почему = '';
          try { почему = (ошибка && ошибка.message) ? ' ' + String(ошибка.message) : ''; } catch (е) {}
          if (!navigator.onLine) скажи('строкаПрогрева', 'сеть нужна один раз — включи сеть и нажми снова: без неё веса не взять, и дом честно это признаёт.');
          else скажи('строкаПрогрева', 'не вышло:' + почему + ' — дом не притворится, что слышит. Попробуй ещё раз.');
          if (кноп) кноп.disabled = false;
        } catch (е) {}
        греем = false;
      });
    } catch (е) { греем = false; }
  }

  /* ═══ СЕКЦИЯ 5 · РЕЕСТР ВЕРСИЙ (летопись + текущая сборка) ═════════════ */
  function строкаРеестра(з, текущая) {
    try {
      var тр = document.createElement('tr');
      if (текущая) тр.className = 'сейчас';
      var поколение = '—';
      try { поколение = String(з.версия || з.поколение || з.кэш || '—'); } catch (е) {}
      тр.appendChild(ячейка(поколение, текущая ? 'золото' : ''));
      var такт = '—';
      try { такт = String(з.такт || '—'); } catch (е) {}
      тр.appendChild(ячейка(такт, ''));
      var дата = '—';
      try { дата = String(з.дата || '—'); } catch (е) {}
      тр.appendChild(ячейка(дата, ''));
      var сдел = '—';
      try {
        if (Object.prototype.toString.call(з.сделано) === '[object Array]' && з.сделано.length) сдел = з.сделано.join(' · ');
        else if (з.сделано) сдел = String(з.сделано);
      } catch (е) {}
      тр.appendChild(ячейка(сдел, ''));
      return тр;
    } catch (е) { return document.createElement('tr'); }
  }

  function реестр() {
    try {
      var тело = по('телоРеестра');
      взятьРеестр().then(function (д) {
        try {
          if (!тело) return;
          очистить(тело);
          var лет = (д && д.летопись) || [];
          if (!лет.length) {
            тело.appendChild(строкаСообщение('реестр открыт, но летопись пуста — честно и странно.', 4));
            скажи('реестрСтатус', 'летопись пуста — это тоже правда дома.');
            return;
          }
          лет.forEach(function (з) {
            try { тело.appendChild(строкаРеестра(з, false)); } catch (е) {}
          });
          var дом = (д && д.дом) || {};
          var текущая = {
            версия: дом.поколение_кэша || 'v87',
            такт: (дом.версия ? 'v' + дом.версия : 'v10.28') + ' «' + (дом.такт || 'ЭМЕРДЖЕНТ') + '»',
            дата: дом.дата || '—',
            сделано: 'текущая сборка: дверь ·38 ПУЛЬС — кардиограмма, показатели, кэши, AI-абсолют, реестр'
          };
          тело.appendChild(строкаРеестра(текущая, true));
          скажи('реестрСтатус', 'летопись: ' + лет.length + ' ' + склонение(лет.length, ['запись', 'записи', 'записей']) + (дом.версия ? ' · дом v' + дом.версия + ' «' + (дом.такт || '') + '»' : ''));
        } catch (е) {}
      }).catch(function () {
        try {
          if (!тело) return;
          очистить(тело);
          тело.appendChild(строкаСообщение('реестр не найден — это честный сбой, сообщи хозяину.', 4, 'сбой'));
          скажи('реестрСтатус', 'реестр не найден — это честный сбой, сообщи хозяину.');
        } catch (е) {}
      });
    } catch (е) {}
  }

  /* ═══ СЕКЦИЯ 7 · ГОТОВНОСТЬ ФОНДА (W2 «ГОТОВНОСТЬ ФОНДА», ТЗ §2, 2026-11-13) ═══
     Честное состояние «фонд в доме»: CORE_READY / SONG_READY / MODEL_READY / P2P_READY
     + счётчик выученного (аудио_в_хранилище) + ручной прогрев «вечера» (выбранные
     песни × языки флагмана) с прогнозом объёма и отменой (AbortController).
     Определения всех состояний — data/versions.json → счётчики.словарь
     (готовность_ядра / готовность_песен / готовность_моделей / готовность_p2p /
     аудио_в_хранилище / песня_недоступна); лица числа не выдумывают.
     Числа: манифест фонда ДАННЫЕ/МИНУС_ФОНД_РЕЛИЗ.json (точные байты релиза
     MINUS-FOND-2026-10-30 — прогноз объёма из реестра, не HEAD-угадывание);
     тайтлы — ДОКУМЕНТЫ/ТРЕКИ/ТЕКСТ_КАНОН/СВОДКА_61_песен.csv (канон текстов);
     языки флагмана — ДАННЫЕ/ВЕЧЕР_ЯЗЫКИ.json (порядок — канон I-12, машина
     не пересортировывает); счётчик выученного — len(__ОПФС.список()).
     Закон медиа: тела песен в пре-кэш воркера НЕ входят — вечер кладёт их
     в OPFS «фонограммы» (opfs-core/0.1) только по выбору человека (I-01).
     Канон комнаты: ES2019, каждый блок в try/catch, ноль вставок разметки строками
     (только createElement/textContent), сеть — только same-origin по клику человека. */
  var МАНИФЕСТ_ФОНДА = 'ДАННЫЕ/МИНУС_ФОНД_РЕЛИЗ.json';
  var КАНОН_ТЕКСТОВ = 'ДОКУМЕНТЫ/ТРЕКИ/ТЕКСТ_КАНОН/СВОДКА_61_песен.csv';
  var ЯЗЫКИ_ВЕЧЕРА = 'ДАННЫЕ/ВЕЧЕР_ЯЗЫКИ.json';
  var ФЛАГМАН = 'rWpYxmFjm9g';           /* «Когда теряем» — флагман ×157 голосов */
  var вечерФонд = null;                  /* [{ид, тайтл, байт}] из манифеста — факт релиза */
  var вечерПутьЯзыков = null;            /* «путь» из ДАННЫЕ/ВЕЧЕР_ЯЗЫКИ.json — один факт одно место */
  var вечерИдёт = false;
  var вечерКонтроллер = null;            /* AbortController — отмена до последнего байта */

  function хранилищеЖиво() {
    try { return !!(window.__ОПФС && typeof window.__ОПФС.список === 'function'); } catch (е) { return false; }
  }
  function имяКаталогаФонограмм() {
    try { return (хранилищеЖиво() && window.__ОПФС.возможности() && window.__ОПФС.возможности().каталог) || 'фонограммы'; } catch (е) { return 'фонограммы'; }
  }
  /* выученное: список идов + суммарный вес (File.size — метаданные, тела НЕ читаем) */
  function выученное() {
    return new Promise(function (решение) {
      try {
        if (!хранилищеЖиво() || !navigator.storage || typeof navigator.storage.getDirectory !== 'function') {
          решение({ живо: false, н: 0, вес: null, текстов: 0 });
          return;
        }
        window.__ОПФС.список().then(function (спис) {
          try {
            var все = (спис || []).slice();
            var аудио = все.filter(function (и) { return String(и).indexOf('txt-') !== 0; });
            var текстов = все.length - аудио.length;
            navigator.storage.getDirectory().then(function (корень) {
              return корень.getDirectoryHandle(имяКаталогаФонограмм(), { create: false });
            }).then(function (кат) {
              var обещания = аудио.map(function (и) {
                return кат.getFileHandle(и, { create: false }).then(function (ф) {
                  return ф.getFile().then(function (файл) { return Number(файл.size) || 0; });
                }).catch(function () { return 0; });
              });
              Promise.all(обещания).then(function (веса) {
                try {
                  var сумма = 0;
                  веса.forEach(function (в) { сумма += в; });
                  решение({ живо: true, н: аудио.length, вес: сумма, текстов: текстов });
                } catch (е) { решение({ живо: true, н: аудио.length, вес: null, текстов: текстов }); }
              }, function () { решение({ живо: true, н: аудио.length, вес: null, текстов: текстов }); });
            }).catch(function () { решение({ живо: true, н: аудио.length, вес: null, текстов: текстов }); });
          } catch (е) { решение({ живо: false, н: 0, вес: null, текстов: 0 }); }
        }).catch(function () { решение({ живо: false, н: 0, вес: null, текстов: 0 }); });
      } catch (е) { решение({ живо: false, н: 0, вес: null, текстов: 0 }); }
    });
  }
  function готЯдро() {
    /* CORE_READY: воркер active + честный ответ S15_PING с поколением (числа — от воркера) */
    try {
      var св = navigator.serviceWorker;
      if (!св) { скажи('готЯдро', 'НЕ ГОТОВО — браузер не даёт сервис-воркер: офлайн-ядро на этом устройстве не ставится.'); return; }
      св.getRegistration().then(function (рег) {
        try {
          if (!рег) { скажи('готЯдро', 'НЕ ГОТОВО — дом ещё не ставил сторожа: открой дом по сети один раз.'); return; }
          var ст = (рег.active && !рег.waiting && !рег.installing) ? 'active' : (рег.waiting ? 'waiting' : 'installing');
          спроситьВоркера({ type: 'S15_PING' }, 1200).then(function (д) {
            try {
              var пок = д && (д.поколение || д.поколениеКэша || д.кэш || д.версияКэша);
              if (пок) скажи('готЯдро', 'ГОТОВО (CORE_READY) — воркер ' + ст + ', кэш ' + String(пок) + ' ответил на PING: ядро офлайна живёт на устройстве.');
              else скажи('готЯдро', 'ЧАСТИЧНО — воркер ' + ст + ', но на PING не ответил: ядро стоит, поколение воркер молчит (честно).');
            } catch (е) {}
          }).catch(function () {
            скажи('готЯдро', 'ЧАСТИЧНО — воркер ' + ст + ', но PING без ответа (приватный режим или file://): ядро стоит, счет молчит — честно.');
          });
        } catch (е) {}
      }).catch(function () {
        скажи('готЯдро', 'НЕ ГОТОВО — браузер отказал в доступе к воркерам.');
      });
    } catch (е) {}
  }
  function готПесни() {
    /* SONG_READY + счётчик аудио_в_хранилище: len(__ОПФС.список()) + вес File.size */
    try {
      выученное().then(function (в) {
        try {
          if (!в.живо) { скажи('готПесни', 'хранилище дома (OPFS) недоступно на этом устройстве — выучивание недоступно, песни поют с сети.'); return; }
          скажи('готПесни', 'выучено ' + в.н + ' ' + склонение(в.н, ['песня', 'песни', 'песен']) +
            (в.вес ? ' · в хранилище дома ≈ ' + (весСтрокой(в.вес) || '—') : '') +
            (в.текстов ? ' · текстов языков: ' + в.текстов : '') +
            ' (OPFS «' + имяКаталогаФонограмм() + '»; SONG_READY у каждой выученной — на ·32 у титула)');
        } catch (е) {}
      });
    } catch (е) {}
  }
  function готМодели() {
    /* MODEL_READY: факты слуха/мозга — те же статы, что в СЕКЦИИ 4 (не выдумывать) */
    try {
      Promise.all([слухСтатус(), мозгСтатус()]).then(function (о) {
        try {
          var слух = о[0], мозг = о[1];
          var слухГотов = слух.найден || слухПрогрет;
          var мозгГотов = мозг.частей >= ЧАСТЕЙ_ВСЕГО;
          if (слухГотов && мозгГотов) скажи('готМодели', 'ГОТОВО (MODEL_READY) — слух прогрет' + (слух.файлов ? ' (файлов: ' + слух.файлов + ')' : '') + ', мозг цельный ' + мозг.частей + '/' + ЧАСТЕЙ_ВСЕГО + ': слушает и отвечает офлайн.');
          else скажи('готМодели', 'НЕ ГОТОВО — слух ' + (слухГотов ? 'прогрет' : 'не прогрет') + ', мозг ' + мозг.частей + '/' + ЧАСТЕЙ_ВСЕГО + ' частей. Кнопка «ПРОГРЕТЬ СЛУХ» выше греет по клику (I-01); дом честно не называет себя готовым.');
        } catch (е) {}
      }).catch(function () { скажи('готМодели', 'кэши не читаются — модели не сосчитать (file:// или приватный режим)'); });
    } catch (е) {}
  }
  function готП2П() {
    /* P2P_READY — возможность, не соединение (определение в словаре): модули связи
       в ядре дома + DataChannel браузером поддержан. Соединение — факт зала ·22. */
    try {
      var умеет = false;
      try { умеет = typeof RTCPeerConnection === 'function' && typeof RTCPeerConnection.prototype.createDataChannel === 'function'; } catch (е) {}
      var хр = window.caches;
      if (!хр || typeof хр.match !== 'function') {
        скажи('готП2П', умеет ? 'ВОЗМОЖНОСТЬ ЕСТЬ — браузер поддерживает DataChannel; кэши здесь не читаются, модули не сверить (file:// или приватный режим). Соединение — факт зала ·22, не обещание.' : 'НЕТ — браузер не поддерживает DataChannel: связь зала на этом устройстве не заведётся.');
        return;
      }
      хр.match('./БИБЛИОТЕКИ/trystero-nostr.bundle.mjs', { ignoreSearch: true }).then(function (нашла) {
        try {
          скажи('готП2П', (нашла && умеет)
            ? 'ВОЗМОЖНОСТЬ ЕСТЬ (P2P_READY) — модули связи лежат в ядре, браузер поддерживает DataChannel. Но соединение рождается только в зале ·22 — возможность ≠ разговор, дом не обещает лишнего.'
            : 'НЕТ — ' + (нашла ? 'браузер не поддерживает DataChannel.' : 'модулей связи в ядре нет') + ' Зал ·22 скажет точнее.');
        } catch (е) {}
      }).catch(function () {
        скажи('готП2П', умеет ? 'ВОЗМОЖНОСТЬ ЕСТЬ — DataChannel поддержан; модули сверить не вышло (честно).' : 'НЕТ — DataChannel не поддержан браузером.');
      });
    } catch (е) {}
  }
  /* ── ВЕЧЕР: собрание списка из манифеста (прогноз объёма — точные байты) ── */
  function вечерТайтлы() {
    return new Promise(function (решение) {
      try {
        fetch(КАНОН_ТЕКСТОВ).then(function (ответ) {
          if (!ответ.ok) throw new Error('HTTP ' + ответ.status);
          return ответ.text();
        }).then(function (т) {
          try {
            var карта = {};
            var строки = String(т).split('\n');
            for (var i = 1; i < строки.length; i++) {
              var ст = строки[i];
              if (!ст) continue;
              /* мини-CSV с кавычками: поле vid — второе, title — третье */
              var поля = [], поле = '', вКавычке = false;
              for (var к = 0; к < ст.length; к++) {
                var сим = ст.charAt(к);
                if (сим === '"') { вКавычке = !вКавычке; continue; }
                if (сим === ',' && !вКавычке) { поля.push(поле); поле = ''; continue; }
                поле += сим;
              }
              поля.push(поле);
              if (поля.length >= 3 && поля[1] && поля[2]) карта[поля[1]] = поля[2];
            }
            решение(карта);
          } catch (е) { решение({}); }
        }).catch(function () { решение({}); });
      } catch (е) { решение({}); }
    });
  }
  /* реестр языков — правда дома: живое чтение с бастом кэша (образец sg-registry:
     правда перечитывается живьём, пре-кэш воркера держит её для офлайна).
     Латка живой поверки v243: бамп не гарантирует свежее тело — HTTP-кэш
     (CDN max-age=600 + браузер) мог отдать старый реестр в момент установки
     нового поколения; баст отличается от пре-кэш-ключа — сеть отдаёт живое. */
  function вечерЯзыкиРеестр() {
    return new Promise(function (решение) {
      try {
        fetch(ЯЗЫКИ_ВЕЧЕРА + '?вечер=' + Date.now()).then(function (о) {
          if (!о.ok) throw new Error('HTTP ' + о.status);
          return о.json();
        }).then(function (д) { решение(д || null); }).catch(function () {
          fetch(ЯЗЫКИ_ВЕЧЕРА).then(function (о) { return о.ok ? о.json() : null; }).then(function (д) {
            решение(д || null);
          }).catch(function () { решение(null); });
        });
      } catch (е) { решение(null); }
    });
  }
  function вечерСобрать() {
    try {
      var кноп = по('вечерСобрать');
      if (кноп) { кноп.disabled = true; }
      скажи('вечерСтатус', 'собираю список фонда: манифест релиза + канон текстов + языки флагмана (родное, same-origin)…');
      var маниф = null, тайтлы = {}, языки = null;
      Promise.all([
        fetch(МАНИФЕСТ_ФОНДА).then(function (о) { if (!о.ok) throw new Error('HTTP ' + о.status); return о.json(); }),
        вечерТайтлы(),
        вечерЯзыкиРеестр()
      ]).then(function (о) {
        try {
          маниф = о[0]; тайтлы = о[1] || {}; языки = о[2];
          вечерПутьЯзыков = (языки && языки.путь) || 'ДАННЫЕ/синхрон_кс1/флагман_157_языков/srt/';
          var голос = ((маниф && маниф.файлы) || []).filter(function (ф) {
            try { return String(ф.было || '').indexOf('minus/голос/') === 0; } catch (е) { return false; }
          });
          if (!голос.length) { скажи('вечерСтатус', 'манифест фонда не открылся или пуст — честный сбой, список собрать нельзя.'); if (кноп) кноп.disabled = false; return; }
          вечерФонд = голос.map(function (ф) {
            var ид = String(ф.было).split('/').pop().replace(/\.mp3$/, '');
            return { ид: ид, байт: Number(ф.байт) || 0, тайтл: (тайтлы[ид] || '') };
          });
          вечерФонд.sort(function (а, б) { return а.тайтл < б.тайтл ? -1 : (а.тайтл > б.тайтл ? 1 : 0); });
          вечерОтрисовать(языки);
        } catch (е) {
          скажи('вечерСтатус', 'список не собрался: ' + ((е && е.message) || 'сбой') + ' — честно.');
          if (кноп) кноп.disabled = false;
        }
      }).catch(function (о) {
        скажи('вечерСтатус', 'манифест фонда не открылся: ' + ((о && о.message) || 'сбой') + ' — без него прогноз объёма был бы выдумкой, а дом не выдумывает.');
        if (кноп) кноп.disabled = false;
      });
    } catch (е) {}
  }
  function вечерОтрисовать(языки) {
    try {
      var тело = по('вечерТело');
      if (!тело) return;
      очистить(тело);
      Promise.all(вечерФонд.map(function (п) {
        return хранилищеЖиво() ? window.__ОПФС.есть(п.ид).catch(function () { return false; }) : Promise.resolve(false);
      })).then(function (метки) {
        try {
          for (var i = 0; i < вечерФонд.length; i++) {
            (function (номер, выучена) {
              var п = вечерФонд[номер];
              var тр = document.createElement('tr');
              var яч1 = document.createElement('td');
              var гал = document.createElement('input');
              гал.type = 'checkbox';
              гал.className = 'вечерГал';
              гал.dataset.ид = п.ид;
              гал.id = 'вечер-' + п.ид;
              гал.setAttribute('aria-label', 'выучить песню ' + (п.тайтл || п.ид) + ' (' + весСтрокой(п.байт) + ')');
              яч1.appendChild(гал);
              var яч2 = document.createElement('td');
              var им = document.createElement('label');
              им.setAttribute('for', 'вечер-' + п.ид);
              им.textContent = п.тайтл || ('песня ' + п.ид);
              if (!п.тайтл) им.textContent = 'песня ' + п.ид + ' (в каноне текстов имени нет — честно)';
              if (п.ид === ФЛАГМАН) {
                var флаг = document.createElement('span');
                флаг.className = 'метка';
                флаг.textContent = 'флагман ×157';
                им.appendChild(document.createTextNode(' '));
                им.appendChild(флаг);
              }
              яч2.appendChild(им);
              var яч3 = document.createElement('td');
              яч3.textContent = п.байт ? весСтрокой(п.байт) : '—';
              var яч4 = document.createElement('td');
              яч4.textContent = выучена ? 'да — поёт в самолёте' : 'нет';
              if (выучена) яч4.className = 'золото';
              тр.appendChild(яч1); тр.appendChild(яч2); тр.appendChild(яч3); тр.appendChild(яч4);
              тело.appendChild(тр);
            })(i, метки[i] === true);
          }
        } catch (е) {}
      }).catch(function () {});
      try {
        var сум = 0;
        вечерФонд.forEach(function (п) { сум += п.байт; });
        скажи('вечерСтатус', 'фонд вечера: ' + вечерФонд.length + ' ' + склонение(вечерФонд.length, ['песня', 'песни', 'песен']) + ' · весь фонд весит ' + (весСтрокой(сум) || '—') + ' (точные байты манифеста ' + (живойРеестр && живойРеестр.счётчики && живойРеестр.счётчики.словарь ? 'релиза' : 'манифеста') + '). Отметь галками — прогноз пересчитаю.');
        вечерПрогноз();
      } catch (е) {}
      /* языки флагмана: порядок baked в файле (канон I-12), машина не пересортировывает */
      try {
        var блок = по('вечерЯзыкиБлок'), сел = по('вечерЯзыки');
        if (блок && сел) {
          очистить(сел);
          var список = (языки && языки.языки) || [];
          список.forEach(function (я) {
            try {
              var оп = document.createElement('option');
              оп.value = String(я.код || '');
              оп.dataset.файл = String(я.файл || '');
              оп.textContent = (я.канон ? '★ ' : '') + String(я.имя || я.код) + ' (' + String(я.код) + ')';
              if (я.канон) оп.selected = true;
              сел.appendChild(оп);
            } catch (е) {}
          });
          блок.hidden = список.length === 0;
          if (сел.addEventListener) {
            сел.addEventListener('change', вечерПрогнозЯзыки);
            вечерПрогнозЯзыки();
          }
          if (!список.length) скажи('вечерЯзыкиИтог', 'переводы флагмана в доме не нашлись — тексты языков не выучить (честно).');
        }
      } catch (е) {}
      try {
        var кнопГреть = по('вечерГреть');
        if (кнопГреть) кнопГреть.disabled = false;
        var кнопСобрать = по('вечерСобрать');
        if (кнопСобрать) кнопСобрать.disabled = false;
      } catch (е) {}
    } catch (е) {}
  }
  function вечерВыбранныеПесни() {
    try {
      var галки = document.querySelectorAll('.вечерГал');
      var выбр = [];
      for (var i = 0; i < галки.length; i++) {
        try { if (галки[i].checked && галки[i].dataset && галки[i].dataset.ид) выбр.push(галки[i].dataset.ид); } catch (е) {}
      }
      return выбр;
    } catch (е) { return []; }
  }
  function вечерПрогнозЯзыки() {
    try {
      var сел = по('вечерЯзыки');
      if (!сел) return;
      var н = 0;
      for (var i = 0; i < сел.options.length; i++) { if (сел.options[i].selected) н++; }
      скажи('вечерЯзыкиИтог', н ? 'выбрано языков: ' + н + ' — тексты посчитаю по факту загрузки (вес мелкий, честное «—» до факта).' : 'языки не выбраны — выучатся только песни.');
      вечерПрогноз();
    } catch (е) {}
  }
  function вечерПрогноз() {
    try {
      var выбр = вечерВыбранныеПесни();
      var карта = {};
      вечерФонд.forEach(function (п) { карта[п.ид] = п; });
      var сум = 0;
      выбр.forEach(function (и) { сум += (карта[и] && карта[и].байт) || 0; });
      var строка = выбр.length
        ? 'прогноз объёма: ' + выбр.length + ' ' + склонение(выбр.length, ['песня', 'песни', 'песен']) + ' · ' + (весСтрокой(сум) || '—') + ' (точные байты манифеста) + тексты языков по факту'
        : 'галки пусты — прогноз 0 Б; дом не качает ничего без твоего выбора (I-01).';
      скажи('вечерИтог', строка);
    } catch (е) {}
  }
  function вечерПутьПесни(ид) {
    /* единственный строитель путей фонда — js/minus-fond.js (один факт — одно место);
       выучиваем оригинал с голосом (дверь-0, same-origin) */
    try {
      if (ид === '9ys_TVEtda8') return './minus/prosto-lubi.mp3'; /* шасси дома (TH-AUDIO-44) — его же тело и выучиваем */
      if (ид === 'Qb8xb0vUYDg') return null; /* Сборник — компиляция из 7 частей, выучиванию не подлежит */
      return './minus/голос/' + encodeURIComponent(ид) + '.mp3'; /* дверь-0 (TH-AUDIO-45) */
    } catch (е) { return null; }
  }
  function вечерГреть() {
    try {
      if (вечерИдёт) return;
      if (!хранилищеЖиво()) { скажи('вечерИтог', 'хранилище дома (OPFS) недоступно — выучивание на этом устройстве невозможно, честно.'); return; }
      var выбр = вечерВыбранныеПесни();
      if (!выбр.length) { скажи('вечерИтог', 'галки пусты — выучивать нечего; отметь песни в списке вечера.'); return; }
      if (!navigator.onLine) { скажи('вечерИтог', 'сети нет — невыученное не взять: включи сеть один раз; уже выученное и так поёт офлайн.'); return; }
      var карта = {};
      вечерФонд.forEach(function (п) { карта[п.ид] = п; });
      var сборник = выбр.filter(function (и) { return и === 'Qb8xb0vUYDg'; });
      if (сборник.length) скажи('вечерИтог', 'Сборник — компиляция из 7 частей: выучиванию не подлежит, поёт частями с сети — честная метка на ·32.');
      /* закрепить() — до прогрева: защита выученного от вытеснения (квота origin) */
      var закреп = Promise.resolve(null);
      if (typeof window.__ОПФС.закрепить === 'function') {
        закреп = window.__ОПФС.закрепить();
      }
      закреп.then(function (р) {
        try {
          if (р && р.ок) скажи('вечерСтатус', 'хранилище закреплено (persist): выученное защищено от вытеснения' + (р.уже ? ' — было закреплено раньше.' : '.') );
          else if (р && !р.ок) скажи('вечерСтатус', 'закрепить не вышло: ' + (р.причина || 'причина неизвестна') + ' — выученное живёт под квотой, дом продолжает (честно).');
        } catch (е) {}
        вечерИдёт = true;
        вечерКонтроллер = (typeof AbortController === 'function') ? new AbortController() : null;
        var кнопГреть = по('вечерГреть'), кнопСтоп = по('вечерСтоп'), прог = по('вечерПрогресс');
        if (кнопГреть) кнопГреть.disabled = true;
        if (кнопСтоп) кнопСтоп.hidden = false;
        if (прог) { прог.hidden = false; прог.max = выбр.length; прог.value = 0; }
        /* тексты выбранных языков — после песен (мелкие, честный счёт по факту) */
        var тексты = [];
        try {
          var сел = по('вечерЯзыки');
          if (сел) {
            for (var i = 0; i < сел.options.length; i++) {
              try {
                if (сел.options[i].selected && сел.options[i].dataset && сел.options[i].dataset.файл) {
                  тексты.push({ код: сел.options[i].value || String(i), файл: сел.options[i].dataset.файл });
                }
              } catch (е) {}
            }
          }
        } catch (е) {}
        вечерЦепочка(выбр, карта, тексты, 0, 0);
      }).catch(function () { вечерИдёт = false; });
    } catch (е) { вечерИдёт = false; }
  }
  function вечерЦепочка(выбр, карта, тексты, индекс, сделано) {
    try {
      if (!вечерИдёт) return; /* отмена вышла из цепочки */
      if (индекс >= выбр.length) { вечерТексты(тексты, 0, сделано, выбр.length); return; }
      var ид = выбр[индекс];
      var п = карта[ид];
      var причина = (п && п.байт) ? (весСтрокой(п.байт) || '') : '';
      if (ид === 'Qb8xb0vUYDg') { скажи('вечерСтатус', 'Сборник пропущен: компиляция выучиванию не подлежит.'); вечерЦепочка(выбр, карта, тексты, индекс + 1, сделано); return; }
      var путь = вечерПутьПесни(ид);
      if (!путь) { вечерЦепочка(выбр, карта, тексты, индекс + 1, сделано); return; }
      скажи('вечерСтатус', 'учу ' + (индекс + 1) + ' из ' + выбр.length + ': ' + ((п && (п.тайтл || п.ид)) || ид) + (причина ? ' · ' + причина : '') + '…');
      var опции = вечерКонтроллер ? { signal: вечерКонтроллер.signal } : {};
      fetch(путь, опции).then(function (ответ) {
        if (!ответ.ok) throw new Error('HTTP ' + ответ.status + ' — дверь не отдала песню');
        return ответ.arrayBuffer();
      }).then(function (байты) {
        if (!вечерИдёт) return;
        return window.__ОПФС.положить(ид, байты).then(function (р) {
          try {
            if (!р || !р.ок) throw new Error(р && р.причина ? р.причина : 'положить отказалось');
            сделано += 1;
            if (прог) прог.value = сделано;
            скажи('вечерСтатус', 'выучено: ' + ((п && (п.тайтл || п.ид)) || ид) + ' — ' + (весСтрокой(р.размер) || '') + ' в хранилище дома');
            готПесни();
          } catch (е) {}
          вечерЦепочка(выбр, карта, тексты, индекс + 1, сделано);
        });
      }).catch(function (о) {
        try {
          if (!вечерИдёт) return;
          var почему = (о && о.message) ? String(о.message) : 'отказ без имени';
          скажи('вечерСтатус', '«' + ((п && (п.тайтл || п.ид)) || ид) + '» не выучилась: ' + почему + ' — иду дальше, отказ не молчит.');
          вечерЦепочка(выбр, карта, тексты, индекс + 1, сделано);
        } catch (е) {}
      });
    } catch (е) { вечерЦепочка(выбр, карта, тексты, индекс + 1, сделано); }
  }
  function вечерТексты(тексты, индекс, сделано, всегоПесен) {
    try {
      if (!вечерИдёт) return;
      if (индекс >= тексты.length) { вечерКонец(сделано, всегоПесен, тексты.length, 0); return; }
      var т = тексты[индекс];
      var путь = (вечерПутьЯзыков || 'ДАННЫЕ/синхрон_кс1/флагман_157_языков/srt/') + т.файл;
      скажи('вечерСтатус', 'учу текст языка ' + т.код + ' (' + (индекс + 1) + ' из ' + тексты.length + ')…');
      var опции = вечерКонтроллер ? { signal: вечерКонтроллер.signal } : {};
      fetch(путь, опции).then(function (ответ) {
        if (!ответ.ok) throw new Error('HTTP ' + ответ.status);
        return ответ.arrayBuffer();
      }).then(function (байты) {
        if (!вечерИдёт) return;
        var идТекста = 'txt-' + ФЛАГМАН + '.' + String(т.код).replace(/[^A-Za-z0-9._-]/g, '-');
        return window.__ОПФС.положить(идТекста, байты).then(function (р) {
          try {
            if (!р || !р.ок) throw new Error(р && р.причина ? р.причина : 'положить отказалось');
            скажи('вечерСтатус', 'текст ' + т.код + ' выучен — ' + (весСтрокой(р.размер) || '') + ' в хранилище дома');
            готПесни();
          } catch (е) {}
          вечерТексты(тексты, индекс + 1, сделано, всегоПесен);
        });
      }).catch(function (о) {
        try {
          if (!вечерИдёт) return;
          скажи('вечерСтатус', 'текст ' + т.код + ' не выучился: ' + ((о && о.message) || 'отказ') + ' — иду дальше.');
          вечерТексты(тексты, индекс + 1, сделано, всегоПесен);
        } catch (е) {}
      });
    } catch (е) { вечерТексты(тексты, индекс + 1, сделано, всегоПесен); }
  }
  function вечерКонец(сделано, всегоПесен, языков, текстовСделано) {
    try {
      вечерИдёт = false;
      вечерКонтроллер = null;
      var прог = по('вечерПрогресс'), кнопГреть = по('вечерГреть'), кнопСтоп = по('вечерСтоп');
      if (прог) прог.hidden = true;
      if (кнопГреть) кнопГреть.disabled = false;
      if (кнопСтоп) кнопСтоп.hidden = true;
      скажи('вечерИтог', 'вечер готов: выучено ' + сделано + ' из ' + всегоПесен + ' ' + склонение(всегоПесен, ['песня', 'песни', 'песен']) +
        (языков ? ' · текстов языков: ' + текстовСделано + '/' + языков : '') +
        (сделано < всегоПесен ? ' — отказы перечислены выше честно' : ' — всё отмеченное дома') +
        '. Выученное поёт в самолёте: ·32 ставит выученное первой ступенью лестницы.');
      готПесни();
      кэшиБлок();
    } catch (е) {}
  }
  function вечерСтоп() {
    try {
      if (!вечерИдёт) return;
      вечерИдёт = false;
      try { if (вечерКонтроллер) вечерКонтроллер.abort(); } catch (е) {}
      вечерКонтроллер = null;
      var прог = по('вечерПрогресс'), кнопГреть = по('вечерГреть'), кнопСтоп = по('вечерСтоп');
      if (прог) прог.hidden = true;
      if (кнопГреть) кнопГреть.disabled = false;
      if (кнопСтоп) кнопСтоп.hidden = true;
      скажи('вечерИтог', 'остановлено человеком — уже выученное осталось дома, докачка честно прервана (I-01).');
      готПесни();
    } catch (е) { вечерИдёт = false; }
  }
  function готовностьБлок() {
    try {
      /* тайминг дома: room-38.js — defer-скрипт шапки, js/opfs-core.js — defer-скрипт
         низа тела: канон __ОПФС встаёт ПОСЛЕ нас (readyState уже interactive).
         Ядро/модели от __ОПФС не зависят — живём сразу; песни ждём канон честно
         (до ~4,5 с, затем честная строка), p2p даём воркеру добрать пре-кэш. */
      готЯдро();
      готМодели();
      ждёмОПФС(0);
      try { setTimeout(готП2П, 1500); } catch (е) { готП2П(); }
    } catch (е) {}
  }
  function ждёмОПФС(попытка) {
    try {
      var ошибка = !navigator.storage || typeof navigator.storage.getDirectory !== 'function';
      if (хранилищеЖиво() || ошибка || попытка >= 15) { готПесни(); return; }
      setTimeout(function () { ждёмОПФС(попытка + 1); }, 300);
    } catch (е) { готПесни(); }
  }

  /* ═══ ЗАПУСК ДВЕРИ ═════════════════════════════════════════════════════ */
  function жива() {
    try { кардиограмма(); } catch (е) {}
    try { связь(); } catch (е) {}
    try { память(); } catch (е) {}
    try { воркерБлок(); } catch (е) {}
    try { айБлок(); } catch (е) {}
    try { двери(); } catch (е) {}
    try { реестр(); } catch (е) {}
    try { кэшиБлок(); } catch (е) {}
    try { документы(); } catch (е) {}
    try { готовностьБлок(); } catch (е) {}
    try {
      var кноп = по('свОбновить');
      if (кноп) кноп.addEventListener('click', обновитьДом);
    } catch (е) {}
    try {
      var кнопСлух = по('кнопкаПрогреть');
      if (кнопСлух) кнопСлух.addEventListener('click', прогретьСлух);
    } catch (е) {}
    try {
      var кнопСобрать = по('вечерСобрать');
      if (кнопСобрать) кнопСобрать.addEventListener('click', вечерСобрать);
      var кнопГреть = по('вечерГреть');
      if (кнопГреть) кнопГреть.addEventListener('click', вечерГреть);
      var кнопСтоп = по('вечерСтоп');
      if (кнопСтоп) кнопСтоп.addEventListener('click', вечерСтоп);
      /* галки приходят и уходят при перерисовке списка — слушаем делегированием на tbody один раз */
      var вечерТело = по('вечерТело');
      if (вечерТело) вечерТело.addEventListener('change', вечерПрогноз);
    } catch (е) {}
    try {
      window.addEventListener('online', связь);
      window.addEventListener('offline', связь);
    } catch (е) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', жива);
  else жива();
}());
