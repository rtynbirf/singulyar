/* ============================================================
   АВТОПЛЕЙ-РАЗБЛОКИРОВЩИК СИНГУЛЯРА (assets/autoplay-fix.js)
   Проблема: браузеры (Chrome/Safari/Edge/Firefox) блокируют звук
   без жеста пользователя — политика автоплея. Это не поломка
   страниц: так работает защита autoplay, «везде разом» её
   включает/снимает Media Engagement Index и настройки сайта.
   Решение: любой отказ play() ловим, показываем явную кнопку
   «▶ ВКЛЮЧИТЬ ЗВУК» и по первому касанию/клавише:
     1) дожимаем play() всему, что просили запустить;
     2) возобновляем (resume) все AudioContext страницы;
     3) по явному клику на кнопку перезапускаем YouTube-ифреймы
        с ?autoplay=1 (жест есть — браузер даёт звук).
   API для страниц: window.SNG_UNLOCK() — форс-разблокировка,
   window.SNG_APF_CTX(ctx) — зарегистрировать AudioContext.
   Файл аддитивный: ничего не ломает, просто дожимает звук.
   ============================================================ */
(function () {
  'use strict';
  if (window.__SNG_APF__) return;
  window.__SNG_APF__ = true;

  var pendingMedia = [];   /* {el: HTMLMediaElement} */
  var ytFrames = [];       /* {frame, src} */
  var pill = null;
  var unlocked = false;

  function ensurePill() {
    if (pill) return;
    pill = document.createElement('button');
    pill.id = 'sng-sound-pill';
    pill.type = 'button';
    pill.textContent = '▶ ВКЛЮЧИТЬ ЗВУК';
    pill.setAttribute('aria-label', 'Браузер заблокировал автоплей — включить звук');
    pill.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:2147483647;' +
      'padding:12px 22px;border-radius:999px;border:1px solid rgba(34,211,238,.7);cursor:pointer;' +
      'background:linear-gradient(90deg,rgba(34,211,238,.18),rgba(255,43,214,.18));' +
      'color:#eef2ff;font:800 .92rem/1 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;' +
      'letter-spacing:.05em;box-shadow:0 6px 24px rgba(34,211,238,.25);animation:sngPulse 1.6s ease-in-out infinite';
    var st = document.createElement('style');
    st.textContent = '@keyframes sngPulse{0%,100%{opacity:.92}50%{opacity:1;box-shadow:0 6px 34px rgba(255,43,214,.35)}}';
    document.head.appendChild(st);
    pill.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      unlocked = true;
      /* явный жест: перезапускаем YouTube-ифреймы с autoplay=1 */
      ytFrames.splice(0).forEach(function (f) { try { f.frame.src = f.src; } catch (err) {} });
      pumpMedia();
      resumeCtxs();
      removePill();
    });
    (document.body || document.documentElement).appendChild(pill);
  }

  function removePill() {
    if (pill) { try { pill.remove(); } catch (e) {} pill = null; }
  }

  function pumpMedia() {
    pendingMedia.splice(0).forEach(function (m) {
      try { if (m.el && m.el.play) m.el.play().catch(function () {}); } catch (e) {}
    });
  }

  var ctxs = [];
  window.SNG_APF_CTX = function (c) { if (c && ctxs.indexOf(c) < 0) ctxs.push(c); };
  function resumeCtxs() {
    ctxs.forEach(function (c) { try { if (c.state === 'suspended') c.resume(); } catch (e) {} });
    if (window.__СБОРНИК_КОНТЕКСТЫ) { try { window.__СБОРНИК_КОНТЕКСТЫ.forEach(function (c) { if (c && c.state === 'suspended') c.resume(); }); } catch (e) {} }
  }

  /* ловим ЛЮБОЙ отказ play() на странице — и видео, и аудио, как бы они ни создавались */
  try {
    var OrigPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      var el = this;
      var r = OrigPlay.apply(this, arguments);
      if (r && r.then) {
        r.catch(function (e) {
          if (e && (e.name === 'NotAllowedError' || e.name === 'AbortError')) {
            var dup = pendingMedia.some(function (x) { return x.el === el; });
            if (!unlocked && !dup) { pendingMedia.push({ el: el }); ensurePill(); }
          }
        });
      }
      return r;
    };
  } catch (e) {}

  /* YouTube-ифреймы с ?autoplay=1: если звук не пошёл — перезапуск по явному жесту */
  var watchTimer = 0;
  function watchIframes() {
    if (watchTimer) return;
    watchTimer = setTimeout(function () {
      watchTimer = 0;
      try {
        document.querySelectorAll('iframe[src*="autoplay=1"]').forEach(function (f) {
          if (f.__sngWatch) return;
          f.__sngWatch = true;
          ytFrames.push({ frame: f, src: f.src });
          setTimeout(function () { if (!unlocked && ytFrames.length) ensurePill(); }, 1500);
        });
      } catch (e) {}
    }, 300);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchIframes);
  else watchIframes();
  try { new MutationObserver(watchIframes).observe(document.documentElement, { childList: true, subtree: true }); } catch (e) {}

  /* первое касание в любом месте страницы = жест: дожимаем звук без клика по кнопке */
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
    document.addEventListener(ev, function () {
      unlocked = true;
      pumpMedia();
      resumeCtxs();
      removePill();
    }, { capture: true, passive: true });
  });

  window.SNG_UNLOCK = function () {
    unlocked = true;
    pumpMedia(); resumeCtxs(); removePill();
    ytFrames.splice(0).forEach(function (f) { try { f.frame.src = f.src; } catch (e) {} });
  };
})();
