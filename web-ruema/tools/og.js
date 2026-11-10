#!/usr/bin/env node
/* Genera la imagen para compartir enlaces (1200×630) con el nombre de config/site.js.
   Uso: node tools/og.js   (requiere Playwright, ya disponible en el entorno de desarrollo) */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const cfg = require('../config/site');
const root = path.join(__dirname, '..');
const font = (f) => 'data:font/woff2;base64,' + fs.readFileSync(path.join(root, 'src/assets/fonts', f)).toString('base64');
const diagram = 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(root, 'src/assets/diagramas/terraza.svg')).toString('base64');
const html = `<!doctype html><html><head><style>
@font-face{font-family:B;src:url(${font('bricolage-grotesque-latin.woff2')})}@font-face{font-family:F;src:url(${font('figtree-latin.woff2')})}
body{margin:0;width:1200px;height:630px;background:#1F2429;color:#fff;font-family:F;display:grid;grid-template-columns:1fr 500px;align-items:center;overflow:hidden}
.t{padding:0 0 0 72px}.k{font:700 22px F;letter-spacing:.14em;text-transform:uppercase;color:#9CC0EE}
h1{font:800 56px/1.05 B;letter-spacing:-.02em;margin:18px 0 26px}.n{font:800 34px B;display:flex;gap:14px;align-items:center}
.m{width:44px;height:44px;border-radius:10px;background:#154A8A;display:grid;place-items:center}
.c{background:#fff;border-radius:28px 0 0 28px;padding:40px 24px 40px 30px;height:420px;display:grid;place-items:center}
</style></head><body><div class="t"><div class="k">${cfg.base.locality} · Granada</div><h1>Impermeabilizaciones en Granada</h1>
<div class="n"><span class="m"><svg viewBox="0 0 32 32" width="30" height="30"><path d="M16 5s8 9 8 14a8 8 0 0 1-16 0C8 14 16 5 16 5z" fill="#fff"/></svg></span>${cfg.brand.name}</div></div>
<div class="c"><img src="${diagram}" width="470"></div></body></html>`;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await p.setContent(html, { waitUntil: 'load' });
  await p.waitForTimeout(200);
  const out = path.join(root, 'src/assets/img/og.jpg');
  await p.screenshot({ path: out, type: 'jpeg', quality: 86 });
  await b.close();
  console.log('✔ ' + path.relative(process.cwd(), out));
})();
