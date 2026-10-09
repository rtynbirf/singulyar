/*!
 * SINGULYAR UX ENGINE v9.6 «ОДИН ГОЛОС» · метка сборки такта v1.51.0 (суть справок — v9.5)
 * Наследник v9.4 «ПОДСКАЗКИ ВЕЗДЕ» (тот — наследник v9.3 «ТАМ ГДЕ ПОСТАВИЛ»).
 * Главное изменение такта v1.45.0 (слово владельца):
 *   «ПРИ НАВЕДЕНИИ КУРСОРА ОН НЕ ВЫДАЁТ СПРАВКИ!!!
 *    ОН ВЫДАЁТ ТО ЧТО НА КЛАВИШЕ НАПИСАНО»
 *
 * ЧТО ИЗМЕНИЛОСЬ В v9.5:
 *  - справка больше НЕ эхо ярлыка: приоритет data-справка страницы →
 *    словарь дома → разрешение ссылки по манифесту ядра → роль элемента →
 *    и только в самом конце ярлык;
 *  - состояние переключателей (aria-pressed) входит в справку;
 *  - внешние ссылки честно предупреждают: «уйдёт из дома в сеть».
 *  - динамический контент (каталоги, списки, плееры) накрывается
 *    MutationObserver: подсказки появляются у объектов, рождённых скриптом;
 *  - ничего не рисуем и ничего не ломаем: только добавляем отсутствующий
 *    title; элементы с aria-hidden и наше собственное меню пропускаются;
 *  - в меню дома добавлен пункт «Документация дома» (открытый код и
 *    открытые знания — ДОКУМЕНТАЦИЯ.html).
 *
 * Слово владельца v1.34.0 (остаётся в силе):
 *   «КНОПКА БЫВШАЯ ШЕСТЕРЁНКА СЕЙЧАС ТРИ ТОЧКИ НЕ ДОЛЖНА БЫТЬ ПРИВЯЗАНА
 *    ЖЁСТКО — НАДО ЧТОБ КАК ШЕСТЕРЁНКА ТАСКАТЬ МОЖНО БЫЛО ТАМ ГДЕ
 *    ПОЛЬЗОВАТЕЛЬ ХОЧЕТ, А НЕ ТЫ ЕГО ВЫНУЖДАЕШЬ!!! НИКАКОГО НАСИЛИЯ НАД
 *    ДЕЙСТВИЯМИ — СИСТЕМА ДЛЯ ЧЕЛОВЕКА, А НЕ ЧЕЛОВЕК ПОДСТРАИВАЕТСЯ»
 *
 * ЧТО ИЗМЕНИЛОСЬ В v9.3:
 *  - плавающие кнопки ⌂ (домой) и ⌇ (меню дома) ПЕРЕТАСКИВАЮТСЯ мышью и
 *    пальцем на любой точке экрана — как прежняя шестерёнка; позиция
 *    хранится в localStorage (SINGULYAR_UX_V8) и живёт до тех пор, пока
 *    человек сам её не сменит: КУДА ЧЕЛОВЕК ПОСТАВИЛ — ТАМ И СТОИТ;
 *  - клик/тап как работал, так и работает: перетаскивание отличается от
 *    клика порогом 7 px; долгое касание (меню) и ПКМ не тронуты;
 *  - позиции клампятся в экран при переносе, ресайзе и повороте.
 *
 * ПРЕДЫДУЩИЕ ПРИКАЗЫ, ОСТАЮЩИЕСЯ В СИЛЕ:
 *  - v9.1: нативное меню браузера ЖИВЁТ ВЕЗДЕ (копировать/отправить/
 *    поделиться не отнимаются); МЕНЮ ДОМА — только на НАШИХ объектах;
 *  - v9.2: ⌂ домой на каждой комнате; нить Ариадны поднимается из-под
 *    капота.
 *
 * Слово владельца 2026-10-08 — вместо отставшего ярлыка v9.2
 * «ТУТ НЕТ ХОЗЯИН=ГОСТЬ»: бирка «Хозяин проекта» одна, и носит её
 * Человек — ЧЕЛОВЕК един (ед. число), Человек не есть люди: люди
 * умирают, но передают знание из поколения в поколение. Единственность
 * проходит по всей цепи: БОГ=ЗНАНИЕ=ИСТИНА=СМЫСЛ=ЧЕЛОВЕК. Узел и
 * канал RUVSON стоят в доме на почётном первом месте — Зал суверенного
 * узла (·28), как Хелен Келлер в имени фонда: не хозяин и не владелец.
 * Хозяин работы — мы: ты=я.
 *
 * Чистый vanilla JS · 0 зависимостей · офлайн · без innerHTML · без телеметрии
 * Интеграция: <script defer src="singulyar-ux-engine-v9.js"></script>
 * Публичный API: window.SingulyarUX (в конце файла).
 */
