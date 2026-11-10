/* Servidor estático mínimo que imita el alojamiento: índices de carpeta, 404 real,
   redirecciones de _redirects y un endpoint de formulario simulado (/__form). */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.xml': 'application/xml', '.txt': 'text/plain' };
module.exports = function serve(dir, port) {
  const redirects = fs.existsSync(path.join(dir, '_redirects'))
    ? fs.readFileSync(path.join(dir, '_redirects'), 'utf8').trim().split('\n').map((l) => l.split(' ')) : [];
  const state = { formStatus: 200, received: [] };
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    if (url === '/__form') {
      let body = ''; req.on('data', (c) => (body += c));
      req.on('end', () => { state.received.push(body); res.writeHead(state.formStatus, { 'Content-Type': 'application/json' }); res.end('{}'); });
      return;
    }
    for (const [from, to, code] of redirects) {
      if (from === url || (from.endsWith('/*') && url.startsWith(from.slice(0, -1)))) { res.writeHead(Number(code), { Location: to }); return res.end(); }
    }
    let file = path.join(dir, url);
    if (url.endsWith('/')) file = path.join(file, 'index.html');
    else if (!path.extname(url) && fs.existsSync(path.join(file, 'index.html'))) { res.writeHead(301, { Location: url + '/' }); return res.end(); }
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404, { 'Content-Type': TYPES['.html'] }); return res.end(fs.readFileSync(path.join(dir, '404.html')));
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(fs.readFileSync(file));
  });
  return new Promise((r) => server.listen(port, () => r({ server, state })));
};
