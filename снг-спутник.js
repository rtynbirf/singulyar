/* СНГ-СПУТНИК v1 (2026-11-22, волна «человек действует»: сквозное управление на ВСЕХ страницах Дома).
   Один файл — две роли, роль узнаёт себя по дому:
   · МАСТЕР (СЦЕНА, есть #панТранспорт): слушает команды спутников и жмёт НАСТОЯЩИЕ клавиши лица
     (кнПлей/кнТрекВперёд/кнТрекНазад/кнТихо) — одна истина у дома, спутник не изобретает движок.
     Каждую секунду вещает состояние (титул, играет, время) в BroadcastChannel «снг-пульт-v1»
     и в localStorage «снг-пульт-состояние» (зеркало для страниц без живого канала).
   · СПУТНИК (все остальные страницы): честный бар внизу — ⏮ ▶/⏸ ⏭ + титул + линия прогресса
     + дверь на СЦЕНУ. Слышит СЦЕНУ — показывает живое состояние и шлёт команды;
     СЦЕНА молчит (не открыта) — бар честно говорит «дом молчит» и ведёт на СЦЕНУ.
   Канон дома: без innerHTML (КОРД), звук только на СЦЕНЕ, глифы канона, эмодзи-плоскость запрещена. */
(function () {
  "use strict";
  if (window.__снгСпутник) return; /* дом не клонируется */
  window.__снгСпутник = true;

  var КАНАЛ = 'снг-пульт-v1';
  var КЛЮЧ_СОСТОЯНИЕ = 'снг-пульт-состояние';
  var КЛЮЧ_КОМАНДА = 'снг-пульт-команда';
  var СВЕЖЕСТЬ = 6000; /* мс: старше — дом молчит, честно говорим об этом */

  var бк = null;
  try { бк = new BroadcastChannel(КАНАЛ); } catch (е) { бк = null; }

  function шлиКоманду(имя) {
    var м = { тип: 'команда', cmd: имя, от: (location.pathname.split('/').pop() || 'спутник'), т: Date.now() };
    try { if (бк) бк.postMessage(м); } catch (е) {}
    try { localStorage.setItem(КЛЮЧ_КОМАНДА, JSON.stringify(м)); } catch (е) {}
  }

  function состояние() {
    try {
      var с = JSON.parse(localStorage.getItem(КЛЮЧ_СОСТОЯНИЕ) || 'null');
      return (с && (Date.now() - с.т) < СВЕЖЕСТЬ) ? с : null;
    } catch (е) { return null; }
  }

  /* ── РОЛЬ МАСТЕРА ── */
  function мастер() {
    var РУКИ = { 'переключить': 'кнПлей', 'некст': 'кнТрекВперёд', 'прев': 'кнТрекНазад', 'тихо': 'кнТихо' };
    function рука(м) {
      if (!м || м.тип !== 'команда') return;
      var ид = РУКИ[м.cmd];
      if (!ид) return;
      var э = document.getElementById(ид);
      if (э) э.click(); /* настоящий дом жмёт настоящую клавишу — спутник не командует звуком напрямую */
    }
    if (бк) бк.onmessage = function (е) { рука(е.data); };
    window.addEventListener('storage', function (е) {
      if (е.key !== КЛЮЧ_КОМАНДА || !е.newValue) return;
      try { рука(JSON.parse(е.newValue)); } catch (ошибка) {}
    });
    setInterval(function () {
      var пл = document.getElementById('кнПлей');
      if (!пл) return;
      var т = document.getElementById('песняТитул');
      var сейчас = document.getElementById('времяСейчас');
      var всего = document.getElementById('времяВсего');
      var со = {
        т: Date.now(),
        титул: т ? т.textContent : '',
        играет: пл.getAttribute('aria-pressed') === 'true',
        поз: сейчас ? сейчас.textContent : '',
        длит: всего ? всего.textContent : ''
      };
      try { if (бк) бк.postMessage({ тип: 'состояние', с: со }); } catch (ошибка) {}
      try { localStorage.setItem(КЛЮЧ_СОСТОЯНИЕ, JSON.stringify(со)); } catch (ошибка) {}
    }, 1000);
  }

  /* ── РОЛЬ СПУТНИКА ── */
  function спутник() {
    var СЦЕНА_URL = 'https://rtynbirf.github.io/singulyar/%D0%A1%D0%98%D0%9D%D0%93%D0%A3%D0%9B%D0%AF%D0%A0_32_%D0%A1%D0%A6%D0%95%D0%9D%D0%90.html';
    var стиль = document.createElement('style');
    стиль.textContent =
      '.снг-спутник{position:fixed;left:0;right:0;bottom:0;z-index:9999;display:flex;align-items:center;gap:10px;' +
      'padding:10px clamp(10px,3vw,18px);padding-bottom:calc(10px + env(safe-area-inset-bottom,0));' +
      'background:#0A0A0C;border-top:1px solid #2A2C30;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px}' +
      '.снг-спутник button{background:#33353A;color:#E8E8EA;border:0;border-radius:999px;width:40px;height:40px;min-width:40px;' +
      'display:inline-flex;align-items:center;justify-content:center;font-size:15px;cursor:pointer;flex:none}' +
      '.снг-спутник button:active{transform:scale(.94)}' +
      '.снг-спутник button.снг-играет{background:#B08D57;color:#0A0A0C;font-weight:700}' +
      '.снг-спутник-титул{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#E8E8EA}' +
      '.снг-спутник-титул small{color:#9A9CA2;font-size:11px;margin-left:8px}' +
      '.снг-спутник-молчит{color:#9A9CA2;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.снг-спутник-молчит a{color:#B08D57;font-weight:700;text-decoration:none}' +
      '.снг-спутник-линия{position:absolute;top:-1px;left:0;height:2px;background:#B08D57;width:0%;transition:width .4s linear}' +
      '.снг-спутник-дверь{color:#B08D57;text-decoration:none;font-weight:700;flex:none}' +
      '@media (max-width:640px){.снг-спутник-дверь{display:none}.снг-спутник-титул small{display:none}}';
    document.head.appendChild(стиль);

    var бар = document.createElement('div');
    бар.className = 'снг-спутник';
    бар.setAttribute('role', 'group');
    бар.setAttribute('aria-label', 'Пульт-спутник дома: управление СЦЕНОЙ с любой страницы');

    var линия = document.createElement('div');
    линия.className = 'снг-спутник-линия';

    function клавиша(глиф, имя, подпись) {
      var б = document.createElement('button');
      б.type = 'button';
      б.textContent = глиф;
      б.setAttribute('aria-label', подпись);
      б.title = подпись;
      б.addEventListener('click', function () { шлиКоманду(имя); });
      return б;
    }
    var кнНаз = клавиша('\u23EE', 'прев', 'Предыдущий трек (СЦЕНА)');
    var кнПлей = клавиша('\u25B6', 'переключить', 'Играть / пауза (СЦЕНА)');
    var кнВпр = клавиша('\u23ED', 'некст', 'Следующий трек (СЦЕНА)');

    var титул = document.createElement('span');
    титул.className = 'снг-спутник-титул';
    титул.setAttribute('aria-live', 'polite');

    var молчит = document.createElement('span');
    молчит.className = 'снг-спутник-молчит';

    var дверь = document.createElement('a');
    дверь.className = 'снг-спутник-дверь';
    дверь.href = СЦЕНА_URL;
    дверь.textContent = 'СЦЕНА \u2197';
    дверь.setAttribute('aria-label', 'Открыть СЦЕНУ дома');

    function покажи(с) {
      if (с) {
        титул.style.display = '';
        молчит.style.display = 'none';
        кнНаз.style.display = кнВпр.style.display = дверь.style.display = '';
        кнПлей.textContent = с.играет ? '\u23F8' : '\u25B6';
        кнПлей.setAttribute('aria-label', с.играет ? 'Пауза (СЦЕНА)' : 'Играть (СЦЕНА)');
        кнПлей.classList.toggle('снг-играет', !!с.играет);
        while (титул.firstChild) титул.removeChild(титул.firstChild);
        титул.appendChild(document.createTextNode((с.титул || 'дом поёт') || 'дом поёт'));
        var мелко = document.createElement('small');
        мелко.textContent = (с.поз || '') + ' / ' + (с.длит || '');
        титул.appendChild(мелко);
        var доля = parseFloat(String(с.поз || '0').split(':')[0] || '0');
        var полн = parseFloat(String(с.длит || '0').split(':')[0] || '0');
        /* прогресс по минутам: м:сс — грубая линия честности (точный пульт — на СЦЕНЕ) */
        линия.style.width = (полн > 0 ? Math.max(0, Math.min(100, (доля / полн) * 100)) : 0) + '%';
      } else {
        титул.style.display = 'none';
        кнНаз.style.display = кнВпр.style.display = 'none';
        кнПлей.style.display = 'none';
        дверь.style.display = '';
        молчит.style.display = '';
        while (молчит.firstChild) молчит.removeChild(молчит.firstChild);
        молчит.appendChild(document.createTextNode('дом молчит — СЦЕНА закрыта. '));
        var а = document.createElement('a');
        а.href = СЦЕНА_URL;
        а.textContent = 'открыть СЦЕНУ';
        молчит.appendChild(а);
        линия.style.width = '0%';
      }
    }

    бар.appendChild(линия);
    бар.appendChild(кнНаз);
    бар.appendChild(кнПлей);
    бар.appendChild(кнВпр);
    бар.appendChild(титул);
    бар.appendChild(молчит);
    бар.appendChild(дверь);
    document.body.appendChild(бар);
    /* бар не должен давить на ногу страницы: доме подкладываем подстилку */
    var старая = parseInt(document.body.style.paddingBottom || '0', 10) || 0;
    document.body.style.paddingBottom = (старая + 62) + 'px';

    if (бк) бк.onmessage = function (е) { if (е.data && е.data.тип === 'состояние') покажи(е.data.с); };
    window.addEventListener('storage', function (е) { if (е.key === КЛЮЧ_СОСТОЯНИЕ) покажи(состояние()); });
    setInterval(function () { покажи(состояние()); }, 2000);
    покажи(состояние());
  }

  function старт() {
    if (document.getElementById('панТранспорт')) мастер();
    else if (document.body) спутник();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', старт);
  else старт();
})();
