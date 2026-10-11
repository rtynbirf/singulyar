#!/usr/bin/env node
/* Оракул такта v10.52 «ЧУВСТВА» (С33) — байт-проверка дома.
   Запуск: node ИНСТРУМЕНТЫ/test_s31_chuvstva.js  → exit 0 = такт встал. */
"use strict";
const fs = require("fs");
const path = require("path");
const F = path.join(__dirname, "..", "СИНГУЛЯР_31_ЛАДОМ.html");
const raw = fs.readFileSync(F, "utf8");
let fail = 0, ok = 0;
function чек(имя, условие){
  if(условие){ ok++; console.log("  ✓ " + имя); }
  else { fail++; console.log("  ✗ " + имя); }
}
console.log("=== ОРАКУЛ v10.52 «ЧУВСТВА» ===");
чек("титул дома — v10.52 «ЧУВСТВА»", raw.includes("<title>ЛАДОМ — пространство своих · СИНГУЛЯР ·31 v10.52 «ЧУВСТВА»"));
чек("window.APP штамп: v/такт/кэш/стр", raw.includes("v:'10.52', такт:'ЧУВСТВА'") && raw.includes("s15-orkestrator-v107") && raw.includes("стр:'2026-10-11'"));
чек("проба ЗДОРОВЬЕ 23 в реестре", raw.includes("window.__HEALTH22,window.__HEALTH23]"));
чек("проба 23 определена", raw.includes("window.__HEALTH23 = function()"));
чек("auraScript блок на месте", raw.includes('<script id="auraScript">') && raw.includes("window.__АУРА = { ver:'v10.52'"));
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
чек("VER зала — динамический от APP (долг F-19)", raw.includes('var VER = (window.APP && window.APP.ver) || "v10.52 «ЧУВСТВА»";'));
чек("U+FFFD (битые символы) = 0", !raw.includes("\uFFFD"));
чек("старый хвост «СНЯТЬ КРЫШУ» жив (реверс не сломан)", raw.includes("СНЯТЬ КРЫШУ"));

const sw = fs.readFileSync(path.join(__dirname, "..", "sw15.js"), "utf8");
чек("sw15: кэш v107", sw.includes("s15-orkestrator-v107"));
чек("sw15: летопись такта в комментарии", sw.includes("Такт v10.52 «ЧУВСТВА»"));
const vj = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "versions.json"), "utf8"));
чек("versions.json: штамп 10.52/ЧУВСТВА/v107", vj.дом.версия === "10.52" && vj.дом.такт === "ЧУВСТВА" && vj.дом.поколение_кэша === "v107");
чек("versions.json: летопись С33 в голове", vj.летопись[0].такт === "ЧУВСТВА" && vj.летопись[1].такт === "ЯЗЫКИ");
const shtab = fs.readFileSync(path.join(__dirname, "..", "ШТАБ_РЕВИЗИИ_31.html"), "utf8");
чек("ШТАБ: F-03/F-04 закрыты в реестре", shtab.includes("исправлено v10.52 «ЧУВСТВА» (гард micPanel.open") && shtab.includes("исправлено v10.52 «ЧУВСТВА» (recBusy"));
чек("ШТАБ: 4 тренд-карточки ЧУВСТВ", shtab.includes("Calm technology — осознанность через периферию") && shtab.includes("Haptic rhythm") && shtab.includes("Singer tools") && shtab.includes("Иммерсивный веб 2025"));

console.log("=== ИТОГ: " + ok + " зелёных, " + fail + " красных ===");
process.exit(fail ? 1 : 0);
