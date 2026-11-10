#!/usr/bin/env node
/* Optimiza las fotografías de fotos/originales/ → src/assets/img/fotos/<nombre>-<ancho>.webp
   y actualiza content/fotos-manifest.json (dimensiones para evitar saltos de diseño).
   Requiere ImageMagick (comando "convert"). Uso: node tools/fotos.js
   El nombre del archivo (sin extensión) es el que se usa en config/site.js y en los casos. */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const root = path.join(__dirname, '..');
const src = path.join(root, 'fotos/originales');
const dst = path.join(root, 'src/assets/img/fotos');
const WIDTHS = [480, 960, 1600];
fs.mkdirSync(dst, { recursive: true });
const manifest = {};
for (const f of fs.readdirSync(src).filter((x) => /\.(jpe?g|png|webp|tiff?)$/i.test(x))) {
  const name = path.basename(f, path.extname(f)).toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  const input = path.join(src, f);
  const [w, h] = execFileSync('identify', ['-format', '%w %h', input + '[0]']).toString().trim().split(' ').map(Number);
  const widths = WIDTHS.filter((x) => x < w).concat(w <= WIDTHS[WIDTHS.length - 1] ? [w] : []).slice(0, 3);
  for (const width of widths) {
    execFileSync('convert', [input + '[0]', '-auto-orient', '-strip', '-resize', `${width}x`, '-quality', '78', '-define', 'webp:method=6', path.join(dst, `${name}-${width}.webp`)]);
  }
  manifest[name] = { width: w, height: h, widths };
  console.log(`✔ ${name}: ${widths.join(', ')} px`);
}
fs.writeFileSync(path.join(root, 'content/fotos-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
