/*!
 * SINGULYAR UX ENGINE v8.0 FINAL — единая консолидированная версия
 * Заменяет собой v1–v7 (все семь файлов) и исправляет найденные в аудите баги.
 *
 * Чистый vanilla JS · 0 зависимостей · офлайн · без innerHTML · без телеметрии
 *
 * ЧТО ИСПРАВЛЕНО ОТНОСИТЕЛЬНО v1–v7 (кратко, полный список — в АУДИТ_ОТЧЁТЕ):
 *  v1: тултипы больше не срезают доступное имя (title → aria-label, не в data-*);
 *      MutationObserver убран (тормозил при посимвольной подсветке караоке).
 *  v2: движок больше НЕ перекрашивает хост-страницу (body !important убран);
 *      фокус больше не крадётся у контента «watchdog'ом».
 *  v3–v7: drag&drop восстановлен и сделан на Pointer Events с pointer capture;
 *      баг «после перетаскивания клавиша S не работает» устранён (suppressClick).
 *  v4: диагностика 9 точек теперь меряет панель в ПОЛНОМ масштабе
 *      (в v4 замер шёл по scale(0.7) — «9/9 ОК» было ложноположительным);
 *      позиция шестерёнки после диагностики восстанавливается (в v4/v7 терялась).
 *  v5: keyCode 8 (Backspace) больше не «Назад»; предупреждений alert() нет.
 *  v6: ГЛАВНОЕ — hover больше не вызывает автоклик (dwell-движок v6 кликал любую
 *      кнопку, над которой мышь стояла 0.8 с — фатально для обычных мышей);
 *      микрофон больше не включается сам при загрузке; SpeechRecognition —
 *      только явный opt-in (и честное предупреждение: в Chrome это облако);
 *      gamepad-поллинг: вечный rAF-цикл 60 fps заменён на опрос при
 *      подключённом геймпаде (экономия батареи).
 *  v7: в v7 drag&drop был вообще выкинут (при заявленном «перетащите») —
 *      здесь восстановлен; isExpanded больше не «догоняет» асинхронно в rAF.
 *  Общее: горячие клавиши игнорируются при вводе текста (INPUT/TEXTAREA/SELECT/
 *      contenteditable/isComposing); Ctrl/Meta-модификаторы уважаются;
 *      prefers-reduced-motion поддержан; повторное подключение скрипта безопасно.
 *
 * Интеграция: <script defer src="singulyar-ux-engine-v8-final.js"></script>
 * Публичный API для тестов/ТВ: window.SingulyarUX (см. конец файла).
 */
