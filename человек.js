/* ЧЕЛОВЕК · общий модуль дома (латка С135, такт v11.49 «ЗАКРЫТИЕ»).
   ЧТО ЭТО: единая личность на весь дом — один человек, одно устройство, одно имя.
   Выбрал себя однажды (в любой двери: КРУГ ·23, ПИР ·54, дальше — новые комнаты) —
   дом запомнил, и каждая дверь уже знает, кто вошёл: имя подставляется само,
   «регистрироваться» в другой комнате больше не нужно.
   Запуск: <script src="./человек.js"></script> до скрипта страницы. Дальше:
   ЧЕЛОВЕК.читать()  → запись {id?, имя, эмодзи, тип, deviceId, с} или null;
   ЧЕЛОВЕК.записать(л) → сквозная запись: ключ дома + ключ круга ·23 + имя ПИРа
                         (все комнаты остаются совместимыми, механизм один);
   ЧЕЛОВЕК.имя()     → короткое имя или '';
   ЧЕЛОВЕК.deviceId() → метка устройства: рождается один раз, живёт в доме.
   Хранение: только localStorage этого браузера. Сети нет, зависимостей нет,
   DOM-инъекций нет — канон дома. Вкладки узнают об изменении через событие storage. */
(function () {
  'use strict';
  var КЛЮЧ_ДОМ = 'singulyar.человек';
  var КЛЮЧ_КРУГ = 'singular.krug.v1.identity';
  var КЛЮЧ_ПИР = 'singulyar.pir.имя';
  var КЛЮЧ_УСТРОЙСТВО = 'singulyar.человек.deviceId';

  function читай(ключ) {
    try {
      var сыр = localStorage.getItem(ключ);
      return сыр ? JSON.parse(сыр) : null;
    } catch (е) { return null; }
  }
  function пиши(ключ, значение) {
    try { localStorage.setItem(ключ, значение); } catch (е) { /* хранилище глухо — живём без памяти */ }
  }
  function здоров(л) {
    return !!(л && typeof л.имя === 'string' && л.имя.trim() &&
              typeof л.deviceId === 'string' && л.deviceId);
  }

  window.ЧЕЛОВЕК = {
    КЛЮЧ: КЛЮЧ_ДОМ,

    /* читать(): ключ дома → усыновление прежней записи круга ·23 → null */
    читать: function () {
      var дом = читай(КЛЮЧ_ДОМ);
      if (здоров(дом)) return дом;
      var круг = читай(КЛЮЧ_КРУГ);
      if (здоров(круг)) return круг; /* кто выбрал себя в ·23 раньше — уже человек дома */
      return null;
    },

    /* записать(л): одна рука пишет во все ключи дома — механизмы комнат не ломаются */
    записать: function (л) {
      if (!здоров(л)) return false;
      var дом = Object.assign({}, л, { с: Date.now() });
      var круг = Object.assign({}, л); delete круг.с;
      var сырД = JSON.stringify(дом);
      пиши(КЛЮЧ_ДОМ, сырД);
      пиши(КЛЮЧ_КРУГ, JSON.stringify(круг));
      пиши(КЛЮЧ_ПИР, дом.имя.slice(0, 64));
      return true;
    },

    /* забыть(): дом чисто забывает человека на этом устройстве (все двери сразу) */
    забыть: function () {
      try { localStorage.removeItem(КЛЮЧ_ДОМ); } catch (е) {}
      try { localStorage.removeItem(КЛЮЧ_КРУГ); } catch (е) {}
      try { localStorage.removeItem(КЛЮЧ_ПИР); } catch (е) {}
    },

    имя: function () {
      var л = this.читать();
      return л ? л.имя : '';
    },

    /* deviceId(): метка устройства — своя у дома, рождается один раз */
    deviceId: function () {
      var л = читай(КЛЮЧ_ДОМ) || читай(КЛЮЧ_КРУГ);
      if (л && л.deviceId) return л.deviceId;
      try {
        var старая = localStorage.getItem(КЛЮЧ_УСТРОЙСТВО);
        if (старая) return старая;
      } catch (е) {}
      var д;
      try {
        д = (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID()
          : 'dev-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
      } catch (е) { д = 'dev-' + Date.now().toString(36); }
      пиши(КЛЮЧ_УСТРОЙСТВО, д);
      return д;
    }
  };
})();
