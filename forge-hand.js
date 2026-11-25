/* ФОРЖ:РУКА v3 · кузня rtynbirf · ЧЕЛОВЕК=АККАУНТ=PID1 · одно другое не исключает
   Рука дома СИНГУЛЯР: корона сверху + золотая нить внизу каждой страницы.
   CSP-безопасно: никаких inline-стилей в HTML, всё через свойства CSSOM.

   ЛАТКА-НИЗ v3 (С188 «СТАКАН, А НЕ ВАЛТЦ»): слово владельца
   «ОДИН БЛОК ПЕРЕКРЫВАЕТ ДРУГОЙ!!!» — исполнено замером, а не угадыванием.
   Раньше рука стояла на жёстких bottom:47px и поднималась над плеером зала
   (РЕЗОНАНС: плеер fixed bottom 54px, высота ~114px — рука втыкалась в его
   подзаголовок, з-index 2147482000 сверху). Теперь нижняя мебель дома
   (спутник-бар, плеер зала, явно помеченное data-нижняя-мебель) измеряется
   вживую, и рука встаёт НАД верхней кромкой мебели через var(--forge-niz).
   Одна точка правды: forge-hand.js грузится в каждой комнате дома. */
(function () {
  if (window.__FORGE_HAND__) return;
  window.__FORGE_HAND__ = 1;
  function crown() {
    try {
      if (!document.body) return;
      if (document.querySelector('[data-forge="crown"]')) return;
      var o = document.createElement('div');
      o.setAttribute('data-forge', 'crown');
      o.setAttribute('aria-hidden', 'true');
      var s = o.style;
      s.position = 'fixed';
      s.top = '0';
      s.left = '0';
      s.right = '0';
      s.height = '3px';
      s.zIndex = '2147483000';
      s.pointerEvents = 'none';
      s.background = 'repeating-linear-gradient(90deg, rgba(217,164,65,.92) 0 16px, rgba(232,114,42,.85) 16px 30px, rgba(138,100,32,.55) 30px 34px)';
      s.boxShadow = '0 1px 0 rgba(242,196,100,.35), 0 4px 14px rgba(0,0,0,.35)';
      var d = document.createElement('span');
      d.setAttribute('aria-hidden', 'true');
      var ds = d.style;
      ds.position = 'fixed';
      ds.top = '2px';
      ds.left = '50%';
      ds.width = '8px';
      ds.height = '8px';
      ds.zIndex = '2147483001';
      ds.pointerEvents = 'none';
      ds.transform = 'translateX(-50%) rotate(45deg)';
      ds.background = '#F2C464';
      ds.boxShadow = '0 0 10px rgba(242,196,100,.85)';
      var head = document.head || document.documentElement;
      head.appendChild(o);
      head.appendChild(d);
    } catch (e) { /* корона не должна ломать дом */ }
  }
  function stamp() {
    try {
      if (!document.body) return;
      if (document.querySelector('[data-forge="hand"]')) return;
      var f = document.createElement('footer');
      f.setAttribute('data-forge', 'hand');
      var s = f.style;
      s.position = 'relative';
      s.zIndex = '2147483000';
      s.clear = 'both';
      s.marginTop = '10px';
      s.textAlign = 'center';
      s.padding = '10px 14px 11px';
      s.fontFamily = "ui-monospace, Consolas, 'Courier New', monospace";
      s.fontSize = '11.5px';
      s.lineHeight = '1.7';
      s.letterSpacing = '.04em';
      s.color = '#C9C2B4';
      s.background = 'linear-gradient(90deg, rgba(11,10,8,.94), rgba(18,16,12,.94), rgba(11,10,8,.94))';
      s.borderTop = '1px solid rgba(217,164,65,.55)';
      s.boxShadow = '0 -6px 18px rgba(0,0,0,.25)';
      var mark = document.createElement('span');
      mark.textContent = '\u25C7';
      mark.style.color = '#D9A441';
      mark.style.marginRight = '8px';
      var t = document.createElement('span');
      t.textContent = 'КУЗНЯ RTYNBIRF · ЧЕЛОВЕК=АККАУНТ=PID1 · ОДНО ДРУГОЕ НЕ ИСКЛЮЧАЕТ';
      var a = document.createElement('a');
      a.href = 'https://github.com/rtynbirf';
      a.textContent = ' · github.com/rtynbirf';
      a.style.color = '#F2C464';
      a.style.textDecoration = 'none';
      a.style.borderBottom = '1px dotted rgba(242,196,100,.5)';
      f.appendChild(mark); f.appendChild(t); f.appendChild(a);
      document.body.appendChild(f);
    } catch (e) { /* рука не должна ломать дом */ }
  }
  /* МЕРА v3: нижняя мебель дома измеряется вживую; рука встаёт над её верхней кромкой. */
  function мера() {
    try {
      var vh = window.innerHeight || document.documentElement.clientHeight;
      if (!vh) return;
      var низ = 47; /* база: спутник-бар и дыхание */
      var мебель = document.querySelectorAll('.снг-спутник, .плеер, [data-нижняя-мебель]');
      for (var i = 0; i < мебель.length; i++) {
        var el = мебель[i];
        var s = window.getComputedStyle(el);
        if (!s || s.position !== 'fixed') continue;
        if (el.closest('[data-forge]') || el.closest('nav[aria-label="нить дома"]')) continue;
        var r = el.getBoundingClientRect();
        if (r.height <= 0 || r.height > vh * 0.6) continue;      /* не мебель */
        if (vh - r.bottom > 260) continue;                        /* не в нижнем поясе */
        var надо = Math.round(vh - r.top) + 8;                    /* сколько снизу, чтобы встать над кромкой */
        if (надо > низ) низ = надо;
      }
      document.documentElement.style.setProperty('--forge-niz', Math.min(низ, 260) + 'px');
    } catch (e) { /* мера не должна ломать дом */ }
  }
  function латка() {
    try {
      if (!document.head || document.getElementById('forge-latka-niz')) return;
      var st = document.createElement('style');
      st.id = 'forge-latka-niz';
      st.textContent = [
        'body > footer[data-forge="hand"]{position:fixed !important;left:222px !important;right:auto !important;top:auto !important;bottom:var(--forge-niz,47px) !important;margin:0 !important;max-width:min(760px,calc(100vw - 500px)) !important;background:#0B0A08 !important;background-image:linear-gradient(90deg,rgba(11,10,8,1),rgba(18,16,12,1),rgba(11,10,8,1)) !important;border:1px solid rgba(217,164,65,.4) !important;border-radius:10px !important;box-shadow:0 8px 22px rgba(0,0,0,.55) !important;z-index:2147482000 !important;}',
        'body > nav[aria-label="нить дома"]{position:fixed !important;left:222px !important;right:auto !important;top:auto !important;bottom:8px !important;margin:0 !important;background:#0B0A08 !important;border:1px solid rgba(176,141,87,.28) !important;border-radius:10px !important;z-index:2147482000 !important;}',
        '#sg65nav{background:rgba(10,10,12,.97) !important;border:1px solid rgba(176,141,87,.28) !important;border-radius:12px !important;padding:4px !important;}',
        '#main{padding-bottom:calc(var(--forge-niz,47px) + 70px) !important;}',
        '@media (max-width:1100px){body > footer[data-forge="hand"],body > nav[aria-label="нить дома"]{left:10px !important;max-width:calc(100vw - 210px) !important;}}',
        '@media (max-width:760px){body > footer[data-forge="hand"],body > nav[aria-label="нить дома"]{max-width:calc(100vw - 24px) !important;}#sg65nav{right:6px !important;bottom:52px !important;}}'
      ].join('\n');
      document.head.appendChild(st);
    } catch (e) { /* латка не должна ломать дом */ }
  }
  function следить() {
    /* мебель может встать позже плеера/спутника — мера перезапускается. */
    try {
      var т = null;
      var переставь = function () {
        try { if (т) clearTimeout(т); } catch (e) {}
        т = setTimeout(мера, 220);
      };
      window.addEventListener('resize', переставь, { passive: true });
      try {
        new MutationObserver(переставь).observe(document.body, { childList: true, subtree: true });
      } catch (e) {}
      переставь();
    } catch (e) { /* следить не должно ломать дом */ }
  }
  function dress() { crown(); stamp(); латка(); мера(); следить(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', dress);
  } else {
    dress();
  }
})();
