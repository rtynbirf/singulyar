/* ==========================================================================
   СИНГУЛЯР — ЯДРО МОДУЛЕЙ v1.3.0 · такт v1.33.0 «ХОЗЯИН=ГОСТЬ»
   Слово владельца (такт v1.32.0): «Я ТЕБЕ КАЖДЫЙ ОБЬЕКТ ДАЛ!!!» — все объекты
   SNG синтезируются в единую картину мира, а не голый разрозненный набор;
   кристалл рассыпается на осколки-двери: «КУДА ЧЕЛОВЕК ПОСТАВИЛ ТАМ И СТОИТ
   — ОН РЕШАЕТ». Слово такта v1.31.0: «НА ГЛАВНОЙ СТРАНИЦЕ ТОЛЬКО КРИСТАЛ…
   НИТЬ АРИАДНЫ ВЫВЕДЕТ ЕГО ИЗ ЛАБИРИНТА МИНОТАВРА=)». История — git.
   --------------------------------------------------------------------------
   Модель дома:
   • МОДУЛЬ — автономная комната вселенной (файл). У каждого есть номер (·NN),
     класс, фасет КРИСТАЛЛА и МОДАЛЬНОСТИ — каналы, на которых он говорит.
   • МУЛЬТИМОДАЛЬНОСТЬ — главный отличитель архитектуры: СМЫСЛ ОДИН —
     МОДАЛЬНОСТИ РАЗНЫЕ (наследие ·21, поднятое до уровня всего дома).
   • Шесть модальностей: СЛОВО · ГОЛОС · ЗВУК · ОБРАЗ · ТАКТ · ЖЕСТ.
   • Живое ядро, не картинки: призма рисуется на canvas — свободный художник
     сам является источником, статике взяться неоткуда.
   Инвариант дома (по документам владельца, «СУВЕРЕННЫЙ УЗЕЛ»):
     Ŝ = 1_H + λ(I⊗I†) · ⟨M(t), Σ(t)⟩ ≡ 0
   Публичный API: window.SNG (см. конец файла).
   Канон (handover владельца, 2026-10-05): Кристалл-Шар — титульный объект;
   Socio-регистр — тексты без эго. Офлайн-закон: 0 внешних запросов, 0 шрифтов,
   0 картинок.
   ========================================================================== */
