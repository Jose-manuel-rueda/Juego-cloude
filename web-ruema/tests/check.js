#!/usr/bin/env node
/* Comprobaciones de la web:  node tests/check.js
   1) La versión de producción se niega a generarse con la configuración real incompleta.
   2) Comprobaciones estáticas (SEO, enlaces, accesibilidad básica, sin marcadores) en pruebas y producción.
   3) Pruebas en navegador (móvil y escritorio): menú, barra inferior, llamadas, WhatsApp, formulario,
      medición, teclado, movimiento reducido, desbordamiento horizontal y errores de consola. */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
let failures = 0; let passes = 0;
const ok = (cond, msg) => { if (cond) passes++; else { failures++; console.log('  ✖ ' + msg); } };
const section = (t) => console.log('\n▸ ' + t);

/* ---------------- 1. bloqueo de producción ---------------- */
section('Producción bloqueada con datos pendientes');
const blocked = spawnSync('node', ['build.js', '--production', '--out=.test/blocked'], { cwd: ROOT, encoding: 'utf8' });
ok(blocked.status !== 0, 'la versión de producción debería fallar con la configuración real incompleta');
ok(/Faltan datos/.test(blocked.stderr), 'debería listar los datos que faltan');

/* ---------------- builds ---------------- */
execFileSync('node', ['build.js', '--out=.test/staging'], { cwd: ROOT });
execFileSync('node', ['build.js', '--production', '--out=.test/prod'], { cwd: ROOT, env: { ...process.env, RUEMA_CONFIG: path.join(__dirname, 'fixture-config.js') } });

/* ---------------- 2. estáticas ---------------- */
const listHtml = (dir) => {
  const out = [];
  (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (p.endsWith('.html')) out.push(p); } })(dir);
  return out;
};
const toUrl = (dir, f) => '/' + path.relative(dir, f).replace(/index\.html$/, '').replace(/\\/g, '/');
const strip = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

