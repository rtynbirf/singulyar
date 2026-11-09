'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = Number(process.env.PORT || 8080);
const ROOT = path.resolve(__dirname, '..');
const rooms = new Map();
const MIME = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/markdown; charset=utf-8'};

function safeSend(ws, obj) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}
function getRoom(code) {
  if (!rooms.has(code)) rooms.set(code, new Set());
  return rooms.get(code);
}
function broadcast(room, sender, obj) {
  for (const client of room) if (client !== sender) safeSend(client, obj);
}
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  const file = path.resolve(ROOT, '.' + pathname);
  if (!file.startsWith(ROOT + path.sep) && file !== ROOT) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(err.code === 'ENOENT' ? 404 : 500); return res.end(err.code === 'ENOENT' ? 'Not found' : 'Server error'); }
    res.writeHead(200, {'Content-Type': MIME[path.extname(file)] || 'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-store'});
    res.end(data);
  });
});
const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });
server.on('upgrade', (req, socket, head) => {
  const pathname = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname;
  if (pathname !== '/signal') { socket.destroy(); return; }
  wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
});
wss.on('connection', ws => {
  ws.roomCode = null;
  ws.clientId = null;
  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return safeSend(ws, {type:'error', message:'Некорректное сообщение'}); }
    if (!msg || typeof msg.type !== 'string') return;
    if (msg.type === 'join') {
      const code = String(msg.room || '').toUpperCase();
      if (!/^[A-Z0-9]{4,12}$/.test(code)) return safeSend(ws,{type:'error',message:'Код комнаты: 4–12 латинских букв или цифр'});
      let room = getRoom(code);
      if (room.size >= 2) return safeSend(ws,{type:'error',message:'Комната заполнена (максимум два участника в прототипе).'});
      ws.roomCode = code; ws.clientId = String(msg.from || '');
      const other = [...room][0];
      room.add(ws);
      safeSend(ws,{type:'joined',peers:room.size,shouldOffer:!other});
      if (other) {
        safeSend(other,{type:'peer-joined',from:ws.clientId,name:String(msg.name||'Участник').slice(0,40)});
        safeSend(ws,{type:'peer-joined',from:other.clientId||''});
      }
      return;
    }
    const room = ws.roomCode && rooms.get(ws.roomCode);
    if (!room || !room.has(ws)) return safeSend(ws,{type:'error',message:'Сначала войдите в комнату'});
    if (msg.type === 'leave') { cleanup(ws); return; }
    const allowed = new Set(['offer','answer','candidate','text']);
    if (!allowed.has(msg.type)) return;
    if (msg.type === 'text') {
      if (typeof msg.text !== 'string' || msg.text.length > 4000) return safeSend(ws,{type:'error',message:'Сообщение слишком длинное'});
      msg.text = msg.text;
      msg.name = String(msg.name || 'Участник').slice(0,40);
    }
    // Relay only signaling and small text messages; media itself travels via WebRTC.
    broadcast(room, ws, msg);
  });
  ws.on('close', () => cleanup(ws));
  ws.on('error', () => cleanup(ws));
});
function cleanup(ws) {
  const code = ws.roomCode;
  if (!code) return;
  const room = rooms.get(code);
  if (room) {
    room.delete(ws);
    for (const client of room) safeSend(client,{type:'peer-left'});
    if (room.size === 0) rooms.delete(code);
  }
  ws.roomCode = null;
}
server.listen(PORT, '0.0.0.0', () => console.log(`Singulyar prototype listening on http://localhost:${PORT}`));
