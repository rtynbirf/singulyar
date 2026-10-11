#!/usr/bin/env node
/* Оракул такта v10.53 «ОБЕРЕГ» (С34) — байт-проверка дома.
   Закон СИНГУЛЯРА: эргономика · приватность · конфиденциальность · юзабилити.
   Запуск: node ИНСТРУМЕНТЫ/test_s31_obereg.js  → exit 0 = такт встал. */
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
console.log("=== ОРАКУЛ v10.53 «ОБЕРЕГ» ===");

/* титул и версии */
чек("титул дома — v10.53 «ОБЕРЕГ»", raw.includes("<title>ЛАДОМ — пространство своих · СИНГУЛЯР ·31 v10.53 «ОБЕРЕГ»"));
чек("window.APP штамп: v/такт/кэш/стр", raw.includes("v:'10.53', такт:'ОБЕРЕГ'") && raw.includes("s15-orkestrator-v108") && raw.includes("стр:'2026-10-11'"));
чек("шапка-комментарий С34 на месте", raw.includes("такт v10.53 «ОБЕРЕГ» (С34") && raw.includes("ЗАКОН СИНГУЛЯРА"));

/* ЩИТ */
чек("ЩИТ: элемент в шапке до ЗДОРОВЬЯ", /<span id="shield" class="shield"[^>]*>[\s\S]{0,120}shTxt[\s\S]{0,120}<button id="chipHealth"/.test(raw));
чек("ЩИТ: оранжевая точка — паттерн Apple (#FF8A3C)", raw.includes(".shield.жив i{background:#FF8A3C"));
чек("ЩИТ: plain language «СВОЁ»/«МИКРОФОН»", raw.includes("жив ? 'МИКРОФОН' : 'СВОЁ'"));
чек("ЩИТ: драйвер — обёртка над трактом-брокером", raw.includes("Т.занять = function(){ var р = занять.apply(this, arguments); setTimeout(обнови, 0); return р; };"));
чек("ЩИТ: гарда от двойной обёртки", raw.includes("Т.__щитОбёрнут"));
чек("ЩИТ: aria-live=polite (скринридер объявит ожизнь мика)", raw.includes('<span id="shield" class="shield" aria-live="polite"'));
чек("ЩИТ: копирование — clipboard + textarea-фолбэк", raw.includes("navigator.clipboard.writeText") && raw.includes("document.execCommand('copy')"));

/* честное приглашение */
чек("приглашение: правда о сигналинге PeerJS на витрине", raw.includes("адрес зала ведёт через облако-телефонист PeerJS"));
чек("приглашение: кнопка копирования ≥44px (WCAG 2.2)", raw.includes('коп.id = \'kv31copy\'') && raw.includes("#kv31copy{min-height:44px"));
чек("приглашение: «звук и слова — напрямую между устройствами»", raw.includes("Звук и слова идут напрямую между вашими устройствами"));

/* ТИХО */
чек("ТИХО: 40 с спокойного часа, рубашки присыпаются", raw.includes("var ПАУЗА = 40000") && raw.includes("body.тихо .topbar,body.тихо #sceneRow{opacity:.26}"));
чек("ТИХО: строка песни не гаснет (нет .line в правиле тихо)", !/body\.тихо[^}]*#?lyrics/.test(raw));
чек("ТИХО: под паузой дом не спит", raw.includes("if(!играет()){ т = setTimeout(усни, ПАУЗА); return; }"));
чек("ТИХО: пауза/конец трека будят (capture у документа)", raw.includes("document.addEventListener('pause', бодри, true)"));
чек("ТИХО: касание/клавиша/фокус пробуждают", raw.includes("'pointermove','pointerdown','keydown','wheel','touchstart','focusin'"));

/* АУРА theme-aware */
чек("АУРА: цвета из токенов темы (--amber/--lilac/--coral)", raw.includes("ЦВ = [ цвет('--amber','222,169,104'), цвет('--lilac','110,150,210'), цвет('--coral','186,138,88') ]"));
чек("АУРА: пересчёт на смене темы, не в кадре рисования", raw.includes("if(темКлюч !== кешТемы){ кешТемы = темКлюч; обновиЦвета(); }"));
чек("АУРА: рисуй читает ЦВ, литералы ушли", raw.includes("круг(w*0.28, h*(0.62 + Math.sin(фаза)*0.06),     w*0.34*(0.75+ампл*0.5), ЦВ[0], 0.16*ампл);") && !raw.includes("'222,169,104', 0.16*ампл"));
чек("АУРА: экспорт цвета()", raw.includes("цвета: function(){ return (ЦВ||[]).join('|'); }"));

