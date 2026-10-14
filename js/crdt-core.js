/* crdt-core/0.1 — порт канона ДОКУМЕНТЫ/ТРЕКИ/КАРАОКЕ_СИНХРОН/src/crdt-ядро.mjs (ПВ5, такт v11.36)
   Часы Лампорта + LWW-Element-Set + Меркль (несжатый trie глубины 64, 3 фазы, proof).
   Законы дома: время всегда аргументом (без Date.now внутри), 0 сети (транспорт снаружи — И-01),
   детерминизм (тай-брейк (т, уз)), честные отказы словами. Экспорт: window.__КРДТ. */
(function(){'use strict';

/* ── Часы Лампорта: монотонный порядок причинности ── */
function ЧасыЛампорта(){ this.t = 0; }
ЧасыЛампорта.prototype.тик = function(){ this.t += 1; return this.t; };
ЧасыЛампорта.prototype.приём = function(чужое){
  if(!Number.isInteger(чужое) || чужое < 0) throw new Error("чужое время — целое ≥ 0");
  this.t = Math.max(this.t, чужое) + 1;
  return this.t;
};

/* ── LWW-Element-Set: последнее-писавшее-побеждает по (т, уз) ── */
function LWWSet(){ this.записи = new Map(); }
LWWSet.prototype._победа = function(a, b){ return (a.т > b.т) || (a.т === b.т && a.уз > b.уз) ? a : b; };
LWWSet.prototype.добавить = function(э, т, уз){
  if(!Number.isInteger(т) || т < 0) throw new Error("время — целое ≥ 0");
  if(!уз) throw new Error("узел обязателен (детерминированный тай-брейк)");
  const н = { б: true, т: т, уз: String(уз) };
  const с = this.записи.get(э);
  this.записи.set(э, с ? this._победа(с, н) : н);
  return н;
};
LWWSet.prototype.удалить = function(э, т, уз){
  if(!Number.isInteger(т) || т < 0) throw new Error("время — целое ≥ 0");
  if(!уз) throw new Error("узел обязателен");
  const н = { б: false, т: т, уз: String(уз) };
  const с = this.записи.get(э);
  this.записи.set(э, с ? this._победа(с, н) : н);
  return н;
};
LWWSet.prototype.живые = function(){
  const р = [];
  this.записи.forEach(function(з, э){ if(з.б) р.push(э); });
  return р.sort();
};
LWWSet.prototype.слить = function(чужой){
  const записи = чужой instanceof LWWSet ? чужой.записи : new Map(Object.entries(чужой));
  var сам = this;
  записи.forEach(function(з, э){
    const с = сам.записи.get(э);
    сам.записи.set(э, с ? сам._победа(с, з) : з);
  });
  return this;
};
LWWSet.prototype.дифф = function(){
  const о = {};
  this.записи.forEach(function(з, э){ о[э] = { б: з.б, т: з.т, уз: з.уз }; });
  return о;
};
LWWSet.prototype.изДиффа = function(д){ return this.слить(д); };
LWWSet.prototype.чистка = function(порог){
  var снято = 0, сам = this;
  this.записи.forEach(function(з, э){ if(!з.б && з.т < порог){ сам.записи.delete(э); снято += 1; } });
  return снято;
};

/* ── Меркль: несжатый trie фиксированной глубины (см. канон) ── */
var МЕРКЛЬ_ГЛУБИНА = 64;
function ша(байты){
  const б = typeof байты === "string" ? new TextEncoder().encode(байты) : байты;
  return globalThis.crypto.subtle.digest("SHA-256", б).then(function(х){ return new Uint8Array(х); });
}
function hex(б){ return Array.prototype.map.call(б, function(x){ return x.toString(16).padStart(2, "0"); }).join(""); }
var _ПАД_КЭШ = null;
function ПАД(){ if(!_ПАД_КЭШ) _ПАД_КЭШ = ша("п:∅"); return _ПАД_КЭШ; }

var Меркль = {
  лист: function(э){
    if(typeof э !== "string" || !э) return Promise.reject(new Error("элемент — непустая строка"));
    return ша("л:" + э);
  },
  узел: function(л, п){
    const с = new Uint8Array(л.length + п.length + 1);
    с[0] = 1; с.set(л, 1); с.set(п, 1 + л.length);
    return ша(с);
  },
  дерево: function(элементы, глубина){
    if(элементы == null) return Promise.reject(new Error("элементы обязательны (пустой фонд — [])"));
    const Г = Number.isInteger(глубина) && глубина > 0 && глубина <= 256 ? глубина : МЕРКЛЬ_ГЛУБИНА;
    const уникальные = Array.from(new Set(элементы.map(String))).sort();
    for(var i0 = 0; i0 < уникальные.length; i0++){ if(!уникальные[i0]) return Promise.reject(new Error("пустой элемент недопустим")); }
    var сам = this;
    return Promise.all(уникальные.map(function(э){ return сам.лист(э); })).then(function(хэши){
      const биты = хэши.map(function(х){
        const г = hex(х), м = new Array(г.length * 4);
        for(let i = 0; i < г.length; i++){ const v = parseInt(г[i], 16); м[i*4]=(v>>3)&1; м[i*4+1]=(v>>2)&1; м[i*4+2]=(v>>1)&1; м[i*4+3]=v&1; }
        return м;
      });
      const список = уникальные.map(function(э, i){ return { э: э, х: хэши[i], б: биты[i] }; });
      function ветка(спис, г){
        if(спис.length === 0) return Promise.resolve(null);
        if(г >= Г){
          if(спис.length !== 1) return Promise.reject(new Error("коллизия путей листа — недопустима для канона"));
          return Promise.resolve({ л: спис[0].э, х: спис[0].х });
        }
        const лев = спис.filter(function(х){ return !х.б[г]; }), прав = спис.filter(function(х){ return х.б[г]; });
        return Promise.all([ветка(лев, г + 1), ветка(прав, г + 1)]).then(function(дв){
          return Promise.all([дв[0] ? Promise.resolve(дв[0].х) : ПАД(), дв[1] ? Promise.resolve(дв[1].х) : ПАД()]).then(function(хх){
            return сам.узел(хх[0], хх[1]).then(function(х){ return { д: дв, х: х }; });
          });
        });
      }
      return ветка(список, 0).then(function(три){
        return (три ? Promise.resolve(три.х) : ПАД()).then(function(к){ return { три: три, корень: к, листья: уникальные, глубина: Г }; });
      });
    });
  },
  корень: function(элементы){ return this.дерево(элементы).then(function(д){ return hex(д.корень); }); },
  сверка: function(элементыА, элементыБ){
    var сам = this;
    const лишние = [], недостающие = [];
    function обход(у, в_лишние){
      if(!у) return Promise.resolve();
      if(у.л){ (в_лишние ? лишние : недостающие).push(у.л); return Promise.resolve(); }
      return обход(у.д[0], в_лишние).then(function(){ return обход(у.д[1], в_лишние); });
    }
    function спуск(а, б){
      if(!а && !б) return Promise.resolve();
      if(а && б && hex(а.х) === hex(б.х)) return Promise.resolve();
      if(а && б && а.л && б.л){ лишние.push(а.л); недостающие.push(б.л); return Promise.resolve(); }
      if(а && б && а.д && б.д) return спуск(а.д[0], б.д[0]).then(function(){ return спуск(а.д[1], б.д[1]); });
      return а ? обход(а, true) : обход(б, false);
    }
    return Promise.all([this.дерево(элементыА), this.дерево(элементыБ)]).then(function(дд){
      return спуск(дд[0].три, дд[1].три).then(function(){
        return { равны: hex(дд[0].корень) === hex(дд[1].корень), лишние: Array.from(new Set(лишние)).sort(), недостающие: Array.from(new Set(недостающие)).sort() };
      });
    });
  },
  доказ: function(элементы, э, глубина){
    if(typeof э !== "string" || !э) return Promise.reject(new Error("элемент — непустая строка"));
    return this.дерево(элементы, глубина).then(function(д){
      if(д.листья.indexOf(э) < 0) return Promise.reject(new Error("листа нет в дереве: " + э));
      const путь = [];
      function путьК(у, г){
        if(!у) return Promise.resolve(false);
        if(у.л) return Promise.resolve(у.л === э);
        function шаг(i){
          путь.push({ с: у.д[1 - i] ? hex(у.д[1 - i].х) : "∅", л: i === 0 });
          return путьК(у.д[i], г + 1).then(function(нашёл){ if(нашёл) return true; путь.pop(); return false; });
        }
        return шаг(0).then(function(нашёл){ return нашёл ? true : шаг(1); });
      }
      return путьК(д.три, 0).then(function(нашёл){
        if(!нашёл) return Promise.reject(new Error("путь к листу не нашёлся"));
        return { элемент: э, корень: hex(д.корень), глубина: д.глубина, путь: путь };
      });
    });
  },
  проверьДоказ: function(пруф){
    if(!пруф || !Array.isArray(пруф.путь) || typeof пруф.элемент !== "string") return Promise.reject(new Error("proof неполон"));
    var сам = this;
    let хбП = this.лист(пруф.элемент);
    const шаги = пруф.путь.slice().reverse(); /* путь копится сверху вниз — подъём снизу вверх */
    шаги.forEach(function(шаг){ хбП = хбП.then(function(хб){
      if(typeof шаг.л !== "boolean") throw new Error("шаг пути бит");
      const сбП = шаг.с === "∅" ? ПАД()
        : (typeof шаг.с === "string" && шаг.с.length === 64 ? Promise.resolve(new Uint8Array((шаг.с.match(/../g) || []).map(function(b){ return parseInt(b, 16); }))) : null);
      if(!сбП) throw new Error("шаг пути бит");
      return сбП.then(function(сб){ return шаг.л ? сам.узел(хб, сб) : сам.узел(сб, хб); });
    }); });
    return хбП.then(function(хб){ return hex(хб) === пруф.корень; });
  }
};

window.__КРДТ = { ЧасыЛампорта: ЧасыЛампорта, LWWSet: LWWSet, Меркль: Меркль, МЕРКЛЬ_ГЛУБИНА: МЕРКЛЬ_ГЛУБИНА, hex: hex, вер: "0.1" };
}());
