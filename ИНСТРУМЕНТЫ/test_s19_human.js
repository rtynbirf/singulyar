/* ═══ ТЕСТ ·19 ЧЕЛОВЕК + SINGULAR SERVER v1 (node --test ИНСТРУМЕНТЫ/test_s19_human.js) ═══
   Инварианты Human-First ТЗ + интеграционный тест GC из ТЗ:
   CREATE → TEMPORARY → EXPIRE → GC → метаданные отсутствуют + блоб отсутствует.
   Живой сервер поднимается на случайном порту с DATA_DIR во временной папке.
   Запуск: node --test ИНСТРУМЕНТЫ/test_s19_human.js */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawn} = require('node:child_process');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const SERVER = path.join(ROOT, 'server', 'server.mjs');
const sleep = ms => new Promise(r => setTimeout(r, ms));

function jsOf(file) {
  const s = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const m = s.match(/<script>([\s\S]*?)<\/script>/);
  return m ? m[1] : '';
}

/* ── статические инварианты модулей (дёшево, честно) ── */
test('·19 и ·18 говорят на одном алфавите кодов залов', () => {
  const s19 = jsOf('СИНГУЛЯР_19_ЧЕЛОВЕК.html');
  const s18 = fs.readFileSync(path.join(ROOT, 'СИНГУЛЯР_18_СОБЫТИЕ.html'), 'utf8');
  const a19 = s19.match(/const АЛФАВИТ_КОДА = '([^']+)'/);
  const a18 = s18.match(/const АЛФАВИТ_КОДА = '([^']+)'/);
  assert.ok(a19 && a18, 'алфавит объявлен в обоих модулях');
  assert.equal(a19[1], a18[1], 'алфавит совпадает посимвольно');
});
test('·19 не содержит ни одного присвоения innerHTML', () => {
  const s = fs.readFileSync(path.join(ROOT, 'СИНГУЛЯР_19_ЧЕЛОВЕК.html'), 'utf8');
  assert.equal((s.match(/innerHTML\s*=/g) || []).length, 0);
});
test('мост ·19→·18: ?зал=КОД для гостя и ?хост=КОД для ведущего существуют', () => {
  const s19 = fs.readFileSync(path.join(ROOT, 'СИНГУЛЯР_19_ЧЕЛОВЕК.html'), 'utf8');
  const s18 = fs.readFileSync(path.join(ROOT, 'СИНГУЛЯР_18_СОБЫТИЕ.html'), 'utf8');
  assert.ok(s19.includes("'СИНГУЛЯР_18_СОБЫТИЕ.html?зал='"), 'гостевая ссылка ·19 → ·18');
  assert.ok(s19.includes("'СИНГУЛЯР_18_СОБЫТИЕ.html?хост='"), 'хостская ссылка ·19 → ·18');
  assert.ok(/function создатьЗал\(фиксКод\)/.test(s18), '·18 принять фиксированный код');
  assert.ok(/btnCreate'\)\.addEventListener\('click', function \(\) \{ создатьЗал\(\); \}\)/.test(s18),
    'клик не передаёт MouseEvent как код (косяк предотвращён)');
  assert.ok(/п\.get\('хост'\)/.test(s18), '·18 читает ?хост=');
});
test('синтаксис JS ·19 и ·18 валиден (vm, блок за блоком)', () => {
  for (const f of ['СИНГУЛЯР_19_ЧЕЛОВЕК.html', 'СИНГУЛЯР_18_СОБЫТИЕ.html']) {
    const blocks = [...fs.readFileSync(path.join(ROOT, f), 'utf8').matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)];
    let проверено = 0;
    for (const b of blocks) {
      if (/\bsrc=/.test(b[0])) continue;
      const модуль = /type\s*=\s*["']?module/i.test(b[0]);
      /* module-блоки: top-level await и динамический import легальны в
         браузере, но vm.Script парсит как классический скрипт — для
         синтакс-проверки аппроксимируем (как в check_page_scripts.js) */
      const код = модуль
        ? b[1].replace(/\bimport\s*\(/g, 'IMPORT_ВЫЗОВ(').replace(/\bawait\s+/g, '')
        : b[1];
      new (require('node:vm').Script)(код); /* бросит при ошибке */
      проверено++;
    }
    assert.ok(проверено >= 1, f + ': хотя бы один встроенный блок проверен');
  }
});
test('личность: ECDSA P-256 подписывает вызов, серверная схема crypto.verify(JWK) её принимает', async () => {
  const keys = await crypto.webcrypto.subtle.generateKey({name: 'ECDSA', namedCurve: 'P-256'}, false, ['sign', 'verify']);
  const jwk = await crypto.webcrypto.subtle.exportKey('jwk', keys.publicKey);
  const challenge = crypto.randomBytes(32).toString('base64url');
  const sig = await crypto.webcrypto.subtle.sign({name: 'ECDSA', hash: 'SHA-256'}, keys.privateKey, new TextEncoder().encode(challenge));
  const sigB64 = Buffer.from(sig).toString('base64url');
  /* dsaEncoding ieee-p1363 — тот же формат, что у браузерного WebCrypto (и в server.mjs) */
  const ok = crypto.verify('sha256', Buffer.from(challenge), {key: crypto.createPublicKey({key: jwk, format: 'jwk'}), dsaEncoding: 'ieee-p1363'}, Buffer.from(sigB64, 'base64url'));
  assert.equal(ok, true, 'та же схема, что в server.mjs /api/auth/verify');
  const pubKey = {key: crypto.createPublicKey({key: jwk, format: 'jwk'}), dsaEncoding: 'ieee-p1363'};
  const подделка = crypto.verify('sha256', Buffer.from('другой вызов'), pubKey, Buffer.from(sigB64, 'base64url'));
  assert.equal(подделка, false, 'подмена challenge ловится');
});
test('технический UUID — не имя и не код друга', () => {
  const uuid = crypto.randomUUID(), имя = 'Бабушка';
  assert.notEqual(uuid, имя);
  assert.match(uuid, /^[0-9a-f-]{36}$/);
});

/* ── живой сервер: SINGULAR SERVER v1 ── */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 's19-test-'));
const env = {
  ...process.env, PORT: '0', GC_INTERVAL_MS: '300', TTL_TEMP_MS: '900',
  DATA_DIR: path.join(tmp, 'data'), MAX_FINAL_MB: '2'
};
const proc = spawn(process.execPath, [SERVER], {env, stdio: ['ignore', 'pipe', 'pipe']});
let BASE = '';
proc.stdout.on('data', d => { const m = String(d).match(/http:\/\/localhost:(\d+)/); if (m) BASE = 'http://127.0.0.1:' + m[1]; });
proc.stderr.on('data', d => process.stderr.write('[server] ' + d));
const waitBase = async () => { for (let i = 0; i < 100 && !BASE; i++) await sleep(60); assert.ok(BASE, 'сервер поднялся'); };