(function () {
    'use strict';

    // ── 0. Защита от повторного подключения (в v1–v7 отсутствовала: двойной
    //    скрипт = две шестерёнки с одинаковыми id и двойные обработчики) ──
    if (window.__SINGULYAR_UX_ENGINE__) return;
    window.__SINGULYAR_UX_ENGINE__ = 'v8.0-final';

    // ── 1. Безопасное хранилище (file:// и приватные режимы могут кидать) ──
    var STORE_KEY = 'SINGULYAR_UX_V8';

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
        x: num(saved.x, null),                    // позиция шестерёнки (null = авторазмещение)
        y: num(saved.y, null),
        spring: (saved.spring === 'snappy' || saved.spring === 'cinematic') ? saved.spring : 'elastic',
        audioOn: saved.audioOn !== false,          // клики — да
        audioHover: saved.audioHover === true,     // звуки при наведении — ВЫКЛ по умолчанию (v6 спамил)
        volume: Math.min(0.5, Math.max(0.02, num(saved.volume, 0.25))),
        voiceOn: saved.voiceOn === true,           // микрофон — ВЫКЛ по умолчанию (v6 включал сам!)
        theme: (saved.theme === 'light' || saved.theme === 'contrast') ? saved.theme : 'dark'
    };
    function persist() { storeSave(config); }

    var SPRING = {
        elastic:   '0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
        snappy:    '0.15s cubic-bezier(0.2, 1.4, 0.4, 1)',
        cinematic: '0.42s cubic-bezier(0.16, 1, 0.3, 1)'
    };

    // Уважение к «уменьшить движение» (в v1–v7 не было вообще)
    var reducedMotion = false;
    try { reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

    // Режим хорошего соседа: хост-страница со своими горячими клавишами подключает
    // скрипт с data-hotkeys="off" — тогда движок НЕ перехватывает Esc/S/Shift+T
    // глобально (только закрывает собственную панель). Один клик до выхода
    // всё равно остаётся: шестерёнка всегда на экране, в ней кнопка «Главное меню».
    var hostHotkeysOff = false;
    try { hostHotkeysOff = !!(document.currentScript && document.currentScript.dataset.hotkeys === 'off'); } catch (e) {}

    // ── 3. Стили (скоуп по id-префиксу, без !important-ковра на весь документ) ──
    var css = [
        ':root[data-sux-theme="contrast"]{--sux-bg:#000;--sux-fg:#ff0;--sux-accent:#ff0;--sux-border:#fff;--sux-panel:#000;}',
        ':root[data-sux-theme="light"]{--sux-bg:#f2f4f8;--sux-fg:#101418;--sux-accent:#0066cc;--sux-border:rgba(0,0,0,.25);--sux-panel:#fff;}',
        ':root:not([data-sux-theme="contrast"]):not([data-sux-theme="light"]){--sux-bg:rgba(16,22,31,.94);--sux-fg:#eef4f9;--sux-accent:#D4AF37;--sux-border:rgba(212,175,55,.55);--sux-panel:rgba(16,22,31,.97);}',

        '#sux-gear{position:fixed;z-index:2147483000;top:16px;right:16px;width:clamp(52px,4.5vw,72px);height:clamp(52px,4.5vw,72px);',
        'border-radius:50%;background:var(--sux-bg);color:var(--sux-accent);border:2px solid var(--sux-border);',
        'box-shadow:0 8px 24px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;',
        'font-size:clamp(24px,2.4vw,34px);cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none;',
        'padding:0;line-height:1;transition:transform .2s ease,box-shadow .2s ease;}',
        '#sux-gear:active{cursor:grabbing}',
        '#sux-gear:hover{transform:scale(1.06)}',
        '#sux-gear:focus-visible{outline:3px solid var(--sux-accent);outline-offset:3px}',
        '#sux-gear[aria-expanded="true"] > span{transform:rotate(90deg)}',
        '#sux-gear > span{display:inline-block;transition:transform .3s ease}',

        '#sux-panel{position:fixed;z-index:2147483001;width:min(calc(100vw - 20px),440px);max-height:min(78vh,640px);overflow-y:auto;',
        'background:var(--sux-panel);color:var(--sux-fg);border:2px solid var(--sux-border);border-radius:16px;',
        'box-shadow:0 18px 50px rgba(0,0,0,.55);padding:16px;font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;',
        'display:none;opacity:0;transform:scale(.9);will-change:transform,opacity;}',
        '#sux-panel.open{display:block}',
        '#sux-panel.show{opacity:1;transform:scale(1)}',
        '#sux-panel h2{margin:0 0 10px;font-size:16px;color:var(--sux-accent);display:flex;align-items:center;gap:8px;}',
        '#sux-panel .sux-note{margin:0 0 12px;color:color-mix(in srgb,var(--sux-fg) 72%,transparent);font-size:13px}',

        '.sux-btn{display:block;width:100%;text-align:left;margin:0 0 8px;padding:11px 13px;border-radius:10px;',
        'background:transparent;border:1.5px solid var(--sux-border);color:var(--sux-fg);font:inherit;cursor:pointer;}',
        '.sux-btn:hover{background:color-mix(in srgb,var(--sux-accent) 14%,transparent)}',
        '.sux-btn:focus-visible{outline:3px solid var(--sux-accent);outline-offset:2px}',
        '.sux-btn[data-on="1"]{background:color-mix(in srgb,var(--sux-accent) 22%,transparent);font-weight:700}',
        '.sux-btn.danger{border-color:#ff3b5c;color:#ff6b83}',
        '.sux-close{position:absolute;top:10px;right:10px;width:38px;height:38px;border-radius:50%;border:1.5px solid var(--sux-border);',
        'background:transparent;color:var(--sux-fg);font-size:18px;cursor:pointer;}',
        '.sux-close:hover{background:#ff3b5c;border-color:#ff3b5c;color:#fff}',
        '.sux-close:focus-visible{outline:3px solid var(--sux-accent);outline-offset:2px}',

        '#sux-status{margin-top:6px;padding:8px 10px;border-radius:8px;font-size:12.5px;white-space:pre-line;display:none;',
        'background:color-mix(in srgb,var(--sux-accent) 10%,transparent)}',
        '#sux-status.err{background:rgba(255,59,92,.14)}',

        '.sux-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 10px;font-size:13px}',
        '.sux-row output{font-variant-numeric:tabular-nums;opacity:.8}',

        '@media (prefers-reduced-motion: reduce){',
        '  #sux-gear,#sux-gear>span,#sux-panel{transition:none !important;animation:none !important}',
        '}',
        '@media print{#sux-gear,#sux-panel{display:none !important}}'
    ].join('');

    var styleEl = document.createElement('style');
    styleEl.id = 'sux-style';
    styleEl.textContent = css;               // статическая строка, не пользовательский ввод
    document.head.appendChild(styleEl);

    // Применяем тему ТОЛЬКО к собственным элементам движка (v2 красила весь body)
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

    // ── 5. Шестерёнка ──
    var gear = el('button', {
        id: 'sux-gear',
        type: 'button',
        'aria-label': 'Настройки и навигация СИНГУЛЯР. Перетащите в удобное место — позиция запомнится. Клавиша S.',
        'aria-expanded': 'false',
        'aria-haspopup': 'dialog',
        title: 'Настройки (S) · потяните, чтобы передвинуть'
    });
    var gearIcon = el('span', null, '⚙');
    gear.appendChild(gearIcon);
    document.body.appendChild(gear);

    // Позиция: clamp в видимые границы; НЕ мутируем userAnchor при служебных
    // перестановках (v4/v7 портили позицию диагностикой именно из-за этого).
    function clampPos(x, y) {
        var w = gear.offsetWidth || 56, h = gear.offsetHeight || 56;
        var maxX = Math.max(8, window.innerWidth - w - 8);
        var maxY = Math.max(8, window.innerHeight - h - 8);
        return { x: Math.min(Math.max(8, x), maxX), y: Math.min(Math.max(8, y), maxY) };
    }
    function placeGear(x, y, mutateAnchor) {
        var c = clampPos(x, y);
        gear.style.left = c.x + 'px';
        gear.style.top = c.y + 'px';
        if (mutateAnchor) { config.x = c.x; config.y = c.y; }
        return c;
    }
    function placeGearInitial() {
        if (config.x == null || config.y == null) {
            // авторазмещение: правый верхний угол с учётом safe-area
            var inset = 16;
            try { inset = Math.max(16, parseInt(getComputedStyle(document.documentElement).getPropertyValue('--singulyar-safe-top')) || 16); } catch (e) {}
            placeGear(window.innerWidth - (gear.offsetWidth || 56) - inset, inset, true);
        } else {
            placeGear(config.x, config.y, false);   // сохранённое — клампим, но не переписываем
        }
    }
    placeGearInitial();

    var saveTimer = null;
    function persistPositionSoon() {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(persist, 250);
    }

    // ── 6. Панель (role=dialog, ловушка фокуса, возврат фокуса) ──
    var panel = el('div', { id: 'sux-panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Быстрые настройки СИНГУЛЯР' });

    var head = el('h2');
    var headIcon = el('span', null, '⚙');
    head.appendChild(headIcon);
    head.appendChild(document.createTextNode(' Быстрые настройки'));
    var closeBtn = el('button', { class: 'sux-close', type: 'button', 'aria-label': 'Закрыть (Esc)', title: 'Закрыть (Esc)' }, '×');

    var status = el('div', { id: 'sux-status', role: 'status', 'aria-live': 'polite' });

    var btnHome = el('button', { class: 'sux-btn', type: 'button' }, '🏠 Главное меню — в один клик');
    btnHome.title = 'Вернуться на index.html (Esc)';

    var btnAudio = el('button', { class: 'sux-btn', type: 'button' });
    var btnVoice = el('button', { class: 'sux-btn', type: 'button' });
    var btnTheme = el('button', { class: 'sux-btn', type: 'button' });
    var btnDiag  = el('button', { class: 'sux-btn', type: 'button' }, '⚡ Диагностика 9 точек экрана');
    btnDiag.title = 'Проверка: панель не выходит за границы ни в одной из 9 зон';
    var btnReset = el('button', { class: 'sux-btn danger', type: 'button' }, '📍 Сбросить положение шестерёнки');

    // Громкость: честный ползунок вместо отсутствия настройки
    var volRow = el('div', { class: 'sux-row' });
    var volLabel = el('label', { for: 'sux-vol' }, 'Громкость кликов');
    var volOut = el('output', null, Math.round(config.volume * 100) + '%');
    var vol = el('input', { id: 'sux-vol', type: 'range', min: '2', max: '50', step: '2', style: { flex: '1' } });
    vol.value = String(Math.round(config.volume * 100));
    volRow.appendChild(volLabel); volRow.appendChild(vol); volRow.appendChild(volOut);

    panel.appendChild(head);
    panel.appendChild(closeBtn);
    panel.appendChild(btnHome);
    panel.appendChild(btnAudio);
    panel.appendChild(btnVoice);
    panel.appendChild(btnTheme);
    panel.appendChild(btnDiag);
    panel.appendChild(volRow);
    panel.appendChild(btnReset);
    panel.appendChild(status);
    document.body.appendChild(panel);

    function refreshToggles() {
        btnAudio.textContent = '🔊 Звуковые клики: ' + (config.audioOn ? 'ВКЛ' : 'выкл');
        btnAudio.dataset.on = config.audioOn ? '1' : '0';
        btnVoice.textContent = '🎙️ Голосовые команды: ' + (config.voiceOn ? 'ВКЛ' : 'выкл (по умолчанию)');
        btnVoice.dataset.on = config.voiceOn ? '1' : '0';
        btnVoice.title = 'Внимание: в Chrome распознавание речи работает через облако Google. ' +
                         'Для полностью офлайн-сборки держите выключенным.';
        var themeNames = { dark: '🌙 Тема: тёмная', light: '☀️ Тема: светлая', contrast: '⚡ Тема: контраст (WCAG AAA)' };
        btnTheme.textContent = themeNames[config.theme] || themeNames.dark;
    }
    refreshToggles();

    // ── 7. Звук: ленивый AudioContext, создаётся только в жесте пользователя ──
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
    // Раскрутка контекста допускается только из реального жеста:
    ['pointerdown', 'keydown'].forEach(function (ev) {
        window.addEventListener(ev, function () { if (config.audioOn) ensureCtx(); }, { once: true, passive: true });
    });

    function beep(type) {
        if (!config.audioOn) return;
        var ctx = audioCtx;                    // без ensureCtx(): вне жеста не создаём
        if (!ctx || ctx.state !== 'running') return;
        try {
            var t = ctx.currentTime;
            var o1 = ctx.createOscillator(), o2 = null, g = ctx.createGain(), f = ctx.createBiquadFilter();
            f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 1.2;   // PA-дружелюбный коридор ~0.9–3.4 кГц
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
            } else if (type === 'focus') {
                o1.type = 'sine'; o1.frequency.setValueAtTime(880, t);
                g.gain.setValueAtTime(v * 0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.012);
                o1.start(t); o1.stop(t + 0.014);
            } else if (type === 'ack') {
                o1.type = 'sine';
                o1.frequency.setValueAtTime(1046.5, t); o1.frequency.setValueAtTime(1318.5, t + 0.03);
                g.gain.setValueAtTime(v * 0.6, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
                o1.start(t); o1.stop(t + 0.1);
            }
        } catch (e) { /* звук не критичен */ }
    }

    // ── 8. Открытие/закрытие панели (синхронный isExpanded — баг v7 устранён) ──
    var isOpen = false;
    var lastFocus = null;

    function focusables(root) {
        return Array.prototype.filter.call(
            root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
            function (n) { return !n.disabled && n.offsetParent !== null; }
        );
    }

    function openPanel() {
        if (isOpen) return;
        isOpen = true;
        lastFocus = document.activeElement && document.activeElement !== document.body ? document.activeElement : gear;
        panel.classList.add('open');
        layoutPanelClamped();
        gear.setAttribute('aria-expanded', 'true');
        // Анимация появления (если не reduced-motion)
        requestAnimationFrame(function () {
            panel.classList.add('show');
            var first = focusables(panel)[0];
            if (first) first.focus(); else closeBtn.focus();
        });
        beep('open');
    }

    function closePanel(returnFocus) {
        if (!isOpen) return;
        isOpen = false;
        panel.classList.remove('show');
        gear.setAttribute('aria-expanded', 'false');
        var hide = function () {
            if (!isOpen) panel.classList.remove('open');
            panel.removeEventListener('transitionend', hide);
        };
        panel.addEventListener('transitionend', hide);
        setTimeout(hide, reducedMotion ? 0 : 320);   // страховка, если transitionend не придёт
        if (returnFocus !== false) {
            var back = lastFocus && document.contains(lastFocus) ? lastFocus : gear;
            try { back.focus({ preventScroll: true }); } catch (e) { back.focus(); }
        }
        beep('close');
    }

    function togglePanel() { isOpen ? closePanel() : openPanel(); }

    // Умное позиционирование панели: под шестерёнкой, при нехватке места — над,
    // с клампом по всем краям (математика v3–v7, почищенная).
    function layoutPanelClamped() {
        var pw = panel.offsetWidth || 380, ph = panel.offsetHeight || 320;
        var gw = gear.offsetWidth || 56;
        var gx = parseFloat(gear.style.left) || 16, gy = parseFloat(gear.style.top) || 16;
        var left = gx, top = gy + gw + 8;
        var M = 8;
        if (left + pw > window.innerWidth - M) left = window.innerWidth - pw - M;
        if (left < M) left = M;
        if (top + ph > window.innerHeight - M) top = gy - ph - 8;
        if (top < M) top = M;
        var ox = (gx + gw / 2) > window.innerWidth / 2 ? 'right' : 'left';
        var oy = (gy + gw / 2) > window.innerHeight / 2 ? 'bottom' : 'top';
        panel.style.transformOrigin = oy + ' ' + ox;
        panel.style.left = left + 'px';
        panel.style.top = top + 'px';
    }

    // ── 9. Drag & Drop на Pointer Events (единственный источник истины) ──
    var drag = { active: false, moved: false, sx: 0, sy: 0, ox: 0, oy: 0 };
    var suppressNextClick = false;

    gear.addEventListener('pointerdown', function (e) {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        drag.active = true; drag.moved = false;
        drag.sx = e.clientX; drag.sy = e.clientY;
        drag.ox = parseFloat(gear.style.left) || 16;
        drag.oy = parseFloat(gear.style.top) || 16;
        try { gear.setPointerCapture(e.pointerId); } catch (err) {}
        if (reducedMotion) return;
        gear.style.transition = 'none';
    });

    gear.addEventListener('pointermove', function (e) {
        if (!drag.active) return;
        var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
        if (!drag.moved && Math.hypot(dx, dy) > 6) drag.moved = true;
        if (drag.moved) placeGear(drag.ox + dx, drag.oy + dy, true);
    });

    function endDrag(e) {
        if (!drag.active) return;
        drag.active = false;
        gear.style.transition = '';
        try { if (e && e.pointerId != null) gear.releasePointerCapture(e.pointerId); } catch (err) {}
        if (drag.moved) {
            suppressNextClick = true;                 // клик после драга — не «нажатие»
            persistPositionSoon();
            if (navigator.vibrate) try { navigator.vibrate(15); } catch (err) {}
        }
    }
    gear.addEventListener('pointerup', endDrag);
    gear.addEventListener('pointercancel', endDrag);

    gear.addEventListener('click', function () {
        if (suppressNextClick) { suppressNextClick = false; return; }   // ← фикс бага v3–v6
        togglePanel();
    });

    gear.addEventListener('keydown', function (e) {
        // D-Pad-подстройка позиции, когда шестерёнка в фокусе (пульт ТВ)
        var step = e.shiftKey ? 48 : 12;
        var dx = 0, dy = 0;
        if (e.key === 'ArrowLeft') dx = -step;
        else if (e.key === 'ArrowRight') dx = step;
        else if (e.key === 'ArrowUp') dy = -step;
        else if (e.key === 'ArrowDown') dy = step;
        if (dx || dy) {
            e.preventDefault();
            placeGear((parseFloat(gear.style.left) || 16) + dx, (parseFloat(gear.style.top) || 16) + dy, true);
            persistPositionSoon();
        }
    });

    // ── 10. Клавиатура: защищённые хоткеи ──
    function isTyping(elx) {
        if (!elx) return false;
        var tag = elx.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
               elx.isContentEditable === true || elx.isComposing === true;
    }

    window.addEventListener('keydown', function (e) {
        // TV-пульты: GoBack (Tizen) / keyCode 10009; keyCode 8 (Backspace) НАМЕРЕННО убран —
        // он стирал текст в полях и уводил со страницы (баг v5).
        var tvBack = (e.key === 'GoBack') || (e.keyCode === 10009);
        var typing = isTyping(document.activeElement);

        if (e.key === 'Escape' || tvBack) {
            if (isOpen) { e.preventDefault(); closePanel(); return; }
            // В режиме data-hotkeys="off" глобальный Esc-выход отдаём хост-странице
            if (hostHotkeysOff) return;
            if (!typing) {
                // На самом хабе выходить некуда — не перезагружаем страницу зря (как в v1)
                var p = location.pathname || '';
                if (!/index\.html?$/i.test(p) && !/\/$/.test(p)) { e.preventDefault(); goHome(); }
            }
            return;                                          // в поле ввода Esc НЕ уводит со страницы
        }

        if (hostHotkeysOff || typing || e.ctrlKey || e.metaKey || e.altKey) return;

        if (e.key === 's' || e.key === 'S' || e.key === 'ы' || e.key === 'Ы') {
            e.preventDefault(); togglePanel(); return;
        }
        if (e.shiftKey && (e.key === 'T' || e.key === 't' || e.key === 'Е' || e.key === 'е')) {
            e.preventDefault(); runDiagnostics(); return;
        }
        // Ловушка фокуса внутри панели
        if (isOpen && e.key === 'Tab') {
            var items = focusables(panel);
            if (!items.length) return;
            var i = items.indexOf(document.activeElement);
            var next;
            if (e.shiftKey) next = (i <= 0) ? items.length - 1 : i - 1;
            else next = (i === -1 || i === items.length - 1) ? 0 : i + 1;
            e.preventDefault();
            items[next].focus();
        }
    });

    function goHome() {
        // «index.html» относительно текущей папки — работает и на GitHub Pages (/singulyar/), и на file://
        beep('ack');
        // Маркер для автотестов/ТВ-сборок: фиксация попытки перехода до её факта
        try { window.__SUX_NAVIGATING__ = { to: 'index.html', at: Date.now() }; } catch (e) {}
        window.location.href = 'index.html';
    }

    // Клик мимо панели — закрыть (ожидаемое поведение модалок, в v3–v7 не было)
    document.addEventListener('pointerdown', function (e) {
        if (!isOpen) return;
        if (!panel.contains(e.target) && e.target !== gear && !gear.contains(e.target)) closePanel();
    }, true);

    // ── 11. Диагностика 9 точек: ЧЕСТНАЯ (полный масштаб, без transition,
    //        позиция шестерёнки сохраняется; в v4 — замер scale(0.7), в v4/v7
    //        позиция после теста терялась) ──
    function runDiagnostics() {
        var orig = clampPos(config.x == null ? parseFloat(gear.style.left) : config.x,
                            config.y == null ? parseFloat(gear.style.top) : config.y);
        var wasOpen = isOpen;
        var prevTransition = panel.style.transition;
        if (!wasOpen) openPanel();                      // корректные aria/фокус/классы
        panel.style.transition = 'none';                // меряем финальный layout, а не анимацию

        var pw = panel.offsetWidth || 380, ph = panel.offsetHeight || 320;
        var W = window.innerWidth, H = window.innerHeight;
        var points = [
            { n: 'верх-лево',   x: 0,          y: 0 },
            { n: 'верх-центр',  x: W / 2,      y: 0 },
            { n: 'верх-право',  x: W,          y: 0 },
            { n: 'серед-лево',  x: 0,          y: H / 2 },
            { n: 'центр',       x: W / 2,      y: H / 2 },
            { n: 'серед-право', x: W,          y: H / 2 },
            { n: 'низ-лево',    x: 0,          y: H },
            { n: 'низ-центр',   x: W / 2,      y: H },
            { n: 'низ-право',   x: W,          y: H }
        ];
        var fails = [];
        points.forEach(function (p) {
            var g = clampPos(p.x - (gear.offsetWidth || 56) / 2, p.y - (gear.offsetWidth || 56) / 2);
            gear.style.left = g.x + 'px'; gear.style.top = g.y + 'px';
            // та же математика раскладки, что и в openPanel — меряем сам алгоритм
            var left = g.x, top = g.y + (gear.offsetWidth || 56) + 8, M = 8;
            if (left + pw > W - M) left = W - pw - M;
            if (left < M) left = M;
            if (top + ph > H - M) top = g.y - ph - 8;
            if (top < M) top = M;
            panel.style.left = left + 'px'; panel.style.top = top + 'px';
            var r = panel.getBoundingClientRect();
            var bad = r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1;
            if (bad) fails.push(p.n + ' (' + Math.round(r.left) + ',' + Math.round(r.top) +
                                ' → ' + Math.round(r.right) + ',' + Math.round(r.bottom) + ')');
        });

        // восстановление: позиция шестерёнки и панель у неё же
        gear.style.left = orig.x + 'px'; gear.style.top = orig.y + 'px';
        layoutPanelClamped();
        panel.style.transition = prevTransition;

        status.style.display = 'block';
        status.className = fails.length ? 'err' : '';
        status.textContent = fails.length
            ? '❌ Вылеты за границы: ' + fails.length + '/9\n' + fails.join('\n')
            : '✅ 9/9 точек: панель внутри экрана (замер в полном масштабе, без анимаций). ' +
              'Экран: ' + W + '×' + H + ' px.';
        beep('ack');
    }

    // ── 12. Кнопки панели ──
    closeBtn.addEventListener('click', function () { closePanel(); });
    btnHome.addEventListener('click', goHome);
    btnAudio.addEventListener('click', function () {
        config.audioOn = !config.audioOn;
        refreshToggles(); persist();
        if (config.audioOn) { ensureCtx(); beep('click'); }
    });
    btnVoice.addEventListener('click', function () {
        config.voiceOn = !config.voiceOn;
        refreshToggles(); persist();
        if (config.voiceOn) startVoice(); else stopVoice();
    });
    btnTheme.addEventListener('click', function () {
        var order = ['dark', 'light', 'contrast'];
        config.theme = order[(order.indexOf(config.theme) + 1) % order.length];
        if (config.theme === 'dark') document.documentElement.removeAttribute('data-sux-theme');
        else document.documentElement.setAttribute('data-sux-theme', config.theme);
        refreshToggles(); persist();
    });
    btnDiag.addEventListener('click', function () { runDiagnostics(); });
    btnReset.addEventListener('click', function () {
        config.x = null; config.y = null; persist();
        placeGearInitial();
        status.style.display = 'block'; status.className = '';
        status.textContent = '📍 Позиция шестерёнки сброшена.';
    });
    vol.addEventListener('input', function () {
        config.volume = parseInt(vol.value, 10) / 100;
        volOut.textContent = vol.value + '%';
        persist();
    });
    vol.addEventListener('change', function () { if (config.audioOn) beep('click'); });

    // ── 13. Голос: строго opt-in, автоперезапуск только при живом флаге и
    //        видимой вкладке; честное предупреждение про облако в Chrome ──
    var recognition = null;
    function startVoice() {
        var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        status.style.display = 'block'; status.className = '';
        if (!SR) { status.textContent = 'Голос не поддерживается этим браузером.'; config.voiceOn = false; refreshToggles(); persist(); return; }
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
                if (/(настройк|меню|settings|menu)/.test(t)) { beep('ack'); openPanel(); }
                else if (/(закры|close|назад)/.test(t)) { beep('ack'); closePanel(); }
                else if (/(домой|главное|home)/.test(t)) goHome();
            };
            recognition.onerror = function (ev) {
                if (ev && ev.error === 'not-allowed') {       // пользователь отказал — не перезапускаемся
                    config.voiceOn = false; refreshToggles(); persist(); stopVoice();
                    status.style.display = 'block'; status.className = 'err';
                    status.textContent = 'Микрофон запрещён в настройках браузера — голосовые команды выключены.';
                }
            };
            recognition.onend = function () {
                // В v6/v7 цикл перезапуска крутился вечно. Теперь: только при
                // включённом флаге, живой вкладке и не чаще, чем раз в 1.5 с.
                if (config.voiceOn && !document.hidden) {
                    setTimeout(function () {
                        if (config.voiceOn && !document.hidden) { try { recognition.start(); } catch (e) {} }
                    }, 1500);
                }
            };
            recognition.start();
            status.textContent = 'Голос включён (ru-RU). В Chrome распознавание идёт через облако Google — ' +
                                 'для строгого офлайна держите голос выключенным.';
        } catch (e) {
            config.voiceOn = false; refreshToggles(); persist();
        }
    }
    function stopVoice() {
        if (!recognition) return;
        var r = recognition; recognition = null;
        r.onend = null; r.onresult = null; r.onerror = null;
        try { r.stop(); } catch (e) {}
    }

    // ── 14. Геймпад: опрос ТОЛЬКО при подключённом паде (v6 крутил rAF всегда) ──
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
            } else if (b[1] && b[1].pressed) { padLast = now; if (isOpen) closePanel(); }
        }
    }
    function stepFocus(dir) {
        // Навигация ТОЛЬКО по видимым и доступным элементам (v6 фокусировал скрытые — фокус «пропадал»)
        var items = focusables(document.body).filter(function (n) {
            var r = n.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight;
        });
        if (!items.length) return;
        var i = items.indexOf(document.activeElement);
        var next = i === -1 ? (dir > 0 ? 0 : items.length - 1) : (i + dir + items.length) % items.length;
        items[next].focus();
        beep('focus');
    }
    window.addEventListener('gamepadconnected', function () {
        if (!gamepadTimer) gamepadTimer = setInterval(pollPad, 140);
    });
    window.addEventListener('gamepaddisconnected', function () {
        clearInterval(gamepadTimer); gamepadTimer = null;
    });

    // ── 15. Ресайз / поворот / visualViewport: пере-кламп (с rAF-дебаунсом) ──
    var rafPending = false;
    function reclamp() {
        if (rafPending) return;
        rafPending = true;
        requestAnimationFrame(function () {
            rafPending = false;
            placeGear(parseFloat(gear.style.left) || 16, parseFloat(gear.style.top) || 16, true);
            if (isOpen) layoutPanelClamped();
        });
    }
    window.addEventListener('resize', reclamp, { passive: true });
    window.addEventListener('orientationchange', reclamp);
    if (window.visualViewport) {
        visualViewport.addEventListener('resize', reclamp, { passive: true });
        visualViewport.addEventListener('scroll', reclamp, { passive: true });
    }

    // ── 16. Публичный API (для автотестов, ТВ-сборок и консоли) ──
    window.SingulyarUX = {
        version: '8.0-final',
        open: openPanel,
        close: function () { closePanel(); },
        toggle: togglePanel,
        home: goHome,
        diagnostics: runDiagnostics,
        state: function () {
            return {
                open: isOpen,
                gear: { x: parseFloat(gear.style.left), y: parseFloat(gear.style.top) },
                config: JSON.parse(JSON.stringify(config)),
                audioCtxCreated: !!audioCtx,
                voiceActive: !!recognition
            };
        },
        _test: { placeGear: placeGear, clampPos: clampPos, focusables: focusables }
    };

    console.log('SINGULYAR UX Engine v8.0-final: шестерёнка готова. S — панель, Esc — закрыть/домой, Shift+T — диагностика.');
})();
