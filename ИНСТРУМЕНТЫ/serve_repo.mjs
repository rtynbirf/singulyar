/* Крошечный статический сервер репо для браузерных тестов.
   Почему не `python3 -m http.server`: в песочнице он виснет, когда родитель
   умирает с capture_output (обработчик пишет в мёртвый пайп). Node — надёжен.
   Запуск: node serve_repo.mjs <порт> [корень=папка этого файла/..] */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const порт = Number(process.argv[2] || 8923);
const корень = path.resolve(process.argv[3] || path.join(path.dirname(new URL(import.meta.url).pathname), '..'));

const ТИПЫ = {
  '.html': 'text/html; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', /* v1.27.0: иначе chromium не парсит мост (урок такта — тест-среда обязана соврать с продом как можно меньше; на GitHub Pages MIME верный) */
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.mp3': 'audio/mpeg', '.webm': 'video/webm', '.zip': 'application/zip',
  '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};

http.createServer((з, о) => {
  try {
    let п = decodeURIComponent(з.url.split('?')[0]);
    if (п === '/') п = '/index.html';
    const ф = path.join(корень, п);
    if (!ф.startsWith(корень)) { о.writeHead(403); о.end('forbidden'); return; }
    fs.readFile(ф, (е, д) => {
      if (е) { о.writeHead(404); о.end('not found'); return; }
      о.writeHead(200, { 'Content-Type': ТИПЫ[path.extname(ф).toLowerCase()] || 'application/octet-stream' });
      о.end(д);
    });
  } catch (е) { о.writeHead(500); о.end('error'); }
}).listen(порт, '127.0.0.1', () => console.log('serve_repo готов: http://127.0.0.1:' + порт + '/ из ' + корень));
