import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

http
  .createServer((req, res) => {
    let u = decodeURIComponent((req.url || '/').split('?')[0]);
    if (u === '/') u = '/index.html';
    const f = path.resolve(root, u.replace(/^\/+/, ''));
    if (!f.startsWith(root)) {
      res.writeHead(403);
      return res.end('403');
    }
    fs.readFile(f, (e, d) => {
      if (e) {
        res.writeHead(404);
        return res.end('404 ' + u);
      }
      res.writeHead(200, { 'Content-Type': mime[path.extname(f)] || 'application/octet-stream' });
      res.end(d);
    });
  })
  .listen(8765, '127.0.0.1', () => console.log('ready on 8765'));
