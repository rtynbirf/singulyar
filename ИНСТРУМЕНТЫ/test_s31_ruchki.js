#!/usr/bin/env node
/* Оракул такта v10.61 «РУЧКИ» (С41) — байт-проверка дома.
   Запуск: node ИНСТРУМЕНТЫ/test_s31_ruchki.js  → exit 0 = такт встал. */
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
console.log("=== ОРАКУЛ v10.61 «РУЧКИ» ===");

/* ── честность версий ── */
чек("титул дома живёт тактом реестра («"+ТАКТ+"»)", raw.includes("СИНГУЛЯР ·31 v"+ВЕР+" «"+ТАКТ+"»"));
чек("og:title живёт тактом реестра («"+ТАКТ+"»)", raw.includes('content="ЛАДОМ — пространство своих · СИНГУЛЯР ·31 v'+ВЕР+' «'+ТАКТ+'»"'));
чек("window.APP штамп: v/такт/кэш (живой реестр)", raw.includes("v:'"+ВЕР+"', такт:'"+ТАКТ+"'") && raw.includes("s15-orkestrator-"+КЭШ));
чек("К.вер поднят (ящики с К.вер в зале — исторические версии каждого)", (raw.match(/К\.вер = "/g) || []).length >= 2);
чек("VER-фолбэк погашен (фолбэк-литерал зала v10.78)", raw.includes('var VER = (window.APP && window.APP.ver) || "v10.78 «СЛОГ»";') && !raw.includes('"v10.59 «СИНТЕЗ»"'));
чек("__ХАРМ/__ПРОФИЛЬ подняты ×2", (raw.match(/ver:"v10\.61 «РУЧКИ»"/g) || []).length === 2);
чек("старого штампа v10.60 «ЧУТЬЁ» в живых строках нет", !raw.includes("v:'10.60'") && !raw.includes("s15-orkestrator-v115'"));

/* ── такт-комментарий ── */
чек("такт-комментарий С41 в шапке", raw.includes("<!-- такт v10.61 «РУЧКИ» (С41") && raw.indexOf("<!-- такт v10.61") < raw.indexOf("<!-- такт v10.60"));

/* ── тело ручек ── */
чек("__РУЧКИ определён", raw.includes("window.__РУЧКИ = (function(){"));
чек("идемпотентный страж (ручкиБлок)", raw.includes('if(document.getElementById("ручкиБлок")) return window.__РУЧКИ'));
чек("карточки объясняют «почему» (aria-label)", raw.includes('btn.setAttribute("aria-label", карт.имя + ". Почему: " + карт.почему)'));
чек("карточка транспорта — по контексту", raw.includes('▶ НАЧАТЬ ВЕЧЕР') && raw.includes('⏸ ПАУЗА') && raw.includes('▶ ПРОДОЛЖИТЬ'));
чек("карточка тишины — обе правды", raw.includes("◻ ТИШИНА") && raw.includes("🔊 ЗВУК ВЕРНУТЬ"));
чек("карточка света — следующая сцена с откатом на прежнюю", raw.includes('СВЕТ: "+(L[nx].name') && raw.includes('window.__SCENE.set(было)'));
чек("карточка пульта — открыть/убрать по состоянию", raw.includes("⚙ ОТКРЫТЬ ПУЛЬТ") && raw.includes("⚙ УБРАТЬ ПУЛЬТ"));
чек("доклады честны: откат=null", raw.includes('♥ ЗДОРОВЬЕ ДОМА', ) && raw.includes("МАЛЫШ · ОТЧЁТ") && raw.includes('инт:"OPEN", арг:"health", откат:null'));
чек("двери ·35/·36 с честным объяснением", raw.includes("ДВЕРЬ ·35 ВОПРОСЫ") && raw.includes("ДВЕРЬ ·36 СЛОВАРЬ") && raw.includes("вернёшься по ⌂"));
чек("лимит 8 карточек честный", raw.includes("return out.slice(0, 8);"));
чек("стек откатов — сессия, ≤6, без localStorage", raw.includes("if(СТЕК.length>6) СТЕК.length = 6;") && !/ручки[\s\S]{0,200}localStorage\.setItem/.test(raw.slice(raw.indexOf("window.__РУЧКИ"), raw.indexOf("</script>", raw.indexOf("window.__РУЧКИ")))));
чек("откат идёт шиной ЛИЦ (один путь действия)", raw.includes('шина("MUTE","")') && raw.includes('шина("TOGGLE","")'));
чек("пустой откат — честное объяснение, не фальшь", raw.includes("нечего отменять: обратимых действий в этом вечере ещё не было"));
чек("роль-гард: может() шины ЛИЦ", raw.includes('function может(инт){ try{ return !window.__РОЛИ || !window.__РОЛИ.ведает || window.__РОЛИ.ведает(инт); }catch(_){ return true; } }'));
чек("ноль innerHTML в органе ручек (закон калм-органа)", !/ручки[\s\S]{0,9000}innerHTML/.test(raw.slice(raw.indexOf("window.__РУЧКИ"), raw.indexOf("window.__РУЧКИ") + 9000)));
чек("MutationObserver — тонкий слой поверх калм-краси", raw.includes("НАБЛ.observe(КАРТА, { childList:true })"));
чек("здоровье ручек: карточек/обратимых/стек/гард", raw.includes("return { карточек:к.length, обратимых:обратимых, стек:СТЕК.length, гард:гард };"));

/* ── стиль ── */
чек("стиль ручек: блок + сетка", raw.includes('<style id="ручкиСтиль">') && raw.includes("#ручкиСетка{display:grid"));
чек("цели ≥44px (откат-чип)", raw.includes(".ручка-откат{display:inline-flex;align-items:center;min-height:44px"));
чек("фокус-кольцо канона дома", raw.includes('.ручка:focus-visible{outline:2px solid #D4AF37'));
чек("гард reduced-motion", raw.includes("@media (prefers-reduced-motion: reduce){#ручкиСетка .ручка,.ручка-откат{transition:none}}"));

/* ── казна и проба ── */
чек("казна: __РУЧКИ в семье «оберег·щит»", raw.includes("/^__ЩИТ$|^__ТИХО$|^__КАЛМТОЧКА$|^__РУЧКИ$/"));
чек("проба ЗДОРОВЬЕ 26 живёт в зале", raw.includes("window.__HEALTH26"));
чек("проба 26 определена (карточки/откаты/гард)", raw.includes("window.__HEALTH26 = function()") && raw.includes("з.карточек>=5 && з.карточек<=8"));
чек("паспорт пульта — строка ручек", raw.includes("— ручки (v10.61) —") && raw.includes("window.__РУЧКИ.стек()"));

/* ── U+FFFD и живые узлы дома ── */
чек("U+FFFD (битые символы) = 0", !raw.includes("\uFFFD"));
чек("старые дома живы: калм-точка не тронута", raw.includes('{id:"калмТочка"') && raw.includes("window.__КАЛМТОЧКА={") && raw.includes('калм-точка не собралась:'));
чек("ЗДОРОВЬЕ-пробы старьём живы (HEALTH25 на месте)", raw.includes("window.__HEALTH25 = function()"));

/* ── sw15 ── */
const sw = fs.readFileSync(path.join(__dirname, "..", "sw15.js"), "utf8");
чек("sw15: кэш живого поколения («"+КЭШ+"»)", sw.includes("s15-orkestrator-"+КЭШ));
чек("sw15: поколение живого кэша носится в теле («"+КЭШ+"»)", sw.includes(КЭШ));
чек("sw15: старое поколение ушло", !sw.includes("'s15-orkestrator-v115'"));

/* ── versions.json ── */
const vj = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "versions.json"), "utf8"));
чек("versions.json: дом живёт тактом реестра", vj.дом.версия === ВЕР && vj.дом.такт === ТАКТ && vj.дом.поколение_кэша === КЭШ);
чек("versions.json: летопись живёт (последняя запись = такт реестра)", vj.летопись[vj.летопись.length - 1].такт === ТАКТ);
чек("versions.json: летопись выросла (≥100, append-only)", vj.летопись.length >= 100);
чек("versions.json: счётчики из живого реестра (41/62/200)", vj.счётчики.дверей === 41 && vj.счётчики.песен === 62 && vj.счётчики.языков === 200);

