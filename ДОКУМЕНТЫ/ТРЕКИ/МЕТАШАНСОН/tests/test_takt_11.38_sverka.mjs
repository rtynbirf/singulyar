/* страж такта v11.38 «СВЕРКА» (С116) — МЕТАШАНСОН/tests, канон дома */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import path from "node:path";

const КОРЕНЬ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const читай = (п) => readFileSync(path.join(КОРЕНЬ, п), "utf8");
function require_spawn(ком, арг){ /* node --test пишет отчёт в stderr — берём оба потока */
  const р = spawnSync(ком, арг, { cwd: КОРЕНЬ, encoding: "utf8", timeout: 120000 });
  return String(р.stdout || "") + String(р.stderr || "");
}

test("ремонт музыки: честные куски на месте в ·31", () => {
  const с = читай("СИНГУЛЯР_31_ЛАДОМ.html");
  assert.ok(с.includes("window.__СТОРОЖ_ЗВУКА"), "сторож звука вживлён");
  assert.ok(с.includes("домОтвал:домОтвал"), "домОтвал экспортирован транспортом");
  assert.ok(с.includes("твПуть:твПуть"), "твПуть экспортирован (ТВ-старт вечера)");
  assert.ok(/function ensureAudio\(\)[\s\S]{0,700}Applause\.init\(ac\)/.test(с), "ensureAudio на ТВ живёт без захвата элемента");
  assert.ok(/function startShow\(\)\{\s*if\(window\.SG_ЗВУК_ТВ&&window\.SG_ЗВУК_ТВ\(\)\)/.test(с), "startShow ТВ-ветка: вечер начинается без шасси webm");
  assert.ok(с.includes("const an=KV.an; /* ремонт v11.36"), "гарда beatFrame (RAF не роняет кадр на ТВ)");
  assert.ok(с.includes("window.APP = { v:'11.38', такт:'СВЕРКА'"), "APP ·31 на правду такта");
});

test("инлайн-скрипты ·31 валидны после ремонта", () => {
  const с = читай("СИНГУЛЯР_31_ЛАДОМ.html");
  const re = /<script([^>]*)>([\s\S]*?)<\/script>/g;
  let m, красных = 0, js = 0;
  while((m = re.exec(с))){
    const ат = m[1] || "", т = m[2];
    if(!т.trim()) continue;
    if(/type\s*=\s*["'](application\/json|speculationrules|module)/i.test(ат)) continue;
    if(/\bsrc\s*=/i.test(ат)) continue;
    js++;
    try{ new vm.Script(т); }catch(e){ красных++; console.log("красный блок:", String(e.message).slice(0, 120)); }
  }
  assert.ok(js > 30, "инлайн-скриптов достаточно");
  assert.equal(красных, 0);
});

test("ПВ5: канон crdt-ядро/0.1 существует, тесты зелёные", () => {
  const канон = path.join(КОРЕНЬ, "ДОКУМЕНТЫ/ТРЕКИ/КАРАОКЕ_СИНХРОН/src/crdt-ядро.mjs");
  assert.ok(existsSync(канон), "канон на месте");
  const прогон = require_spawn("node", ["ДОКУМЕНТЫ/ТРЕКИ/КАРАОКЕ_СИНХРОН/tests/test_crdt_yadro.mjs"]); /* напрямую: вложенный node --test раннер глушит */
  const весь = (прогон || "") + "";
  const пасс = /pass\s+24\b/.exec(весь), фай = /fail\s+[1-9]/.exec(весь);
  assert.ok(пасс, "24/24 проб канона (см. вывод: " + весь.slice(-200) + ")");
  assert.ok(!фай, "красных нет");
});

test("ПВ5: порт js/crdt-core.js валиден и в пре-кэше", () => {
  const порт = читай("js/crdt-core.js");
  new vm.Script(порт); /* синтаксис */
  assert.ok(порт.includes("window.__КРДТ"), "экспорт __КРДТ");
  const sw = читай("sw15.js");
  assert.ok(sw.includes("'./js/crdt-core.js'"), "пре-кэш +crdt-core");
  assert.ok(sw.includes("s15-orkestrator-v189"), "кэш v189 (стрелка их v188 цела)");
});

test("ПВ5: панели вживлены в ·25/·30/·33 в стиле каждой двери", () => {
  const с25 = читай("СИНГУЛЯР_25_КОШЕЛЁК.html");
  assert.ok(с25.includes('id="btnКрдтКорень"') && с25.includes('class="кноп"'), "·25: панель в каноне двери");
  assert.ok(с25.includes('src="js/crdt-core.js"'), "·25: порт подключён");
  const с30 = читай("СИНГУЛЯР_30_ТКАНЬ.html");
  assert.ok(с30.includes('id="кнКрдтКорень"') && с30.includes('class="тих"'), "·30: панель в каноне двери");
  const блок30 = (с30.split("ПВ5 (такт v11.36)")[1] || "").split("</script>")[0] || "";
  assert.ok(блок30.length > 200, "·30: блок ПВ5 найден");
  assert.ok(!/innerHTML\s*=|\w\.innerHTML/.test(блок30), "·30: закон 0 innerHTML в блоке ПВ5");
  const с33 = читай("СИНГУЛЯР_33_ФОНД.html");
  assert.ok(с33.includes('id="кнМеркльКорень"') && с33.includes('class="действие"'), "·33: панель в каноне двери");
  assert.ok(с33.includes("js/qr-token.js"), "·33: proof в QR через канон qr-token");
});

test("цех: versions.json на правду такта", () => {
  const в = JSON.parse(читай("data/versions.json"));
  assert.equal(в.дом.версия, "11.38");
  assert.equal(в.дом.такт, "СВЕРКА");
  assert.equal(в.дом.поколение_кэша, "v189");
});
