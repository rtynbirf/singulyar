/* Singulyar intent composition bridge — proposal for current index.html.
 * Target is the existing #намерениеФорма / #намерениеВвод / #намерениеОтвет.
 * It enriches Ariadne's existing result instead of replacing SNG.намерение.
 * No network, no storage, no automatic send, no innerHTML.
 * Add after the existing intent handler only after regression testing on a pinned commit.
 */
(function () {
  'use strict';
  var form = document.getElementById('намерениеФорма');
  var input = document.getElementById('намерениеВвод');
  var output = document.getElementById('намерениеОтвет');
  if (!form || !input || !output || form.dataset.singulyarCompositionBridge === '1') return;
  form.dataset.singulyarCompositionBridge = '1';

  var routes = {
    person: { label: 'Человек и предпочтения', href: 'СИНГУЛЯР_19_ЧЕЛОВЕК.html', why: 'сначала проверить предпочтения адресата' },
    intent: { label: 'Намерение и композиция', href: 'hir-prototype.html', why: 'сформулировать цель и выбрать составной сценарий' },
    compose: { label: 'СВОБОДА ·29', href: 'СИНГУЛЯР_29_СВОБОДА.html', why: 'предложить композицию, решение остаётся человеку' },
    fabric: { label: 'ТКАНЬ ·30', href: 'СИНГУЛЯР_30_ТКАНЬ.html', why: 'исследовать слой смысла и транспорта' },
    communicate: { label: 'ОБЩЕНИЕ ·21', href: 'СИНГУЛЯР_21_ОБЩЕНИЕ.html', why: 'представить один смысл текстом, речью, Брайлем/AAC/вибро' },
    transport: { label: 'СВЯЗЬ ·22', href: 'СИНГУЛЯР_22_СВЯЗЬ.html', why: 'выбрать канал с fallback к тексту' },
    circle: { label: 'КРУГ ·23', href: 'СИНГУЛЯР_23_КРУГ.html', why: 'выбрать адресата или группу' },
    email: { label: 'ПОЧТА ·24', href: 'СИНГУЛЯР_24_ПОЧТА.html', why: 'асинхронное письмо' },
    value: { label: 'КОШЕЛЁК ·25', href: 'СИНГУЛЯР_25_КОШЕЛЁК.html', why: 'передача ценности требует отдельного подтверждения' },
    line: { label: 'ЛИНИЯ ·26', href: 'СИНГУЛЯР_26_ЛИНИЯ.html', why: 'проверить существующий путь связи' },
    peer: { label: 'ПИР ·54', href: 'СИНГУЛЯР_54_ПИР.html', why: 'живая связь; доступность и сигнализация зависят от окружения' },
    humanLink: { label: 'СВЯЗЬ ЧЕЛОВЕКА ·53', href: 'СИНГУЛЯР_53_СВЯЗЬ_ЧЕЛОВЕКА.html', why: 'существующая дверь связи человека' },
    event: { label: 'СОБЫТИЕ ·18', href: 'СИНГУЛЯР_18_СОБЫТИЕ.html', why: 'создать/войти в событие или зал' }
  };
  function classify(text) {
    var q = String(text || '').toLocaleLowerCase('ru');
    var keys = [];
    if (/деньг|оплат|перевод|подар|долг|за[её]м|бартер|пожертв|чаев/.test(q)) keys.push('value');
    if (/позвон|звон|видео|лицо|поговор|голос/.test(q)) keys.push('transport', 'peer');
    if (/напис|сообщ|текст|ответ|письм|почт/.test(q)) keys.push('communicate', 'email');
    if (/слеп|брай|озвуч|экранн|говорить не могу|нем|субтитр|глух|жест|вибр|доступ/.test(q)) keys.push('person', 'communicate');
    if (/групп|семь|друз|люд|позвать|собрат|событи|встрет/.test(q)) keys.push('circle', 'event');
    if (/рядом|связ|напрям|без посред|пир/.test(q)) keys.push('humanLink', 'peer');
    if (!keys.length) keys.push('intent', 'compose', 'communicate', 'transport', 'circle');
    return Array.from(new Set(keys)).slice(0, 5);
  }
  function addPanel() {
    var old = document.getElementById('singulyar-composition-suggestions');
    if (old) old.remove();
    var panel = document.createElement('section');
    panel.id = 'singulyar-composition-suggestions';
    panel.setAttribute('aria-label', 'Предложения способов общения');
    panel.style.cssText = 'margin-top:12px;padding:12px;border:1px solid rgba(212,175,55,.55);border-radius:12px;text-align:left';
    var title = document.createElement('h3');
    title.textContent = 'Возможная композиция — выберите сами';
    title.style.margin = '0 0 8px';
    panel.appendChild(title);
    var note = document.createElement('p');
    note.textContent = 'Намерение не отправляется автоматически. Это ссылки на существующие двери дома; доступность и реальные возможности проверяются внутри каждой двери.';
    panel.appendChild(note);
    classify(input.value).forEach(function (key) {
      var route = routes[key]; if (!route) return;
      var a = document.createElement('a');
      a.href = route.href;
      a.style.cssText = 'display:block;padding:8px 10px;margin:5px 0;border:1px solid rgba(240,240,248,.18);border-radius:8px;color:inherit;text-decoration:none';
      var strong = document.createElement('strong'); strong.textContent = route.label;
      var why = document.createElement('span'); why.textContent = ' — ' + route.why;
      a.appendChild(strong); a.appendChild(why); panel.appendChild(a);
    });
    output.appendChild(panel);
  }
  form.addEventListener('submit', function () { window.setTimeout(addPanel, 0); });
})();
