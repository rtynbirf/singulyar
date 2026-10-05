/*!
 * SINGULYAR UX ENGINE v9.2 «ХОЗЯИН=ГОСТЬ» · такт v1.33.0
 * Наследник v9.0 «ПОД КАПОТ» (тот — наследник v8.0-final).
 * Главное изменение такта v1.33.0 (слово владельца):
 *   «НА ГЛАВНОЙ ДОЛЖНО СТОЯТЬ ТОЛЬКО ЭТО!!! … НА КАЖДОЙ ВНУТРЕННЕЙ
 *    СТРАНИЦЕ ВСЁ ПРИВЕСТИ ТОЛЬКО К ТАКОМУ СТИЛЮ … ПОЛНОСТЮ ПРОВЕРИТЬ
 *    НАВИГАЦИЮ ТАМ БАРДАК … УБРАЛ ВСЁ ЧТО СВЯЗАНО С ЭГО. ТУТ НЕТ
 *    ХОЗЯИН=ГОСТЬ. КАЖДЫЙ САМ ХОЗЯИН»
 * Изменение предыдущего такта по слову владельца:
 *   «А ГДЕ ТОГДА СИСТЕМНЫЕ? … МАЛО ЛИ ЧТО У НЕГО В ПКМ — СКОПИРОВАТЬ,
 *    ОТПРАВИТЬ, ПОДЕЛИТЬСЯ… ТЫ ЖЕ О ЛЮДЯХ ДУМАТЬ ДОЛЖЕН ВСЕГДА В ПЕРВУЮ
 *    ОЧЕРЕДЬ. ПЕРЕДЕЛАЙ БУДЬ ЛАСКА.»
 *
 * ЧТО ИЗМЕНИЛОСЬ В v9.1:
 *  - нативное меню браузера ЖИВЁТ ВЕЗДЕ: копировать/отправить/поделиться/
 *    перевести не отнимаются ни на одной странице (глобальный перехват снят);
 *  - МЕНЮ ДОМА открывается только на НАШИХ объектах:
 *      ПКМ по кристаллу (лицо) · ПКМ по тихой ручке ⌇ (комнаты) ·
 *      долгое касание кристалла/ручки (экраны без ПКМ) · клавиша S;
 *  - ручка ⌇ — стекло и золото, глиф канона; живёт в правом нижнем углу
 *    комнат, на лице её нет — там дверью служит сам кристалл;
 *  - ложный клик после долгого касания гасится (кристалл не дёргается).
 *
 * ПРЕДЫДУЩИЙ ПРИКАЗ (v9.0), ОСТАЮЩИЙСЯ В СИЛЕ:
 *   «ШЕСТЕРЁНКУ СДЕЛАТЬ ПОД КАПОТ: НА ГЛАВНОЙ СТРАНИЦЕ ПРЯМО ПКМ (ПРАВОЙ
 *   КНОПКОЙ МЫШИ) ПО … ВЫПАДАЮЩЕЕ МЕНЮ = СПИСОК, ВСЁ ПЕРЕДЕЛАТЬ ПОД
 *   КРИСТАЛЬНО ЕДИНЫЙ СТИЛЬ. НЕ НАДО ЛЕПИТЬ КОЛХОЗ!!!!»
 *
 * ЧТО ИЗМЕНИЛОСЬ ОТНОСИТЕЛЬНО v8:
 *  - висячая кнопка-шестерёнка УДАЛЕНА с лица всех комнат (была чужеродным
 *    телом на канонном лице: чёрный void, стекло, золото — и вдруг гайка);
 *  - [v9.0, отменено в v9.1] ПКМ в любом месте открывал меню — глобальный
 *    в кристальном стиле: тёмное матовое стекло, тонкая светлая рамка,
 *    золото — единственный акцент, моно-шрифт дома;
 *  - эмодзи выжжены из всех надписей движка (только глифы канона: ⬢ ⌇ ◈ ⤳ ¶):
 *    слово владельца «НЕ НАДО КОЛХОЗ ЦЫГАНЩИНУ ТАЩИТЬ ИЗ ИНТЕРНЕТА»;
 *  - клавиатурный путь сохранён: S — меню, Esc — закрыть, стрелки — по списку;
 *  - хранит прежний ключ настроек SINGULYAR_UX_V8 (без x/y шестерёнки);
 *  - звук касаний, голос (opt-in), геймпад, темы, диагностика — сохранены.
 *
 * Чистый vanilla JS · 0 зависимостей · офлайн · без innerHTML · без телеметрии
 * Интеграция: <script defer src="singulyar-ux-engine-v9.js"></script>
 * Публичный API: window.SingulyarUX (в конце файла).
 */