/* строка-герой */
чек("лирика: строка-герой 1.045", raw.includes("transform:scale(1.045)}/* С34 «ОБЕРЕГ»"));
чек("лирика: .done/.on не сломаны", raw.includes(".line.done{opacity:.22}") && raw.includes(".line.on{color:var(--lyrOn,var(--text));opacity:1;transform:scale(1.045)"));

/* обряд ящика */
чек("ящик «оберег·щит»: 2 вещи по обряду С23–С29", raw.includes('К.ящики.push("оберег·щит")') && raw.includes('К.вер = "v10.53 «ОБЕРЕГ»"') && raw.includes("К.вещей += 2;"));
чек("семья «оберег·щит» в КАЗНЕ", raw.includes('["оберег·щит",         /^__ЩИТ$|^__ТИХО$/]'));
чек("проба ЗДОРОВЬЕ 24 определена и в сборке", raw.includes("window.__HEALTH24 = function()") && raw.includes("window.__HEALTH23,window.__HEALTH24].forEach"));
чек("проба 24: 5 проб щита/тихого/приглашения/ауры", (function(){ var b = raw.slice(raw.indexOf("window.__HEALTH24 = function"), raw.indexOf("window.__HEALTH24 = function") + 4500); return (b.match(/out\.push\(/g) || []).length === 5; })());

/* канон не тронут */
чек("канон: С19 конвейер жив", raw.includes('__КОНВЕЙЕР.поставь(loop,"пульс")') || raw.includes('window.__КОНВЕЙЕР.поставь'));
чек("канон: аура — шаг в конвейере (своего RAF нет)", raw.includes("window.__КОНВЕЙЕР.поставь(шаг, 'аура')"));
чек("канон: брокер «ОДИН МИКРОФОН» не переписан (определение в ядре)", !/shieldScript[\s\S]{0,5000}window\.__ГОЛОС *= *\{/.test(raw));
чек("U+FFFD (битые символы) = 0", !raw.includes("\uFFFD"));
чек("старый хвост «СНЯТЬ КРЫШУ» жив (реверс не сломан)", raw.includes("СНЯТЬ КРЫШУ"));

/* sw15 */
const sw = fs.readFileSync(path.join(__dirname, "..", "sw15.js"), "utf8");
чек("sw15: кэш v108", sw.includes("s15-orkestrator-v108") && !sw.includes("s15-orkestrator-v107';"));
чек("sw15: летопись такта в комментарии", sw.includes("Такт v10.53 «ОБЕРЕГ»"));

/* versions.json */
const vj = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "versions.json"), "utf8"));
чек("versions.json: штамп 10.53/ОБЕРЕГ/v108", vj.дом.версия === "10.53" && vj.дом.такт === "ОБЕРЕГ" && vj.дом.поколение_кэша === "v108");
чек("versions.json: летопись С34 в голове, С33 следом", vj.летопись[0].такт === "ОБЕРЕГ" && (vj.летопись[1].такт === "ПРОЁМ" || vj.летопись[1].такт === "ЧУВСТВА"));
чек("versions.json: летопись 20 записей", vj.летопись.length === 20);

/* ШТАБ */
const shtab = fs.readFileSync(path.join(__dirname, "..", "ШТАБ_РЕВИЗИИ_31.html"), "utf8");
чек("ШТАБ: O-10/O-11 закрыты (сверено v10.53)", shtab.includes("сверено v10.53 «ОБЕРЕГ»") && !shtab.includes('"st": "открыто (README)"'));
чек("ШТАБ: ЭП-11 дополнен ОБЕРЕГОМ, ЛАН-ЗАЛ остаётся открытым", shtab.includes("v10.53 «ОБЕРЕГ» закрыл щит приватности") && shtab.includes("ЛАН-ЗАЛ (QR-сигналинг без облака)"));
чек("ШТАБ: 3 тренд-карточки ОБЕРЕГА", shtab.includes("Приватность на витрине: паттерн цветных точек") && shtab.includes("forgiving design") && shtab.includes("Calm idle — дом присыпается сам"));

/* README */
const rm = fs.readFileSync(path.join(__dirname, "..", "README.md"), "utf8");
чек("README: строка такта v10.53 в журнале", rm.includes("| v10.53 | «ОБЕРЕГ» |"));
const drm = fs.readFileSync(path.join(__dirname, "..", "ДОКУМЕНТЫ", "README.md"), "utf8");
чек("ДОКУМЕНТЫ/README: двери и специфика ЛАДОМ", drm.includes("специфика ЛАДОМ") && drm.includes("Быть рядом. По-своему."));

console.log("=== ИТОГ: " + ok + " зелёных, " + fail + " красных ===");
process.exit(fail ? 1 : 0);
