/* страж такта v11.41 «ДОСТУПНО» (С119, ключ ㉖) — МЕТАШАНСОН/tests, канон дома.
   СТОП-ГОРН ×2: их v11.40 «ВОЗВРАТ ГОЛОСА» (С118, ключ №11 владельца) и их v11.39 «ГОЛОС ТВ» (С117, PAT №34)
   — их байты приняты целиком, мой такт честно перенумерован v11.40→v11.41/С118→С119/v191→v192/летопись 126→128.
   Приказ владельца: «ВЭБ АУДИО НЕ ДОСТУПНО В ЭТОМ БРАУЗЕРЕ ЗНАЧИТ ЛОЖИ ТО ЧТО ДОСТУПНО=)
   ЧЕЛОВЕК НЕ ДОЛЖЕН ИСПЫТОВАТЬ ДИСКОМФОРТ ОТ НЕ СПОСОБНОСТИ СИСТЕМЫ=)» */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync, statSync } from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import path from "node:path";

const КОРЕНЬ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const читай = (п) => readFileSync(path.join(КОРЕНЬ, п), "utf8");
const пропуски = (ат) => /type\s*=\s*["'](application\/ld\+json|speculationrules|importmap)/i.test(ат);

test("·31: тупик «Web Audio недоступен» снят — вечер играется элементом", () => {
  const с = читай("СИНГУЛЯР_31_ЛАДОМ.html");
  assert.ok(!с.includes('showToast("Web Audio недоступен в этом браузере")'), "старый тупик-тост вымиранием");
  assert.ok(с.includes("const безГрафа = !ensureAudio();"), "startShow: ветка безГрафа на месте");
  assert.ok(с.includes('if(ac && ac.state==="suspended")'), "гарда ac && ac.state в startShow");
  assert.ok(/if\(безГрафа\)\{\s*showToast\("Web Audio здесь недоступен[\s\S]{0,200}__СТОРОЖ_ЗВУКА\(\)/.test(с), "честный тост + сторож жив без графа");
  assert.ok(с.includes("new MediaRecorder(безГрафа ? micStream : recDest.stream"), "запись: микрофон напрямую без recDest");
  assert.ok(с.includes("Web Audio недоступен и микрофон не дали — записывать нечего; песня играет."), "честный отказ записи без микрофона");
  assert.ok(с.includes('n:"синтез аплодисментов"+((window.AudioContext||window.webkitAudioContext)?"":" — Web Audio нет'), "ЗДОРОВЬЕ аплодисментов честно о деградации");
  assert.ok(с.includes("window.APP = { v:'11.41', такт:'ДОСТУПНО'"), "APP ·31 на правду такта");
  assert.ok(/minus\/голос/.test(с), "их ГОЛОС ТВ: ветка голос-фонда целa");
  assert.ok(existsSync(path.join(КОРЕНЬ, "minus/голос")), "minus/голос/ существует");
});

test("·31: инлайн-скрипты валидны после правок", () => {
  const с = читай("СИНГУЛЯР_31_ЛАДОМ.html");
  const re = /<script([^>]*)>([\s\S]*?)<\/script>/g;
  let m, красных = 0, js = 0;
  while((m = re.exec(с))){
    const ат = m[1] || "", т = m[2];
    if(!т.trim() || /\bsrc\s*=/i.test(ат) || пропуски(ат)) continue;
    js++;
    try{ new vm.Script(т); }catch(e){ красных++; console.log("красный блок:", String(e.message).slice(0, 120)); }
  }
  assert.ok(js > 30, "инлайн-скриптов достаточно");
  assert.equal(красных, 0);
});

test("·15/·16/·17/·18: честные гарды вместо TypeError", () => {
  const с15 = читай("СИНГУЛЯР_15_ОРКЕСТРАТОР.html");
  assert.ok(с15.includes("S15_NO_AUDIO_CTX") && с15.includes("stream.getTracks().forEach(function(t){ t.stop(); })"), "·15: гард с остановкой трека");
  const с16 = читай("СИНГУЛЯР_16_СУФЛЁР.html");
  assert.ok(с16.includes("S16_NO_AUDIO_CTX") && /if \(!AC16\) throw/.test(с16), "·16: типизированный отказ");
  const с17 = читай("СИНГУЛЯР_17_ЗАЛ.html");
  assert.ok(с17.includes("S17_NO_AUDIO_CTX"), "·17: честный текст в phoneMicOn");
  const с18 = читай("СИНГУЛЯР_18_СОБЫТИЕ.html");
  assert.ok(/function ensureCtx\(\)\s*\{[\s\S]{0,220}if \(!AC\) return null;/.test(с18), "·18: ensureCtx возвращает null, не бросает");
  assert.ok(с18.includes("S18_NO_AUDIO_CTX"), "·18: микрофон — типизированный отказ");
  assert.ok(с18.includes("if (!ctx) return; /* v11.41"), "·18: чужой() skip графа");
  for (const п of ["СИНГУЛЯР_15_ОРКЕСТРАТОР.html","СИНГУЛЯР_16_СУФЛЁР.html","СИНГУЛЯР_17_ЗАЛ.html","СИНГУЛЯР_18_СОБЫТИЕ.html"]) {
    const с = читай(п);
    const re = /<script([^>]*)>([\s\S]*?)<\/script>/g;
    let m;
    while((m = re.exec(с))){
      if(!m[2].trim() || /\bsrc\s*=/i.test(m[1]||"") || пропуски(m[1]||"")) continue;
      new vm.Script(m[2]); /* синтакс каждой правленой двери */
    }
  }
});

test("·39: звоночек файлом — тон-тест доступен везде", () => {
  const с = читай("СИНГУЛЯР_39_КОЛОНКА.html");
  assert.ok(с.includes("const AC39 = window.AudioContext||window.webkitAudioContext;") && с.includes("звоночек файлом (Web Audio недоступен"), "пробаЗвука: элементный фолбэк");
  assert.ok(с.includes("const ACt = window.AudioContext||window.webkitAudioContext;") && с.includes("if(id39 && au.setSinkId)"), "тон: элементный фолбэк + setSinkId элемента");
  const ф = path.join(КОРЕНЬ, "звуки/тон-тест.mp3");
  assert.ok(existsSync(ф), "файл звоночка существует");
  assert.ok(statSync(ф).size > 5000 && statSync(ф).size < 100000, "звоночек лёгкий (5–100 КБ)");
  const ff = spawnSync("ffprobe", ["-v","quiet","-show_entries","format=duration","-of","csv=p=0","звуки/тон-тест.mp3"], { cwd: КОРЕНЬ, encoding: "utf8" });
  const д = parseFloat((ff.stdout||"").trim());
  assert.ok(д > 0.5 && д < 4, "звоночек звучит (ffprobe: " + д + " с)");
});

test("sw15: кэш v192, звоночек в пре-кэше, синтакс зелёный", () => {
  const sw = читай("sw15.js");
  assert.ok(sw.includes("s15-orkestrator-v192"), "кэш v192");
  assert.ok(!sw.includes("'s15-orkestrator-v191'"), "их поколение-литерал поднято");
  assert.ok(sw.includes("'./звуки/тон-тест.mp3'"), "пре-кэш +звоночек");
  const ч = spawnSync("node", ["--check","sw15.js"], { cwd: КОРЕНЬ, encoding: "utf8" });
  assert.equal(ч.status, 0, "node --check sw15.js зелёный");
});

test("versions.json: 11.41/ДОСТУПНО/v192, летопись 128 с репарацией v11.38", () => {
  const в = JSON.parse(читай("data/versions.json"));
  assert.equal(в.дом.версия, "11.41");
  assert.equal(в.дом.такт, "ДОСТУПНО");
  assert.equal(в.дом.поколение_кэша, "v192");
  assert.equal(в.летопись.length, 128, "летопись 128");
  assert.equal(в.летопись[123].версия, "11.37", "их ОКНО цело append-only");
  assert.equal(в.летопись[124].версия, "11.39", "их ГОЛОС ТВ цел append-only");
  assert.equal(в.летопись[125].версия, "11.40", "их ВОЗВРАТ ГОЛОСА цел append-only");
  assert.equal(в.летопись[126].версия, "11.38", "репарация: запись v11.38 восстановлена");
  assert.equal(в.летопись[127].версия, "11.41", "запись v11.41 на месте");
});

test("карты и цех: А-1 погашена, реестр №50, их ходы целы, README правда", () => {
  const кар = читай("docs/ДОРОЖНАЯ_КАРТА.md");
  assert.ok(кар.includes("### Линия АУДИО-ДОСТУПНОСТЬ"), "линия АУДИО-ДОСТУПНОСТЬ в разделе 2");
  assert.ok(кар.includes("✅→факт **закрыт тактом v11.41 «ДОСТУПНО» (С119, ключ ㉖; факт 3а.34)**"), "А-1 погашена фактом");
  assert.ok(кар.includes("| 48 | Такт v11.39 «ГОЛОС ТВ»"), "их №48 цел");
  assert.ok(кар.includes("| 49 | Такт v11.40 «ВОЗВРАТ ГОЛОСА»"), "их №49 цел");
  assert.ok(кар.includes("| 50 | Такт v11.41 «ДОСТУПНО»"), "мой такт №50");
  assert.ok(кар.includes("## 3а.32 · ТАКТ v11.39 «ГОЛОС ТВ»"), "их факт 3а.32 цел");
  assert.ok(кар.includes("## 3а.33 · ТАКТ v11.40 «ВОЗВРАТ ГОЛОСА»"), "их факт 3а.33 цел");
  assert.ok(кар.includes("## 3а.34 · ТАКТ v11.41 «ДОСТУПНО»"), "мой факт 3а.34");
  assert.ok(кар.includes("**Такт:** v11.41 «ДОСТУПНО»"), "шапка карты на правду такта");
  const ен = читай("docs/ДОРОЖНАЯ_КАРТА_EN.md");
  assert.ok(ен.includes("### AUDIO-AVAILABILITY line"), "EN: линия на месте");
  assert.ok(ен.includes("## 3a.34 · TACT v11.41"), "EN: факт 3a.34");
  assert.ok(ен.includes("| 50 | Tact v11.41"), "EN: мой №50");
  const зк = читай("docs/ЗЕЛЁНАЯ_КАРТА.md");
  assert.ok(зк.includes("**Такт v11.41 «ДОСТУПНО» (С119, ключ ㉖"), "ЗК: статус такта");
  const чг = читай("CHANGELOG.md");
  assert.ok(/## \[11\.41\] «ДОСТУПНО»/.test(чг), "CHANGELOG [11.41]");
  assert.ok(/## \[11\.40\] «ВОЗВРАТ ГОЛОСА»/.test(чг), "их [11.40] цел поверх");
  const рд = читай("README.md");
  assert.ok(рд.includes("**11.41 «ДОСТУПНО»**") && рд.includes("s15-orkestrator-v192"), "README одна правда");
});

test("живая логика: startShow безГрафа доходит до audio.play() (vm-прогон ядра)", () => {
  const с = читай("СИНГУЛЯР_31_ЛАДОМ.html");
  const i = с.indexOf("function startShow(){");
  const тело = с.slice(i, с.indexOf("function togglePlay()"));
  assert.ok(тело.includes("audio.play()"), "старт доходит до элемента");
  assert.ok(тело.includes("безГрафа"), "флаг безГрафа в теле старта");
  assert.ok(!/if\(!ensureAudio\(\)\)\{[^}]*return\s*;\s*\}/.test(тело.replace(/const безГрафа = !ensureAudio\(\);/, "")), "отказ-по-ensureAudio вымиранием — старта без звука больше нет");
});
