/**
 * СИНГУЛЯР · Пульт ·31 РУМА ЛАДОМ
 * Движок адаптивного интерфейса, D-Pad пространственного фокуса и управления комнатой
 */

(function () {
  'use strict';

  // Состояние 31 Румы
  const roomState = {
    temp: 22.5,
    humidity: 45,
    lightMode: 'Ладом (Уют)',
    doorLocked: true,
    securityMode: 'Активна',
    activeIntentsCount: 3,
    logs: []
  };

  let currentMode = 'desktop'; // 'mobile', 'desktop', 'tv'
  let focusedIndex = 0;
  let focusableElements = [];

  // Элементы DOM
  const $ = (id) => document.getElementById(id);

  function init() {
    setupModeSelectors();
    setupRoomControls();
    setupDPadEngine();
    setupVirtualRemote();
    autoDetectViewport();
    updateUI();
    addLog('Пульт ·31 РУМА ЛАДОМ инициализирован');
  }

  // 1. Авто-определение типа экрана по ширине
  function autoDetectViewport() {
    const w = window.innerWidth;
    if (w < 650) {
      setMode('mobile');
    } else if (w > 1600) {
      setMode('tv');
    } else {
      setMode('desktop');
    }
  }

  // 2. Переключение режимов экрана
  function setMode(mode) {
    currentMode = mode;
    const container = $('appContainer');
    container.className = 'app-container mode-' + mode;

    document.querySelectorAll('.mode-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    // Рефреш фокусируемых элементов
    setTimeout(refreshFocusables, 100);
    addLog('Режим интерфейса переключен: ' + mode.toUpperCase());
  }

  function setupModeSelectors() {
    document.querySelectorAll('.mode-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        setMode(btn.dataset.mode);
      });
    });

    window.addEventListener('resize', () => {
      // Авто-переключение только если пользователь не нажимал кнопку вручную
    });
  }

  // 3. Обновление состояния UI
  function updateUI() {
    $('tempVal').textContent = roomState.temp.toFixed(1) + ' °C';
    $('humidityVal').textContent = roomState.humidity + ' %';
    $('lightStatus').textContent = roomState.lightMode;
    $('doorStatus').textContent = roomState.doorLocked ? 'Заблокирована' : 'Открыта';
    $('doorStatusPill').className = 'status-pill ' + (roomState.doorLocked ? 'active' : 'danger');
    $('doorStatusDot').style.background = roomState.doorLocked ? '#238636' : '#da3633';
  }

  function addLog(msg) {
    const time = new Date().toLocaleTimeString();
    roomState.logs.unshift(`[${time}] ${msg}`);
    if (roomState.logs.length > 15) roomState.logs.pop();

    const list = $('logList');
    if (list) {
      list.innerHTML = roomState.logs.map((item) => `<li>${item}</li>`).join('');
    }
  }

  // 4. Логика управления элементами комнаты
  function setupRoomControls() {
    $('tempMinus').addEventListener('click', () => {
      roomState.temp -= 0.5;
      updateUI();
      addLog('Температура понижена до ' + roomState.temp.toFixed(1) + ' °C');
    });

    $('tempPlus').addEventListener('click', () => {
      roomState.temp += 0.5;
      updateUI();
      addLog('Температура повышена до ' + roomState.temp.toFixed(1) + ' °C');
    });

    $('lightBtn').addEventListener('click', () => {
      const modes = ['Ладом (Уют)', 'Работа (Яркий)', 'Вечер (Закат)', 'Ночь (Минимальный)'];
      const idx = (modes.indexOf(roomState.lightMode) + 1) % modes.length;
      roomState.lightMode = modes[idx];
      updateUI();
      addLog('Режим освещения переключен: ' + roomState.lightMode);
    });

    $('doorToggleBtn').addEventListener('click', () => {
      roomState.doorLocked = !roomState.doorLocked;
      updateUI();
      addLog(roomState.doorLocked ? 'Замок двери ·31 заблокирован' : 'Замок двери ·31 ОТКРЫТ');
    });

    $('quickIntentBtn').addEventListener('click', () => {
      addLog('Сгенерировано экстренное намерение связи через Дверь ·53');
      alert('Экстренное намерение сформировано и отправлено в контур СИНГУЛЯР!');
    });
  }

  // 5. Движок пространственного фокуса D-Pad (Spatial KeyNav Engine)
  function refreshFocusables() {
    focusableElements = Array.from(
      document.querySelectorAll('button, input, select, [tabindex="0"]')
    ).filter((el) => {
      return el.offsetWidth > 0 && el.offsetHeight > 0 && getComputedStyle(el).display !== 'none';
    });

    if (focusableElements.length > 0) {
      setSpatialFocus(0);
    }
  }

  function setSpatialFocus(index) {
    if (focusableElements.length === 0) return;
    focusedIndex = (index + focusableElements.length) % focusableElements.length;

    focusableElements.forEach((el) => el.classList.remove('spatial-focused'));
    const target = focusableElements[focusedIndex];
    if (target) {
      target.classList.add('spatial-focused');
      target.focus({ preventScroll: false });
    }
  }

  // Навигация по евклидову расстоянию центров элементов в пространстве
  function moveFocusDirection(dir) {
    if (focusableElements.length === 0) return;
    const currentEl = focusableElements[focusedIndex];
    if (!currentEl) return setSpatialFocus(0);

    const r1 = currentEl.getBoundingClientRect();
    const c1 = { x: r1.left + r1.width / 2, y: r1.top + r1.height / 2 };

    let bestIdx = focusedIndex;
    let minDistance = Infinity;

    focusableElements.forEach((el, i) => {
      if (i === focusedIndex) return;
      const r2 = el.getBoundingClientRect();
      const c2 = { x: r2.left + r2.width / 2, y: r2.top + r2.height / 2 };

      const dx = c2.x - c1.x;
      const dy = c2.y - c1.y;

      let isCandidate = false;

      if (dir === 'UP' && dy < -10 && Math.abs(dx) < Math.abs(dy) * 2) isCandidate = true;
      if (dir === 'DOWN' && dy > 10 && Math.abs(dx) < Math.abs(dy) * 2) isCandidate = true;
      if (dir === 'LEFT' && dx < -10 && Math.abs(dy) < Math.abs(dx) * 2) isCandidate = true;
      if (dir === 'RIGHT' && dx > 10 && Math.abs(dy) < Math.abs(dx) * 2) isCandidate = true;

      if (isCandidate) {
        const dist = Math.hypot(dx, dy);
        if (dist < minDistance) {
          minDistance = dist;
          bestIdx = i;
        }
      }
    });

    setSpatialFocus(bestIdx);
  }

  function setupDPadEngine() {
    window.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'ArrowUp':
          moveFocusDirection('UP');
          e.preventDefault();
          break;
        case 'ArrowDown':
          moveFocusDirection('DOWN');
          e.preventDefault();
          break;
        case 'ArrowLeft':
          moveFocusDirection('LEFT');
          e.preventDefault();
          break;
        case 'ArrowRight':
          moveFocusDirection('RIGHT');
          e.preventDefault();
          break;
        case 'Enter':
        case ' ':
          if (focusableElements[focusedIndex]) {
            focusableElements[focusedIndex].click();
          }
          e.preventDefault();
          break;
        case 'Escape':
          addLog('D-Pad: Нажата клавиша ESC (Назад)');
          break;
      }
    });
  }

  // 6. Симулятор ТВ-пульта на экране
  function setupVirtualRemote() {
    $('dpadUp').addEventListener('click', () => moveFocusDirection('UP'));
    $('dpadDown').addEventListener('click', () => moveFocusDirection('DOWN'));
    $('dpadLeft').addEventListener('click', () => moveFocusDirection('LEFT'));
    $('dpadRight').addEventListener('click', () => moveFocusDirection('RIGHT'));
    $('dpadOk').addEventListener('click', () => {
      if (focusableElements[focusedIndex]) focusableElements[focusedIndex].click();
    });
  }

  // Старт после загрузки DOM
  window.addEventListener('DOMContentLoaded', init);
})();
