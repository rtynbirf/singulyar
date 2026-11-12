/* СИНГУЛЯР · ЕДИНОЕ ОКНО — 0.8.0 «СЛОИ» (волна ×20).
   Только дополнение: ни один существующий ключ, ID и строка логики не тронуты.
   1) Пилюля состояния «где я»: тело помечается data-room=in|out по лампе #dot —
      её зажигает и гасит app.js (setStatus); наблюдатель только читает класс.
   2) «Установить дом — 2 минуты»: свой ключ установки PWA. Где браузер умеет —
      родное окно установки (beforeinstallprompt); где нет — честные шаги руками. */
"use strict";
(function () {
  var dot = document.getElementById("dot");
  if (dot && window.MutationObserver) {
    var пометь = function () {
      document.body.setAttribute("data-room", dot.classList.contains("on") ? "in" : "out");
    };
    new MutationObserver(пометь).observe(dot, { attributes: true, attributeFilter: ["class"] });
    пометь();
  }

  var отложено = null;
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); отложено = e; });

  function установить() {
    if (!отложено) return false;
    var событие = отложено;
    отложено = null;
    try { событие.prompt(); } catch (e) {}
    if (событие.userChoice && событие.userChoice.finally) событие.userChoice.finally(function () {});
    return true;
  }

  var кнопка = document.getElementById("btnInstall"),
      шторка = document.getElementById("installDlg"),
      ещё = document.getElementById("btnInstallGo");

  function открыть() { if (шторка) шторка.classList.remove("hidden"); }
  function закрыть() { if (шторка) шторка.classList.add("hidden"); }

  if (кнопка) кнопка.addEventListener("click", function () { if (!установить()) открыть(); });
  if (ещё) ещё.addEventListener("click", function () { if (!установить()) открыть(); });

  var крести = document.getElementById("installClose");
  if (крести) крести.addEventListener("click", закрыть);
  if (шторка) шторка.addEventListener("click", function (e) { if (e.target === шторка) закрыть(); });
})();