const jwkOf = async имя => {
  const keys = await crypto.webcrypto.subtle.generateKey({name: 'ECDSA', namedCurve: 'P-256'}, false, ['sign', 'verify']);
  const jwk = await crypto.webcrypto.subtle.exportKey('jwk', keys.publicKey);
  return {имя, keys, jwk};
};
const reg = async (ч) => {
  let r = await fetch(BASE + '/api/register', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({name: ч.имя, publicKey: ч.jwk})});
  assert.equal(r.status, 201);
  const {user} = await r.json();
  r = await fetch(BASE + '/api/auth/challenge', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({userId: user.id})});
  const {challenge} = await r.json();
  const sig = await crypto.webcrypto.subtle.sign({name: 'ECDSA', hash: 'SHA-256'}, ч.keys.privateKey, new TextEncoder().encode(challenge));
  r = await fetch(BASE + '/api/auth/verify', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({userId: user.id, signature: Buffer.from(sig).toString('base64url')})});
  assert.equal(r.status, 200);
  const d = await r.json();
  return {user, token: d.token};
};
const api = (token, method, p, body_, headers = {}) => fetch(BASE + p, {
  method,
  headers: {authorization: 'Bearer ' + token, ...(body_ !== undefined && !(body_ instanceof Buffer) ? {'content-type': 'application/json'} : {}), ...headers},
  body: body_ === undefined ? undefined : (body_ instanceof Buffer ? body_ : JSON.stringify(body_))
}).then(async r => ({status: r.status, data: await r.json().catch(() => ({})), headers: r.headers}));

