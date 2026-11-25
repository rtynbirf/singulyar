/* НООСЕТКА · ядро мира v1.1 «ПРОВЕРЯЙ, А НЕ ВЕРЬ» · кузня rtynbirf
   ЧЕЛОВЕК=АККАУНТ=PID1 · одно другое не исключает.

   Один файл, ноль зависимостей, браузер и Node (>=18, есть fetch).
   Автомат МИРА:  GHOST → WIRE → LIVE → READY · отказ → DEGRADED (с причиной)
   Автомат СЕТКИ: DARK → SCAN → COHERENT | FRACTURED

   ВХОДЫ: { манифест?, ядро?, стражи[] } · ВЫХОДЫ: { состояние, причина, брайль, события }

   ЧЕСТЬ МЕХАНИЗМА: состояние НЕ декларируется — оно вымеряется. Манифест
   качается по сети, ядро качается по сети, каждый страж качается по сети.
   Битый JSON = DEGRADED, недостающий страж = «стражи N/16» в причине.
   Ничего не врёт: и 404, и отказ сети видны как есть.

   v1.1 «ПУЛЬТ ДОМА» (2026-11-25, слово владельца «НАВИГАЦИЯ ГДЕ?» и
   «ГДЕ РЕГУЛИРОВКИ? КАК В СИСТЕМЕ ПЕРЕНЕСТИ ПЕРЕДВИНУТЬ СМЕНИТЬ РАЗМЕР»):
   ядро, подключённое тегом <script defer src="noo-kernel.js">, само ставит
   на странице пульт дома — плавающую панель с реестром комнат
   (noo/комнаты.json, номера уникальны), которую можно переносить,
   менять в размере, сворачивать и прятать; положение живёт в localStorage.
   Отключается флагом window.NOO_ПУЛЬТ_ОТКЛ = true до загрузки ядра или
   крестиком на панели (возвращение — двойным щелчком по вкладке-звезде).
   В рамке (iframe) пульт не дублируется. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.Noo = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSION = 'noo-kernel/1.1';
  var СТРАЖЕЙ_ТРЕБУЕТСЯ = 16;
  var БРАЙЛЬ_READY = '\u2817\u2811\u2801\u2819\u283D'; /* latin-g1: R E A D Y, канон дома */

  function rawUrl(мир, путь) {
    /* сегментное кодирование: кириллица в пути честная, слэши не трогаем */
    var п = String(путь || '').split('/').map(encodeURIComponent).join('/');
    return 'https://raw.githubusercontent.com/' + мир.владелец + '/' + мир.репо +
           '/' + (мир.ветка || 'main') + '/' + п;
  }

  function fetchOk(url, таймаут) {
    return new Promise(function (решено) {
      var сделано = false;
      var т = setTimeout(function () { if (!сделано) { сделано = true; решено(null); } }, таймаут || 12000);
      fetch(url, { cache: 'no-store' }).then(function (r) {
        if (сделано) return; сделано = true; clearTimeout(т);
        решено(r.ok ? r : null);
      }).catch(function () {
        if (сделано) return; сделано = true; clearTimeout(т); решено(null);
      });
    });
  }

  /* Автомат мира. Вход: { владелец, репо, ветка, ядро?, стражи?[], канон? }
     Выход: { состояние, причина, стражи_взято, брайль, события[] } */
  function мирСостояние(мир, опции) {
    опции = опции || {};
    var события = [];
    var брайль = String((мир && мир.брайль) || '');
    function фин(состояние, причина, взято) {
      return { состояние: состояние, причина: причина, стражи_взято: взято || 0,
               брайль: брайль, события: события, версия: VERSION };
    }
    if (!мир || !мир.репо) return фин('GHOST', 'мира нет в реестре');
    события.push({ т: 'мир', с: мир.репо });
    if (!мир.манифест) {
      if (мир.архив) return фин('SEALED', 'мир заморожен владельцем (архив GitHub) — контракта нет по решению владельца');
      return фин('GHOST', 'noo-manifest.json не отвечает (404/сеть)');
    }
    события.push({ т: 'манифест', с: 'есть' });
    /* живой манифест — дальше ядро */
    if (!мир.ядро_живо) return фин('WIRE', 'манифест на связи, ядро в репо не найдено');
    события.push({ т: 'ядро', с: 'есть' });
    /* поверхность, если заявлена */
    if (мир.поверхность && опции.проверятьПоверхность !== false) {
      if (!мир.поверхность_жива) return фин('DEGRADED', 'поверхность заявлена, но не отвечает');
      события.push({ т: 'поверхность', с: 'есть' });
    }
    var стражи = (мир.стражи || []);
    if (!стражи.length) {
      return фин('LIVE', 'ядро в репо · мир не заявляет стражей');
    }
    var взято = мир.стражи_взято;
    if (typeof взято !== 'number') return фин('DEGRADED', 'стражи не промерены');
    if (взято !== СТРАЖЕЙ_ТРЕБУЕТСЯ) {
      return фин('DEGRADED', 'стражи ' + взято + '/' + СТРАЖЕЙ_ТРЕБУЕТСЯ);
    }
    события.push({ т: 'стражи', с: СТРАЖЕЙ_ТРЕБУЕТСЯ + '/' + СТРАЖЕЙ_ТРЕБУЕТСЯ });
    if (String(мир.канон) !== 'READY') {
      return фин('DEGRADED', 'канон ' + String(мир.канон) + ' ≠ READY');
    }
    события.push({ т: 'канон', с: 'READY' });
    return фин('READY', 'стражи 16/16 · канон READY · ' + СТРАЖЕЙ_ТРЕБУЕТСЯ + ' стражей живы');
  }

  /* Промер одного мира по сети: манифест → ядро → стражи → поверхность. */
  async function промерить(мир, опции) {
    опции = опции || {};
    мир.манифест = null; мир.ядро_живо = false; мир.поверхность_жива = false; мир.стражи_взято = 0;
    var r = await fetchOk(rawUrl(мир, 'noo-manifest.json'), опции.таймаут);
    if (r) {
      try { мир.манифест = await r.json(); } catch (e) { мир.манифест = null; }
    }
    if (мир.манифест && Array.isArray(мир.манифест.стражи)) мир.стражи = мир.манифест.стражи;
    if (мир.манифест && мир.манифест.канон) мир.канон = мир.манифест.канон;
    if (мир.манифест && мир.манифест.брайль) мир.брайль = мир.манифест.брайль;
    if (мир.манифест && мир.манифест.поверхность && !мир.поверхность) мир.поверхность = мир.манифест.поверхность;
    var ядроПуть = (мир.манифест && мир.манифест.ядро) || 'noo-kernel.js';
    var kr = await fetchOk(rawUrl(мир, ядроПуть), опции.таймаут);
    мир.ядро_живо = !!kr;
    if (мир.ядро_живо && мир.стражи && мир.стражи.length) {
      var взято = 0;
      for (var i = 0; i < мир.стражи.length; i++) {
        var путь = мир.стражи[i] && (мир.стражи[i].p || мир.стражи[i].путь || мир.стражи[i]);
        if (!путь) continue;
        var sr = await fetchOk(rawUrl(мир, путь), опции.таймаут);
        if (sr) взято++;
      }
      мир.стражи_взято = взято;
    }
    if (мир.поверхность) {
      var pr = await fetchOk(мир.поверхность, опции.таймаут);
      мир.поверхность_жива = !!pr;
    }
    return мирСостояние(мир, опции);
  }

  /* Автомат сетки: DARK → SCAN → COHERENT | FRACTURED */
  async function скан(реестр, опции) {
    опции = опции || {};
    var миры = (реестр.миры || реестр || []);
    var строки = [];
    for (var i = 0; i < миры.length; i++) {
      var мир = Object.assign({ владелец: реестр.владелец || 'rtynbirf' }, миры[i]);
      if (опции.на_мир) await опции.на_мир(мир, i, миры.length);
      var итог = await промерить(мир, опции);
      строки.push(Object.assign(мир, итог));
    }
    var разбитые = строки.filter(function (с) { return с.состояние === 'GHOST' || с.состояние === 'DEGRADED'; }); /* SEALED не дробит: заморозка — решение владельца, не отказ */
    var ready = строки.filter(function (с) { return с.состояние === 'READY'; }).length;
    return {
      состояние: разбитые.length ? 'FRACTURED' : 'COHERENT',
      причина: разбитые.length
        ? (разбитые.length + ' миров вне канона: ' + разбитые.slice(0, 6).map(function (б) { return б.репо + ':' + б.состояние; }).join(', ') + (разбитые.length > 6 ? ' …' : ''))
        : ('все ' + строки.length + ' миров отвечают · READY: ' + ready),
      миры: строки,
      ready: ready,
      версия: VERSION
    };
  }

  /* Брайль-строка сетки: фрагменты миров выстраиваются по «порядок». */
  function брайльСтрока(итог) {
    var фраг = (итог.миры || [])
      .filter(function (м) { return м.брайль; })
      .sort(function (a, b) { return (a.порядок || 0) - (b.порядок || 0); })
      .map(function (м) { return м.брайль; });
    return фраг.join('\u2800');
  }

  /* Рендер карты миров в элемент. Ноль innerHTML-ширь — только нужные узлы. */
  function рендер(итог, el) {
    if (!el) return null;
    el.setAttribute('data-noo-grid', '');
    var сводка = document.createElement('div');
    сводка.setAttribute('data-noo-сводка', '');
    var цвет = итог.состояние === 'COHERENT' ? '#3fb950' : (итог.состояние === 'SCAN' ? '#d29922' : '#f85149');
    сводка.style.cssText = 'font:13px/1.5 ui-monospace,Consolas,monospace;color:' + цвет + ';padding:6px 0';
    сводка.textContent = 'СЕТКА ' + итог.состояние + ' — ' + итог.причина;
    el.appendChild(сводка);
    var т = document.createElement('table');
    т.style.cssText = 'width:100%;border-collapse:collapse;font:12.5px/1.5 ui-monospace,Consolas,monospace';
    var шап = т.createTHead().insertRow();
    ['МИР', 'РОЛЬ', 'СОСТОЯНИЕ', 'СТРАЖИ', 'ПРИЧИНА'].forEach(function (з) {
      var я = шап.insertCell(); я.textContent = з;
      я.style.cssText = 'text-align:left;border-bottom:1px solid rgba(217,164,65,.35);padding:4px 8px;color:#d9a441';
    });
    var тело = т.createTBody();
    итог.миры.forEach(function (м) {
      var стр = тело.insertRow();
      var цветС = { READY: '#3fb950', LIVE: '#58a6ff', WIRE: '#d29922', DEGRADED: '#f85149', GHOST: '#8b949e', SEALED: '#6e7681' }[м.состояние] || '#8b949e';
      function ячейка(текст, цв) {
        var я = стр.insertCell();
        я.textContent = текст == null ? '' : String(текст);
        я.style.cssText = 'border-bottom:1px solid rgba(217,164,65,.14);padding:4px 8px;color:' + (цв || '#c9c2b4');
        return я;
      }
      ячейка(м.репо, '#f2c464');
      ячейка(м.роль || '');
      ячейка(м.состояние, цветС);
      ячейка(typeof м.стражи_взято === 'number' && м.стражи ? (м.стражи_взято + '/' + м.стражи.length) : '');
      ячейка(м.причина || '');
    });
    el.appendChild(т);
    var бр = document.createElement('div');
    бр.style.cssText = 'font:15px/1.8 ui-monospace,Consolas,monospace;letter-spacing:.35em;color:#d9a441;padding:10px 0';
    бр.setAttribute('data-noo-брайль', '');
    бр.textContent = брайльСтрока(итог) || БРАЙЛЬ_READY;
    el.appendChild(бр);
    return el;
  }

  return {
    VERSION: VERSION,
    СТРАЖЕЙ_ТРЕБУЕТСЯ: СТРАЖЕЙ_ТРЕБУЕТСЯ,
    БРАЙЛЬ_READY: БРАЙЛЬ_READY,
    мирСостояние: мирСостояние,
    промерить: промерить,
    скан: скан,
    брайльСтрока: брайльСтрока,
    рендер: рендер,
    rawUrl: rawUrl
  };
});