(function () {
  'use strict';
  if (window.__SINGULYAR_MODULES__) return;
  window.__SINGULYAR_MODULES__ = 'v1.3.0';

  /* ── 1. МОДАЛЬНОСТИ — каналы человека ──────────────────────────────── */
  var МОДАЛЬНОСТИ = [
    { id: 'слово', имя: 'СЛОВО', глиф: '¶', цвет: '#F0F0F0',
      кратко: 'текст · субтитры · файлы · Брайль' },
    { id: 'голос', имя: 'ГОЛОС', глиф: '◉', цвет: '#D4AF37',
      кратко: 'речь · пение · голосовые' },
    { id: 'звук',  имя: 'ЗВУК',  глиф: '∿', цвет: '#F5A623',
      кратко: 'минусовки · FFT · DSP' },
    { id: 'образ', имя: 'ОБРАЗ', глиф: '◈', цвет: '#F0D78C',
      кратко: 'живые холсты · видео · экран' },
    { id: 'такт',  имя: 'ТАКТ',  глиф: '⌇', цвет: '#C8A05F',
      кратко: 'вибро · пульс · ритм' },
    { id: 'жест',  имя: 'ЖЕСТ',  глиф: '⤳', цвет: '#C8CCD2',
      кратко: 'касания · QR · пульт' }
  ];

  /* ── 2. МАНИФЕСТ МОДУЛЕЙ — узлы вселенной ──────────────────────────── */
  /* модальности — по факту кода комнат, не по обещаниям */
  var МОДУЛИ = [
    { id: 'хаб', номер: '·00', имя: 'ХАБ', файл: 'index.html', класс: 'К0',
      фасет: null, авто: true,
      модальности: ['слово', 'голос', 'звук', 'образ', 'такт', 'жест'],
      кратко: 'карта модулей: смысл один — модальности разные' },
    { id: 's01', номер: '·01', имя: 'КОГДА ТЕРЯЕМ', файл: 'СИНГУЛЯР_01_Когда_теряем_157_голосов.html',
      класс: 'К1', фасет: 'flow', авто: true,
      модальности: ['звук', 'голос', 'слово', 'образ'],
      кратко: 'флагман ×157 голосов: караоке платформы ·01' },
    { id: 's02r', номер: '·02', имя: 'РЕЗОНАНС', файл: 'СИНГУЛЯР_02_РЕЗОНАНС_Когда_теряем_157_голосов.html',
      класс: 'К1', фасет: 'resonance', авто: true,
      модальности: ['звук', 'образ', 'слово'],
      кратко: 'колесо 157 узлов, ДНК 9/9, караоке стирает слова' },
    { id: 's02f', номер: '·02', имя: 'ФАБРИКА', файл: 'СИНГУЛЯР_02_ФАБРИКА_эмерджентная_архитектура.html',
      класс: 'К1', фасет: 'atlas', авто: true,
      модальности: ['слово', 'звук', 'образ', 'жест'],
      кратко: 'генерация песен, конвейер, галактика эмерджентности' },
    { id: 's15', номер: '·15', имя: 'ОРКЕСТРАТОР', файл: 'СИНГУЛЯР_15_ОРКЕСТРАТОР.html',
      класс: 'К2', фасет: 'atlas', авто: true,
      модальности: ['слово', 'звук', 'голос', 'образ', 'жест'],
      кратко: 'реестр 62×13, хор, темп/тональность — дирижёр дома' },
    { id: 's16', номер: '·16', имя: 'СУФЛЁР', файл: 'СИНГУЛЯР_16_СУФЛЁР.html',
      класс: 'К2', фасет: 'flow', авто: true,
      модальности: ['голос', 'звук', 'слово', 'образ'],
      кратко: 'оценка вокала UltraStar-стиля, колбаски, счёт' },
    { id: 's17', номер: '·17', имя: 'ЗАЛ', файл: 'СИНГУЛЯР_17_ЗАЛ.html',
      класс: 'К2', фасет: 'resonance', авто: true,
      модальности: ['образ', 'слово', 'жест', 'звук'],
      кратко: 'P2P двойной экран без сервера + air-gapped QR' },
    { id: 's18', номер: '·18', имя: 'СОБЫТИЕ', файл: 'СИНГУЛЯР_18_СОБЫТИЕ.html',
      класс: 'К2', фасет: 'resonance', авто: true,
      модальности: ['голос', 'звук', 'слово', 'образ', 'жест'],
      кратко: 'зал совместного пения по коду/QR, синхростарт, память' },
    { id: 's19', номер: '·19', имя: 'ЧЕЛОВЕК', файл: 'СИНГУЛЯР_19_ЧЕЛОВЕК.html',
      класс: 'К2', фасет: 'aura', авто: true,
      модальности: ['слово', 'такт', 'жест'],
      кратко: 'Human-First: событие одно — каналы разные, личность на устройстве' },
    { id: 's20', номер: '·20', имя: 'ФОНЕТИКА', файл: 'СИНГУЛЯР_20_ФОНЕТИКА.html',
      класс: 'К2', фасет: 'aura', авто: true,
      модальности: ['слово', 'звук', 'голос'],
      кратко: 'романизация любой письменности, слог-чипы, TTS медленно' },
    { id: 's21', номер: '·21', имя: 'ОБЩЕНИЕ', файл: 'СИНГУЛЯР_21_ОБЩЕНИЕ.html',
      класс: 'К2', фасет: 'aura', авто: true,
      модальности: ['слово', 'голос', 'такт', 'жест'],
      кратко: 'смысл один — представления разные: текст/Брайль/речь/вибро' },
    { id: 's22', номер: '·22', имя: 'СВЯЗЬ', файл: 'СИНГУЛЯР_22_СВЯЗЬ.html',
      класс: 'К2', фасет: 'mesh', авто: true,
      модальности: ['слово', 'голос', 'звук', 'образ'],
      кратко: 'девять каналов связи, fallback вниз, мост ·21⇄·22' },
    { id: 's23', номер: '·23', имя: 'КРУГ', файл: 'СИНГУЛЯР_23_КРУГ.html',
      класс: 'К2', фасет: 'mesh', авто: true,
      модальности: ['слово', 'голос', 'звук', 'образ'],
      кратко: 'живой круг людей: румы, чаты, звонки P2P' },
    { id: 's24', номер: '·24', имя: 'ПОЧТА', файл: 'СИНГУЛЯР_24_ПОЧТА.html',
      класс: 'К2', фасет: 'vault', авто: true,
      модальности: ['слово', 'образ'],
      кратко: 'ящики имя@singulyar, письма P2P, подпись ECDSA' },
    { id: 's25', номер: '·25', имя: 'КОШЕЛЁК', файл: 'СИНГУЛЯР_25_КОШЕЛЁК.html',
      класс: 'К2', фасет: 'vault', авто: true,
      модальности: ['слово', 'такт', 'жест'],
      кратко: 'тихие переводы, append-only журнал, бумажки-токены' },
    { id: 's26', номер: '·26', имя: 'ЛИНИЯ', файл: 'СИНГУЛЯР_26_ЛИНИЯ.html',
      класс: 'К2', фасет: 'vault', авто: true,
      модальности: ['слово', 'жест'],
      кратко: 'свои номера 00–15, SMS P2P без операторов, свои OTP' },
    { id: 's27', номер: '·27', имя: 'ФУНДАМЕНТ', файл: 'СИНГУЛЯР_27_ФУНДАМЕНТ.html',
      класс: 'К2', фасет: 'brain', авто: true,
      модальности: ['образ', 'слово'],
      кратко: 'визуальный канон v3.0 «Ambient OS» — 27 ЛВЛ, основание дома' },
    { id: 's28', номер: '·28', имя: 'УЗЕЛ', файл: 'СИНГУЛЯР_28_УЗЕЛ.html',
      класс: 'К2', фасет: 'brain', авто: true,
      модальности: ['слово', 'образ', 'такт', 'жест'],
      кратко: 'СУВЕРЕННЫЙ УЗЕЛ: Ŝ = 1_H + λ(I⊗I†) — философия автономии вживую' }
  ];

  /* ── 3. API ─────────────────────────────────────────────────────────── */
  var SNG = {
    версия: '1.3.0',
    формула: 'Ŝ = 1_H + λ(I⊗I†)',
    инвариант: '⟨M(t), Σ(t)⟩ ≡ 0',
    модальности: МОДАЛЬНОСТИ,
    модуль: МОДУЛИ,

    по(модальность) {
      return МОДУЛИ.filter(function (m) { return m.модальности.indexOf(модальность) !== -1; });
    },
    поId(ид) {
      for (var i = 0; i < МОДУЛИ.length; i++) if (МОДУЛИ[i].id === ид) return МОДУЛИ[i];
      return null;
    },
    пофайл(имя) {
      var н = decodeURIComponent(имя || '').split('/').pop().toLowerCase();
      /* корень сайта — это хаб index.html (сервер отдаёт / без имени файла) */
      if (!н) н = 'index.html';
      for (var i = 0; i < МОДУЛИ.length; i++)
        if (МОДУЛИ[i].файл.toLowerCase() === н) return МОДУЛИ[i];
      return null;
    },
    текущий() { return SNG.пофайл(location.pathname); },

    /* модальность → где человек её принимает (честная карта каналов) */
    карта() {
      return МОДАЛЬНОСТИ.map(function (mod) {
        return { модальность: mod, модули: SNG.по(mod.id) };
      });
    }
  };
  window.SNG = SNG;

  /* ── 4. ЖИВАЯ ПРИЗМА — смысл один, модальности разные (canvas) ─────── */
  /* Вход: один белый луч Ψ. Внутри: кристалл-проектор I⊗I†.
     Выход: шесть лучей — по числу модальностей. 0 картинок, всё рисуется. */
  SNG.призма = function (канвас, опции) {
    опции = опции || {};
    var ctx = канвас.getContext('2d');
    if (!ctx) return null;
    var ДПР = Math.min(2, window.devicePixelRatio || 1);
    var w = 0, h = 0;
    var движение = true;
    try { движение = !window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

    function размер() {
      var r = канвас.getBoundingClientRect();
      w = Math.max(10, r.width); h = Math.max(10, r.height);
      канвас.width = Math.round(w * ДПР); канвас.height = Math.round(h * ДПР);
      ctx.setTransform(ДПР, 0, 0, ДПР, 0, 0);
    }
    размер();
    if ('ResizeObserver' in window) new ResizeObserver(размер).observe(канвас);
    else window.addEventListener('resize', размер);

    var t0 = (опции.фаза || 0);
    function луч(x0, y0, x1, y1, цвет, ширина, альфа) {
      ctx.globalAlpha = альфа;
      ctx.strokeStyle = цвет; ctx.lineWidth = ширина; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    function кадр(ts) {
      var t = движение ? (ts / 1000 + t0) : t0;
      ctx.clearRect(0, 0, w, h);
      var cx = w * 0.56, cy = h / 2;             /* центр — узел */
      var R = Math.min(w * 0.30, h * 0.42);       /* радиус веера */

      /* входящий луч Ψ — слева, белый */
      var пульс = движение ? (0.75 + 0.25 * Math.sin(t * 1.7)) : 0.9;
      луч(0, cy, cx - R * 0.62, cy, 'rgba(240,240,240,' + (0.5 * пульс) + ')', 2.2, 1);
      луч(0, cy, cx - R * 0.62, cy, 'rgba(240,240,240,' + (0.16 * пульс) + ')', 7, 1);

      /* кристалл-проектор — шестиугольная призма */
      var r = R * 0.34;
      ctx.save();
      ctx.translate(cx, cy);
      var вращ = движение ? t * 0.12 : 0;
      ctx.rotate(вращ);
      ctx.beginPath();
      for (var i = 0; i < 6; i++) {
        var a = Math.PI / 3 * i;
        var x = r * Math.cos(a), y = r * Math.sin(a);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(212,175,55,.10)';
      ctx.strokeStyle = 'rgba(212,175,55,.85)'; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.beginPath();
      for (var j = 0; j < 6; j++) {
        var a2 = Math.PI / 3 * j + Math.PI / 6;
        var x2 = r * 0.62 * Math.cos(a2), y2 = r * 0.62 * Math.sin(a2);
        if (j === 0) ctx.moveTo(x2, y2); else ctx.lineTo(x2, y2);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(240,240,248,.5)'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.restore();

      /* ядро — человек */
      var п = движение ? (0.82 + 0.18 * Math.sin(t * 2.3)) : 1;
      var grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.75);
      grd.addColorStop(0, 'rgba(255,244,214,' + п + ')');
      grd.addColorStop(0.45, 'rgba(212,175,55,' + (0.8 * п) + ')');
      grd.addColorStop(1, 'rgba(212,175,55,0)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.75, 0, Math.PI * 2); ctx.fill();

      /* шесть лучей-модальностей веером вправо */
      var п1 = МОДАЛЬНОСТИ.length;
      for (var k = 0; k < п1; k++) {
        var мод = МОДАЛЬНОСТИ[k];
        var угол = (-п1 + 1) / 2 + k;                    /* −2.5..+2.5 */
        var радианы = угол * (Math.PI / 5.2);
        var x1 = cx + Math.cos(радианы) * R;
        var y1 = cy + Math.sin(радианы) * R * 1.05;
        var волна = движение ? (0.55 + 0.45 * Math.sin(t * 1.4 + k * 1.05)) : 0.8;
        луч(cx + r * 0.5 * Math.cos(радианы), cy + r * 0.5 * Math.sin(радианы),
            x1, y1, мод.цвет, 1.6, 0.28 + 0.5 * волна);
        луч(cx + r * 0.5 * Math.cos(радианы), cy + r * 0.5 * Math.sin(радианы),
            x1, y1, мод.цвет, 5, 0.08 + 0.14 * волна);
        /* глиф на конце луча */
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = мод.цвет;
        ctx.font = '600 ' + Math.max(13, R * 0.13) + 'px system-ui,sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(мод.глиф, x1 + Math.cos(радианы) * 12, y1 + Math.sin(радианы) * 12);
        ctx.globalAlpha = 1;
      }

      /* частицы смысла бегут по лучам */
      if (движение) {
        for (var m = 0; m < п1; m++) {
          var мм = МОДАЛЬНОСТИ[m];
          var рад2 = (-п1 + 1) / 2 + m * 1 * (Math.PI / 5.2);
          рад2 = ((-п1 + 1) / 2 + m) * (Math.PI / 5.2);
          var ф = (t * 0.35 + m / п1) % 1;
          var px = cx + Math.cos(рад2) * R * ф * 1.02;
          var py = cy + Math.sin(рад2) * R * 1.05 * ф * 1.02;
          ctx.globalAlpha = 0.85;
          ctx.fillStyle = мм.цвет;
          ctx.beginPath(); ctx.arc(px, py, 1.6, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
      if (движение) requestAnimationFrame(кадр);
    }
    requestAnimationFrame(кадр);
    return { стоп: function () { движение = false; }, перерисовать: function () { размер(); } };
  };


  /* ── 4b. КРИСТАЛЛ-ШАР — титульный объект канона (canvas) ────────────── */
  /* Незыблемый визуальный канон SINGULYAR · такт v1.33.0 «ХОЗЯИН=ГОСТЬ»:
     живой эталон — шипастый хрустальный шар (стекло/серебро), золотое лучистое
     ядро со вспышкой, два золотых кольца, россыпь бликов. Рисуется кодом по
     векторному макету «КАК В КОРЕЛ ДРО» (МАКЕТ_КРИСТАЛЛ_v133.svg) — 0 картинок.
     Comfort Guardrails: 2 кольца + ядро + 3 яруса шипов — не больше. */
  SNG.кристалл = function (канвас, опции) {
    опции = опции || {};
    var ctx = канвас.getContext('2d');
    if (!ctx) return null;
    var ДПР = Math.min(2, window.devicePixelRatio || 1);
    var w = 0, h = 0;
    var движение = true;
    try { движение = !window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    var фаза = (опции.фаза || 0);

    function размер() {
      var r = канвас.getBoundingClientRect();
      w = Math.max(10, r.width); h = Math.max(10, r.height);
      канвас.width = Math.round(w * ДПР); канвас.height = Math.round(h * ДПР);
      ctx.setTransform(ДПР, 0, 0, ДПР, 0, 0);
      if (!движение) кадр(фаза * 1000, true);
    }
    размер();
    if ('ResizeObserver' in window) new ResizeObserver(размер).observe(канвас);
    else window.addEventListener('resize', размер);

    /* детерминированный генератор (тот же seed, что в векторном макете) */
    var сем = 2718281828;
    function ранд() { сем = (сем * 1103515245 + 12345) & 0x7fffffff; return сем / 0x7fffffff; }
    function интер(a, b) { return a + (b - a) * ранд(); }

    /* шипы: 3 яруса [кол-во, длина-мин, длина-макс, ширина-мин, ширина-макс] */
    var ШИПЫ = [];
    (function () {
      var ярусы = [[80, 0.42, 0.72, 0.09, 0.13], [56, 0.28, 0.48, 0.07, 0.11], [34, 0.16, 0.28, 0.05, 0.08]];
      ярусы.forEach(function (я) {
        for (var i = 0; i < я[0]; i++) {
          ШИПЫ.push({
            a: Math.PI * 2 * (i / я[0]) + интер(-0.06, 0.06),
            len: интер(я[1], я[2]), wd: интер(я[3], я[4]),
            аль: я[0] === 80 ? 1 : (я[0] === 56 ? 0.9 : 0.8),
            зол: ранд() < 0.12
          });
        }
      });
    })();

    /* блики: россыпь точек-стекляшек (мерцают) */
    var БЛИКИ = [];
    (function () {
      for (var i = 0; i < 46; i++) {
        БЛИКИ.push({
          a: ранд() * Math.PI * 2, r: 0.06 + Math.sqrt(ранд()) * 0.9,
          s: интер(0.7, 1.9), зол: ранд() < 0.4, фаза: ранд() * Math.PI * 2, скор: интер(0.5, 1.4)
        });
      }
    })();

    /* фацеты: три кольца вершин, триангуляция между ними */
    var ФАЦЕТЫ = (function () {
      var кольца = [];
      [[6, 0.15, 0.30], [8, 0.55, 0.52], [12, 0.90, 0.74]].forEach(function (с) {
        var pts = [];
        for (var i = 0; i < с[0]; i++) pts.push([с[1] + Math.PI * 2 * i / с[0], с[2]]);
        кольца.push(pts);
      });
      var тр = [];
      for (var k = 0; k < кольца.length - 1; k++) {
        var A = кольца[k], B = кольца[k + 1];
        for (var i = 0; i < Math.max(A.length, B.length); i++) {
          var p1 = A[i % A.length], p2 = A[(i + 1) % A.length];
          var j1 = Math.floor(i * B.length / A.length) % B.length, j2 = (j1 + 1) % B.length;
          тр.push(ранд() < 0.5 ? [p1, p2, B[j1]] : [p1, B[j1], B[j2]]);
        }
      }
      return { кольца: кольца, тр: тр };
    })();

    /* кольца канона: [наклон, rx, ry, толщина] */
    var КОЛЬЦА = [[-0.16, 1.20, 0.300, 2.6], [0.12, 1.32, 0.330, 1.8]];

    function кадр(ts, одиночный) {
      var t = движение ? (ts / 1000 + фаза) : фаза;
      if (одиночный) t = фаза;
      ctx.clearRect(0, 0, w, h);
      var cx = w / 2, cy = h / 2;
      var R = Math.min(w, h) * 0.34;

      /* хало ядра */
      var пульс = движение ? (0.86 + 0.14 * Math.sin(t * 1.5)) : 0.95;
      var halo = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 0.72);
      halo.addColorStop(0, 'rgba(212,175,55,' + (0.30 * пульс) + ')');
      halo.addColorStop(1, 'rgba(212,175,55,0)');
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.72, 0, Math.PI * 2); ctx.fill();

      /* задние дуги колец */
      КОЛЬЦА.forEach(function (к) {
        ctx.save();
        ctx.translate(cx, cy); ctx.rotate(к[0]);
        ctx.beginPath(); ctx.ellipse(0, 0, R * к[1], R * к[2], 0, Math.PI, Math.PI * 2);
        ctx.strokeStyle = 'rgba(212,175,55,.30)'; ctx.lineWidth = к[3]; ctx.stroke();
        ctx.restore();
      });

      /* тело шара — тёмное стекло */
      var стек = ctx.createRadialGradient(cx - R * 0.38, cy - R * 0.32, R * 0.1, cx, cy, R);
      стек.addColorStop(0, 'rgba(238,242,250,.26)');
      стек.addColorStop(0.55, 'rgba(34,40,54,.93)');
      стек.addColorStop(1, 'rgba(10,12,18,.98)');
      ctx.fillStyle = стек;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(240,240,248,.38)'; ctx.lineWidth = 1.1; ctx.stroke();

      /* фацеты — стекло с тонкой светлой рамкой */
      var i, j, тр;
      for (i = 0; i < ФАЦЕТЫ.тр.length; i++) {
        тр = ФАЦЕТЫ.тр[i];
        ctx.beginPath();
        for (j = 0; j < 3; j++) {
          var x = cx + Math.cos(тр[j][0]) * R * тр[j][1];
          var y = cy + Math.sin(тр[j][0]) * R * тр[j][1];
          j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(224,230,242,' + (0.05 + 0.06 * (i % 3)) + ')';
        ctx.fill();
        ctx.strokeStyle = 'rgba(240,240,248,.22)'; ctx.lineWidth = 0.7; ctx.stroke();
      }
      /* внешняя кайма фацетов */
      var посл = ФАЦЕТЫ.кольца[ФАЦЕТЫ.кольца.length - 1];
      for (i = 0; i < посл.length; i++) {
        var a1 = посл[i][0], a2 = посл[(i + 1) % посл.length][0];
        if (a2 < a1) a2 += Math.PI * 2;
        var am = (a1 + a2) / 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a1) * R * 0.74, cy + Math.sin(a1) * R * 0.74);
        ctx.lineTo(cx + Math.cos(a2) * R * 0.985, cy + Math.sin(a2) * R * 0.985);
        ctx.lineTo(cx + Math.cos(am) * R * 0.94, cy + Math.sin(am) * R * 0.94);
        ctx.lineTo(cx + Math.cos(a1) * R * 0.985, cy + Math.sin(a1) * R * 0.985);
        ctx.closePath();
        ctx.fillStyle = 'rgba(236,240,248,.07)'; ctx.fill();
        ctx.strokeStyle = 'rgba(240,240,248,.18)'; ctx.lineWidth = 0.6; ctx.stroke();
      }

      /* блики мерцают */
      for (i = 0; i < БЛИКИ.length; i++) {
        var б = БЛИКИ[i];
        var мерк = движение ? (0.45 + 0.55 * Math.sin(t * б.скор + б.фаза)) : 0.7;
        ctx.globalAlpha = 0.25 + 0.55 * мерк;
        ctx.fillStyle = б.зол ? '#F0D78C' : '#F0F0F8';
        ctx.beginPath();
        ctx.arc(cx + Math.cos(б.a) * R * б.r, cy + Math.sin(б.a) * R * б.r, б.s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      /* шипы — медленное вращение двух внешних ярусов */
      var вращ = движение ? (t * 0.03) : 0;
      for (i = 0; i < ШИПЫ.length; i++) {
        var ш = ШИПЫ[i];
        var a = ш.a + вращ * (ш.аль > 0.9 ? 1 : 0.55);
        var баз = R * 0.985, вер = баз + R * ш.len, пол = ш.wd / 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a - пол) * баз, cy + Math.sin(a - пол) * баз);
        ctx.lineTo(cx + Math.cos(a) * вер, cy + Math.sin(a) * вер);
        ctx.lineTo(cx + Math.cos(a + пол) * баз, cy + Math.sin(a + пол) * баз);
        ctx.closePath();
        ctx.fillStyle = 'rgba(236,240,248,' + (0.13 * ш.аль) + ')';
        ctx.fill();
        ctx.strokeStyle = ш.зол ? 'rgba(240,215,140,' + (0.5 * ш.аль) + ')' : 'rgba(240,240,248,' + (0.3 * ш.аль) + ')';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      /* золотое ядро + вспышка */
      var ядр = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.3);
      ядр.addColorStop(0, 'rgba(255,246,220,' + пульс + ')');
      ядр.addColorStop(0.4, 'rgba(240,215,140,' + (0.9 * пульс) + ')');
      ядр.addColorStop(0.75, 'rgba(212,175,55,' + (0.55 * пульс) + ')');
      ядр.addColorStop(1, 'rgba(212,175,55,0)');
      ctx.fillStyle = ядр;
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.3, 0, Math.PI * 2); ctx.fill();
      for (i = 0; i < 4; i++) {
        var уг = i * Math.PI / 2 + (движение ? -t * 0.02 : 0);
        var длина = R * (i % 2 ? 0.5 : 0.8);
        ctx.save();
        ctx.translate(cx, cy); ctx.rotate(уг);
        ctx.beginPath();
        ctx.moveTo(-длина, 0); ctx.lineTo(0, -R * 0.035); ctx.lineTo(длина, 0); ctx.lineTo(0, R * 0.035);
        ctx.closePath();
        ctx.fillStyle = i % 2 ? 'rgba(255,233,176,.40)' : 'rgba(255,233,176,.62)';
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = '#FFE9B0';
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.085, 0, Math.PI * 2); ctx.fill();

      /* передние дуги колец + бегущие искры */
      КОЛЬЦА.forEach(function (к, oi) {
        ctx.save();
        ctx.translate(cx, cy); ctx.rotate(к[0]);
        ctx.beginPath(); ctx.ellipse(0, 0, R * к[1], R * к[2], 0, 0, Math.PI);
        ctx.strokeStyle = 'rgba(212,175,55,.95)'; ctx.lineWidth = к[3]; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(0, 0, R * к[1], R * к[2] * 0.97, 0, Math.PI * 0.06, Math.PI * 0.94);
        ctx.strokeStyle = 'rgba(255,244,214,.4)'; ctx.lineWidth = 0.9; ctx.stroke();
        /* искра на кольце */
        var фа = t * (0.30 + oi * 0.09) + oi * 2.1;
        var sx = Math.cos(фа) * R * к[1], sy = Math.sin(фа) * R * к[2];
        if (Math.sin(фа) >= 0) {
          ctx.fillStyle = '#F0D78C';
          ctx.beginPath(); ctx.arc(sx, sy, 2.1, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 0.25;
          ctx.beginPath(); ctx.arc(sx, sy, 4.6, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
        }
        ctx.restore();
      });

      if (движение && !одиночный) requestAnimationFrame(кадр);
    }
    if (движение) requestAnimationFrame(кадр);
    else кадр(фаза * 1000, true);
    return { стоп: function () { движение = false; }, перерисовать: function () { размер(); } };
  };

  /* ── 5. МОДУЛЬНАЯ БИРКА — каждая страница знает, кто она ───────────── */
  var CSS_БИРКИ = [
    '.sng-strip{margin:0;padding:7px 14px;display:flex;flex-wrap:wrap;align-items:center;gap:8px;',
    'background:rgba(18,20,24,.66);border-bottom:1px solid rgba(240,240,248,.12);',
    'font:12.5px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#9CA3AF;',
    'position:relative;z-index:30;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}',
    '.sng-strip b{color:#F0D78C;font-weight:700;letter-spacing:.4px;white-space:nowrap}',
    '.sng-strip .sng-mod{display:inline-flex;align-items:center;gap:4px;padding:2px 9px;border-radius:999px;',
    'font-size:11px;font-weight:600;letter-spacing:.4px;border:1px solid;white-space:nowrap}',
    '.sng-strip .sng-map{margin-left:auto;color:#C8CCD2;text-decoration:none;border-bottom:1px dashed rgba(200,204,210,.4);white-space:nowrap}',
    '.sng-strip .sng-map:hover{color:#F0D78C;border-bottom-color:#F0D78C}',
    '.sng-strip .sng-f{font-size:11px;color:#6B7178;white-space:nowrap}',
    '@media (max-width:640px){.sng-strip .sng-map{margin-left:0}.sng-strip{font-size:11.5px}}',
    '@media (prefers-reduced-motion: reduce){.sng-strip *{transition:none!important;animation:none!important}}'
  ].join('');

  function chip(мод) {
    var s = document.createElement('span');
    s.className = 'sng-mod';
    s.setAttribute('data-sng-mod', мод.id);
    s.style.color = мод.цвет;
    s.style.borderColor = мод.цвет;
    s.style.background = 'rgba(240,240,248,.05)';
    s.textContent = мод.глиф + ' ' + мод.имя;
    return s;
  }

  function бирка() {
    try {
      if (document.querySelector('.sng-strip')) return;
      /* лицо дома = ТОЛЬКО макет (закон такта v1.33.0): бирка живёт в комнатах,
         на хабе её нет — там дверью служит сам кристалл */
      if (document.getElementById('crystalButton')) return;
      var модуль = SNG.текущий();
      if (!модуль) return;
      var полоса = document.createElement('div');
      полоса.className = 'sng-strip';
      полоса.setAttribute('role', 'region');
      полоса.setAttribute('aria-label', 'Модуль вселенной и его модальности');

      var кто = document.createElement('b');
      кто.textContent = '⬢ МОДУЛЬ ' + модуль.номер + ' ' + модуль.имя;
      полоса.appendChild(кто);

      модуль.модальности.forEach(function (ид) {
        for (var i = 0; i < МОДАЛЬНОСТИ.length; i++)
          if (МОДАЛЬНОСТИ[i].id === ид) { полоса.appendChild(chip(МОДАЛЬНОСТИ[i])); break; }
      });

      var факт = document.createElement('span');
      факт.className = 'sng-f';
      факт.textContent = модуль.авто ? 'автономный файл' : 'часть ядра';
      полоса.appendChild(факт);

      var карта = document.createElement('a');
      карта.className = 'sng-map';
      карта.href = 'index.html#модули';
      карта.textContent = 'карта модулей →';
      полоса.appendChild(карта);

      var шапка = document.querySelector('header');
      if (шапка && шапка.parentNode) {
        /* бирка встаёт сразу после шапки, не ломая чужие раскладки */
        шапка.parentNode.insertBefore(полоса, шапка.nextSibling);
      } else {
        /* v1.1.1: хаб ·00 — титул без шапки (канон ФУНДАМЕНТА): бирка живёт
           внизу, перед футером — идентификация хаба не на лобном месте */
        var подвал = document.querySelector('main footer, footer');
        var осн = document.querySelector('main') || document.body;
        if (подвал && подвал.parentNode) подвал.parentNode.insertBefore(полоса, подвал);
        else осн.appendChild(полоса);
      }
    } catch (e) { /* бирка не имеет права ломать комнату */ }
  }

  function стили() {
    try {
      if (document.getElementById('sng-strip-style')) return;
      var s = document.createElement('style');
      s.id = 'sng-strip-style';
      s.textContent = CSS_БИРКИ;
      document.head.appendChild(s);
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { стили(); бирка(); });
  } else { стили(); бирка(); }

  /* ── 6. ОСКОЛКИ — кристалл рассыпается на двери дома (такт v1.32.0) ── */
  /* Слово владельца: «Я ТЕБЕ КАЖДЫЙ ОБЬЕКТ ДАЛ!!!» — все объекты SNG в одной
     картине мира: ядро (смысл) → орбиты (кольца дома) → осколки (17 дверей,
     у каждого фасет и модальности). И закон человека: «КУДА ЧЕЛОВЕК ПОСТАВИЛ
     ТАМ И СТОИТ — ОН РЕШАЕТ»: осколок можно перетащить, позиция запоминается.
     0 картинок: осколки — настоящий DOM (TZ: реальные контролы, не рисунок). */
  var ОСКОЛКИ_КЛЮЧ = 'singulyar-осколки-v1';
  /* рассеяние осколков — как на канонном зерне владельца (canonical-crystal):
     малые кристаллы органично вокруг ядра, без строгих колец.
     Золотой угол 2.399963 рад гарантирует: соседи не слипаются никогда. */
  var ЗОЛОТОЙ_УГОЛ = 2.399963;
  var ФАСЕТ_ИМЕНИ = { atlas: 'ATLAS', flow: 'FLOW', resonance: 'RESONANCE',
    aura: 'AURA', mesh: 'MESH', vault: 'VAULT', brain: 'МОЗГ' };

  function осколкиСклад() {
    try {
      var сырой = localStorage.getItem(ОСКОЛКИ_КЛЮЧ);
      if (!сырой) return { состояние: 'собран', позиции: {} };
      var в = JSON.parse(сырой);
      if (!в || typeof в !== 'object') return { состояние: 'собран', позиции: {} };
      return { состояние: в.состояние === 'рассыпан' ? 'рассыпан' : 'собран',
               позиции: (в.позиции && typeof в.позиции === 'object') ? в.позиции : {} };
    } catch (e) { return { состояние: 'собран', позиции: {} }; }
  }
  function осколкиПомнить(склад) {
    try { localStorage.setItem(ОСКОЛКИ_КЛЮЧ, JSON.stringify(склад)); } catch (e) {}
  }

  /* стили осколков — стекло канона: тонкая светлая кромка, золото — единственный акцент */
  var CSS_ОСКОЛКОВ = [
    '.осколки-слой{position:absolute;inset:0;pointer-events:none;z-index:3}',
    '.осколок{position:absolute;width:28px;height:28px;margin:-14px 0 0 -14px;pointer-events:auto;z-index:1;',
      'display:block;appearance:none;border:0;padding:0;background:none;cursor:grab;',
      'touch-action:none;-webkit-tap-highlight-color:transparent;text-decoration:none}',
    '.осколок:active{cursor:grabbing;z-index:70}',
    '.осколок:hover,.осколок:focus-visible{z-index:60}',
    '.осколок .остриё{position:absolute;inset:0;clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);',
      'transform:rotate(var(--поворот,0deg));',
      'background:linear-gradient(160deg,rgba(240,240,248,.26),rgba(240,240,248,.06) 52%,rgba(212,175,55,.20));',
      'transition:transform var(--dur-fast) var(--ease-spring),filter var(--dur-fast)}',
    '.осколок .остриё::after{content:"";position:absolute;inset:5px;clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);',
      'background:linear-gradient(200deg,rgba(10,10,12,.10),rgba(240,240,248,.16))}',
    '.осколок .номер{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;',
      'font:600 8.5px/1 var(--mono,Cascadia Mono,ui-monospace,Consolas,monospace);',
      'color:rgba(240,240,248,.78);letter-spacing:.04em;pointer-events:none;text-shadow:0 1px 2px rgba(0,0,0,.8)}',
    '.осколок[data-класс="К1"] .остриё{background:linear-gradient(160deg,rgba(212,175,55,.55),rgba(245,166,35,.16) 55%,rgba(212,175,55,.42));',
      'filter:drop-shadow(0 0 7px rgba(212,175,55,.38))}',
    '.осколок[data-класс="К1"] .номер{color:#FFD98A}',
    '.осколок:hover .остриё,.осколок:focus-visible .остриё{transform:scale(1.22) rotate(var(--поворот,0deg));',
      'filter:drop-shadow(0 0 10px rgba(212,175,55,.55))}',
    '.осколок:focus-visible{outline:none}',
    '.осколок:focus-visible .остриё{outline:2px solid #F5D58F;outline-offset:4px}',
    /* бирка осколка — синтез объектов: номер · имя · фасет · модальности */
    '.осколок .бирка{position:absolute;bottom:calc(100% + 10px);left:50%;transform:translateX(-50%) translateY(4px);',
      'min-width:150px;max-width:230px;padding:8px 11px;pointer-events:none;opacity:0;',
      'background:rgba(10,12,16,.90);border:1px solid rgba(212,175,55,.38);border-radius:10px;',
      'box-shadow:0 12px 30px rgba(0,0,0,.55),inset 0 1px 0 rgba(240,240,248,.08);',
      'backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);',
      'transition:opacity var(--dur-fast) ease,transform var(--dur-fast) var(--ease-spring);text-align:left}',
    '.осколок:hover .бирка,.осколок:focus-visible .бирка{opacity:1;transform:translateX(-50%) translateY(0)}',
    '.осколок .бирка b{display:block;font:700 11.5px/1.3 var(--mono,Cascadia Mono,ui-monospace,Consolas,monospace);',
      'color:#F0D78C;letter-spacing:.06em;white-space:nowrap}',
    '.осколок .бирка i{display:block;font-style:normal;font:11px/1.4 var(--mono,Cascadia Mono,ui-monospace,Consolas,monospace);',
      'color:#9CA3AF;margin-top:3px}',
    '.осколок .бирка .фасет{display:inline-block;margin-top:5px;font:600 9px/1 var(--mono,Cascadia Mono,ui-monospace,Consolas,monospace);',
      'letter-spacing:.14em;color:#C8B896;border:1px solid rgba(200,184,150,.45);border-radius:999px;padding:2.5px 7px}',
    '.осколок .бирка .моды{display:inline-block;margin-left:5px;font:12px/1 var(--mono,Cascadia Mono,ui-monospace,Consolas,monospace);',
      'color:#C8CCD2;letter-spacing:.18em;vertical-align:middle}',
    '@media (max-width:640px){.осколок{width:24px;height:24px;margin:-12px 0 0 -12px}',
      '.осколок .бирка{display:none}}',
    '@media (prefers-reduced-motion: reduce){.осколок .остриё,.осколок .бирка{transition:none!important}}'
  ].join('\n');

  function осколкиСтили() {
    try {
      if (document.getElementById('sng-осколки-стиль')) return;
      var s = document.createElement('style');
      s.id = 'sng-осколки-стиль';
      s.textContent = CSS_ОСКОЛКОВ;
      document.head.appendChild(s);
    } catch (e) {}
  }

  /* рассеяние по золотому углу: точка вокруг ядра (в px от центра кристалла) */
  function точкаРассеяния(i, R) {
    var фи = i * ЗОЛОТОЙ_УГОЛ + 0.35;
    var ρ = R * (1.04 + 0.30 * ((i * 0.618034) % 1));   /* пояс 1.04–1.34 R */
    return { x: Math.cos(фи) * ρ, y: Math.sin(фи) * ρ * 0.62, поворот: Math.round((фи * 57.2958) % 60) };
  }

  /* публичный конструктор: SNG.осколки({ кнопка, слой, канвас, статус }) */
  SNG.осколки = function (опции) {
    опции = опции || {};
    var кнопка = опции.кнопка, слой = опции.слой;
    if (!кнопка || !слой || слой.dataset.осколки) return null;
    слой.dataset.осколки = '1';
    осколкиСтили();

    var склад = осколкиСклад();
    var карта = {};                       /* id → { a, узел, кольцо, индекс } */
    var сокращено = false;
    try { сокращено = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

    /* глифы модальностей — для бирки (синтез объектов в одном месте) */
    var глиф = {};
    МОДАЛЬНОСТИ.forEach(function (м) { глиф[м.id] = м.глиф; });

    /* строим 17 осколков-дверей (нулевой innerHTML — закон репозитория) */
    var ПОРЯДОК = ['s01', 's02r', 's02f', 's15', 's16', 's17', 's18', 's19', 's20',
                   's21', 's22', 's23', 's24', 's25', 's26', 's27', 's28'];
    ПОРЯДОК.forEach(function (ид, i) {
      var м = SNG.поId(ид);
      if (!м || карта[ид]) return;
      var a = document.createElement('a');
      a.className = 'осколок';
      a.href = м.файл;
      a.setAttribute('data-класс', м.класс);
      a.setAttribute('aria-label', м.номер + ' ' + м.имя + ' — ' + (ФАСЕТ_ИМЕНИ[м.фасет] || '') +
        '. Дверь дома. Перетащите — встанет туда, где оставите.');
      a.dataset.id = ид;

        var остриё = document.createElement('span');
        остриё.className = 'остриё';
        остриё.setAttribute('aria-hidden', 'true');
        var номер = document.createElement('span');
        номер.className = 'номер';
        номер.setAttribute('aria-hidden', 'true');
        номер.textContent = м.номер;

        var бирка = document.createElement('span');
        бирка.className = 'бирка';
        бирка.setAttribute('aria-hidden', 'true');
        var бИмя = document.createElement('b'); бИмя.textContent = м.номер + ' ' + м.имя;
        var бКратко = document.createElement('i'); бКратко.textContent = м.кратко;
        var бФасет = document.createElement('span'); бФасет.className = 'фасет';
        бФасет.textContent = ФАСЕТ_ИМЕНИ[м.фасет] || 'ГРАНЬ';
        var бМоды = document.createElement('span'); бМоды.className = 'моды';
        бМоды.textContent = м.модальности.map(function (x) { return глиф[x] || ''; }).join('');
        бирка.appendChild(бИмя); бирка.appendChild(бКратко);
        бирка.appendChild(бФасет); бирка.appendChild(бМоды);

        a.appendChild(остриё); a.appendChild(номер); a.appendChild(бирка);
        a.style.setProperty('--поворот', точкаРассеяния(i, 100).поворот + 'deg');
        слой.appendChild(a);
        карта[ид] = { узел: a, порядок: i };
    });

    function состояние() { return склад.состояние; }

    /* орбитальные координаты в процентах секции титула — осколки сидят ровно
       на нарисованных кольцах; перетащенные — где оставил человек */
    function расставить(анимация) {
      var зона = слой.getBoundingClientRect();
      var кр = (опции.канвас || кнопка).getBoundingClientRect();
      var цx = кр.left + кр.width / 2 - зона.left;
      var цy = кр.top + кр.height / 2 - зона.top;
      var R = Math.min(кр.width, кр.height) * 0.36;
      Object.keys(карта).forEach(function (ид) {
        var о = карта[ид];
        var сохр = склад.позиции[ид];
        var x, y;
        if (сохр && isFinite(сохр[0]) && isFinite(сохр[1])) {
          x = зона.width * сохр[0]; y = зона.height * сохр[1];
        } else {
          var п = точкаРассеяния(о.порядок, R);
          x = цx + п.x; y = цy + п.y;
        }
        /* кламп в границы секции — осколок не уходит с лица */
        x = Math.min(Math.max(20, x), Math.max(20, зона.width - 20));
        y = Math.min(Math.max(20, y), Math.max(20, зона.height - 20));
        о.узел.style.left = x + 'px';
        о.узел.style.top = y + 'px';
        if (анимация && !сокращено) {
          о.узел.style.transition = 'none';
          о.узел.style.transform = 'translate(0,0) scale(.2) rotate(-90deg)';
          о.узел.style.opacity = '0';
          /* принудительный reflow — затем полёт на орбиту со сдвигом фазы */
          void о.узел.offsetWidth;
          о.узел.style.transition = 'transform .55s cubic-bezier(.16,1,.3,1) ' + (о.порядок * 26) + 'ms, opacity .4s ease ' + (о.порядок * 26) + 'ms';
          о.узел.style.transform = 'translate(0,0) scale(1) rotate(0deg)';
          о.узел.style.opacity = '1';
          setTimeout(function () { о.узел.style.transition = ''; }, 700 + о.порядок * 26);
        }
      });
    }

    function очиститьПолёт() {
      Object.keys(карта).forEach(function (ид) {
        карта[ид].узел.style.transition = '';
        карта[ид].узел.style.transform = '';
        карта[ид].узел.style.opacity = '';
      });
    }

    function рассыпать() {
      склад.состояние = 'рассыпан';
      осколкиПомнить(склад);
      слой.hidden = false;
      расставить(true);
      кнопка.classList.add('рассыпан');
      кнопка.setAttribute('aria-expanded', 'true');
      кнопка.setAttribute('aria-label', 'Кристалл SINGULYAR — собрать осколки обратно');
      if (опции.статус && опции.статус.textContent != null)
        опции.статус.textContent = 'Кристалл рассыпался на 17 дверей. Перетащите осколок — он останется там, где вы его оставите. Касание ядра — собрать.';
    }

    function собрать() {
      склад.состояние = 'собран';
      осколкиПомнить(склад);
      кнопка.classList.remove('рассыпан');
      кнопка.setAttribute('aria-expanded', 'false');
      кнопка.setAttribute('aria-label', 'Кристалл SINGULYAR — рассыпать на двери дома');
      Object.keys(карта).forEach(function (ид) {
        var о = карта[ид];
        /* позиции человека НЕ стираем: «куда поставил — там и стоит»;
           вернуть на орбиты можно только явным «Сбросить осколки» */
        if (сокращено) { о.узел.style.opacity = '0'; return; }
        о.узел.style.transition = 'transform .45s cubic-bezier(.16,1,.3,1), opacity .38s ease';
        о.узел.style.transform = 'scale(.2) rotate(90deg)';
        о.узел.style.opacity = '0';
      });
      осколкиПомнить(склад);
      setTimeout(function () {
        if (склад.состояние === 'собран') слой.hidden = true;
        очиститьПолёт();
      }, сокращено ? 0 : 470);
      if (опции.статус && опции.статус.textContent != null)
        опции.статус.textContent = 'Осколки собраны. Кристалл — цел. Касание — рассыпать на двери.';
    }

    function переключить() { склад.состояние === 'рассыпан' ? собрать() : рассыпать(); }

    function сброс() {
      склад.позиции = {};
      осколкиПомнить(склад);
      if (склад.состояние === 'рассыпан') расставить(false);
      if (опции.статус && опции.статус.textContent != null)
        опции.статус.textContent = 'Осколки вернулись на орбиты дома.';
    }

    /* ПЕРЕТАСКИВАНИЕ — «куда человек поставил, там и стоит» */
    Object.keys(карта).forEach(function (ид) {
      var узел = карта[ид].узел;
      var тян = { активно: false, сдвинули: false, sx: 0, sy: 0, ox: 0, oy: 0 };
      узел.addEventListener('pointerdown', function (e) {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        тян.активно = true; тян.сдвинули = false;
        тян.sx = e.clientX; тян.sy = e.clientY;
        тян.ox = parseFloat(узел.style.left) || 0;
        тян.oy = parseFloat(узел.style.top) || 0;
        try { узел.setPointerCapture(e.pointerId); } catch (err) {}
        e.preventDefault();
      });
      узел.addEventListener('pointermove', function (e) {
        if (!тян.активно) return;
        var dx = e.clientX - тян.sx, dy = e.clientY - тян.sy;
        if (!тян.сдвинули && Math.hypot(dx, dy) > 6) тян.сдвинули = true;
        if (!тян.сдвинули) return;
        var зона = слой.getBoundingClientRect();
        var x = Math.min(Math.max(20, тян.ox + dx), зона.width - 20);
        var y = Math.min(Math.max(20, тян.oy + dy), зона.height - 20);
        узел.style.left = x + 'px';
        узел.style.top = y + 'px';
      });
      function конец(e) {
        if (!тян.активно) return;
        тян.активно = false;
        try { if (e && e.pointerId != null) узел.releasePointerCapture(e.pointerId); } catch (err) {}
        if (тян.сдвинули) {
          var зона = слой.getBoundingClientRect();
          склад.позиции[ид] = [
            +(parseFloat(узел.style.left) / зона.width).toFixed(4),
            +(parseFloat(узел.style.top) / зона.height).toFixed(4)
          ];
          осколкиПомнить(склад);
          if (navigator.vibrate) try { navigator.vibrate(12); } catch (err) {}
          узел.setAttribute('data-поставлен', '1');
        }
      }
      узел.addEventListener('pointerup', конец);
      узел.addEventListener('pointercancel', конец);
      /* клик после перетаскивания — не переход */
      узел.addEventListener('click', function (e) {
        if (тян.сдвинули) { тян.сдвинули = false; e.preventDefault(); }
      });
    });

    /* клавиатура: Enter/Space на кнопке-кристалле даёт рассыпать/собрать (кнопка сама),
       Esc на лице — собрать, если меню не открыто */
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (склад.состояние !== 'рассыпан') return;
      if (document.querySelector('.sux-menu')) return;      /* меню важнее */
      var тег = document.activeElement && document.activeElement.tagName;
      if (тег === 'INPUT' || тег === 'TEXTAREA' || тег === 'SELECT') return;
      собрать();
    });

    /* пересборка при resize: орбитальные пересчитываются, поставленные — в % */
    var таймер;
    window.addEventListener('resize', function () {
      clearTimeout(таймер);
      таймер = setTimeout(function () { if (склад.состояние === 'рассыпан') расставить(false); }, 160);
    }, { passive: true });

    кнопка.addEventListener('click', переключить);
    кнопка.setAttribute('aria-controls', слой.id || 'осколкиСлой');

    /* восстановление состояния человека (он решает): рассыпанное остаётся рассыпанным */
    if (склад.состояние === 'рассыпан') {
      слой.hidden = false;
      расставить(false);
      кнопка.classList.add('рассыпан');
      кнопка.setAttribute('aria-expanded', 'true');
      кнопка.setAttribute('aria-label', 'Кристалл SINGULYAR — собрать осколки обратно');
    } else {
      слой.hidden = true;
    }

    return {
      рассыпать: рассыпать, собрать: собрать, переключить: переключить, сброс: сброс,
      состояние: состояние, пересчитать: function () { if (состояние() === 'рассыпан') расставить(false); }
    };
  };
})();
