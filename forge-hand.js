/* ФОРЖ:РУКА v2 · кузня rtynbirf · ЧЕЛОВЕК=АККАУНТ=PID1 · одно другое не исключает
   Рука дома СИНГУЛЯР: корона сверху + золотая нить внизу каждой страницы.
   CSP-безопасно: никаких inline-стилей в HTML, всё через свойства CSSOM. */
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
  /* ЛАТКА-НИЗ v2 (С179): слово владельца «ОДИН БЛОК ПЕРЕКРЫВАЕТ ДРУГОЙ!!!».
     Нижние латы дома — ПЛОТНЫЕ: контент не просвечивает, полосы не тонут
     в чужих стековых контекстах, у контента есть запас (padding-bottom).
     Одна точка правды: forge-hand.js грузится в каждой комнате дома. */
  function latka() {
    try {
      if (!document.head || document.getElementById('forge-latka-niz')) return;
      var st = document.createElement('style');
      st.id = 'forge-latka-niz';
      st.textContent = [
        'body > footer[data-forge="hand"]{position:fixed !important;left:222px !important;right:auto !important;top:auto !important;bottom:47px !important;margin:0 !important;max-width:min(760px,calc(100vw - 500px)) !important;background:#0B0A08 !important;background-image:linear-gradient(90deg,rgba(11,10,8,1),rgba(18,16,12,1),rgba(11,10,8,1)) !important;border:1px solid rgba(217,164,65,.4) !important;border-radius:10px !important;box-shadow:0 8px 22px rgba(0,0,0,.55) !important;z-index:2147482000 !important;}',
        'body > nav[aria-label="нить дома"]{position:fixed !important;left:222px !important;right:auto !important;top:auto !important;bottom:8px !important;margin:0 !important;background:#0B0A08 !important;border:1px solid rgba(176,141,87,.28) !important;border-radius:10px !important;z-index:2147482000 !important;}',
        '#sg65nav{background:rgba(10,10,12,.97) !important;border:1px solid rgba(176,141,87,.28) !important;border-radius:12px !important;padding:4px !important;}',
        '#main{padding-bottom:150px !important;}',
        '@media (max-width:1100px){body > footer[data-forge="hand"],body > nav[aria-label="нить дома"]{left:10px !important;max-width:calc(100vw - 210px) !important;}}',
        '@media (max-width:760px){body > footer[data-forge="hand"],body > nav[aria-label="нить дома"]{max-width:calc(100vw - 24px) !important;}#sg65nav{right:6px !important;bottom:52px !important;}}'
      ].join('\n');
      document.head.appendChild(st);
    } catch (e) { /* латка не должна ломать дом */ }
  }
  function dress() { crown(); stamp(); latka(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', dress);
  } else {
    dress();
  }
})();
