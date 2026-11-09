#!/usr/bin/env node
/* Оракул такта v10.52 «ЧУВСТВА» (С33) — байт-проверка дома.
   Запуск: node ИНСТРУМЕНТЫ/test_s31_chuvstva.js  → exit 0 = такт встал. */
"use strict";
const fs = require("fs");
const path = require("path");
const F = path.join(__dirname, "..", "СИНГУЛЯР_31_ЛАДОМ.html");
const raw = fs.readFileSync(F, "utf8");
const РЕЕСТР = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "versions.json"), "utf8"));
const ВЕР = РЕЕСТР.дом.версия, ТАКТ = РЕЕСТР.дом.такт, КЭШ = РЕЕСТР.дом.поколение_кэша, ДАТА = РЕЕСТР.дом.дата;
let fail = 0, ok = 0;
function чек(имя, условие){
  if(условие){ ok++; console.log("  ✓ " + имя); }
  else { fail++; console.log("  ✗ " + имя); }
}
console.log("=== ОРАКУЛ v10.52 «ЧУВСТВА» ===");
чек("титул дома живёт тактом реестра («"+ТАКТ+"»)", raw.includes("СИНГУЛЯР ·31 v"+ВЕР+" «"+ТАКТ+"»"));
чек("window.APP штамп: v/такт/кэш/стр (живой реестр)", raw.includes("v:'"+ВЕР+"', такт:'"+ТАКТ+"'") && raw.includes("s15-orkestrator-"+КЭШ) && raw.includes("стр:'"+ДАТА+"'"));
чек("проба ЗДОРОВЬЕ 23 живёт в зале", raw.includes("window.__HEALTH23"));
чек("проба 23 определена", raw.includes("window.__HEALTH23 = function()"));
чек("auraScript блок на месте", raw.includes('<script id="auraScript">') && raw.includes("window.__АУРА = { ver:'"));
чек("CSS ауры + гарды движения", raw.includes("#auraCv{position:absolute") && raw.includes('html[data-motion="off"] #auraCv{display:none}'));
чек("аура — шаг в конвейере, не свой RAF", raw.includes("window.__КОНВЕЙЕР.поставь(шаг, 'аура')"));
чек("канвас внутри #sngbg (гаснет в kids/day/kraft/hc)", /bg\.insertBefore\(cv, bg\.firstChild\)/.test(raw));
чек("АУРА читает существующий __KV.an (без второго MediaElementSource)", raw.includes("an.getByteFrequencyData(fa)") && !/auraScript[\s\S]{0,4000}createMediaElementSource/.test(raw.slice(raw.indexOf('auraScript'), raw.indexOf('strojScript'))));
чек("ПУЛЬС: хост-подписчик __TAKT_SUBS шлёт kv31b", raw.includes("разослать({ t:'kv31b', b:beat, a:accent?1:0 })"));
чек("ПУЛЬС: гость слушает kv31b и вибрирует", raw.includes("m.t==='kv31b' && pulsOn && navigator.vibrate"));
чек("ПУЛЬС: запись 'puls' в таблице __ГОСТЬ_ТРАНС (приёмник не правлен)", raw.includes("'puls':         function(){ pulsOn = !pulsOn;"));
чек("ПУЛЬС: тумблер гостя с памятью kv31gpuls", raw.includes("kv31gpuls") && raw.includes('id="kv31gPuls"'));
чек("ПУЛЬС: тумблер хозяина в панели КРЫШИ, память kv31puls", raw.includes('id="kv31btnPuls"') && raw.includes("kv31puls"));
чек("ЭХО: ползунок kv31paEcho в панели", raw.includes('id="kv31paEcho"'));
чек("ЭХО: процедурный импульс ирЭха", raw.includes("function ирЭха(ctx)") && raw.includes("Math.pow(1 - i/ч, зат)"));
чек("ЭХО: ConvolverNode в тракте micToPA", raw.includes("createConvolver()") && raw.includes("S.echoIR = ирЭха(ctx)"));
чек("ЭХО: «труба»-элемент muted при живом графе (Chrome-разблокировка)", raw.includes("S.micPA.muted = граф"));
чек("ЭХО: фолбэк srcObject сохранён", raw.includes("S.micPA.srcObject = stream"));
чек("ЭХО: память kv31echo", raw.includes("localStorage.getItem('kv31echo')"));
чек("ЭХО: hostStop разбирает граф", raw.includes("S.echoNodes[к].disconnect()") && raw.includes("S.echoCtx.close()"));
чек("F-03 закрыт: гард micPanel.open после await", raw.includes("if(!micPanel.open){") && raw.includes("тракт освобождаем"));
чек("F-04 закрыт: recBusy до первого await", raw.includes("let recBusy = false;") && raw.includes("recBusy = true;   /* F-04"));
чек("ящик «чувства·аура»: 3 вещи по обряду", raw.includes('К.ящики.push("чувства·аура")') && raw.includes('К.вер = "v10.52 «ЧУВСТВА»"'));
чек("семья в КАЗНЕ", raw.includes("/^__АУРА$|^__ЭХОЗАЛА$|^__ПУЛЬСЗАЛА$/"));
чек("VER зала — динамический от APP (фолбэк-литерал зала v10.78)", raw.includes('var VER = (window.APP && window.APP.ver) || "v10.78 «СЛОГ»";'));
чек("U+FFFD (битые символы) = 0", !raw.includes("\uFFFD"));
чек("старый хвост «СНЯТЬ КРЫШУ» жив (реверс не сломан)", raw.includes("СНЯТЬ КРЫШУ"));

const sw = fs.readFileSync(path.join(__dirname, "..", "sw15.js"), "utf8");
чек("sw15: кэш живого поколения («"+КЭШ+"»)", sw.includes("s15-orkestrator-"+КЭШ));
чек("sw15: летопись такта в комментарии", sw.includes("Такт v10.52 «ЧУВСТВА»"));
const vj = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "versions.json"), "utf8"));
чек("versions.json: дом живёт тактом реестра", vj.дом.версия === ВЕР && vj.дом.такт === ТАКТ && vj.дом.поколение_кэша === КЭШ);
чек("versions.json: летопись живёт (последняя запись = такт реестра)", Array.isArray(vj.летопись) && vj.летопись.length >= 100 && vj.летопись[vj.летопись.length - 1].такт === ТАКТ);
const shtab = fs.readFileSync(path.join(__dirname, "..", "ШТАБ_РЕВИЗИИ_31.html"), "utf8");
чек("ШТАБ: F-03/F-04 закрыты в реестре", shtab.includes("исправлено v10.52 «ЧУВСТВА» (гард micPanel.open") && shtab.includes("исправлено v10.52 «ЧУВСТВА» (recBusy"));
чек("ШТАБ: 4 тренд-карточки ЧУВСТВ", shtab.includes("Calm technology — осознанность через периферию") && shtab.includes("Haptic rhythm") && shtab.includes("Singer tools") && shtab.includes("Иммерсивный веб 2025"));

console.log("=== ИТОГ: " + ok + " зелёных, " + fail + " красных ===");
process.exit(fail ? 1 : 0);