function staticChecks(dir, prod) {
  const files = listHtml(dir);
  const redirects = fs.readFileSync(path.join(dir, '_redirects'), 'utf8').trim().split('\n').map((l) => l.split(' ')[0]);
  const titles = new Map(); const descs = new Map();
  for (const f of files) {
    const html = fs.readFileSync(f, 'utf8');
    const url = toUrl(dir, f);
    const tag = `[${prod ? 'prod' : 'pruebas'} ${url}]`;
    const h1 = html.match(/<h1[\s>]/g) || [];
    ok(h1.length === 1, `${tag} debe tener exactamente un H1 (tiene ${h1.length})`);
    const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
    const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
    ok(title.length > 10 && title.length <= 70, `${tag} título de longitud adecuada (${title.length}): ${title}`);
    ok(desc.length >= 70 && desc.length <= 165, `${tag} descripción de 70–165 caracteres (${desc.length})`);
    if (titles.has(title)) ok(false, `${tag} título duplicado con ${titles.get(title)}`); titles.set(title, url);
    if (descs.has(desc)) ok(false, `${tag} descripción duplicada con ${descs.get(desc)}`); descs.set(desc, url);
    const noindex = /<meta name="robots" content="noindex/.test(html);
    const legal = /^\/(aviso-legal|privacidad|cookies|gracias)\/$|^\/404\.html$/.test(url);
    if (prod) ok(noindex === legal, `${tag} indexación incorrecta (noindex=${noindex})`);
    else ok(noindex, `${tag} la versión de pruebas debe llevar noindex`);
    if (url !== '/404.html') {
      const can = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
      ok(prod ? can === 'https://www.ejemplo-pruebas.test' + url : !!can, `${tag} canonical incorrecto: ${can}`);
    }
    // jerarquía de encabezados
    const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => +m[1]);
    for (let i = 1; i < levels.length; i++) if (levels[i] > levels[i - 1] + 1) { ok(false, `${tag} salto de encabezado h${levels[i - 1]}→h${levels[i]}`); break; }
    // imágenes
    for (const m of html.matchAll(/<img\b[^>]*>/g)) {
      ok(/\salt="[^"]+"/.test(m[0]), `${tag} imagen sin alt: ${m[0].slice(0, 80)}`);
      ok(/\swidth="\d+"/.test(m[0]) && /\sheight="\d+"/.test(m[0]), `${tag} imagen sin dimensiones`);
    }
    // ids únicos
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
    ok(!dup.length, `${tag} ids duplicados: ${[...new Set(dup)].join(', ')}`);
    // etiquetas de formulario
    for (const m of html.matchAll(/<(input|select|textarea)\b[^>]*\sid="([^"]+)"/g)) ok(html.includes(`for="${m[2]}"`), `${tag} campo sin etiqueta: ${m[2]}`);
    // enlaces internos
    for (const m of html.matchAll(/href="(\/[^"#]*)(#[^"]*)?"/g)) {
      const href = m[1];
      if (href.startsWith('//')) continue;
      const target = href.endsWith('/') ? path.join(dir, href, 'index.html') : path.join(dir, href);
      ok(fs.existsSync(target) || redirects.includes(href.replace(/\/$/, '')), `${tag} enlace roto: ${href}`);
      if (m[2] && m[2].length > 1 && (href === url)) ok(ids.includes(m[2].slice(1)), `${tag} ancla inexistente ${m[2]}`);
    }
    for (const m of html.matchAll(/href="#([^"]+)"/g)) if (!/^pendiente-/.test(m[1])) ok(ids.includes(m[1]), `${tag} ancla inexistente #${m[1]}`);
    // datos estructurados
    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      try { const o = JSON.parse(m[1]); ok(!o.aggregateRating && !o.review, `${tag} no debe haber valoraciones en datos estructurados`); } catch (e) { ok(false, `${tag} JSON-LD inválido`); }
    }
    if (prod) {
      ok(!/class="pend"|data-pendiente|Pendiente:|#pendiente-|staging/.test(html), `${tag} contiene marcadores de datos pendientes`);
      ok(!/form-warning/.test(html), `${tag} contiene aviso de formulario sin conectar`);
      ok(!/impermeabilizacion-piscinas-granada|piscina-pierde-agua|>Piscinas</.test(html) && !/cubierta o piscina/.test(html), `${tag} ofrece piscinas aunque el servicio no está confirmado`);
      ok(!/\/trabajos\//.test(html), `${tag} enlaza a Trabajos sin casos publicados`);
    }
  }
  return files.length;
}
section('Comprobaciones estáticas · pruebas');
console.log('  páginas: ' + staticChecks(path.join(ROOT, '.test/staging'), false));
section('Comprobaciones estáticas · producción (datos ficticios de test)');
console.log('  páginas: ' + staticChecks(path.join(ROOT, '.test/prod'), true));

const prodDir = path.join(ROOT, '.test/prod');
const sitemap = fs.readFileSync(path.join(prodDir, 'sitemap.xml'), 'utf8');
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace('https://www.ejemplo-pruebas.test', ''));
ok(locs.length > 5, 'sitemap con URLs');
for (const l of locs) {
  const f = path.join(prodDir, l, 'index.html');
  ok(fs.existsSync(f) && !/noindex/.test(fs.readFileSync(f, 'utf8')), `sitemap incluye una URL no indexable o inexistente: ${l}`);
}
ok(/Sitemap: https:\/\/www\.ejemplo-pruebas\.test\/sitemap\.xml/.test(fs.readFileSync(path.join(prodDir, 'robots.txt'), 'utf8')), 'robots.txt de producción con sitemap');
ok(!/X-Robots-Tag/.test(fs.readFileSync(path.join(prodDir, '_headers'), 'utf8')), 'producción sin X-Robots-Tag');
ok(/X-Robots-Tag: noindex/.test(fs.readFileSync(path.join(ROOT, '.test/staging/_headers'), 'utf8')), 'pruebas con X-Robots-Tag noindex');
ok(!fs.existsSync(path.join(prodDir, 'impermeabilizacion-piscinas-granada')), 'servicio pendiente (piscinas) no se publica en producción');
ok(!fs.existsSync(path.join(prodDir, 'trabajos')), 'Trabajos no se publica sin casos');

