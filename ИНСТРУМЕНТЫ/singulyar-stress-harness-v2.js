/*!
 * SINGULYAR STRESS HARNESS v2.0 — честная версия
 * Заменяет singulyar-stress-test-harness.js (v1.0).
 *
 * Что было НЕЧЕСТНО в v1 (полный разбор — в отчёте аудита):
 *  1. «1000 events/sec» была невозможна: setInterval(fn, 1) браузеры клампят
 *     до ~4 мс → максимум ~250/сек. Теперь события идут пачками за тик и
 *     ФАКТИЧЕСКАЯ частота измеряется и показывается.
 *  2. «Event Success Rate: 100% (0 dropped)» не измерялось вообще: счётчик
 *     увеличивался в момент ОТПРАВКИ события. Мы честно показываем «отправлено»
 *     и живость страницы (кадры/джиттер во время шторма).
 *  3. «Watchdog Recovery < 16 ms» — статическая строка, вписанная в вёрстку.
 *     Удалена.
 *  4. Пресеты «вьюпортов» ничего не эмулировали — рисовали рамку. Рамка
 *     осталась, но подписана честно: «визуальная рамка, НЕ эмуляция».
 *  5. Режимы света мутировали хост-страницу (body.style + filter на <html>,
 *     который к тому же ломает position:fixed у потомков). Теперь —
 *     ненавязчивый оверлей-«засветка», состояние снимается кнопкой.
 *  6. В шторм входил Escape → движок уходил на index.html прямо посреди
 *     теста. Теперь Escape выключен по умолчанию (галочка с предупреждением).
 *
 * Никаких мутаций хост-страницы без кнопки. Все статические «< 16 ms» удалены.
 */
