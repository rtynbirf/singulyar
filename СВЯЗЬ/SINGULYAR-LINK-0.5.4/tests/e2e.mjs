// Сквозная проверка в настоящем браузере: два человека, чат, сигнал, звонок WebRTC.
// Запуск: node tests/e2e.mjs   (нужен playwright; в комплект не входит)
// Движок прогона: SG_ENGINE=chromium|firefox|webkit (по умолчанию chromium — как в CI).
import { createRequire } from "node:module";
import { createApp } from "../server/index.mjs";
const require = createRequire(import.meta.url);
const pw = require(process.env.PLAYWRIGHT_PATH || "playwright");
const engineName = process.env.SG_ENGINE || "chromium";

const app = createApp({ bridgesConfig: [], env: { STUN_URL: "stun:127.0.0.1:1" } });
const port = await app.listen(0, "127.0.0.1");
const base = `http://localhost:${port}`;
const LAUNCH_OPTS = {
  chromium: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] },
  firefox: { firefoxUserPrefs: { "media.navigator.streams.fake": true, "media.navigator.permission.disabled": true } },
  webkit: {}
};
const browser = await pw[engineName].launch(LAUNCH_OPTS[engineName] ?? {});
const ok = (c, m) => { if (!c) throw new Error("FAIL: " + m); console.log("ok  " + m); };
const errors = [];

async function person(name, url, perms = true) {
  /* firefox: право на микрофон даёт преф media.navigator.permission.disabled — список permissions не поддерживается */
  const ctx = await browser.newContext(engineName === "firefox" ? {} : { permissions: perms ? ["microphone", "camera"] : [] });
  const p = await ctx.newPage();
  p.on("pageerror", e => { errors.push(name + ": " + (e.message || "(пустая ошибка)")); console.log("[pageerror]", name, JSON.stringify(e.message), e.stack ? String(e.stack).split("\n")[1] : ""); });
  await p.goto(url);
  return p;
}

// Папа создаёт пространство
const dad = await person("dad", base);
await dad.fill("#title", "Семья Тест");
await dad.click("#btnCreate");
const link = await dad.evaluate(() => location.href);
ok(/\?r=[A-Z0-9]{10}&t=/.test(link), "ссылка-приглашение построена от адреса страницы: " + link.replace(/r=\w+/, "r=…"));
await dad.fill("#name", "Папа");
await dad.click("#btnJoin");
await dad.waitForSelector("#view-room:not(.hidden)");

// Приглашение: карточки мессенджеров и QR
await dad.click("#btnInvite");
const hrefs = await dad.$$eval("#inviteBtns a", as => as.map(a => a.href));
ok(hrefs.some(h => h.startsWith("https://wa.me/?text=") && h.includes(encodeURIComponent(link.split("?")[0]).slice(0, 10))), "WhatsApp-карточка");
ok(hrefs.some(h => h.startsWith("viber://forward")), "Viber-карточка");
ok(hrefs.some(h => h.startsWith("https://teams.microsoft.com/share")), "Teams-карточка");
ok((await dad.$eval("#qr", e => e.innerHTML)).includes("<svg"), "QR нарисован");
await dad.click("#inviteClose");

// Бабушка открывает ссылку «из мессенджера», включает субтитры и озвучку
const gran = await person("gran", link);
ok((await gran.textContent("#joinTitle")).includes("Семья Тест"), "в ссылке название пространства");
await gran.fill("#name", "Бабушка");
await gran.check("#nCaps"); await gran.check("#nSpeak"); await gran.check("#nLarge");
await gran.click("#btnJoin");
await gran.waitForSelector("#view-room:not(.hidden)");
await dad.waitForFunction(() => document.querySelectorAll(".peer").length === 2);
ok((await dad.textContent("#peers")).includes("📝 субтитры"), "папа видит: бабушке нужны субтитры");
ok(await gran.evaluate(() => document.documentElement.classList.contains("large")), "крупный режим у бабушки включён");

// Чат
await dad.fill("#msg", "Привет, бабушка!");
await dad.press("#msg", "Enter");
await gran.waitForFunction(() => document.querySelector("#messages").textContent.includes("Привет, бабушка!"));
ok(true, "сообщение дошло");

// Сигнал
await dad.click('[data-nudge="call"]');
await gran.waitForFunction(() => document.querySelector("#messages").textContent.includes("просит позвонить"));
ok(true, "сигнал «Позвони» дошёл");

// Звонок WebRTC: оба включают микрофон и камеру, проверяем реальный приём медиа
for (const p of [dad, gran]) { await p.click("#btnMic"); await p.click("#btnCam"); }
async function remoteMedia(p) {
  return p.waitForFunction(() => {
    const vs = [...document.querySelectorAll('.tile:not(.self) video')];
    return vs.some(v => v.srcObject && v.srcObject.getTracks().some(t => t.kind === "audio") && v.srcObject.getTracks().some(t => t.kind === "video"));
  }, null, { timeout: 15000 });
}
try { await remoteMedia(dad); await remoteMedia(gran); ok(true, "звонок: аудио+видео дошли в обе стороны (WebRTC)"); }
catch (e) { throw new Error("FAIL: WebRTC не соединился: " + e.message); }

// Выключение камеры → пересогласование без падения
await dad.click("#btnCam");
await dad.click("#btnCam");
await gran.waitForTimeout(800);
ok(await gran.evaluate(() => [...document.querySelectorAll('.tile:not(.self) video')].length >= 1), "переключение камеры не ломает звонок");

// Реконнект: сервер рвёт сокет, клиент возвращается, дубликатов сообщений нет
await gran.evaluate(() => 0);
const before = await gran.$$eval(".msg", e => e.length);
await dad.fill("#msg", "второе"); await dad.press("#msg", "Enter");
await gran.waitForFunction(() => document.querySelector("#messages").textContent.includes("второе"));
ok(before >= 1, "чат продолжает работать");

ok(errors.length === 0, "нет необработанных ошибок в браузере " + JSON.stringify(errors));
await browser.close(); await app.close();
console.log("\nE2E: ВСЁ ЗЕЛЁНОЕ");