(function () {
    'use strict';

    // ── 0. Защита от повторного подключения ──
    if (window.__SINGULYAR_UX_ENGINE__) return;
    window.__SINGULYAR_UX_ENGINE__ = 'v9.2-хозяин-гость';

    // ── 1. Безопасное хранилище (file:// и приватные режимы могут кидать) ──
    var STORE_KEY = 'SINGULYAR_UX_V8';      // ключ прежний — настройки людей не теряются

    function storeLoad() {
        try {
            var raw = localStorage.getItem(STORE_KEY);
            if (!raw) return null;
            var v = JSON.parse(raw);
            return (v && typeof v === 'object') ? v : null;
        } catch (e) { return null; }
    }
    function storeSave(obj) {
        try { localStorage.setItem(STORE_KEY, JSON.stringify(obj)); return true; }
        catch (e) { return false; }
    }
    function num(v, fallback) {
        return (typeof v === 'number' && isFinite(v)) ? v : fallback;
    }

    // ── 2. Конфигурация (один ключ, версионирован) ──
    var saved = storeLoad() || {};
    var config = {
        audioOn: saved.audioOn !== false,          // клики — да
        volume: Math.min(0.5, Math.max(0.02, num(saved.volume, 0.25))),
        voiceOn: saved.voiceOn === true,           // микрофон — ВЫКЛ по умолчанию
        theme: (saved.theme === 'light' || saved.theme === 'contrast') ? saved.theme : 'dark'
    };
    function persist() { storeSave(config); }

    // Уважение к «уменьшить движение»
    var reducedMotion = false;
    try { reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

    // Режим хорошего соседа: хост-страница со своими хоткеями подключает
    // скрипт с data-hotkeys="off" — тогда S/Esc не перехватываются глобально.
    var hostHotkeysOff = false;
    try { hostHotkeysOff = !!(document.currentScript && document.currentScript.dataset.hotkeys === 'off'); } catch (e) {}

    // ── 3. Стили (скоуп по id-префиксу; кристалл: стекло·серебро·золото) ──
    var css = [
        ':root[data-sux-theme="contrast"]{--sux-fg:#ffe680;--sux-accent:#ffd700;--sux-border:#fff;--sux-panel:#000;}',
        ':root[data-sux-theme="light"]{--sux-fg:#101418;--sux-accent:#7a5b10;--sux-border:rgba(0,0,0,.35);--sux-panel:#fff;}',
        ':root:not([data-sux-theme="contrast"]):not([data-sux-theme="light"]){--sux-fg:#C0C8D0;--sux-accent:#D4AF37;--sux-hi:#F0D78C;--sux-border:rgba(240,240,248,.22);--sux-panel:rgba(10,12,16,.94);}',

        '#sux-menu{position:fixed;z-index:2147483001;width:min(calc(100vw - 20px),340px);',
          'background:var(--sux-panel,rgba(10,12,16,.94));color:var(--sux-fg,#C0C8D0);',
          'border:1px solid var(--sux-border,rgba(240,240,248,.22));border-radius:14px;',
          'box-shadow:0 24px 60px rgba(0,0,0,.6),inset 0 1px 0 rgba(240,240,248,.07);',
          'backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);',
          'padding:8px;font:13px/1.45 var(--sux-mono,Cascadia Mono,ui-monospace,Consolas,"Courier New",monospace);',
          'display:none;opacity:0;transform:scale(.96);will-change:transform,opacity}',
        '#sux-menu.open{display:block}',
        '#sux-menu.show{opacity:1;transform:scale(1)}',
        '#sux-menu .sux-head{display:flex;align-items:center;gap:8px;margin:4px 6px 8px;',
          'font-size:11px;letter-spacing:.26em;text-transform:uppercase;color:var(--sux-hi,#F0D78C)}',
        '#sux-menu .sux-head::after{content:"";flex:1;height:1px;',
          'background:linear-gradient(90deg,rgba(212,175,55,.45),transparent)}',
        '.sux-item{display:flex;align-items:center;gap:10px;width:100%;text-align:left;',
          'margin:1px 0;padding:10px 11px;border-radius:9px;border:1px solid transparent;',
          'background:transparent;color:inherit;font:inherit;cursor:pointer}',
        '.sux-item:hover{background:rgba(212,175,55,.10);border-color:rgba(212,175,55,.30)}',
        '.sux-item:focus-visible{outline:2px solid var(--sux-accent,#D4AF37);outline-offset:-1px}',
        '.sux-item[aria-disabled="true"]{color:#6B7178;cursor:default}',
        '.sux-item[aria-disabled="true"]:hover{background:none;border-color:transparent}',
        '.sux-item .g{width:1.1em;text-align:center;color:var(--sux-accent,#D4AF37);flex:none}',
        '.sux-item .k{margin-left:auto;font-size:10.5px;color:#6B7178;flex:none}',
        '.sux-sep{height:1px;margin:6px 8px;background:rgba(240,240,248,.10)}',
        '#sux-status{margin:6px 4px 2px;padding:8px 10px;border-radius:8px;font-size:12px;',
          'white-space:pre-line;display:none;color:var(--sux-hi,#F0D78C);',
          'background:rgba(212,175,55,.08);border:1px solid rgba(212,175,55,.22)}',
        '#sux-status.err{color:#ff6b83;background:rgba(255,59,92,.10);border-color:rgba(255,59,92,.30)}',
        '@media (prefers-reduced-motion: reduce){#sux-menu,#sux-handle{transition:none!important;animation:none!important}}',

        // ручка ⌇ — тихая дверь меню дома для комнат (на лице её нет — там кристалл)
        '#sux-handle{position:fixed;right:14px;bottom:14px;z-index:2147483000;width:40px;height:40px;margin:0;padding:0;',
          'border-radius:50%;display:flex;align-items:center;justify-content:center;',
          'font:17px/1 var(--sux-mono,Cascadia Mono,ui-monospace,Consolas,"Courier New",monospace);',
          'color:var(--sux-accent,#D4AF37);background:var(--sux-panel,rgba(10,12,16,.82));',
          'border:1px solid var(--sux-border,rgba(240,240,248,.22));cursor:pointer;',
          'box-shadow:0 10px 28px rgba(0,0,0,.45),inset 0 1px 0 rgba(240,240,248,.08);',
          'backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);',
          'opacity:.62;transition:opacity .2s ease,border-color .2s ease,transform .12s ease}',
        '#sux-handle:hover,#sux-handle:focus-visible{opacity:1;border-color:rgba(212,175,55,.55);color:var(--sux-hi,#F0D78C)}',
        '#sux-handle:focus-visible{outline:1px solid rgba(212,175,55,.6);outline-offset:3px}',
        '#sux-handle:active{transform:scale(.94)}',
        '#crystalButton{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;touch-action:manipulation}',
        '#sux-home{position:fixed;right:14px;bottom:62px;z-index:2147483000;width:40px;height:40px;margin:0;padding:0;',
          'border-radius:50%;display:flex;align-items:center;justify-content:center;font:16px/1 var(--sux-mono,Cascadia Mono,ui-monospace,Consolas,"Courier New",monospace);',
          'color:var(--sux-fg,#C0C8D0);background:var(--sux-panel,rgba(10,12,16,.82));border:1px solid var(--sux-border,rgba(240,240,248,.22));cursor:pointer;',
          'box-shadow:0 10px 28px rgba(0,0,0,.45),inset 0 1px 0 rgba(240,240,248,.08);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);',
          'opacity:.62;transition:opacity .2s ease,border-color .2s ease,color .2s ease,transform .12s ease}',
        '#sux-home:hover,#sux-home:focus-visible{opacity:1;border-color:rgba(212,175,55,.55);color:var(--sux-hi,#F0D78C)}',
        '#sux-home:focus-visible{outline:1px solid rgba(212,175,55,.6);outline-offset:3px}',
        '#sux-home:active{transform:scale(.94)}',
        '@media print{#sux-menu,#sux-handle{display:none!important}}'
    ].join('');

    var styleEl = document.createElement('style');
    styleEl.id = 'sux-style';
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    // Применяем тему ТОЛЬКО к собственным элементам движка (урок v2)
    if (config.theme !== 'dark') document.documentElement.setAttribute('data-sux-theme', config.theme);

    // ── 4. DOM-фабрика (ноль innerHTML — требование репозитория) ──
    function el(tag, attrs, text) {
        var node = document.createElement(tag);
        if (attrs) for (var k in attrs) {
            if (k === 'style' && typeof attrs[k] === 'object') { Object.assign(node.style, attrs[k]); }
            else if (k === 'dataset') { for (var d in attrs[k]) node.dataset[d] = attrs[k][d]; }
            else node.setAttribute(k, attrs[k]);
        }
        if (text != null) node.textContent = text;
        return node;
    }

    // ── 5. МЕНЮ ДОМА (список под капотом; рождается по ПКМ) ──
    var menu = el('div', {
        id: 'sux-menu',
        role: 'menu',
        'aria-label': 'Меню дома СИНГУЛЯР'
    });
    var head = el('div', { class: 'sux-head', 'aria-hidden': 'true' }, '⬢ Меню дома');
    menu.appendChild(head);

    var status = el('div', { id: 'sux-status', role: 'status', 'aria-live': 'polite' });
    var items = [];   // [{кнопка, действие, глиф, подписка?}]

    function item(глиф, текст, действие, опции) {
        опции = опции || {};
        var b = el('button', {
            class: 'sux-item', type: 'button',
            role: опции.check ? 'menuitemcheckbox' : 'menuitem',
            tabindex: '-1'
        });
        var g = el('span', { class: 'g', 'aria-hidden': 'true' }, глиф);
        var t = el('span', { class: 't' }, текст);
        b.appendChild(g); b.appendChild(t);
        if (опции.клавиша) {
            var k = el('span', { class: 'k', 'aria-hidden': 'true' }, опции.клавиша);
            b.appendChild(k);
        }
        if (!опции.мертв) b.addEventListener('click', function () { действие(); closeMenu(true); });
        else b.setAttribute('aria-disabled', 'true');
        menu.appendChild(b);
        items.push({ кнопка: b, текст: t, глиф: глиф, действие: действие, опции: опции });
        return b;
    }
    function sep() { menu.appendChild(el('div', { class: 'sux-sep', role: 'separator' })); }

    // — путь человека: нить Ариадны —
    function поНити() {
        var нить = document.getElementById('модули');
        if (нить) {
            if (нить.hidden) нить.hidden = false;   /* капот открыт — дверь появилась */
            if (!нить.open) нить.open = true;
            нить.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
            сказать('Нить натянута. Двери дома — ниже.');
        } else {
            window.location.href = 'index.html#модули';
        }
    }
    item('⌇', 'Нить Ариадны · дом 17 дверей', поНити, { клавиша: 'N' });

    // — осколки: только там, где живёт кристалл (лицо) —
    function осколкиДвижок() { return (window.SNG && window.SNG.осколкиДвижок) ? window.SNG.осколкиДвижок : null; }
    var эРассыпать = item('◈', 'Рассыпать кристалл', function () {
        var д = осколкиДвижок(); if (д) д.переключить();
    }, { клавиша: 'C' });
    var эСброс = item('⤳', 'Сбросить осколки на орбиты', function () {
        var д = осколкиДвижок(); if (д) д.сброс();
    });

    sep();

    // — настройки под капотом (канон: выбор человека, не режим для особых) —
    var эЗвук = item('∿', '', function () {
        config.audioOn = !config.audioOn; persist(); подписи();
        if (config.audioOn) { ensureCtx(); beep('click'); }
        сказать(config.audioOn ? 'Звук касаний включён.' : 'Звук касаний выключен.');
    });
    var эГолос = item('◉', '', function () {
        config.voiceOn = !config.voiceOn; persist(); подписи();
        if (config.voiceOn) startVoice(); else stopVoice();
    });
    var эТема = item('◐', '', function () {
        var порядок = ['dark', 'light', 'contrast'];
        config.theme = порядок[(порядок.indexOf(config.theme) + 1) % порядок.length];
        if (config.theme === 'dark') document.documentElement.removeAttribute('data-sux-theme');
        else document.documentElement.setAttribute('data-sux-theme', config.theme);
        persist(); подписи();
    });

    sep();

    // — сервис —
    item('¶', 'Диагностика экрана', function () { диагностика(); });
    var эДом = item('⬢', 'Главная · хаб ·00', function () {
        сказать('Веду к хабу.');
        try { window.__SUX_NAVIGATING__ = { to: 'index.html', at: Date.now() }; } catch (e) {}
        window.location.href = 'index.html';
    });
    item('·', 'сборка v1.33.0 · ХОЗЯИН=ГОСТЬ', function () {}, { мертв: true });

    menu.appendChild(status);
    document.body.appendChild(menu);

    // — подписи без единого эмодзи: глифы канона + слова —
    function подписи() {
        эЗвук.childNodes[1].textContent = 'Звук касаний · ' + (config.audioOn ? 'вкл' : 'выкл');
        эГолос.childNodes[1].textContent = 'Голос · ' + (config.voiceOn ? 'вкл (в Chrome — облако)' : 'выкл');
        эГолос.title = 'Внимание: в Chrome распознавание речи работает через облако Google. ' +
                       'Для полностью офлайн-сборки держите выключенным.';
        var темы = { dark: 'Тема · тёмная', light: 'Тема · светлая', contrast: 'Тема · контраст' };
        эТема.childNodes[1].textContent = темы[config.theme] || темы.dark;

        var д = осколкиДвижок();
        var наЛице = !!д;
        эРассыпать.parentNode && (эРассыпать.style.display = наЛице ? '' : 'none');
        эСброс.parentNode && (эСброс.style.display = наЛице ? '' : 'none');
        if (наЛице) {
            эРассыпать.childNodes[1].textContent = д.состояние() === 'рассыпан'
                ? 'Собрать осколки' : 'Рассыпать кристалл';
            эСброс.style.display = (д.состояние() === 'рассыпан') ? '' : 'none';
        }
        var наХабе = /index\.html?$/i.test(location.pathname || '') || /\/$/.test(location.pathname) ||
                     location.pathname === '/' || location.pathname.endsWith('/');
        эДом.style.display = наХабе ? 'none' : '';
    }

    function сказать(текст, ошибка) {
        status.style.display = 'block';
        status.className = ошибка ? 'err' : '';
        status.textContent = текст;
    }

    // ── 6. Звук: ленивый AudioContext, только в жесте пользователя ──
    var audioCtx = null;
    function ensureCtx() {
        if (!audioCtx) {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            try { audioCtx = new AC(); } catch (e) { return null; }
        }
        if (audioCtx.state === 'suspended' && audioCtx.resume) audioCtx.resume();
        return audioCtx;
    }
    ['pointerdown', 'keydown'].forEach(function (ev) {
        window.addEventListener(ev, function () { if (config.audioOn) ensureCtx(); }, { once: true, passive: true });
    });

    function beep(type) {
        if (!config.audioOn) return;
        var ctx = audioCtx;
        if (!ctx || ctx.state !== 'running') return;
        try {
            var t = ctx.currentTime;
            var o1 = ctx.createOscillator(), o2 = null, g = ctx.createGain(), f = ctx.createBiquadFilter();
            f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 1.2;
            o1.connect(f); if (o2) o2.connect(f); f.connect(g); g.connect(ctx.destination);
            var v = config.volume;
            if (type === 'click') {
                o1.type = 'sine'; o1.frequency.setValueAtTime(880, t);
                o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.setValueAtTime(1760, t);
                o2.connect(f);
                g.gain.setValueAtTime(v * 0.8, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.018);
                o1.start(t); o2.start(t); o1.stop(t + 0.02); o2.stop(t + 0.02);
            } else if (type === 'open' || type === 'close') {
                o1.type = 'sine';
                o1.frequency.setValueAtTime(type === 'open' ? 660 : 980, t);
                o1.frequency.exponentialRampToValueAtTime(type === 'open' ? 990 : 520, t + 0.05);
                g.gain.setValueAtTime(v * 0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
                o1.start(t); o1.stop(t + 0.07);
            } else if (type === 'ack') {
                o1.type = 'sine';
                o1.frequency.setValueAtTime(1046.5, t); o1.frequency.setValueAtTime(1318.5, t + 0.03);
                g.gain.setValueAtTime(v * 0.6, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
                o1.start(t); o1.stop(t + 0.1);
            }
        } catch (e) { /* звук не критичен */ }
    }

    // ── 7. Открытие/закрытие меню ──
    var isOpen = false;
    var lastIndex = -1;

    function видимые() {
        return items.filter(function (it) {
            return it.кнопка.getAttribute('aria-disabled') !== 'true' &&
                   it.кнопка.style.display !== 'none' &&
                   it.кнопка.offsetParent !== null;
        }).map(function (it) { return it.кнопка; });
    }

    function openMenu(x, y) {
        if (isOpen) { place(x, y); return; }
        isOpen = true;
        подписи();
        menu.classList.add('open');
        status.style.display = 'none';
        place(x, y);
        requestAnimationFrame(function () {
            menu.classList.add('show');
            var п = видимые();
            lastIndex = 0;
            if (п[0]) п[0].focus();
        });
        beep('open');
    }

    function place(x, y) {
        var mw = menu.offsetWidth || 300, mh = menu.offsetHeight || 260;
        var M = 8;
        var left = (x == null) ? (window.innerWidth - mw - 16) : x;
        var top = (y == null) ? 64 : y;
        if (left + mw > window.innerWidth - M) left = window.innerWidth - mw - M;
        if (left < M) left = M;
        if (top + mh > window.innerHeight - M) top = (y == null ? top : y) - mh - 4;
        if (top < M) top = M;
        var ox = (left + mw / 2) > window.innerWidth / 2 ? 'right' : 'left';
        var oy = (top + mh / 2) > window.innerHeight / 2 ? 'bottom' : 'top';
        menu.style.transformOrigin = oy + ' ' + ox;
        menu.style.left = left + 'px';
        menu.style.top = top + 'px';
    }

    function closeMenu(вернуть) {
        if (!isOpen) return;
        isOpen = false;
        menu.classList.remove('show');
        var hide = function () {
            if (!isOpen) menu.classList.remove('open');
            menu.removeEventListener('transitionend', hide);
        };
        menu.addEventListener('transitionend', hide);
        setTimeout(hide, reducedMotion ? 0 : 240);
        if (вернуть && lastFocus && document.contains(lastFocus)) {
            try { lastFocus.focus({ preventScroll: true }); } catch (e) { lastFocus.focus(); }
        }
        beep('close');
    }
    function toggleMenu(x, y) { isOpen ? closeMenu(true) : openMenu(x, y); }

    var lastFocus = null;

    // ── 8. ПКМ: СВОБОДА ВЫБОРА (слово владельца: «ТЫ ЖЕ О ЛЮДЯХ ДУМАТЬ ДОЛЖЕН
    //        ВСЕГДА В ПЕРВУЮ ОЧЕРЕДЬ»). Нативное меню браузера живёт ВЕЗДЕ —
    //        копировать, отправить, поделиться, перевести не отнимаем ни у кого.
    //        МЕНЮ ДОМА открывается только на НАШИХ объектах:
    //          · ПКМ по кристаллу (лицо) или по тихой ручке ⌇ (комнаты);
    //          · долгое касание кристалла/ручки — путь экранов без ПКМ;
    //          · клавиша S — прежний путь, никуда не делся.

    var гаситьКлик = false;
    /* флаг живёт ровно один жест: любое новое касание/клавиша сбрасывает его —
       застревать после Esc или между жестами он не имеет права */
    window.addEventListener('pointerdown', function () { гаситьКлик = false; }, true);
    window.addEventListener('keydown', function () { гаситьКлик = false; }, true);
    window.addEventListener('click', function (e) {
        if (!гаситьКлик) return;
        var т = e.target;
        if (!(т && т.closest && т.closest('#crystalButton, #sux-handle, #sux-home'))) return;
        гаситьКлик = false;
        e.preventDefault();
        e.stopImmediatePropagation();
    }, true);

    function нашОбъект(узел) {
        if (!узел) return;
        узел.addEventListener('contextmenu', function (e) {
            e.preventDefault();
            гаситьКлик = true;
            lastFocus = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
            openMenu(e.clientX, e.clientY);
        });
        /* долгое касание (экраны без ПКМ): 550 мс без движения — меню дома */
        var таймер = null, sx = 0, sy = 0;
        узел.addEventListener('pointerdown', function (e) {
            if (e.pointerType === 'mouse') return;
            sx = e.clientX; sy = e.clientY;
            if (таймер) clearTimeout(таймер);
            таймер = setTimeout(function () {
                таймер = null;
                гаситьКлик = true;
                lastFocus = null;
                openMenu(e.clientX, e.clientY);
            }, 550);
        });
        узел.addEventListener('pointermove', function (e) {
            if (!таймер) return;
            if (Math.hypot(e.clientX - sx, e.clientY - sy) > 12) { clearTimeout(таймер); таймер = null; }
        });
        ['pointerup', 'pointercancel'].forEach(function (имя) {
            узел.addEventListener(имя, function () {
                if (таймер) { clearTimeout(таймер); таймер = null; }
            });
        });
    }

    нашОбъект(document.getElementById('crystalButton'));

    /* тихая ручка ⌇ для комнат (на лице её нет — там сам кристалл — дверь) */
    (function () {
        var наХабе = !!document.getElementById('crystalButton');
        if (!наХабе) {
            /* путь домой — видимый и тихий, один стиль с ручкой ⌇ (юзабилити такта v1.33.0) */
            var домой = el('button', {
                id: 'sux-home', type: 'button',
                'aria-label': 'Домой — хаб ·00',
                title: 'ДОМ · хаб ·00'
            }, '⌂');
            домой.addEventListener('click', function () {
                if (гаситьКлик) return;
                сказать('Веду к хабу.');
                try { window.__SUX_NAVIGATING__ = { to: 'index.html', at: Date.now() }; } catch (e) {}
                window.location.href = 'index.html';
            });
            document.body.appendChild(домой);
        }
        if (наХабе) return;
        var ручка = el('button', {
            id: 'sux-handle', type: 'button',
            'aria-label': 'Меню дома СИНГУЛЯР',
            title: 'МЕНЮ ДОМА · ПКМ здесь, долгое касание или клавиша S'
        }, '⌇');
        document.body.appendChild(ручка);
        нашОбъект(ручка);
        ручка.addEventListener('click', function () {
            if (гаситьКлик) return;
            lastFocus = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
            toggleMenu(null, null);
        });
    })();

    // Клик мимо — закрыть (ожидаемое поведение списков)
    document.addEventListener('pointerdown', function (e) {
        if (!isOpen) return;
        if (!menu.contains(e.target)) closeMenu(false);
    }, true);

    // ── 9. Клавиатура: S — меню, Esc — закрыть/домой, стрелки — список ──
    function isTyping(elx) {
        if (!elx) return false;
        var tag = elx.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
               elx.isContentEditable === true || elx.isComposing === true;
    }

    window.addEventListener('keydown', function (e) {
        var tvBack = (e.key === 'GoBack') || (e.keyCode === 10009);
        var typing = isTyping(document.activeElement);

        if (e.key === 'Escape' || tvBack) {
            if (isOpen) { e.preventDefault(); closeMenu(true); return; }
            if (hostHotkeysOff) return;
            if (!typing) {
                var p = location.pathname || '';
                if (!/index\.html?$/i.test(p) && !/\/$/.test(p)) { e.preventDefault(); window.location.href = 'index.html'; }
            }
            return;
        }

        if (isOpen && (e.key === 'Tab')) { e.preventDefault(); closeMenu(true); return; }

        if (hostHotkeysOff || typing || e.ctrlKey || e.metaKey || e.altKey) return;

        // S/Ы — меню (под капотом: на лице шестерёнки нет)
        if (e.key === 's' || e.key === 'S' || e.key === 'ы' || e.key === 'Ы') {
            e.preventDefault();
            lastFocus = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
            if (!isOpen) { lastFocus = document.activeElement; openMenu(window.innerWidth - 356, 64); }
            else closeMenu(true);
            return;
        }
        // N — нить Ариадны
        if (e.key === 'n' || e.key === 'N' || e.key === 'т' || e.key === 'Т') {
            if (!isOpen) { e.preventDefault(); поНити(); return; }
        }
        // C — кристалл (там, где он есть)
        if ((e.key === 'c' || e.key === 'C' || e.key === 'с' || e.key === 'С') && осколкиДвижок()) {
            e.preventDefault();
            осколкиДвижок().переключить();
            подписи();
            return;
        }
        if (e.shiftKey && (e.key === 'T' || e.key === 't' || e.key === 'Е' || e.key === 'е')) {
            e.preventDefault(); диагностика(); return;
        }

        // roving focus по списку
        if (isOpen) {
            var п = видимые();
            if (!п.length) return;
            var i = п.indexOf(document.activeElement);
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
                e.preventDefault();
                var next;
                if (e.key === 'Home') next = 0;
                else if (e.key === 'End') next = п.length - 1;
                else if (e.key === 'ArrowDown') next = (i === -1 || i === п.length - 1) ? 0 : i + 1;
                else next = (i <= 0) ? п.length - 1 : i - 1;
                lastIndex = next;
                п[next].focus();
                beep('ack');
            }
        }
    });

    // ── 10. Диагностика 9 точек: меню обязано сидеть в экране везде ──
    function диагностика() {
        if (!isOpen) openMenu(window.innerWidth / 2 - 150, window.innerHeight / 2 - 120);
        menu.style.transition = 'none';
        var mw = menu.offsetWidth || 300, mh = menu.offsetHeight || 260;
        var W = window.innerWidth, H = window.innerHeight;
        var точки = [
            { н: 'верх-лево', x: 0, y: 0 }, { н: 'верх-центр', x: W / 2, y: 0 }, { н: 'верх-право', x: W, y: 0 },
            { н: 'серед-лево', x: 0, y: H / 2 }, { н: 'центр', x: W / 2, y: H / 2 }, { н: 'серед-право', x: W, y: H / 2 },
            { н: 'низ-лево', x: 0, y: H }, { н: 'низ-центр', x: W / 2, y: H }, { н: 'низ-право', x: W, y: H }
        ];
        var сбои = [];
        точки.forEach(function (т) {
            menu.style.left = '0px'; menu.style.top = '0px';
            var px = Math.min(Math.max(8, т.x - mw / 2), Math.max(8, W - mw - 8));
            var py = Math.min(Math.max(8, т.y - mh / 2), Math.max(8, H - mh - 8));
            menu.style.left = px + 'px'; menu.style.top = py + 'px';
            var r = menu.getBoundingClientRect();
            var плохо = r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1;
            if (плохо) сбои.push(т.н + ' (' + Math.round(r.left) + ',' + Math.round(r.top) +
                                 ' → ' + Math.round(r.right) + ',' + Math.round(r.bottom) + ')');
        });
        сказать(сбои.length
            ? 'СБОЙ. Вылеты за границы: ' + сбои.length + '/9\n' + сбои.join('\n')
            : '9/9 точек: меню внутри экрана (замер в полном масштабе, без анимаций).\nЭкран: ' + W + '×' + H + ' px.', сбои.length > 0);
        beep('ack');
        menu.style.transition = '';
    }

    // ── 11. Голос: строго opt-in, честное предупреждение про облако в Chrome ──
    var recognition = null;
    function startVoice() {
        var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { сказать('Голос не поддерживается этим браузером.'); config.voiceOn = false; persist(); подписи(); return; }
        if (recognition) return;
        try {
            recognition = new SR();
            recognition.continuous = true;
            recognition.interimResults = false;
            recognition.lang = 'ru-RU';
            recognition.onresult = function (ev) {
                var res = ev.results[ev.results.length - 1];
                if (!res || !res[0]) return;
                var t = res[0].transcript.trim().toLowerCase();
                if (/(меню|настройк|settings|menu)/.test(t)) { beep('ack'); openMenu(window.innerWidth - 356, 64); }
                else if (/(закры|close|назад)/.test(t)) { beep('ack'); closeMenu(true); }
                else if (/(домой|главное|home)/.test(t)) window.location.href = 'index.html';
                else if (/(нить|двери|дом)/.test(t)) { beep('ack'); поНити(); }
                else if (/(осколк|кристалл|рассып)/.test(t)) {
                    var д = осколкиДвижок();
                    if (д) { д.переключить(); подписи(); }
                }
            };
            recognition.onerror = function (ev) {
                if (ev && ev.error === 'not-allowed') {
                    config.voiceOn = false; persist(); подписи(); stopVoice();
                    сказать('Микрофон запрещён в настройках браузера — голосовые команды выключены.', true);
                }
            };
            recognition.onend = function () {
                if (config.voiceOn && !document.hidden) {
                    setTimeout(function () {
                        if (config.voiceOn && !document.hidden) { try { recognition.start(); } catch (e) {} }
                    }, 1500);
                }
            };
            recognition.start();
            сказать('Голос включён (ru-RU). В Chrome распознавание идёт через облако Google — для строгого офлайна держите голос выключенным.');
        } catch (e) {
            config.voiceOn = false; persist(); подписи();
        }
    }
    function stopVoice() {
        if (!recognition) return;
        var r = recognition; recognition = null;
        r.onend = null; r.onresult = null; r.onerror = null;
        try { r.stop(); } catch (e) {}
    }

    // ── 12. Геймпад: опрос только при подключённом паде ──
    var gamepadTimer = null;
    var padLast = 0;
    function pollPad() {
        var pads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (var i = 0; i < pads.length; i++) {
            var p = pads[i];
            if (!p) continue;
            var now = performance.now();
            if (now - padLast < 140) continue;
            var b = p.buttons;
            if (b[12] && b[12].pressed) { padLast = now; stepFocus(-1); }
            else if (b[13] && b[13].pressed) { padLast = now; stepFocus(1); }
            else if (b[0] && b[0].pressed) {
                padLast = now;
                if (document.activeElement && document.activeElement.click) document.activeElement.click();
            } else if (b[1] && b[1].pressed) { padLast = now; if (isOpen) closeMenu(true); }
        }
    }
    function stepFocus(dir) {
        var pool = видимые().length ? видимые() : Array.prototype.filter.call(
            document.querySelectorAll('a[href],button,[tabindex]:not([tabindex="-1"])'),
            function (n) {
                var r = n.getBoundingClientRect();
                return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight;
            });
        if (!pool.length) return;
        var i = pool.indexOf(document.activeElement);
        var next = i === -1 ? (dir > 0 ? 0 : pool.length - 1) : (i + dir + pool.length) % pool.length;
        pool[next].focus();
        beep('ack');
    }
    window.addEventListener('gamepadconnected', function () {
        if (!gamepadTimer) gamepadTimer = setInterval(pollPad, 140);
    });
    window.addEventListener('gamepaddisconnected', function () {
        clearInterval(gamepadTimer); gamepadTimer = null;
    });

    // ── 13. Ресайз: меню не должно вылетать ──
    var rafPending = false;
    function reclamp() {
        if (!isOpen || rafPending) return;
        rafPending = true;
        requestAnimationFrame(function () {
            rafPending = false;
            place(parseFloat(menu.style.left), parseFloat(menu.style.top));
        });
    }
    window.addEventListener('resize', reclamp, { passive: true });
    window.addEventListener('orientationchange', reclamp);
    if (window.visualViewport) {
        visualViewport.addEventListener('resize', reclamp, { passive: true });
        visualViewport.addEventListener('scroll', reclamp, { passive: true });
    }

    // ── 14. Публичный API ──
    window.SingulyarUX = {
        version: '9.2-хозяин-гость',
        open: function () { openMenu(window.innerWidth - 356, 64); },
        openAt: openMenu,
        close: function () { closeMenu(true); },
        toggle: toggleMenu,
        state: function () {
            return {
                open: isOpen,
                config: JSON.parse(JSON.stringify(config)),
                audioCtxCreated: !!audioCtx,
                voiceActive: !!recognition
            };
        },
        _test: { видимые: видимые, place: place, menu: menu }
    };

    try { var сш = decodeURIComponent((location.hash || '').replace(/^#/, ''));
          if (сш === 'модули') setTimeout(function () { try { поНити(); } catch (e) {} }, 350); } catch (е0) {}
    подписи();
    console.log('SINGULYAR UX Engine v9.2 «ХОЗЯИН=ГОСТЬ»: системное ПКМ свободно везде; меню дома — ПКМ по кристаллу/ручке ⌇ или клавиша S; ⌂ — домой на каждой комнате. C — кристалл, N — нить, Esc — закрыть/домой.');
})();
