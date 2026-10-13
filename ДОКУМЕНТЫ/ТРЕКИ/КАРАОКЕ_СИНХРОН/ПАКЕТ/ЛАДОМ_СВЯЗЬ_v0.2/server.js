'use strict';
const http = require('node:http');
const crypto = require('node:crypto');
const { WebSocketServer, WebSocket } = require('ws');
const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '127.0.0.1';
const MAX_MESSAGE = 16 * 1024;
const rooms = new Map(); // room -> Map(clientId, {ws,name})
const clients = new Map();
const server = http.createServer((req,res)=>{res.writeHead(200,{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'});res.end('SINGULYAR LADOM signaling server. WebSocket endpoint is /signal.\n');});
const wss = new WebSocketServer({noServer:true,maxPayload:MAX_MESSAGE,perMessageDeflate:false});
server.on('upgrade',(req,socket,head)=>{if(req.url!=='/signal'){socket.destroy();return;}wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));});
function send(ws,obj){if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(obj));}
function leave(ws){const c=clients.get(ws);if(!c)return;const room=rooms.get(c.room);if(room){room.delete(c.id);for(const [id,p] of room)send(p.ws,{type:'peer-left',peerId:c.id});if(!room.size)rooms.delete(c.room);}clients.delete(ws);}
function fail(ws,message){send(ws,{type:'error',message});}
wss.on('connection',ws=>{
 const id=crypto.randomBytes(8).toString('hex');
 ws.on('message',(raw,isBinary)=>{
  if(isBinary){fail(ws,'Бинарные сообщения не поддерживаются сигналингом.');return;}
  let m;try{m=JSON.parse(raw.toString('utf8'));}catch{fail(ws,'Некорректный JSON.');return;}
  if(!m||typeof m.type!=='string'){fail(ws,'Нет типа сообщения.');return;}
  if(m.type==='create-room'||m.type==='join-room'){
   const roomId=String(m.room||'').toUpperCase();if(!/^[A-Z0-9_-]{4,12}$/.test(roomId)){fail(ws,'Код комнаты: 4–12 символов A–Z, цифры, _ или -.');return;}
   let room=rooms.get(roomId);
   if(m.type==='create-room'){if(room&&room.size){fail(ws,'Комната уже существует.');return;}room=new Map();rooms.set(roomId,room);}
   else if(!room){fail(ws,'Комната не найдена или уже завершена.');return;}
   if(room.size>=2){send(ws,{type:'room-full'});return;}
   const participant={ws,id,name:String(m.name||'Участник').slice(0,40),room:roomId};clients.set(ws,participant);room.set(id,participant);
   send(ws,{type:m.type==='create-room'?'room-created':'joined',room:roomId,peerId:[...room.keys()].find(x=>x!==id)||'',participantId:id});
   for(const [otherId,p] of room){if(otherId!==id){send(p.ws,{type:'peer-joined',peerId:id,name:participant.name,polite:true});send(ws,{type:'peer-joined',peerId:otherId,name:p.name,polite:false});}}
   return;
  }
  const c=clients.get(ws);if(!c){fail(ws,'Сначала войдите в комнату.');return;}
  if(m.room&&String(m.room).toUpperCase()!==c.room){fail(ws,'Сообщение относится к другой комнате.');return;}
  if(m.type==='leave-room'){leave(ws);send(ws,{type:'left'});return;}
  if(m.type==='text'){
   const text=String(m.text||'');if(!text.trim()||text.length>2000){fail(ws,'Текст пуст или превышает 2000 символов.');return;}
   const room=rooms.get(c.room);if(room)for(const [id,p] of room)if(id!==c.id)send(p.ws,{type:'text',text,name:c.name,sourceLanguage:String(m.sourceLanguage||'und').slice(0,35),targetLanguage:String(m.targetLanguage||'und').slice(0,35)});return;
  }
  if(m.type==='signal'){
   const to=String(m.to||'');const room=rooms.get(c.room);const p=room&&room.get(to);if(!p){fail(ws,'Получатель сигналинга не найден в комнате.');return;}
   // Only known signaling fields are forwarded; payload size is bounded by ws maxPayload.
   const out={type:'signal',from:c.id};if(m.description&&['offer','answer','pranswer','rollback'].includes(m.description.type))out.description=m.description;else if(m.candidate)out.candidate=m.candidate;else{fail(ws,'Пустой сигнал.');return;}send(p.ws,out);return;
  }
  fail(ws,'Неизвестный тип сообщения.');
 });
 ws.on('close',()=>leave(ws));ws.on('error',()=>leave(ws));
});
server.listen(PORT,HOST,()=>process.stdout.write(`LADOM signaling listening on http://${HOST}:${PORT} (WebSocket /signal)\n`));
process.on('SIGINT',()=>{for(const ws of wss.clients)ws.close();server.close(()=>process.exit(0));});
