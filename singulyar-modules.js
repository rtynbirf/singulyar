/* ==========================================================================
   СИНГУЛЯР — ЯДРО МОДУЛЕЙ v1.0.0 · такт v1.29.0 «МОДУЛИ · МУЛЬТИМОДАЛЬНОСТЬ»
   Слово владельца: «АРХИТЕКТУРА НАШЕГО САЙТА!!! ОТЛИЧАТЬСЯ БУДЕТ ОТ ВСЕХ
   МУЛЬТИМОДАЛЬНОСТЬЮ!!! ПЕРЕДЕЛЫВАЙ ВСЁ И ВСЯ НА МОДУЛИ!!!! ДА МНЕ НЕ НУЖНЫ
   ИЗОБРАЖЕНИЯ Я САМ ЧЕЛОВЕК!!! СВОБОДНЫЙ ХУДОЖНИК=)»
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
   Офлайн-закон: 0 внешних запросов, 0 шрифтов, 0 картинок.
   ========================================================================== */
(function () {
  'use strict';
  if (window.__SINGULYAR_MODULES__) return;
  window.__SINGULYAR_MODULES__ = 'v1.0.0';

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
    версия: '1.0.0',
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
      var модуль = SNG.текущий();
      if (!модуль) return;
      var шапка = document.querySelector('header');
      if (!шапка || !шапка.parentNode) return;
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

      /* бирка встаёт сразу после шапки, не ломая чужие раскладки */
      шапка.parentNode.insertBefore(полоса, шапка.nextSibling);
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
})();