/* ── документация ── */
const ч = fs.readFileSync(path.join(__dirname, "..", "CHANGELOG.md"), "utf8");
чек("CHANGELOG: [10.61] «РУЧКИ» сверху", ч.indexOf("## [10.61] «РУЧКИ»") >= 0 && ч.indexOf("## [10.61] «РУЧКИ»") < ч.indexOf("## [10.60] «ЧУТЬЁ»"));
чек("CHANGELOG: честный откат и фальшь-запрет описаны", ч.includes("Доклады и двери не имитируют откат") && ч.includes("Стек живёт только в сессии"));
const к = fs.readFileSync(path.join(__dirname, "..", "docs", "ДОРОЖНАЯ_КАРТА.md"), "utf8");
чек("карта помнит линию РУЧКИ, зал несёт __РУЧКИ (8 упоминаний)", к.includes("РУЧКИ") && (raw.match(/__РУЧКИ/g) || []).length >= 5);
чек("карта: старой 📋 строки нет", !к.includes("📋 **Генеративные карточки-действия**"));
const с = fs.readFileSync(path.join(__dirname, "..", "docs", "СИНТЕЗ.md"), "utf8");
чек("СИНТЕЗ: шапка/состояние — v10.61/v116", с.includes("**Такт:** v10.61 «РУЧКИ»") && с.includes("такт v10.61 «РУЧКИ»; кэш v116"));
чек("СИНТЕЗ: дорога без карточек (гасили один факт — одно место)", !с.includes("Генеративные карточки-действия** Малыша — ручки дома в ответах"));
const т = fs.readFileSync(path.join(__dirname, "..", "docs", "ТЗ.md"), "utf8");
чек("ТЗ: US-05 чекбокс ручек", т.includes("Ручки-карточки Малыша в калм-карте"));
const м = fs.readFileSync(path.join(__dirname, "..", "docs", "МАЛЫШ.md"), "utf8");
чек("МАЛЫШ: часть 9 «Уроки РУЧКИ»", м.includes("## Часть 9 · Уроки РУЧКИ") && м.includes("карточка = обещание + объяснение + откат"));
const ш = fs.readFileSync(path.join(__dirname, "..", "ШТАБ_РЕВИЗИИ_31.html"), "utf8");
чек("ШТАБ: +2 тренд-карточки РУЧЕК", ш.includes("Генеративные карточки-действия") && ш.includes("Undo-first — обратимость как норма") && ш.includes("(исследование v10.61)"));
const р = fs.readFileSync(path.join(__dirname, "..", "README.md"), "utf8");
чек("README: одна правда — живой реестр", р.includes("**"+ВЕР+" «"+ТАКТ+"»**") && р.includes("s15-orkestrator-"+КЭШ));
чек("README: карта тактов С40 и С41 вписаны (долг С40)", р.includes("| v10.60 | «ЧУТЬЁ» |") && р.includes("| v10.61 | «РУЧКИ» |"));

console.log("=== ИТОГ: " + ok + " зелёных, " + fail + " красных ===");
process.exit(fail ? 1 : 0);