(function () {
    'use strict';
    if (window.__SINGULYAR_HARNESS_V2__) return;
    window.__SINGULYAR_HARNESS_V2__ = true;

    var state = {
        tab: 'stress',            // 'stress' | 'viewport' | 'light'
        running: false,
        targetRate: 1000,         // желаемая частота, событий/сек
        sent: 0,                  // фактически отправлено
        actualRate: 0,            // измеренная частота (события за скользящую секунду)
        eventStamps: [],          // метрики времени отправки (окно 1 c, сжатое по тикам)
        includeEscape: false,
        frameTimes: [],           // последние 180 кадров
        maxFrame: 0,
        longFrames: 0,            // кадров > 24 мс за время шторма
        stormFrames: 0,
        glare: false,
        collapsed: false,
        frameEl: null
    };

    var PRESETS = {
        'mobile-sm': { name: '📱 Смартфон мал.', w: 320,  h: 568 },
        'mobile-md': { name: '📱 Смартфон',      w: 375,  h: 812 },
        'tablet':    { name: '📲 Планшет',       w: 768,  h: 1024 },
        'netbook':   { name: '💻 Нетбук',        w: 1024, h: 600 },
        'laptop':    { name: '💻 Ноутбук',       w: 1366, h: 768 },
        'fhd':       { name: '🖥️ Full HD',       w: 1920, h: 1080 },
        'uw2k':      { name: '🖥️ 21:9 UltraWide',w: 2560, h: 1080 },
        'stage4k':   { name: '📺 4K-сцена 85"',  w: 3840, h: 2160 }
    };

    // ── CSS ──
    var css = [
        '#sh2root{position:fixed;bottom:16px;left:16px;z-index:2147483100;font:12.5px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#e8f0f6;user-select:none}',
        '#sh2root *{box-sizing:border-box;margin:0;padding:0}',
        '.sh2panel{width:340px;background:rgba(14,20,29,.96);border:1px solid rgba(94,234,212,.45);border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.6);overflow:hidden}',
        '.sh2head{display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:rgba(94,234,212,.09);border-bottom:1px solid rgba(255,255,255,.08);cursor:pointer}',
        '.sh2title{font-weight:700;color:#5eead4;font-size:12.5px}',
        '.sh2fold{background:none;border:none;color:#9db2c2;cursor:pointer;font-size:13px;padding:2px 6px}',
        '.sh2tabs{display:flex;background:rgba(0,0,0,.35)}',
        '.sh2tab{flex:1;text-align:center;padding:7px 2px;font-size:11px;font-weight:600;color:#8fa3b3;cursor:pointer;border-bottom:2px solid transparent}',
        '.sh2tab.on{color:#5eead4;border-bottom-color:#5eead4}',
        '.sh2body{padding:11px 12px;max-height:320px;overflow-y:auto}',
        '.sh2sec{font-size:10.5px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:#7d93a5;margin:0 0 8px}',
        '.sh2stat{display:flex;justify-content:space-between;gap:8px;padding:3px 0;font-size:12px}',
        '.sh2stat b{font-family:ui-monospace,Consolas,monospace;color:#5eead4;font-weight:700}',
        '.sh2note{margin:8px 0 0;padding:7px 9px;border-radius:8px;background:rgba(255,195,110,.1);color:#ffd9a0;font-size:11px}',
        '.sh2btn{width:100%;margin:8px 0 0;padding:9px;border:none;border-radius:8px;font:700 12px/1 system-ui,sans-serif;cursor:pointer;background:#5eead4;color:#04121c}',
        '.sh2btn.stop{background:#ff5d78;color:#fff}',
        '.sh2btn:focus-visible,.sh2tab:focus-visible,.sh2fold:focus-visible{outline:2px solid #5eead4;outline-offset:2px}',
        '.sh2grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}',
        '.sh2pre{padding:7px 8px;text-align:left;font-size:11px;border-radius:7px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);color:#dbe7f0;cursor:pointer}',
        '.sh2pre:hover{border-color:#5eead4}',
        '.sh2pre.on{background:rgba(94,234,212,.2);border-color:#5eead4}',
        '.sh2range{width:100%;accent-color:#5eead4;margin:6px 0 2px}',
        '.sh2chk{display:flex;gap:7px;align-items:center;margin-top:8px;font-size:11.5px;color:#ffd9a0;cursor:pointer}',
        '#sh2frame{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);border:2px dashed #5eead4;box-shadow:0 0 0 9999px rgba(0,0,0,.72);pointer-events:none;z-index:2147483090;display:none}',
        '#sh2framelabel{position:absolute;top:-26px;left:-2px;background:#5eead4;color:#04121c;font-weight:800;font-size:10.5px;padding:3px 8px;border-radius:5px 5px 0 0;white-space:nowrap}',
        '#sh2glare{position:fixed;inset:0;pointer-events:none;z-index:2147483080;display:none;background:radial-gradient(ellipse at 30% 20%,rgba(255,255,255,.5),rgba(255,255,255,.08) 55%,transparent 75%)}'
    ].join('');
    var st = document.createElement('style');
    st.id = 'sh2-style';
    st.textContent = css;
    document.head.appendChild(st);

    // ── DOM-фабрика (ноль innerHTML) ──
    function el(tag, attrs, text) {
        var n = document.createElement(tag);
        if (attrs) for (var k in attrs) {
            if (k === 'style' && typeof attrs[k] === 'object') Object.assign(n.style, attrs[k]);
            else n.setAttribute(k, attrs[k]);
        }
        if (text != null) n.textContent = text;
        return n;
    }

    var rootEl = el('div', { id: 'sh2root' });
    var frameEl = el('div', { id: 'sh2frame' });
    var frameLabel = el('div', { id: 'sh2framelabel' }, 'Рамка-подсказка — НЕ эмуляция');
    frameEl.appendChild(frameLabel);
    var glareEl = el('div', { id: 'sh2glare' });
    document.body.appendChild(frameEl);
    document.body.appendChild(glareEl);
    state.frameEl = frameEl;

    var statsSent, statsRate, statsFrame, statsLong, btnStorm;

    function fmtMs(v) { return v.toFixed(1) + ' мс'; }

    function framePercentile(p) {
        if (!state.frameTimes.length) return 0;
        var a = state.frameTimes.slice().sort(function (x, y) { return x - y; });
        return a[Math.min(a.length - 1, Math.floor(a.length * p))];
    }

    function render() {
        rootEl.textContent = '';
        var panel = el('div', { class: 'sh2panel' });

        var head = el('div', { class: 'sh2head' });
        head.appendChild(el('div', { class: 'sh2title' }, '⚡ SINGULYAR HARNESS v2 · честные метрики'));
        var fold = el('button', { class: 'sh2fold', type: 'button', 'aria-label': 'Свернуть/развернуть' }, state.collapsed ? '▲' : '▼');
        fold.addEventListener('click', function (e) { e.stopPropagation(); state.collapsed = !state.collapsed; render(); });
        head.appendChild(fold);
        head.addEventListener('click', function () { state.collapsed = !state.collapsed; render(); });
        panel.appendChild(head);

        if (!state.collapsed) {
            var tabs = el('div', { class: 'sh2tabs' });
            [['stress', '🔥 Шторм'], ['viewport', '📐 Рамка'], ['light', '☀️ Свет']].forEach(function (t) {
                var tab = el('div', {
                    class: 'sh2tab' + (state.tab === t[0] ? ' on' : ''),
                    role: 'button', tabindex: '0'
                }, t[1]);
                tab.addEventListener('click', function () { state.tab = t[0]; render(); });
                tab.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); state.tab = t[0]; render(); } });
                tabs.appendChild(tab);
            });
            panel.appendChild(tabs);

            var body = el('div', { class: 'sh2body' });

            if (state.tab === 'stress') {
                body.appendChild(el('div', { class: 'sh2sec' }, 'Шторм D-Pad/клавиатуры'));

                statsSent = el('div', { class: 'sh2stat' });
                statsRate = el('div', { class: 'sh2stat' });
                statsFrame = el('div', { class: 'sh2stat' });
                statsLong = el('div', { class: 'sh2stat' });
                body.appendChild(statsSent);
                body.appendChild(statsRate);
                body.appendChild(statsFrame);
                body.appendChild(statsLong);
                refreshStats();

                body.appendChild(el('label', { class: 'sh2sec', style: { display: 'block', marginTop: '8px' } }, 'Целевая частота: ' + state.targetRate + ' событий/сек'));
                var range = el('input', { class: 'sh2range', type: 'range', min: '100', max: '2000', step: '100', 'aria-label': 'Целевая частота событий' });
                range.value = String(state.targetRate);
                range.addEventListener('input', function () {
                    state.targetRate = parseInt(range.value, 10);
                    range.previousElementSibling.textContent = 'Целевая частота: ' + state.targetRate + ' событий/сек';
                });
                body.appendChild(range);

                var chk = el('label', { class: 'sh2chk' });
                var cb = el('input', { type: 'checkbox' });
                cb.checked = state.includeEscape;
                cb.addEventListener('change', function () { state.includeEscape = cb.checked; });
                chk.appendChild(cb);
                chk.appendChild(el('span', null, 'включить Escape (⚠ движок уйдёт на index.html)'));
                body.appendChild(chk);

                btnStorm = el('button', { class: 'sh2btn' + (state.running ? ' stop' : ''), type: 'button' });
                btnStorm.textContent = state.running ? '🛑 Остановить шторм' : '🚀 Запустить шторм';
                btnStorm.addEventListener('click', toggleStorm);
                body.appendChild(btnStorm);

                body.appendChild(el('p', { class: 'sh2note' },
                    'Честно: событие «отправлено» значит «доставлено в обработчики страницы». ' +
                    'Реакция движка видна по живости кадров и по тому, что страница не рухнула. ' +
                    'Браузер клампит таймеры до ~4 мс, поэтому 1000+/сек достигается пачками за тик — фактическая частота показана отдельной строкой.'));
            } else if (state.tab === 'viewport') {
                body.appendChild(el('div', { class: 'sh2sec' }, 'Рамка целевого вьюпорта'));
                var grid = el('div', { class: 'sh2grid' });
                Object.keys(PRESETS).forEach(function (k) {
                    var p = PRESETS[k];
                    var b = el('button', { class: 'sh2pre', type: 'button' }, p.name + ' · ' + p.w + '×' + p.h);
                    b.addEventListener('click', function () {
                        frameEl.style.width = Math.min(p.w, window.innerWidth - 8) + 'px';
                        frameEl.style.height = Math.min(p.h, window.innerHeight - 8) + 'px';
                        frameLabel.textContent = p.name + ' (' + p.w + '×' + p.h + ') — НЕ эмуляция';
                        frameEl.style.display = 'block';
                        Array.prototype.forEach.call(grid.children, function (c) { c.classList.remove('on'); });
                        b.classList.add('on');
                    });
                    grid.appendChild(b);
                });
                body.appendChild(grid);
                var hideBtn = el('button', { class: 'sh2btn', type: 'button' }, 'Скрыть рамку');
                hideBtn.addEventListener('click', function () { frameEl.style.display = 'none'; });
                body.appendChild(hideBtn);
                body.appendChild(el('p', { class: 'sh2note' },
                    'Это визуальная рамка поверх страницы, а НЕ эмуляция устройства: страница не переразмечается под 320 px. ' +
                    'Настоящая эмуляция — DevTools (F12 → Ctrl+Shift+M) или window.resizeTo в отдельном окне.'));
            } else {
                body.appendChild(el('div', { class: 'sh2sec' }, 'Симуляция засветки (сцена/солнце)'));
                var glareBtn = el('button', { class: 'sh2btn' + (state.glare ? ' stop' : ''), type: 'button' });
                glareBtn.textContent = state.glare ? 'Убрать засветку' : 'Включить засветку';
                glareBtn.addEventListener('click', function () {
                    state.glare = !state.glare;
                    glareEl.style.display = state.glare ? 'block' : 'none';
                    render();
                });
                body.appendChild(glareBtn);
                body.appendChild(el('p', { class: 'sh2note' },
                    'В v1 этот режим перекрашивал хост-страницу (body.style.background) и вешал CSS filter на <html> — ' +
                    'фильтр создаёт containing block и ЛОМАЕТ position:fixed у движка. Теперь это полупрозрачный оверлей, ' +
                    'который ничего не изменяет в самой странице.'));
            }
            panel.appendChild(body);
        }

        rootEl.appendChild(panel);
        if (!document.getElementById('sh2root')) document.body.appendChild(rootEl);
    }

    function refreshStats() {
        if (!statsSent || !statsSent.isConnected) return;   // вкладка переключена —DOM пересоберётся при рендере
        statsSent.textContent = '';
        statsSent.appendChild(el('span', null, 'Отправлено событий'));
        statsSent.appendChild(el('b', null, String(state.sent)));

        statsRate.textContent = '';
        statsRate.appendChild(el('span', null, 'Фактическая частота'));
        statsRate.appendChild(el('b', null, state.actualRate + '/сек'));

        var p95 = framePercentile(0.95);
        statsFrame.textContent = '';
        statsFrame.appendChild(el('span', null, 'Кадр: медиана / P95'));
        statsFrame.appendChild(el('b', null, fmtMs(framePercentile(0.5)) + ' / ' + fmtMs(p95)));

        statsLong.textContent = '';
        statsLong.appendChild(el('span', null, 'Кадров > 24 мс за шторм'));
        statsLong.appendChild(el('b', { style: state.longFrames > 0 ? { color: '#ffd9a0' } : null }, String(state.longFrames) + ' из ' + state.stormFrames));
    }

    // ── Шторм: пачки за тик = честная высокая частота ──
    var stormTimer = null, eventStamps = state.eventStamps, lastPanelRefresh = 0;

    function dispatchOne() {
        var keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 's', 'Tab'];
        if (state.includeEscape) keys.push('Escape');
        var key = keys[Math.floor(Math.random() * keys.length)];
        document.dispatchEvent(new KeyboardEvent('keydown', { key: key, bubbles: true, cancelable: true }));
        state.sent++;
    }

    function toggleStorm() {
        state.running = !state.running;
        if (state.running) {
            var tickMs = 40;                                   // 25 тиков/сек
            var perTick = Math.max(1, Math.round(state.targetRate * tickMs / 1000));
            var last = performance.now();
            stormTimer = setInterval(function () {
                for (var i = 0; i < perTick; i++) dispatchOne();
                var now = performance.now();
                eventStamps.push({ t: now, n: perTick });
                while (eventStamps.length && now - eventStamps[0].t > 1000) eventStamps.shift();
                state.actualRate = eventStamps.reduce(function (a, s) { return a + s.n; }, 0);
                if (now - lastPanelRefresh > 400) { lastPanelRefresh = now; refreshStats(); }
            }, tickMs);
        } else {
            clearInterval(stormTimer);
            refreshStats();
        }
        if (btnStorm) {
            btnStorm.className = 'sh2btn' + (state.running ? ' stop' : '');
            btnStorm.textContent = state.running ? '🛑 Остановить шторм' : '🚀 Запустить шторм';
        }
    }

    // ── Замер кадров: реальные дельты rAF (в v1 «droppedFrames» считался по одному в секунду) ──
    var lastFrame = performance.now();
    function frameLoop(now) {
        var delta = now - lastFrame;
        lastFrame = now;
        if (delta > 0 && delta < 1000) {
            state.frameTimes.push(delta);
            if (state.frameTimes.length > 180) state.frameTimes.shift();
            if (state.running) {
                state.stormFrames++;
                if (delta > 24) state.longFrames++;
            }
        }
        requestAnimationFrame(frameLoop);
    }
    requestAnimationFrame(frameLoop);

    render();
    console.log('⚡ SINGULYAR Harness v2: готов. Замеры честные; хост-страница не мутируется.');
})();