(function () {
    'use strict';

    // ── 0. Защита от повторного подключения ──
    if (window.__SINGULYAR_UX_ENGINE__) return;
    window.__SINGULYAR_UX_ENGINE__ = 'v9.6-один-голос';

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
        theme: (saved.theme === 'light' || saved.theme === 'contrast') ? saved.theme : 'dark',
        /* v9.3: места, куда человек сам поставил плавающие кнопки */
        posHome: точка(saved.posHome),
        posHandle: точка(saved.posHandle)
    };
    function точка(в) {
        return (в && num(в.x, NaN) === в.x && num(в.y, NaN) === в.y &&
                isFinite(в.x) && isFinite(в.y)) ? { x: в.x, y: в.y } : null;
    }
    function persist() { storeSave(config); }

    // Уважение к «уменьшить движение»
    var reducedMotion = false;
    try { reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches || !!window.SNG_ТИХО; } catch (e) { reducedMotion = !!window.SNG_ТИХО; }

    // Режим хорошего соседа: хост-страница со своими хоткеями подключает
    // скрипт с data-hotkeys="off" — тогда S/Esc не перехватываются глобально.
    var hostHotkeysOff = false;
    try { hostHotkeysOff = !!(document.currentScript && document.currentScript.dataset.hotkeys === 'off'); } catch (e) {}

    // ── 3. Стили (скоуп по id-префиксу; кристалл: стекло·серебро·золото) ──
    var css = [
        ':root[data-sux-theme="contrast"]{--sux-fg:#ffe680;--sux-accent:#ffd700;--sux-border:#fff;--sux-panel:#000;}',
        ':root[data-sux-theme="light"]{--sux-fg:#101418;--sux-accent:#7a5b10;--sux-border:rgba(0,0,0,.35);--sux-panel:#fff;}',
        ':root:not([data-sux-theme="contrast"]):not([data-sux-theme="light"]){--sux-fg:#C0C8D0;--sux-accent:#D4AF37;--sux-hi:#F0D78C;--sux-border:rgba(240,240,248,.22);--sux-panel:rgba(10,12,16,.94);}',

        '#sux-menu{position:fixed;z-index:40;width:min(calc(100vw - 20px),340px);',
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
        '#sux-handle{position:fixed;right:14px;bottom:14px;z-index:40;width:40px;height:40px;margin:0;padding:0;',
          'border-radius:50%;display:flex;align-items:center;justify-content:center;',
          'font:17px/1 var(--sux-mono,Cascadia Mono,ui-monospace,Consolas,"Courier New",monospace);',
          'color:var(--sux-accent,#D4AF37);background:var(--sux-panel,rgba(10,12,16,.82));',
          'border:1px solid var(--sux-border,rgba(240,240,248,.22));cursor:grab;',
          'touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;',
          'box-shadow:0 10px 28px rgba(0,0,0,.45),inset 0 1px 0 rgba(240,240,248,.08);',
          'backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);',
          'opacity:.62;transition:opacity .2s ease,border-color .2s ease,transform .12s ease}',
        '#sux-handle:hover,#sux-handle:focus-visible{opacity:1;border-color:rgba(212,175,55,.55);color:var(--sux-hi,#F0D78C)}',
        '#sux-handle:focus-visible{outline:1px solid rgba(212,175,55,.6);outline-offset:3px}',
        '#sux-handle:active{transform:scale(.94)}',
        '/* v9.3: кнопки таскаются — состояние перетаскивания */',
        '#sux-handle.снг-тянет,#sux-home.снг-тянет{cursor:grabbing;opacity:1;transform:none;',
          'border-color:rgba(212,175,55,.65);color:var(--sux-hi,#F0D78C);transition:none}',
        '@media (prefers-reduced-motion: reduce){#sux-handle.снг-тянет,#sux-home.снг-тянет{transition:none}}',
        '#crystalButton{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;touch-action:manipulation}',
        '#sux-home{position:fixed;right:14px;bottom:62px;z-index:40;width:40px;height:40px;margin:0;padding:0;',
          'border-radius:50%;display:flex;align-items:center;justify-content:center;font:16px/1 var(--sux-mono,Cascadia Mono,ui-monospace,Consolas,"Courier New",monospace);',
          'color:var(--sux-fg,#C0C8D0);background:var(--sux-panel,rgba(10,12,16,.82));border:1px solid var(--sux-border,rgba(240,240,248,.22));cursor:grab;',
          'touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;',
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
    item('⌇', 'Нить Ариадны · дом 19 дверей', поНити, { клавиша: 'N' });

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
        item('§', 'Документация дома', function () {
        сказать('Открываю документацию дома: открытый код и открытые знания.');
        try { window.__SUX_NAVIGATING__ = { to: 'ДОКУМЕНТАЦИЯ.html', at: Date.now() }; } catch (e) {}
        window.location.href = 'ДОКУМЕНТАЦИЯ.html';
    });
    item('·', 'сборка v1.49.0 · ОДНА КНОПКА', function () {}, { мертв: true });

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
        /* v9.4: подсказки живут вместе с подписями */
        эЗвук.title = 'Звук касаний: тихий отклик на действия дома. Переключить.';
        эТема.title = 'Тема дома: тёмная / светлая / контраст. Переключить.';

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
        /* v9.6 «ОДИН ГОЛОС»: меню закрыто — слово всё равно дойдёт, через общую очередь дома */
        try { if (window.__ALERT && !menu.classList.contains('open')) window.__ALERT(текст, { мирно: true }); } catch (e2) {}
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
        /* долгое касание (экраны без ПКМ): 550 мс без движения — меню дома.
       Если кнопку в этот момент таскают — меню не выпрыгивает */
        var таймер = null, sx = 0, sy = 0;
        узел.addEventListener('pointerdown', function (e) {
            if (e.pointerType === 'mouse') return;
            sx = e.clientX; sy = e.clientY;
            if (таймер) clearTimeout(таймер);
            таймер = setTimeout(function () {
                таймер = null;
                if (узел.classList && узел.classList.contains('снг-тянет')) return;
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

    /* ── 8b. ПЕРЕТАСКИВАНИЕ ПЛАВАЮЩИХ КНОПОК (v9.3, слово владельца:
       «ТАСКАТЬ МОЖНО БЫЛО ТАМ ГДЕ ПОЛЬЗОВАТЕЛЬ ХОЧЕТ… НИКАКОГО НАСИЛИЯ»).
       Мышь и палец; порог 7 px отделяет перетаскивание от клика;
       позиция — в localStorage: куда человек поставил, там и стоит. */
    function перетаскивание(узел, ключ) {
        if (!узел || узел.dataset.снгТаск) return;
        узел.dataset.снгТаск = '1';
        var тянем = false, сдвинули = false;
        var sx = 0, sy = 0, ox = 0, oy = 0;

        function сейчас() {
            var пр = узел.getBoundingClientRect();
            return { x: пр.left, y: пр.top };
        }
        function кламп(x, y) {
            var пр = узел.getBoundingClientRect();
            var ш = пр.width || 40, в = пр.height || 40;
            x = Math.min(Math.max(6, x), Math.max(6, window.innerWidth - ш - 6));
            y = Math.min(Math.max(6, y), Math.max(6, window.innerHeight - в - 6));
            return { x: x, y: y };
        }
        function поставить(x, y) {
            var к = кламп(x, y);
            узел.style.left = к.x + 'px';
            узел.style.top = к.y + 'px';
            узел.style.right = 'auto';
            узел.style.bottom = 'auto';
        }
        узел.addEventListener('pointerdown', function (e) {
            if (e.button != null && e.button !== 0) return;   /* ПКМ — меню дома */
            var м = сейчас();
            sx = e.clientX; sy = e.clientY; ox = м.x; oy = м.y;
            тянем = true; сдвинули = false;
            try { узел.setPointerCapture(e.pointerId); } catch (err) {}
        });
        узел.addEventListener('pointermove', function (e) {
            if (!тянем) return;
            var dx = e.clientX - sx, dy = e.clientY - sy;
            if (!сдвинули && Math.hypot(dx, dy) > 7) {
                сдвинули = true;
                узел.classList.add('снг-тянет');
            }
            if (сдвинули) поставить(ox + dx, oy + dy);
        });
        ['pointerup', 'pointercancel'].forEach(function (имя) {
            узел.addEventListener(имя, function (e) {
                if (!тянем) return;
                тянем = false;
                узел.classList.remove('снг-тянет');
                if (!сдвинули) return;                     /* это был клик/тап */
                var м = кламп(сейчас().x, сейчас().y);
                поставить(м.x, м.y);
                config['pos' + ключ] = { x: м.x, y: м.y };
                persist();
                гаситьКлик = true;                          /* не дёрнуться кликом */
                if (e.cancelable) e.preventDefault();
            });
        });
        /* возвращаем место человека (кламп на случай смены экрана) */
        var сохран = config['pos' + ключ];
        if (сохран) поставить(сохран.x, сохран.y);
        /* ресайз/поворот: кнопка не теряется за краем */
        window.addEventListener('resize', function () {
            if (тянем || !узел.isConnected) return;
            var пр = узел.getBoundingClientRect();
            if (пр.width === 0 && пр.height === 0) return;
            var к = кламп(пр.left, пр.top);
            if (к.x !== пр.left || к.y !== пр.top) {
                поставить(к.x, к.y);
                config['pos' + ключ] = { x: к.x, y: к.y };
                persist();
            }
        }, { passive: true });
    }

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
            перетаскивание(домой, 'Home');
        }
        if (наХабе) return;
        var ручка = el('button', {
            id: 'sux-handle', type: 'button',
            'aria-label': 'Меню дома СИНГУЛЯР',
            title: 'МЕНЮ ДОМА · ПКМ здесь, долгое касание или клавиша S'
        }, '⌇');
        document.body.appendChild(ручка);
        нашОбъект(ручка);
        перетаскивание(ручка, 'Handle');
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
            /* v10.7 закон верхнего слоя: Esc при открытом диалоге (ПУЛЬТ, легенда, языки…) закрывает сам диалог — не ведёт на index */
            if (document.querySelector && document.querySelector('dialog[open]')) return;
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
    // v9.6 «ОДИН ГОЛОС» (П2/T-19): микрофон один на страницу. Если голос страницы
    // (КВАРТИРНИК) уже держит распознаватель — второй SR не рождается: вливаемся
    // слушателем через брокер __ГОЛОС и разбираем только свои слова.
    var recognition = null;
    var влитой = false;
    function м2Слова(t) {
        if (/(меню|настройк|settings|menu)/.test(t)) { beep('ack'); openMenu(window.innerWidth - 356, 64); }
        else if (/(закры|close|назад)/.test(t)) { beep('ack'); closeMenu(true); }
        else if (/(домой|главное|home)/.test(t)) window.location.href = 'index.html';
        else if (/(нить|двери|дом)/.test(t)) { beep('ack'); поНити(); }
        else if (/(осколк|кристалл|рассып)/.test(t)) {
            var д = осколкиДвижок();
            if (д) { д.переключить(); подписи(); }
        }
    }
    function startVoice() {
        var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { сказать('Голос не поддерживается этим браузером.'); config.voiceOn = false; persist(); подписи(); return; }
        if (window.__ГОЛОС && window.__ГОЛОС.хост === 'кв') {
            влитой = true;
            window.__ГОЛОС.слушать('м2', function (t, поёт) { if (!поёт) м2Слова(t); });
            сказать('Микрофон один на страницу: слушаю вместе с голосом КВАРТИРНИКА.');
            return;
        }
        if (window.__ГОЛОС) window.__ГОЛОС.занять('м2');
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
                м2Слова(t);
                if (window.__ГОЛОС) window.__ГОЛОС.раздать(t, false);
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
    function stopVoice(выключить) {
        if (влитой) {
            влитой = false;
            if (window.__ГОЛОС) window.__ГОЛОС.снять('м2');
            if (выключить) { config.voiceOn = false; persist(); подписи(); }
            return;
        }
        if (window.__ГОЛОС) window.__ГОЛОС.освободить('м2');
        if (!recognition) return;
        var r = recognition; recognition = null;
        r.onend = null; r.onresult = null; r.onerror = null;
        try { r.stop(); } catch (e) {}
    }
    /* наружу — для брокера «ОДИН ГОЛОС»: preempt уважает выключатель в меню */
    window.__М2ГОЛОС = {
        активен: function () { return влитой || !!recognition; },
        стоп: function () { stopVoice(true); }
    };

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


    // ── 13b. СПРАВКИ ВЕЗДЕ (v9.5, слово владельца: «ПРИ НАВЕДЕНИИ КУРСОРА ОН
    // НЕ ВЫДАЁТ СПРАВКИ!!! ОН ВЫДАЁТ ТО ЧТО НА КЛАВИШЕ НАПИСАНО») ──
    // Справка — это НЕ эхо ярлыка. Приоритет честной справки:
    //   1) data-справка страницы: автор сказал правду о своём контроле;
    //   2) словарь дома: известные контролы — известные справки;
    //   3) разрешение ссылки: дверь из манифеста ядра → «Дверь ·NN ИМЯ: кратко»;
    //   4) роль элемента: отправка формы, свернуть/развернуть, внешняя ссылка;
    //   5) только в самом конце — ярлык, если о контроле больше нечего сказать.
    // По-прежнему только title: ничего не рисуем, ничего не перекрываем,
    // нативное поведение браузера. data-нет-подсказки = явный отказ страницы.
    var ПОДСКАЗКИ_СЕЛЕКТОР =
        'button,a[href],input:not([type=hidden]),select,textarea,summary,' +
        '[role=button],[role=tab],[role=menuitem],[role=option],' +
        '[role=checkbox],[role=switch],[role=slider],' +
        '[contenteditable="true"],img[alt]';

    var СЛОВАРЬ_СПРАВОК = [
        ['#crystalButton', 'Кристалл SINGULYAR: касание — рассыпается на двери дома, ещё касание — собирается. Осколки можно перетаскивать: где поставил, там стоит.'],
        ['#намерениеВвод', 'Скажи своими словами, что хочешь сделать. Дом ответит, в каких дверях это живёт. Слова человека дом не записывает.'],
        ['.намерение-кнопка', 'Спросить дом: он покажет двери, где это делается.'],
        ['#яСам', 'Открыть весь дом сразу: нить Ариадны со всеми дверями. Инвариант I-11: «Я сам» не меньше любого ответа дома.'],
        ['.намерение-сам', 'Открыть весь дом сразу: нить Ариадны со всеми дверями.'],
        ['.дверь', 'Дверь дома: автономная комната со своим кодом. Пройденные двери светятся золотом.'],
        ['.нить-дверь', 'Документация дома: инварианты с доказательствами, открытый код, данные и языки.'],
        ['.sng-strip .sng-map', 'Карта модулей: все комнаты дома одной страницей.'],
        ['.sng-нав a', 'Сквозная навигация: шаг в соседнюю дверь, не возвращаясь на лицо дома.'],
        ['.нить-линия', 'Нить Ариадны: потяни — и дом откроется.'],
        ['summary', 'Раздел сворачивается и разворачивается: нажми, чтобы показать содержимое.'],
        ['a[href*="ДОКУМЕНТАЦИЯ"]', 'Документация дома: инварианты I-01…I-11, каждый доказан тестом; открытый код и данные.'],
        ['a[href*="ИНСТРУКЦИЯ_ДОМА"]', 'Инструкция дома: как устроен дом и как им пользоваться — шаг за шагом.'],
        ['a[href*="ИНСТРУКЦИЯ_УСТАНОВКИ"]', 'Установка СИНГУЛЯР на устройство: приложение (PWA), офлайн, ноль сети.'],
        ['a[href*="ПРОТОКОЛ_ВЫВОДА"]', 'Протокол вывода на экран: как дом показывает один смысл в любом представлении.'],
        ['.пульт-хозяина #музПлей', 'ПЛЕЙ: играет текущую песню локального фонда дома (файлы в доме, сеть не нужна). После паузы — с того же места.'],
        ['.пульт-хозяина #музПауза', 'ПАУЗА: остановить песню, запомнив место. ПЛЕЙ продолжит с него.'],
        ['.пульт-хозяина #музСтоп', 'СТОП: полная остановка — песня сбрасывается в начало. РЕПИТ и СЛУЧАЙНО остаются в своих режимах.'],
        ['.пульт-хозяина #музРепит', 'РЕПИТ: текущая песня по кругу.'],
        ['.пульт-хозяина #музСлучайно', 'СЛУЧАЙНО: после конца песни дом ставит случайную (не повторяя текущую). Выкл — песни идут по порядку фонда.'],
        ['.пульт-хозяина #пультНить', 'Нить Ариадны: все двери дома одной страницей — сквозной путь по дому.']
    ];

    function словарь(n) {
        for (var i = 0; i < СЛОВАРЬ_СПРАВОК.length; i++) {
            try { if (n.matches && n.matches(СЛОВАРЬ_СПРАВОК[i][0])) return СЛОВАРЬ_СПРАВОК[i][1]; }
            catch (е4) {}
        }
        return '';
    }

    function справкаСсылки(a) {
        var href = '';
        try { href = a.getAttribute('href') || ''; } catch (е5) { return ''; }
        if (!href) return '';
        if (href.charAt(0) === '#') return 'Раздел на этой странице: прокрутить к нему.';
        if (/^(https?:|\/\/)/i.test(href)) {
            return a.getAttribute('target') === '_blank'
                ? 'Внешняя ссылка — уйдёт из дома в сеть, откроется в новой вкладке. Дом сам никуда не ходит: ведёшь только ты.'
                : 'Внешняя ссылка — уйдёт из дома в сеть. Дом сам никуда не ходит: ведёшь только ты.';
        }
        var файл = href.split('#')[0].split('?')[0].split('/').pop();
        var якорь = href.indexOf('#') > -1 ? ' (и открыть раздел)' : '';
        try {
            if (window.SNG && SNG.модуль) {
                for (var i = 0; i < SNG.модуль.length; i++) {
                    var м = SNG.модуль[i];
                    if (м.файл === файл) {
                        if (м.id === 'хаб') return 'Хаб дома ·00: кристалл, намерение «Что хотите сделать?», нить Ариадны. Вернуться на лицо дома.';
                        return 'Дверь ' + м.номер + ' ' + м.имя + ': ' + м.кратко + '. Открыть комнату' + якорь + '.';
                    }
                }
            }
        } catch (е6) {}
        if (файл === 'index.html') return 'Лицо дома: кристалл, намерение, нить Ариадны, пульт хозяина.';
        if (!файл) return '';
        return 'Открывает файл дома: ' + файл + якорь + '.';
    }

    function подсказкаТекст(n) {
        var t = '';
        try {
            t = n.getAttribute('data-справка') || '';
            if (!t) t = словарь(n);
            if (!t && n.tagName === 'A') t = справкаСсылки(n);
            if (!t && n.tagName === 'BUTTON' && n.getAttribute('type') === 'submit')
                t = 'Отправить форму: дом примет то, что введено.';
            if (!t && n.tagName === 'INPUT') t = n.getAttribute('placeholder') || '';
            if (!t && n.tagName === 'IMG') t = n.getAttribute('alt') || '';
            if (!t) t = (n.textContent || '').replace(/\s+/g, ' ').trim(); /* последний рубеж */
            /* состояние переключателя — часть справки */
            var п = n.getAttribute('aria-pressed');
            if (t && (п === 'true' || п === 'false'))
                t += (п === 'true') ? ' Сейчас: включено.' : ' Сейчас: выключено.';
        } catch (e) { return ''; }
        if (t.length > 160) t = t.slice(0, 157) + '…';
        return t;
    }

    function подсказки(корень) {
        var список;
        try { список = (корень || document).querySelectorAll(ПОДСКАЗКИ_СЕЛЕКТОР); }
        catch (e) { return; }
        for (var i = 0; i < список.length; i++) подписать(список[i]);
    }

    function подписать(n) {
        try {
            if (!n || n.nodeType !== 1) return;
            if (n.hasAttribute('title')) return;                          /* уже подписано страницей */
            if (n.getAttribute('aria-hidden') === 'true') return;         /* скрытым — не надо */
            /* disabled тоже подписываем: кнопка оживёт — подсказка уже на месте */
            if (n.closest && n.closest('[data-нет-подсказки]')) return;   /* явный отказ страницы */
            var t = подсказкаТекст(n);
            if (!t) return;
            n.setAttribute('title', t);
        } catch (е1) { /* один элемент не должен валить остальные */ }
    }

    /* динамика: каталоги и списки рождаются скриптом — дожимаем подсказки и там.
       Дёшево: сканируем только если добавился ELEMENT-узел, не чаще раза в 400 мс;
       обновления текста (счётчики, караоке-слова) узлов не рождают и не будят нас. */
    var поПодсказки = null, послСкан = 0;
    function подсказкиОтложено() {
        if (поПодсказки) return;
        var ждать = Math.max(0, 300 - (Date.now() - послСкан));
        поПодсказки = setTimeout(function () {
            поПодсказки = null; послСкан = Date.now();
            подсказки(document);
        }, ждать);
    }
    function сканУзла(n) {
        /* добавленное поддерево подписываем сразу же, не дожидаясь бэкстопа:
           и сам узел (это может быть уже готовая кнопка), и его потомков */
        try {
            if (n.nodeType !== 1) return;
            if (n.matches && n.matches(ПОДСКАЗКИ_СЕЛЕКТОР)) подписать(n);
            подсказки(n);
        } catch (е3) {}
    }
    try {
        new MutationObserver(function (порции) {
            var нужно = false;
            for (var i = 0; i < порции.length; i++) {
                var adds = порции[i].addedNodes;
                for (var j = 0; j < adds.length; j++) {
                    if (adds[j].nodeType === 1) { сканУзла(adds[j]); нужно = true; }
                }
            }
            if (нужно) подсказкиОтложено();   /* бэкстоп: добить весь документ */
        }).observe(document.documentElement, { childList: true, subtree: true });
    } catch (е2) { /* старые среды: подсказки стоят хотя бы на старте */ }

    /* v9.5: справка переключателя ЖИВЁТ — после клика пересчитываем title,
       чтобы «Сейчас: включено/выключено» не застаивалось. Пересчёт отложен
       в макрозадачу: обработчики страницы успевают сменить aria-pressed. */
    try {
        document.addEventListener('click', function (ev) {
            setTimeout(function () {
                try {
                    var n = ev.target;
                    if (!n || n.nodeType !== 1 || !n.getAttribute) return;
                    var п = n.getAttribute('aria-pressed');
                    if (п !== 'true' && п !== 'false') return;
                    if (n.closest && n.closest('[data-нет-подсказки]')) return;
                    var t = подсказкаТекст(n);
                    if (t) n.setAttribute('title', t);
                } catch (е9) {}
            }, 0);
        }, true);
    } catch (е10) { /* без пересчёта дом тоже живёт — справка просто старее */ }

    // ── 14. Публичный API ──
    window.SingulyarUX = {
        version: '9.6-один-голос',
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
    подсказки(document);          /* v9.5: старт-скан — после именования меню */
    console.log('SINGULYAR UX Engine v9.5 «СПРАВКИ ВЕЗДЕ»: при наведении — настоящая справка (что делает контрол, как, что сейчас включено), а не эхо ярлыка; ⌂ и ⌇ таскаются — куда поставил, там стоит; нативное ПКМ свободно везде. S — меню (в нём есть «Документация дома»), N — нить, Esc — закрыть/домой.');
})();