/* ═══ ПУЛЬТ ДОМА (noo-kernel/1.1) — навигация + регулировки, один файл ═══
   Слово владельца: «НАВИГАЦИЯ ГДЕ?» · «ГДЕ РЕГУЛИРОВКИ? КАК В СИСТЕМЕ
   ПЕРЕНЕСТИ ПЕРЕДВИНУТЬ СМЕНИТЬ РАЗМЕР И ТД И ТП». Пульт честный: реестр
   комнат качается из noo/комнаты.json; не отвечает — панель говорит об
   отказе, а не рисует выдумку. Положение и размер — воля человека,
   хранится в localStorage этого браузера. */
(function () {
  if (typeof document === 'undefined' || typeof window === 'undefined') return; /* Node — только измеритель */
  if (window.__NOO_ПУЛЬТ__) return; /* двойная инъекция исключена */
  window.__NOO_ПУЛЬТ__ = true;
  if (window.top !== window.self) return; /* в рамке не дублируемся */
  if (window.NOO_ПУЛЬТ_ОТКЛ) return;     /* явный отказ хозяина страницы уважается */

  var КЛЮЧ_СКЛАД = 'noo-пульт-дом-v1';
  var КЛЮЧ_ОТКАЗ = 'noo-пульт-выкл';
  var ЦВЕТ = { золото: '#d9a441', песок: '#f2c464', текст: '#c9c2b4', тускло: '#8f8a7c', фон: 'rgba(11,10,8,.97)', край: 'rgba(217,164,65,.45)' };

  function складЧитай() {
    try { return JSON.parse(localStorage.getItem(КЛЮЧ_СКЛАД) || '{}') || {}; } catch (е) { return {}; }
  }
  function складПиши(д) {
    try { localStorage.setItem(КЛЮЧ_СКЛАД, JSON.stringify(д)); } catch (е) { /* частный режим — живём без склада */ }
  }
  function вПределах(x, y, w, h) {
    var вш = window.innerWidth || 1280, вс = window.innerHeight || 800;
    w = Math.min(Math.max(w, 260), Math.max(260, вш - 24));
    h = Math.min(Math.max(h, 180), Math.max(180, вс - 24));
    x = Math.min(Math.max(x, 8 - w + 48), вш - 48);
    y = Math.min(Math.max(y, 8), вс - 40);
    if (y + h > вс - 8) y = Math.max(8, вс - 8 - h); /* ручка размера и низ пульта всегда досягаемы */
    return { x: x, y: y, w: w, h: h };
  }

  function старт() {
    if (document.getElementById('noo-пульт') || document.getElementById('noo-вкладка')) return;
    var от = складЧитай();
    var отказ = false;
    try { отказ = localStorage.getItem(КЛЮЧ_ОТКАЗ) === '1'; } catch (е) {}

    var панель = document.createElement('div');
    панель.id = 'noo-пульт';
    панель.setAttribute('role', 'complementary');
    панель.setAttribute('aria-label', 'НООСЕТКА · пульт дома');
    панель.style.cssText = 'position:fixed;z-index:2147480000;display:flex;flex-direction:column;' +
      'background:' + ЦВЕТ.фон + ';border:1px solid ' + ЦВЕТ.край + ';border-radius:14px;' +
      'box-shadow:0 12px 40px rgba(0,0,0,.55);color:' + ЦВЕТ.текст + ';' +
      'font:12.5px/1.5 ui-monospace,Consolas,"Courier New",monospace;' +
      'overflow:hidden;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)';

    /* ── шапка-тягач ── */
    var шапка = document.createElement('div');
    шапка.setAttribute('data-noo-тягач', '');
    шапка.style.cssText = 'display:flex;align-items:center;gap:8px;padding:9px 10px 8px;cursor:grab;' +
      'border-bottom:1px solid rgba(217,164,65,.28);background:rgba(18,16,12,.9);touch-action:none;user-select:none;-webkit-user-select:none;flex:0 0 auto';
    шапка.title = 'перетащи — панель переедет';
    var звезда = document.createElement('span');
    звезда.textContent = '\u2726';
    звезда.style.cssText = 'color:' + ЦВЕТ.золото + ';font-size:14px';
    шапка.appendChild(звезда);
    var титул = document.createElement('span');
    титул.textContent = 'НООСЕТКА · ПУЛЬТ ДОМА';
    титул.style.cssText = 'font-weight:700;letter-spacing:.08em;color:' + ЦВЕТ.песок + ';font-size:12px;flex:1 1 auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
    шапка.appendChild(титул);
    function кноп(надпись, подпись) {
      var к = document.createElement('button');
      к.type = 'button';
      к.textContent = надпись;
      к.setAttribute('aria-label', подпись);
      к.style.cssText = 'background:rgba(217,164,65,.12);border:1px solid rgba(217,164,65,.35);border-radius:7px;color:' + ЦВЕТ.песок +
        ';width:22px;height:22px;line-height:1;cursor:pointer;font:12px/1 ui-monospace,Consolas,monospace;padding:0;flex:0 0 auto';
      к.addEventListener('pointerdown', function (е) { е.stopPropagation(); });
      return к;
    }
    var кСверн = кноп('\u2014', 'свернуть пульт');
    var кПрят = кноп('\u00d7', 'спрятать пульт (вернуть: двойной щелчок по звезде)');
    шапка.appendChild(кСверн);
    шапка.appendChild(кПрят);
    панель.appendChild(шапка);

    /* ── тело ── */
    var тело = document.createElement('div');
    тело.setAttribute('data-noo-тело', '');
    тело.style.cssText = 'overflow-y:auto;overflow-x:hidden;padding:8px 10px 10px;flex:1 1 auto;overscroll-behavior:contain';
    var строкаРумы = document.createElement('div');
    строкаРумы.setAttribute('data-noo-рума', '');
    строкаРумы.style.cssText = 'color:' + ЦВЕТ.тускло + ';font-size:11.5px;padding:0 0 7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
    тело.appendChild(строкаРумы);
    var список = document.createElement('div');
    список.setAttribute('data-noo-список', '');
    список.textContent = '… спрашиваю реестр комнат дома …';
    список.style.cssText = 'color:' + ЦВЕТ.тускло + ';padding:2px 0';
    тело.appendChild(список);
    панель.appendChild(тело);

    /* ── тягач размера ── */
    var ручка = document.createElement('div');
    ручка.setAttribute('data-noo-ручка', '');
    ручка.title = 'тяни — размер поменяется';
    ручка.style.cssText = 'position:absolute;right:0;bottom:0;width:16px;height:16px;cursor:nwse-resize;touch-action:none;' +
      'background:linear-gradient(135deg,transparent 50%,rgba(217,164,65,.5) 50%)';
    панель.appendChild(ручка);

    /* ── вкладка-звезда (свернутый пульт) ── */
    var вкладка = document.createElement('button');
    вкладка.id = 'noo-вкладка';
    вкладка.type = 'button';
    вкладка.textContent = '\u2726';
    вкладка.setAttribute('aria-label', 'НООСЕТКА · открыть пульт дома (двойной щелчок)');
    вкладка.title = 'НООСЕТКА · пульт дома — открыть (двойной щелчок; N — тоже)';
    вкладка.style.cssText = 'position:fixed;z-index:2147480000;display:none;right:14px;bottom:14px;width:34px;height:34px;border-radius:50%;' +
      'background:' + ЦВЕТ.фон + ';border:1px solid ' + ЦВЕТ.край + ';color:' + ЦВЕТ.золото +
      ';font:16px/1 ui-monospace,Consolas,monospace;cursor:grab;box-shadow:0 6px 18px rgba(0,0,0,.5);touch-action:none;user-select:none;-webkit-user-select:none;padding:0';

    /* ── состояние: положение/размер/складка ── */
    var г = вПределах(
      typeof от.x === 'number' ? от.x : (window.innerWidth || 1280) - 370,
      typeof от.y === 'number' ? от.y : 78,
      typeof от.w === 'number' ? от.w : 342,
      typeof от.h === 'number' ? от.h : 470
    );
    панель.style.left = г.x + 'px'; панель.style.top = г.y + 'px';
    панель.style.width = г.w + 'px'; панель.style.height = г.h + 'px';
    вкладка.style.left = ''; вкладка.style.right = '14px';
    if (typeof от.vx === 'number' && typeof от.vy === 'number') { вкладка.style.right = ''; вкладка.style.left = от.vx + 'px'; вкладка.style.top = от.vy + 'px'; }

    function свернуть(складка) {
      панель.style.display = складка ? 'none' : 'flex';
      вкладка.style.display = складка ? 'block' : 'none';
      от.складка = !!складка; складПиши(от);
    }
    function спрятать() {
      try { localStorage.setItem(КЛЮЧ_ОТКАЗ, '1'); } catch (е) {}
      панель.remove(); вкладка.remove();
    }
    function развернуть() {
      try { localStorage.removeItem(КЛЮЧ_ОТКАЗ); } catch (е) {}
      отказ = false;
      if (!панель.isConnected) document.body.appendChild(панель);
      свернуть(false);
    }
    кСверн.addEventListener('click', function () { свернуть(true); });
    кПрят.addEventListener('click', спрятать);
    вкладка.addEventListener('dblclick', развернуть);

    /* ── тягачи (мышь и палец — pointer events) ── */
    function тягач(эл, на_ход, на_фин) {
      var жив = false, бх = 0, бу = 0;
      эл.addEventListener('pointerdown', function (е) {
        if (е.button !== 0 && е.pointerType === 'mouse') return;
        жив = true; бх = е.clientX; бу = е.clientY;
        try { эл.setPointerCapture(е.pointerId); } catch (х) {}
        е.preventDefault();
      });
      эл.addEventListener('pointermove', function (е) {
        if (!жив) return;
        на_ход(е.clientX - бх, е.clientY - бу);
        бх = е.clientX; бу = е.clientY;
      });
      function фин(е) { if (!жив) return; жив = false; try { эл.releasePointerCapture(е.pointerId); } catch (х) {} if (на_фин) на_фин(); }
      эл.addEventListener('pointerup', фин);
      эл.addEventListener('pointercancel', фин);
    }
    тягач(шапка, function (дх, ду) {
      var н = вПределах(панель.offsetLeft + дх, панель.offsetTop + ду, панель.offsetWidth, панель.offsetHeight);
      панель.style.left = н.x + 'px'; панель.style.top = н.y + 'px';
    }, function () {
      от.x = панель.offsetLeft; от.y = панель.offsetTop; складПиши(от);
    });
    тягач(ручка, function (дх, ду) {
      var н = вПределах(панель.offsetLeft, панель.offsetTop, панель.offsetWidth + дх, панель.offsetHeight + ду);
      панель.style.width = н.w + 'px'; панель.style.height = н.h + 'px';
      тело.style.display = 'none'; тело.style.display = 'block'; /* пересчёт скролла */
    }, function () {
      от.w = панель.offsetWidth; от.h = панель.offsetHeight; складПиши(от);
    });
    тягач(вкладка, function (дх, ду) {
      вкладка.style.right = '';
      вкладка.style.left = Math.max(4, Math.min((window.innerWidth || 1280) - 42, вкладка.offsetLeft + дх)) + 'px';
      вкладка.style.top = Math.max(4, Math.min((window.innerHeight || 800) - 42, вкладка.offsetTop + ду)) + 'px';
    }, function () {
      от.vx = вкладка.offsetLeft; от.vy = вкладка.offsetTop; складПиши(от);
    });

    /* ── клавиша N: свернуть/развернуть (не в полях ввода) ── */
    document.addEventListener('keydown', function (е) {
      if (е.key !== 'n' && е.key !== 'N' && е.key !== 'т' && е.key !== 'Т') return;
      if (е.ctrlKey || е.altKey || е.metaKey) return;
      var т = е.target;
      if (т && (т.tagName === 'INPUT' || т.tagName === 'TEXTAREA' || т.isContentEditable)) return;
      if (отказ) { развернуть(); return; }
      свернуть(панель.style.display !== 'none');
    }, true);

    /* ── реестр комнат: честный запрос, честный отказ ── */
    function сс(с) { return String(с || '').split('/').map(encodeURIComponent).join('/'); }
    function положи(реестр) {
      список.textContent = '';
      список.style.cssText = 'display:flex;flex-direction:column;gap:10px';
      var путь = decodeURIComponent((location.pathname || '').split('/').pop() || '');
      function секция(заг, строки) {
        if (!строки || !строки.length) return;
        var з = document.createElement('div');
        з.textContent = заг;
        з.style.cssText = 'color:' + ЦВЕТ.золото + ';font-size:10.5px;letter-spacing:.14em;padding:2px 0 1px;border-bottom:1px solid rgba(217,164,65,.2)';
        список.appendChild(з);
        (строки || []).forEach(function (р) {
          var а = document.createElement('a');
          а.href = './' + сс(р.файл);
          а.textContent = (р.н ? р.н + '  ' : '') + (р.т || '');
          а.title = р.роль || р.т || '';
          var сейчас = путь === р.файл;
          а.style.cssText = 'display:block;padding:4px 7px;border-radius:8px;border:1px solid ' + (сейчас ? 'rgba(217,164,65,.65)' : 'rgba(217,164,65,.14)') +
            ';color:' + (сейчас ? ЦВЕТ.песок : ЦВЕТ.текст) + ';text-decoration:none;background:' + (сейчас ? 'rgba(217,164,65,.10)' : 'transparent') +
            ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
          а.addEventListener('mouseenter', function () { а.style.borderColor = 'rgba(217,164,65,.6)'; а.style.color = ЦВЕТ.песок; });
          а.addEventListener('mouseleave', function () { а.style.borderColor = сейчас ? 'rgba(217,164,65,.65)' : 'rgba(217,164,65,.14)'; а.style.color = сейчас ? ЦВЕТ.песок : ЦВЕТ.текст; });
          список.appendChild(а);
        });
      }
      секция('КОМНАТЫ ДОМА', реестр.комнаты);
      секция('СЛУЖБА ДОМА', реестр.служба);
      var карт = document.createElement('a');
      карт.href = './' + сс('НООСЕТКА.html');
      карт.textContent = 'карта миров →';
      карт.style.cssText = 'color:' + ЦВЕТ.золото + ';text-decoration:none;padding:2px 0 0';
      список.appendChild(карт);
      var подпись = document.createElement('div');
      подпись.textContent = 'ядро noo-kernel/1.1 · проверяй, а не верь';
      подпись.style.cssText = 'color:' + ЦВЕТ.тускло + ';font-size:10.5px;padding-top:6px';
      список.appendChild(подпись);
    }
    var кудаживём = decodeURIComponent((location.pathname || '').split('/').pop() || '');
    строкаРумы.textContent = кудаживём ? ('рума: ' + кудаживём) : 'дом ждёт';
    fetch('noo/комнаты.json', { cache: 'no-store' })
      .then(function (р) { if (!р.ok) throw new Error('HTTP ' + р.status); return р.json(); })
      .then(положи)
      .catch(function () {
        fetch('https://raw.githubusercontent.com/rtynbirf/singulyar/rumu/noo/комнаты.json', { cache: 'no-store' })
          .then(function (р) { if (!р.ok) throw new Error('HTTP ' + р.status); return р.json(); })
          .then(положи)
          .catch(function (ошибка) {
            список.style.cssText = 'color:#f85149;padding:4px 0';
            список.textContent = 'реестр комнат не отвечает (' + (ошибка && ошибка.message ? ошибка.message : 'сеть') + ') — честный отказ; дверь домой: ';
            var а = document.createElement('a');
            а.href = './'; а.textContent = 'index';
            а.style.cssText = 'color:' + ЦВЕТ.песок;
            список.appendChild(а);
          });
      });

    document.body.appendChild(панель);
    document.body.appendChild(вкладка);
    свернуть(отказ ? true : !!от.складка);
    if (отказ) панель.remove();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', старт);
  else старт();
})();