/* ---------------- 3. navegador ---------------- */
(async () => {
  const serve = require('./server');
  const { chromium } = require('playwright');
  const { server, state } = await serve(prodDir, 8099);
  const B = 'http://localhost:8099';
  const browser = await chromium.launch();
  const pages = locs.concat(['/aviso-legal/', '/privacidad/', '/cookies/']);
  try {
    section('Navegador · todas las páginas (móvil 390 px, tableta 768 px, escritorio 1366 px)');
    for (const vp of [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1366, height: 900 }]) {
      const p = await browser.newPage({ viewport: vp });
      const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
      for (const u of pages) {
        const r = await p.goto(B + u);
        ok(r.status() === 200, `${u} responde ${r.status()}`);
        const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        ok(over <= 0, `${u} a ${vp.width}px tiene desbordamiento horizontal de ${over}px`);
      }
      ok(!errs.length, `errores de consola a ${vp.width}px: ${errs.join(' | ')}`);
      await p.close();
    }

    section('Navegador · HTTP: 404, redirecciones');
    const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
    let r = await p.goto(B + '/no-existe/');
    ok(r.status() === 404, `página inexistente debe dar 404 (da ${r.status()})`);
    ok(/No encontramos esta página/.test(await p.content()), 'página 404 propia');
    r = await p.goto(B + '/terrazas');
    ok(p.url().endsWith('/impermeabilizacion-terrazas-granada/') && r.status() === 200, 'redirección /terrazas');

    section('Navegador · menú móvil y barra inferior');
    await p.goto(B + '/');
    await p.click('.nav-toggle');
    ok(await p.isVisible('#site-nav'), 'el menú se abre');
    await p.click('.sub-toggle');
    await p.click('#sub-servicios a[href="/impermeabilizacion-terrazas-granada/"]');
    await p.waitForURL('**/impermeabilizacion-terrazas-granada/');
    ok(true, 'navegación a Terrazas desde el menú');
    const tel = await p.getAttribute('.mobile-bar a[data-track="call"]', 'href');
    const wa = await p.getAttribute('.mobile-bar a[data-track="whatsapp"]', 'href');
    ok(tel === 'tel:+34600000000', `enlace de llamada: ${tel}`);
    ok(wa.startsWith('https://wa.me/34600000000?text='), `enlace de WhatsApp: ${wa}`);
    const waMsg = decodeURIComponent(wa.split('text=')[1]);
    ok(/en \[tu localidad\]\. El problema está en la terraza\. Puedo enviar fotos\./.test(waMsg), `mensaje de WhatsApp adaptado: ${waMsg}`);
    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await p.waitForTimeout(300);
    const geo = await p.evaluate(() => {
      const bar = document.querySelector('.mobile-bar').getBoundingClientRect();
      const links = [...document.querySelectorAll('.foot-legal a')].map((a) => a.getBoundingClientRect().bottom);
      return { barTop: bar.top, lastBottom: Math.max(...links) };
    });
    ok(geo.lastBottom <= geo.barTop, `la barra móvil tapa el pie (${geo.lastBottom} > ${geo.barTop})`);
    await p.focus('input[name="nombre"]');
    await p.waitForTimeout(350);
    const hidden = await p.evaluate(() => document.querySelector('.mobile-bar').getBoundingClientRect().top >= window.innerHeight);
    ok(hidden, 'la barra móvil se oculta al escribir en el formulario');

    section('Navegador · formulario');
    await p.goto(B + '/contacto/');
    await p.click('form.lead-form button[type="submit"]');
    ok(await p.isVisible('.form-errors'), 'muestra resumen de errores al enviar vacío');
    ok((await p.getAttribute('#valoracion-nombre', 'aria-invalid')) === 'true', 'marca campos inválidos con aria-invalid');
    ok(state.received.length === 0, 'no envía con errores');
    await p.fill('#valoracion-nombre', 'Prueba');
    await p.fill('#valoracion-telefono', '600 00 00 00');
    await p.fill('#valoracion-localidad', 'Armilla');
    await p.fill('#valoracion-descripcion', 'Mancha en el techo bajo la terraza cuando llueve.');
    await p.fill('#valoracion-email', 'correo-mal');
    await p.click('form.lead-form button[type="submit"]');
    ok(await p.isVisible('#valoracion-email-e'), 'valida el correo opcional si se rellena');
    await p.fill('#valoracion-email', '');
    await p.waitForTimeout(2600);
    state.formStatus = 500;
    await p.click('form.lead-form button[type="submit"]');
    await p.waitForSelector('.form-status.is-error');
    ok(!(await p.isVisible('.form-status.is-ok')) && await p.isVisible('form.lead-form'), 'con error del servidor NO muestra confirmación y conserva el formulario');
    state.formStatus = 200;
    await p.click('form.lead-form button[type="submit"]');
    await p.waitForSelector('.form-status.is-ok');
    ok(/Solicitud enviada/.test(await p.textContent('.form-status')), 'confirmación tras respuesta correcta del servidor');
    const last = state.received[state.received.length - 1] || '';
    ok(/Armilla/.test(last) && /Prueba/.test(last), 'el servidor recibe los datos del formulario');
    const events = await p.evaluate(() => window.dataLayer.map((e) => e.event));
    ok(events.includes('form_submit_success') && events.includes('form_submit_error'), `eventos de formulario medidos: ${events}`);

    section('Navegador · formulario con envío demasiado rápido / campo trampa');
    await p.goto(B + '/impermeabilizacion-cubiertas-granada/');
    const n0 = state.received.length;
    await p.evaluate(() => { const f = document.querySelector('form.lead-form'); f.nombre.value = 'Bot'; f.telefono.value = '600000000'; f.localidad.value = 'X1'; f.descripcion.value = 'texto de un bot de spam'; f.empresa_web.value = 'spam'; });
    await p.click('form.lead-form button[type="submit"]');
    ok(state.received.length === n0 && !(await p.isVisible('.form-status.is-ok')), 'el campo trampa bloquea el envío sin confirmar');

    section('Navegador · medición de clics');
    await p.goto(B + '/');
    await p.evaluate(() => document.querySelectorAll('a[target=_blank]').forEach((a) => a.removeAttribute('target')));
    await p.route('https://wa.me/**', (route) => route.fulfill({ status: 200, body: 'ok' }));
    await p.evaluate(() => { document.addEventListener('click', (e) => { if (e.target.closest('a[href^="tel:"]')) e.preventDefault(); }); });
    await p.click('.mobile-bar a[data-track="call"]');
    const ev2 = await p.evaluate(() => window.dataLayer.map((e) => e.event + ':' + (e.link_location || '')));
    ok(ev2.includes('click_call:mobile-bar'), `clic de llamada medido: ${ev2}`);
    await p.goto(B + '/');
    await p.evaluate(() => document.addEventListener('click', (e) => { if (e.target.closest('a[href*="wa.me"]')) e.preventDefault(); }));
    await p.click('.hero a[data-track="whatsapp"]');
    const ev3 = await p.evaluate(() => window.dataLayer.map((e) => e.event + ':' + (e.link_location || '')));
    ok(ev3.includes('click_whatsapp:hero'), `clic de WhatsApp medido: ${ev3}`);

    section('Navegador · teclado y movimiento reducido');
    const k = await browser.newPage({ viewport: { width: 1366, height: 900 }, reducedMotion: 'reduce' });
    await k.goto(B + '/');
    await k.keyboard.press('Tab');
    ok((await k.evaluate(() => document.activeElement.className)) === 'skip', 'el primer Tab va a «Saltar al contenido»');
    await k.keyboard.press('Enter');
    const op = await k.evaluate(() => getComputedStyle(document.querySelectorAll('.reveal')[3]).opacity);
    ok(op === '1', `con movimiento reducido el contenido es visible sin animación (opacity ${op})`);
    await k.focus('.sub-toggle'); await k.keyboard.press('Enter');
    ok(await k.isVisible('#sub-servicios'), 'el submenú de servicios se abre con teclado');
    await k.keyboard.press('Escape');
    ok(!(await k.isVisible('#sub-servicios')), 'Escape cierra el submenú');

    section('Navegador · sin JavaScript el contenido está en el HTML');
    const ctxNoJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const nj = await ctxNoJs.newPage();
    await nj.goto(B + '/reparacion-goteras-granada/');
    ok(/Filtración, condensación o capilaridad/.test(await nj.textContent('main')), 'contenido principal disponible sin JavaScript');
    ok(await nj.isVisible('.nav-list'), 'menú accesible sin JavaScript');
    await ctxNoJs.close();
  } catch (e) {
    ok(false, 'excepción en pruebas de navegador: ' + e.message);
  } finally {
    await browser.close(); server.close();
    fs.rmSync(path.join(ROOT, '.test'), { recursive: true, force: true });
    console.log(`\n${failures ? '✖' : '✔'} ${passes} comprobaciones correctas, ${failures} fallos`);
    process.exit(failures ? 1 : 0);
  }
})();