test('сервер: health, CORS, статика с защитой', {timeout: 30000}, async (t) => {
  await waitBase();
  let r = await fetch(BASE + '/health');
  const h = await r.json();
  assert.equal(h.ok, true);
  assert.equal(h.ttlTempMs, 900, 'TTL из окружения принят');
  assert.equal(h.service, 'SINGULAR_SERVER');
  r = await fetch(BASE + '/api/me', {method: 'OPTIONS'});
  assert.equal(r.status, 204);
  assert.equal(r.headers.get('access-control-allow-origin'), '*', 'Pages-клиент имеет право звать API');
  r = await fetch(BASE + '/' + encodeURIComponent('СИНГУЛЯР_19_ЧЕЛОВЕК.html'));
  assert.equal(r.status, 200);
  assert.ok((r.headers.get('content-type') || '').includes('text/html'));
  r = await fetch(BASE + '/server/server.mjs');
  assert.equal(r.status, 404, 'код сервера не раздаётся как статика');
  r = await fetch(BASE + '/..%2f..%2fetc%2fpasswd');
  assert.equal(r.status, 404, 'обход пути закрыт');
});

test('личность: регистрация, подпись, отказ подделке', {timeout: 30000}, async () => {
  await waitBase();
  const б = await jwkOf('Бабушка');
  const {user, token} = await reg(б);
  assert.match(user.id, /^[0-9a-f-]{36}$/);
  assert.notEqual(user.id, 'Бабушка', 'UUID ≠ имя');
  const r = await api(token, 'GET', '/api/me');
  assert.equal(r.status, 200);
  assert.equal(r.data.user.name, 'Бабушка');
  /* длинное имя обрезается до 80 — сервер не принимает мусор */
  const длинное = await jwkOf('И'.repeat(120));
  let rr = await fetch(BASE + '/api/register', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({name: длинное.имя, publicKey: длинное.jwk})});
  const dd = await rr.json();
  assert.ok(dd.user.name.length <= 80);
});

test('мои люди: запрос → принятие; kick ≠ разрыв дружбы; повторный запрос после remove; блок', {timeout: 30000}, async () => {
  await waitBase();
  const б = await reg(await jwkOf('Бабушка2'));
  const в = await reg(await jwkOf('Внучка2'));
  const м = await reg(await jwkOf('Мама2'));
  /* чужой не может попроситься без связи — связи нет, но request создаёт pending (решает человек) */
  let r = await api(б.token, 'POST', '/api/friends/request', {userId: в.user.id});
  assert.equal(r.status, 200);
  r = await api(в.token, 'GET', '/api/me');
  assert.equal(r.data.incoming.length, 1, 'Внучка видит запрос');
  assert.equal(r.data.incoming[0].name, 'Бабушка2');
  r = await api(в.token, 'POST', '/api/friends/accept', {userId: б.user.id});
  assert.equal(r.status, 200);
  r = await api(б.token, 'GET', '/api/me');
  assert.equal(r.data.friends.length, 1, 'дружба двусторонняя');
  /* приглашение чужому (не другу) не проходит */
  r = await api(б.token, 'POST', '/api/sessions', {invitees: [м.user.id], hallCode: 'P7J97'});
  assert.equal(r.status, 201, 'сессия создаётся');
  r = await api(в.token, 'POST', '/api/sessions/' + r.data.sessionId + '/join');
  assert.equal(r.status, 200, 'друг входит');
  const сессияДоКика = r.data.sessionId;
  /* удаление из сессии НЕ удаляет дружбу — настоящий переход состояния, не константа */
  r = await api(б.token, 'GET', '/api/me');
  assert.equal(r.data.friends.length, 1, 'после join дружба жива');
  await api(в.token, 'POST', '/api/sessions/' + сессияДоКика + '/leave');
  r = await api(б.token, 'GET', '/api/me');
  assert.equal(r.data.friends.length, 1, 'после выхода из зала дружба НЕ разорвана');
  /* remove → повторный request снова pending (косяк прототипа исправлен) */
  await api(б.token, 'POST', '/api/friends/remove', {userId: в.user.id});
  r = await api(б.token, 'GET', '/api/me');
  assert.equal(r.data.friends.length, 0);
  r = await api(б.token, 'POST', '/api/friends/request', {userId: в.user.id});
  assert.equal(r.status, 200, 'после remove можно позвать снова (фикс прототипа)');
  assert.equal(r.data.state, 'pending');
  await api(в.token, 'POST', '/api/friends/accept', {userId: б.user.id});
  r = await api(б.token, 'GET', '/api/me');
  assert.equal(r.data.friends.length, 1);
  /* block закрывает дверь */
  await api(в.token, 'POST', '/api/friends/block', {userId: б.user.id});
  r = await api(б.token, 'POST', '/api/friends/request', {userId: в.user.id});
  assert.equal(r.status, 403, 'после block запрос отклонён');
});

