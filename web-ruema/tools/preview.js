#!/usr/bin/env node
/* Copia dist/ a otra carpeta con enlaces relativos (…/index.html) para poder abrir la web
   sin servidor o en una vista previa que no sirve desde la raíz del dominio.
   Uso: node build.js && node tools/preview.js <carpeta-destino> */
'use strict';
const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '..', 'dist');
const dst = path.resolve(process.argv[2] || path.join(__dirname, '..', 'dist-preview'));
fs.rmSync(dst, { recursive: true, force: true });
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const s = path.join(d, e.name); const rel = path.relative(src, s); const o = path.join(dst, rel);
    if (e.isDirectory()) { walk(s); continue; }
    if (/^_|robots|sitemap/.test(e.name)) continue;
    fs.mkdirSync(path.dirname(o), { recursive: true });
    if (e.name.endsWith('.html')) {
      const prefix = '../'.repeat(rel.split(path.sep).length - 1) || './';
      let html = fs.readFileSync(s, 'utf8').replace(/<link rel="canonical"[^>]*>\n?/, '');
      html = html.replace(/\b(href|src)="\/(?!\/)([^"#]*)(#[^"]*)?"/g, (m, a, p, h) =>
        `${a}="${prefix}${p === '' || p.endsWith('/') ? p + 'index.html' : p}${h || ''}"`);
      fs.writeFileSync(o, html);
    } else if (e.name.endsWith('.css')) {
      fs.writeFileSync(o, fs.readFileSync(s, 'utf8').replace(/url\("\/assets\//g, 'url("./'));
    } else fs.copyFileSync(s, o);
  }
})(src);
console.log('✔ vista previa en ' + dst);