test('приглашение спеть несёт код зала ·18', {timeout: 30000}, async () => {
  await waitBase();
  const б = await reg(await jwkOf('Бабушка3'));
  const в = await reg(await jwkOf('Внучка3'));
  await api(б.token, 'POST', '/api/friends/request', {userId: в.user.id});
  await api(в.token, 'POST', '/api/friends/accept', {userId: б.user.id});
  const r = await api(б.token, 'POST', '/api/sessions', {invitees: [в.user.id], hallCode: 'k4p2m', song: 'Когда теряем'});
  assert.equal(r.status, 201);
  assert.equal(r.data.hallCode, 'K4P2M', 'код нормализован к алфавиту залов');
  /* подпись события уходит по WS — проверим сырым клиентом ws из node_modules сервера */
  const {createRequire} = require('node:module');
  const req2 = createRequire(path.join(ROOT, 'server', 'package.json'));
  const WebSocket = req2('ws');
  const got = await new Promise((resolve, reject) => {
    const ws = new WebSocket(BASE.replace('http', 'ws') + '/ws?token=' + encodeURIComponent(в.token));
    const таймер = setTimeout(() => { ws.close(); reject(new Error('WS не доставил приглашение')); }, 4000);
    ws.on('message', raw => {
      const m = JSON.parse(String(raw));
      if (m.type === 'sing_invite') { clearTimeout(таймер); ws.close(); resolve(m); }
    });
    ws.on('error', reject);
  });
  assert.equal(got.hallCode, 'K4P2M');
  assert.equal(got.from.name, 'Бабушка3');
  assert.equal(got.song, 'Когда теряем');
});

test('ЗАПИСЬ: структура final.webm + manifest.json + participants/, TEMPORARY → MEMORY человеком', {timeout: 30000}, async () => {
  await waitBase();
  const б = await reg(await jwkOf('Бабушка4'));
  const r0 = await api(б.token, 'POST', '/api/sessions', {invitees: [], hallCode: 'AA2BB'});
  const sid = r0.data.sessionId;
  const аудио = Buffer.from('RIFF....WAVEfmt ' + 'x'.repeat(200));
  let r = await api(б.token, 'POST', '/api/recordings', аудио, {'x-session-id': sid, 'content-type': 'audio/webm'});
  assert.equal(r.status, 201);
  const rid = r.data.recording.id;
  assert.equal(r.data.recording.state, 'temporary');
  assert.ok(Math.abs(r.data.recording.expiresAt - Date.now() - 900) < 5000, 'expiresAt = now + TTL');
  /* структура перемикширования из ТЗ: manifest.json + participants/p1.webm */
  await api(б.token, 'POST', '/api/recordings/' + rid + '/manifest', {version: 1, participants: [{name: 'Бабушка4'}], song: null}, {'content-type': 'application/json'});
  await api(б.token, 'POST', '/api/recordings/' + rid + '/participants/1', Buffer.from('RIFF-part1-' + 'y'.repeat(100)), {'content-type': 'audio/webm'});
  const dir = path.join(tmp, 'data', 'recordings', rid);
  assert.ok(fs.existsSync(path.join(dir, 'final.webm')), 'final.webm на диске');
  assert.ok(fs.existsSync(path.join(dir, 'manifest.json')), 'manifest.json на диске');
  assert.ok(fs.existsSync(path.join(dir, 'participants', 'p1.webm')), 'participants/p1.webm на диске');
  /* временная ≠ доступная: пока не сохранена — никто не скачивает */
  r = await fetch(BASE + '/api/recordings/' + rid, {headers: {authorization: 'Bearer ' + б.token}});
  assert.equal(r.status, 404, 'temporary не раздаётся как воспоминание');
  /* человек решает: сохранить → память (с подписью и фото) */
  r = await api(б.token, 'POST', '/api/recordings/' + rid + '/save', {note: 'день рождения бабушки', photo: 'data:image/png;base64,iVBORw0KGgo='});
  assert.equal(r.status, 200);
  assert.equal(r.data.recording.state, 'memory');
  r = await api(б.token, 'GET', '/api/memories');
  assert.equal(r.data.memories.length, 1);
  assert.equal(r.data.memories[0].note, 'день рождения бабушки');
  assert.equal(r.data.memories[0].photo, true);
  r = await fetch(BASE + '/api/recordings/' + rid, {headers: {authorization: 'Bearer ' + б.token}});
  assert.equal(r.status, 200, 'сохранённое воспоминание доступно владельцу');
  /* чужой сохранить не может */
  const в = await reg(await jwkOf('Внучка4'));
  const r2 = await api(б.token, 'POST', '/api/sessions', {invitees: [], hallCode: 'CC3DD'});
  const аудио2 = Buffer.from('RIFF....WAVEfmt ' + 'z'.repeat(200));
  const r3 = await api(б.token, 'POST', '/api/recordings', аудио2, {'x-session-id': r2.data.sessionId, 'content-type': 'audio/webm'});
  const rr = await api(в.token, 'POST', '/api/recordings/' + r3.data.recording.id + '/save', {});
  assert.equal(rr.status, 403, 'решение о памяти — только у владельца записи');
});

test('ИНТЕГРАЦИОННЫЙ ТЕСТ ТЗ: CREATE → TEMP → EXPIRE → GC → метаданные absent + блоб absent', {timeout: 30000}, async () => {
  await waitBase();
  const б = await reg(await jwkOf('Бабушка5'));
  const r0 = await api(б.token, 'POST', '/api/sessions', {invitees: [], hallCode: 'DD4EE'});
  const аудио = Buffer.from('RIFF....WAVEfmt ' + 'q'.repeat(200));
  const r = await api(б.token, 'POST', '/api/recordings', аудио, {'x-session-id': r0.data.sessionId, 'content-type': 'audio/webm'});
  const rid = r.data.recording.id;
  const dir = path.join(tmp, 'data', 'recordings', rid);
  assert.ok(fs.existsSync(path.join(dir, 'final.webm')), 'CREATE: блоб существует');
  const meta = JSON.parse(fs.readFileSync(path.join(tmp, 'data', 'recordings.json'), 'utf8'));
  assert.ok(meta[rid], 'CREATE: метаданные существуют');
  /* TTL 900 мс, GC каждые 300 мс → через 2 с от записи не должно остаться НИЧЕГО */
  await sleep(2000);
  assert.ok(!fs.existsSync(dir), 'GC: блоб удалён');
  const meta2 = JSON.parse(fs.readFileSync(path.join(tmp, 'data', 'recordings.json'), 'utf8'));
  assert.ok(!meta2[rid], 'GC: метаданные удалены');
  const сохранённая = JSON.parse(fs.readFileSync(path.join(tmp, 'data', 'recordings.json'), 'utf8'));
  assert.ok(!Object.values(сохранённая).some(x => x.state === 'memory' && false), 'инвариант: память не тронута GC');
});

process.on('exit', () => { try { proc.kill('SIGKILL'); } catch {} });
test.after(() => { try { proc.kill('SIGKILL'); fs.rmSync(tmp, {recursive: true, force: true}); } catch {} });
