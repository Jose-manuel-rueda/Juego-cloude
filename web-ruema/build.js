#!/usr/bin/env node
/*
 * Generador de la web.
 *   node build.js                → versión de pruebas (no indexable) en dist/
 *   node build.js --production   → versión pública; falla si faltan datos obligatorios
 * Opciones: --out=<carpeta>  ·  RUEMA_CONFIG=<ruta>  (configuración alternativa, usada en tests)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createRenderer } = require('./src/render');

const ROOT = __dirname;
const args = process.argv.slice(2);
const prod = args.includes('--production') || process.env.RUEMA_ENV === 'production';
const outArg = args.find((a) => a.startsWith('--out='));
const OUT = path.resolve(ROOT, outArg ? outArg.slice(6) : 'dist');
const cfgPath = process.env.RUEMA_CONFIG ? path.resolve(process.env.RUEMA_CONFIG) : path.join(ROOT, 'config/site.js');
const cfg = require(cfgPath);
const SERVICES = require('./content/servicios');
const ARTICLES = require('./content/consejos');

/* ------------------------------------------------------------------ validación de producción */
function validateProduction() {
  const missing = [];
  const need = (v, label) => { if (!v) missing.push(label); };
  need(cfg.siteUrl, 'siteUrl (dominio definitivo)');
  if (cfg.siteUrl && !/^https:\/\//.test(cfg.siteUrl)) missing.push('siteUrl debe empezar por https://');
  need(cfg.contact.phone, 'contact.phone');
  need(cfg.contact.whatsapp, 'contact.whatsapp');
  if (!(cfg.form.provider === 'netlify' || (cfg.form.provider === 'endpoint' && cfg.form.endpoint))) missing.push('form.provider / form.endpoint (conexión del formulario)');
  need(cfg.legal.owner, 'legal.owner (titular)');
  need(cfg.legal.nif, 'legal.nif');
  need(cfg.legal.address, 'legal.address');
  need(cfg.legal.email, 'legal.email');
  if (!Object.values(cfg.services).some((s) => s.estado === 'confirmado')) missing.push('al menos un servicio con estado "confirmado"');
  for (const r of cfg.reviews) if (!r.url || !r.fuente || !r.texto) missing.push(`reseña sin fuente verificable (${r.autor || '?'})`);
  for (const p of cfg.prices) if (!p.alcance || !p.condiciones || !p.impuestos) missing.push(`precio sin alcance/condiciones/impuestos (${p.concepto || '?'})`);
  if (missing.length) {
    console.error('\n✖ No se puede generar la versión pública. Faltan datos en config/site.js:\n');
    missing.forEach((m) => console.error('  · ' + m));
    console.error('\nGenera la versión de pruebas con: node build.js\n');
    process.exit(1);
  }
}
if (prod) validateProduction();

/* ------------------------------------------------------------------ utilidades */
const write = (rel, content) => {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
};
const copyDir = (src, dst) => {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name); const d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
};
const hashed = (srcRel, dstDir, ext) => {
  const content = fs.readFileSync(path.join(ROOT, srcRel));
  const h = crypto.createHash('sha1').update(content).digest('hex').slice(0, 10);
  const name = `${dstDir}/${path.basename(srcRel, ext)}.${h}${ext}`;
  write(name.slice(1), content);
  return name;
};
const listEs = (a) => (a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1]);
const fmtDate = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

/* ------------------------------------------------------------------ preparar salida */
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
copyDir(path.join(ROOT, 'src/assets/fonts'), path.join(OUT, 'assets/fonts'));
copyDir(path.join(ROOT, 'src/assets/img'), path.join(OUT, 'assets/img'));
copyDir(path.join(ROOT, 'src/assets/diagramas'), path.join(OUT, 'assets/diagramas'));
fs.copyFileSync(path.join(ROOT, 'src/favicon.svg'), path.join(OUT, 'favicon.svg'));
const assets = { css: hashed('src/assets/styles.css', '/assets', '.css'), js: hashed('src/assets/main.js', '/assets', '.js') };

const photosManifestPath = path.join(ROOT, 'content/fotos-manifest.json');
const photos = fs.existsSync(photosManifestPath) ? JSON.parse(fs.readFileSync(photosManifestPath, 'utf8')) : {};

/* ------------------------------------------------------------------ qué se publica */
const publishable = (key) => {
  const s = cfg.services[key];
  return s && (s.estado === 'confirmado' || !prod);
};
const publishedServices = SERVICES.filter((s) => publishable(s.key)).map((s) => {
  const ext = cfg.services[s.key].urlExterna;
  return { ...s, external: !!ext, href: ext || s.slug };
});
const svcByKey = Object.fromEntries(publishedServices.map((s) => [s.key, s]));

const loadCases = () => {
  const dir = path.join(ROOT, 'content/casos');
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))
    .filter((c) => c.publicado && c.fotos.every((p) => p.autorizada) && (!c.servicio || svcByKey[c.servicio]));
};
const cases = loadCases();
const articles = ARTICLES.filter((a) => (a.publicado || !prod) && (!a.servicio || (svcByKey[a.servicio] && !svcByKey[a.servicio].external)));
const showWorks = cases.length > 0 || !prod;

const navLinks = [
  { name: 'Precios', path: '/precio-impermeabilizacion-granada/' },
  ...(showWorks ? [{ name: 'Trabajos', path: '/trabajos/' }] : []),
  ...(articles.length ? [{ name: 'Consejos', path: '/consejos/' }] : []),
  { name: 'Empresa', path: '/sobre-nosotros/' },
  { name: 'Contacto', path: '/contacto/' },
];

const ctx = { cfg, prod, pending: new Set(), publishedServices, navLinks, assets, photos, currentPath: '' };
const R = createRenderer(ctx);
const { esc, icon, section, head2 } = R;
const brand = cfg.brand;

/* ------------------------------------------------------------------ bloques reutilizables */
const serviceCards = (list) => `<ul class="cards cards-svc">${list.map((s) => `<li class="card card-svc reveal"><a href="${s.href}"${s.external ? ' rel="noopener"' : ''}>
<span class="card-ico">${icon(s.key)}</span><h3>${s.nav}</h3><p>${s.card}</p><span class="card-more">Ver ${s.nav.toLowerCase()}${icon('arrow')}</span></a></li>`).join('')}</ul>`;

const steps = (items) => `<ol class="steps">${items.map((s, i) => `<li class="step reveal"><span class="step-n">${String(i + 1).padStart(2, '0')}</span><h3>${s.t}</h3><p>${s.d}</p></li>`).join('')}</ol>`;

const METHOD = [
  { t: 'Recogida de información', d: 'Nos cuentas qué pasa, dónde y desde cuándo. Las fotos y las medidas aproximadas ayudan mucho.' },
  { t: 'Diagnóstico', d: 'Revisamos la zona para localizar el origen del agua y el estado de lo que hay: soporte, pendientes, desagües, juntas y encuentros.' },
  { t: 'Propuesta', d: 'Te explicamos qué hemos visto, qué opciones tiene sentido valorar y qué incluye cada una.' },
  { t: 'Ejecución', d: 'Hacemos el trabajo acordado, con el sistema elegido y cuidando los puntos donde más falla el agua.' },
  { t: 'Comprobaciones acordadas', d: 'Antes de cerrar, hacemos las comprobaciones que hayamos pactado y te mostramos el resultado.' },
];

const areaBlock = () => {
  const locs = cfg.serviceArea.localities;
  const sugg = !prod && !locs.length;
  return section(`<div class="area-grid">
<div>${head2('zona-h', 'Zona de servicio', `Desde ${esc(cfg.base.locality)} para ${esc(cfg.serviceArea.summary)}`, `Nuestra base está en ${esc(cfg.base.locality)} (${esc(cfg.base.province)}). Si tu inmueble está en Granada capital o en su área metropolitana, cuéntanos dónde y te confirmamos si podemos atenderte.`)}</div>
<div class="area-list">${locs.length || sugg ? `<ul class="chips">${(locs.length ? locs : cfg.serviceArea.suggested).map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}${sugg ? R.pend('Confirmar localidades reales (serviceArea.localities)') : ''}</div>
</div>`, { cls: 'sec-area', label: 'zona-h' });
};

const reviewsBlock = () => {
  if (!cfg.reviews.length) return '';
  return section(head2('resenas-h', 'Opiniones', 'Lo que dicen nuestros clientes') +
    `<ul class="cards cards-rev">${cfg.reviews.map((r) => `<li class="card card-rev"><blockquote><p>“${esc(r.texto)}”</p></blockquote><p class="rev-meta">${esc(r.autor)} · <a href="${esc(r.url)}" rel="noopener" target="_blank">${esc(r.fuente)}</a>${r.fecha ? ` · ${fmtDate(r.fecha)}` : ''}</p></li>`).join('')}</ul>`,
  { cls: 'sec-reviews', label: 'resenas-h' });
};

const caseCard = (c) => {
  const cover = c.fotos[c.fotos.length - 1];
  return `<li class="card card-case reveal"><a href="/trabajos/${c.slug}/">${cover ? R.picture(cover, { sizes: '(min-width: 900px) 33vw, 100vw' }) : ''}<div class="card-body"><p class="eyebrow">${esc(c.localidad)} · ${esc(svcByKey[c.servicio] ? svcByKey[c.servicio].nav : '')}</p><h3>${esc(c.titulo)}</h3><p>${esc(c.problemaInicial)}</p></div></a></li>`;
};

const worksBlock = () => {
  if (!cases.length) return '';
  return section(head2('trabajos-h', 'Trabajos documentados', 'Casos reales, explicados', 'Qué problema había, qué encontramos y qué hicimos.') +
    `<ul class="cards cards-case">${cases.slice(0, 3).map(caseCard).join('')}</ul><p class="sec-more"><a class="link-arrow" href="/trabajos/">Ver todos los trabajos${icon('arrow')}</a></p>`,
  { label: 'trabajos-h' });
};

const heroPlaces = () => {
  const map = { terrazas: 'terraza', cubiertas: 'cubierta', piscinas: 'piscina' };
  const list = Object.keys(map).filter((k) => svcByKey[k]).map((k) => map[k]);
  return list.length ? 'tu ' + (list.length === 1 ? list[0] : list.slice(0, -1).join(', ') + ' o ' + list[list.length - 1]) : 'tu caso';
};
const differentiators = () => cfg.differentiators.filter((d) => d.confirmado || !prod);

/* ------------------------------------------------------------------ páginas */
const pages = [];
const add = (p) => pages.push(p);

/* ---------- INICIO ---------- */
const HOME_FAQ = [
  { q: '¿En qué zonas trabajáis?', a: `Nuestra base está en ${esc(cfg.base.locality)} y trabajamos en ${esc(cfg.serviceArea.summary)}. Si tienes dudas sobre tu localidad, pregúntanos.` },
  { q: '¿Qué necesitáis para valorar el problema?', a: 'Saber dónde aparece el agua, cuándo (al llover, al regar, siempre), la superficie aproximada y, si puedes, fotos generales y de detalle. Con eso te decimos qué conviene revisar.' },
  { q: '¿Siempre hay que levantar el suelo?', a: 'No siempre, pero tampoco se puede prometer sin revisar. Depende del estado del pavimento, de las pendientes y de lo que haya debajo.' + (svcByKey.terrazas ? ' Lo explicamos en <a href="/consejos/impermeabilizar-terraza-sin-levantar-pavimento/">esta guía</a>.' : '') },
  { q: '¿Cuánto cuesta impermeabilizar?', a: 'Depende de la superficie, del estado del soporte, de si hay que retirar capas y de los puntos que haya que resolver. Te explicamos los factores en la página de <a href="/precio-impermeabilizacion-granada/">precios</a>.' },
  { q: 'Tengo humedad en casa. ¿Es una filtración?', a: 'No toda humedad es una filtración. La condensación y la capilaridad se parecen, pero necesitan otro tratamiento. Si lo que nos cuentas apunta a eso, te lo diremos.' },
  { q: '¿Atendéis a comunidades de vecinos?', a: svcByKey.comunidades ? 'Sí. Preparamos propuestas claras para presidentes y administradores. Más información en la página de <a href="/impermeabilizaciones-comunidades-granada/">comunidades</a>.' : 'Cuéntanos el caso y te diremos cómo podemos ayudarte.' },
];

add({
  path: '/', file: 'index.html',
  fullTitle: `Impermeabilizaciones en Granada | ${brand.name}`,
  title: 'Impermeabilizaciones en Granada',
  description: `Impermeabilizaciones${publishedServices.length ? ' de ' + listEs(publishedServices.filter((x) => x.key !== 'comunidades' && x.key !== 'goteras').map((x) => x.nav.toLowerCase())) : ''} en Granada y su área metropolitana. Diagnosticamos el origen del agua antes de proponer una solución.`,
  bodyClass: 'home',
  jsonld: [R.businessLd()],
  body: () => {
    const hero = cfg.photos.hero;
    const heroVisual = hero && photos[hero.name]
      ? `<div class="hero-photo">${R.picture(hero, { sizes: '(min-width: 1000px) 50vw, 100vw', priority: true })}${hero.stock ? '' : ''}</div>`
      : `<figure class="hero-card"><div class="hero-card-img"><img src="/assets/diagramas/terraza.svg" width="640" height="400" alt="Esquema de la sección de una terraza con los puntos que se revisan: pavimento y juntas, pendientes, sumidero, encuentro con el peto e impermeabilización existente" fetchpriority="high"></div>
<figcaption><span class="eyebrow">Antes de proponer, revisamos</span><ol class="legend legend-inline"><li>Pavimento y juntas</li><li>Pendientes</li><li>Desagües</li><li>Encuentros</li><li>Impermeabilización existente</li></ol></figcaption></figure>`;
    const quick = publishedServices.map((s) => `<li><a href="${s.href}">${icon(s.key)}<span>${s.nav}</span></a></li>`).join('');
    const PROBLEMS = [
      { k: 'goteras', t: 'Mancha en el techo después de llover', d: 'Suele indicar una filtración desde la terraza o la cubierta de encima.' },
      { k: 'terrazas', t: 'Baldosas huecas o juntas abiertas', d: 'El agua encuentra camino bajo el pavimento y aparece donde menos se espera.' },
      { k: 'terrazas', t: 'Charcos que no se van', d: 'Pendientes insuficientes o desagües obstruidos que mantienen el agua sobre la terraza.' },
      { k: 'cubiertas', t: 'Lámina agrietada o despegada', d: 'Las impermeabilizaciones expuestas al sol envejecen y pierden estanqueidad.' },
      { k: 'piscinas', t: 'La piscina baja más de lo normal', d: 'Hay que distinguir evaporación, fuga en el vaso o fuga en la instalación.' },
      { k: 'goteras', t: 'Humedad que no sabes de dónde viene', d: 'Puede ser filtración, condensación o capilaridad. Cada una se trata de forma distinta.' },
    ].filter((p) => svcByKey[p.k]);
    const diffs = differentiators();
    return `
<section class="hero"><div class="wrap hero-grid">
  <div class="hero-copy">
    <p class="eyebrow">${esc(cfg.base.locality)} · Granada y área metropolitana</p>
    <h1>Impermeabilizaciones en Granada para proteger tu vivienda y tu edificio</h1>
    <p class="lead">Cuéntanos dónde aparece el agua. Valoramos el problema y te proponemos una solución adaptada a ${heroPlaces()}.</p>
    <div class="hero-actions">${R.btnQuote('/contacto/')}${R.btnWa('', 'hero')}</div>
    <p class="hero-note">Para viviendas, comunidades de vecinos, administradores de fincas y negocios.</p>
  </div>
  ${heroVisual}
</div>
${quick ? `<div class="wrap"><nav class="quick" aria-label="¿Dónde está el problema?"><p class="quick-t">¿Dónde está el problema?</p><ul>${quick}</ul></nav></div>` : ''}
</section>

${PROBLEMS.length ? section(head2('problemas-h', 'Lo que suele pasar', '¿Te suena alguno de estos problemas?', 'Son las situaciones por las que más nos llaman. Cada una tiene un origen distinto y requiere revisar cosas distintas.') +
  `<ul class="cards cards-prob">${PROBLEMS.map((p) => `<li class="card card-prob reveal"><a href="${svcByKey[p.k].href}"><h3>${p.t}</h3><p>${p.d}</p><span class="card-more">${svcByKey[p.k].nav}${icon('arrow')}</span></a></li>`).join('')}</ul>`,
  { cls: 'sec-dark', label: 'problemas-h' }) : ''}

${publishedServices.length ? section(head2('servicios-h', 'Servicios', 'Qué hacemos', 'Cada servicio tiene su página con lo que revisamos, las opciones posibles y lo que influye en el precio.') + serviceCards(publishedServices), { label: 'servicios-h', id: 'servicios' }) : ''}

${section(head2('metodo-h', 'Método de trabajo', 'Primero entender el problema. Después, resolverlo', 'Una impermeabilización dura si se ha elegido bien. Por eso no empezamos por el producto, sino por el diagnóstico.') + steps(METHOD), { cls: 'sec-method', label: 'metodo-h' })}

${diffs.length ? section(head2('dif-h', 'Cómo trabajamos', 'Lo que puedes esperar de nosotros') +
  `<ul class="cards cards-diff">${diffs.map((d) => `<li class="card card-diff reveal">${icon('check')}<h3>${d.titulo}</h3><p>${d.texto}</p>${d.confirmado ? '' : R.pend('Confirmar diferencial')}</li>`).join('')}</ul>`,
  { cls: 'sec-blue', label: 'dif-h' }) : ''}

${worksBlock()}
${reviewsBlock()}
${areaBlock()}
${R.faq(HOME_FAQ)}
${R.ctaBand({})}`;
  },
});

/* ---------- SERVICIOS ---------- */
for (const s of publishedServices.filter((x) => !x.external)) {
  const crumbs = [{ name: s.nav, path: s.slug }];
  add({
    path: s.slug, file: s.slug.slice(1) + 'index.html',
    title: s.seoTitle, description: s.metaDescription, waProblem: s.waProblem,
    jsonld: [R.breadcrumbLd(crumbs), {
      '@context': 'https://schema.org', '@type': 'Service', name: s.h1, serviceType: s.nav,
      provider: { '@id': R.abs('/#empresa') }, areaServed: { '@type': 'City', name: 'Granada' }, url: R.abs(s.slug),
    }],
    body: () => {
      const related = (s.related || []).map((k) => svcByKey[k]).filter(Boolean);
      const art = s.article && articles.find((a) => a.slug === s.article);
      return `${R.breadcrumbs(crumbs)}
<section class="page-hero"><div class="wrap page-hero-grid">
  <div><p class="eyebrow">${s.audience ? 'Comunidades y administradores' : 'Servicio'}</p><h1>${s.h1}</h1><p class="lead">${s.lead}</p>
  <div class="hero-actions">${R.btnQuote('#valoracion')}${R.btnWa(s.waProblem, 'service-hero')}</div></div>
  <span class="page-hero-ico" aria-hidden="true">${icon(s.key, 'ico ico-xl')}</span>
</div></section>

${section(head2('prob-h', 'Problemas que atendemos', s.audience ? 'Situaciones habituales en edificios' : 'Cuándo conviene revisarlo') +
  `<ul class="cards cards-prob-light">${s.problems.map((p) => `<li class="card reveal"><h3>${p.t}</h3><p>${p.d}</p></li>`).join('')}</ul>`, { label: 'prob-h' })}

${s.compare ? section(head2('cmp-h', 'Antes de reparar', s.compare.title, s.compare.intro) +
  `<div class="table-wrap reveal"><table class="cmp"><thead><tr>${s.compare.cols.map((c) => `<th scope="col">${c}</th>`).join('')}</tr></thead><tbody>${s.compare.rows.map((r) => `<tr><th scope="row">${r[0]}</th>${r.slice(1).map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="note">${s.compare.note}</p>`,
  { cls: 'sec-tint', label: 'cmp-h' }) : ''}

${section(`<div class="split">
  <div>${head2('rev-h', 'Diagnóstico', 'Qué revisamos antes de elegir una solución')}
  <dl class="checks">${s.checks.map((c) => `<div class="check reveal"><dt>${c.t}</dt><dd>${c.d}</dd></div>`).join('')}</dl></div>
  <div>${R.figure(s.diagram)}</div>
</div>`, { label: 'rev-h' })}

${section(`<div class="callout reveal"><h2 id="obs-h">Qué puedes observar tú</h2><p>${s.signsIntro}</p><ul class="ticks">${s.signs.map((x) => `<li>${icon('check')}<span>${x}</span></li>`).join('')}</ul></div>`, { cls: 'sec-callout', label: 'obs-h' })}

${s.meanwhile ? section(`<div class="callout callout-warn reveal"><h2 id="mt-h">${s.meanwhile.title}</h2><ul class="ticks">${s.meanwhile.items.map((x) => `<li>${icon('check')}<span>${x}</span></li>`).join('')}</ul></div>`, { cls: 'sec-callout', label: 'mt-h' }) : ''}

${s.process ? section(head2('proc-h', 'Proceso', s.process.title) + steps(s.process.steps), { cls: 'sec-method', label: 'proc-h' }) : ''}

${section(head2('opt-h', 'Soluciones', 'Opciones que pueden encajar y sus límites', s.optionsNote) +
  `<ul class="cards cards-opt">${s.options.map((o) => `<li class="card card-opt reveal"><h3>${o.t}</h3><p class="opt-k">Cuándo encaja</p><p>${o.when}</p><p class="opt-k">Limitaciones</p><p>${o.limits}</p></li>`).join('')}</ul>`,
  { cls: 'sec-tint', label: 'opt-h' })}

${section(`<div class="split split-even">
  <div class="reveal">${head2('inc-h', 'Alcance', 'Qué incluye el trabajo')}<ul class="ticks">${s.includes.always.map((x) => `<li>${icon('check')}<span>${x}</span></li>`).join('')}</ul></div>
  <div class="reveal"><h3 class="h3-alt">Qué depende de la revisión</h3><ul class="dashes">${s.includes.depends.map((x) => `<li>${x}</li>`).join('')}</ul></div>
</div>`, { label: 'inc-h' })}

${section(`<div class="split split-even">
  <div class="reveal">${head2('pres-h', 'Presupuesto', 'Cómo preparamos el presupuesto')}<p>${s.quote}</p><p><a class="link-arrow" href="/precio-impermeabilizacion-granada/">Cómo se calcula el precio de una impermeabilización${icon('arrow')}</a></p></div>
  <div class="reveal"><h3 class="h3-alt">Qué influye en el precio</h3><ul class="dashes">${s.priceFactors.map((x) => `<li>${x}</li>`).join('')}</ul></div>
</div>`, { cls: 'sec-tint', label: 'pres-h' })}

${R.faq(s.faqs, 'faq', `Preguntas frecuentes sobre ${s.nav.toLowerCase()}`)}

${related.length || art ? section(head2('rel-h', 'Relacionado', 'También te puede interesar') + `<ul class="cards cards-rel">${related.map((r) => `<li class="card reveal"><a href="${r.href}"><span class="card-ico">${icon(r.key)}</span><h3>${r.nav}</h3><p>${r.card}</p></a></li>`).join('')}${art ? `<li class="card card-art reveal"><a href="${art.slug}"><p class="eyebrow">Guía</p><h3>${art.h1}</h3><p>${art.excerpt}</p></a></li>` : ''}</ul>`, { label: 'rel-h' }) : ''}

${R.ctaBand({ service: s.formService, showSelect: false, waProblem: s.waProblem })}`;
    },
  });
}

/* ---------- PRECIOS ---------- */
{
  const crumbs = [{ name: 'Precios', path: '/precio-impermeabilizacion-granada/' }];
  const PARTIDAS = [
    ['Revisión y diagnóstico', 'Inspección de la zona y, si hace falta, comprobaciones para localizar el origen del agua.'],
    ['Medios auxiliares y seguridad', 'Andamios, plataformas, líneas de vida o protecciones para trabajar en altura.'],
    ['Demoliciones y retirada', 'Levantado de pavimento, grava o láminas antiguas, y transporte de escombros.'],
    ['Preparación del soporte', 'Limpieza, reparación de fisuras y regularización para que el sistema se adhiera bien.'],
    ['Formación de pendientes', 'Rehacer la base para que el agua llegue a los desagües, cuando no lo hace.'],
    ['Puntos singulares', 'Sumideros, juntas de dilatación, petos, umbrales, chimeneas y pasos de instalaciones.'],
    ['Sistema de impermeabilización', 'Lámina, membrana u otro sistema, con su número de capas o espesor.'],
    ['Protección y acabado', 'Capa de protección, pavimento nuevo, grava o acabado transitable.'],
    ['Pruebas y comprobaciones', 'Las comprobaciones de estanqueidad acordadas al terminar.'],
    ['Reposiciones interiores', 'Yeso, pintura o falsos techos dañados por el agua, si se incluyen.'],
  ];
  add({
    path: '/precio-impermeabilizacion-granada/', file: 'precio-impermeabilizacion-granada/index.html',
    title: 'Precio de una impermeabilización en Granada: qué influye',
    description: 'Qué partidas tiene un presupuesto de impermeabilización, qué factores cambian el precio y cómo comparar propuestas. Solicita una valoración de tu caso.',
    jsonld: [R.breadcrumbLd(crumbs)],
    body: () => `${R.breadcrumbs(crumbs)}
<section class="page-hero"><div class="wrap"><p class="eyebrow">Precios</p><h1>Precio de una impermeabilización en Granada: qué influye y cómo pedir presupuesto</h1>
<p class="lead">Dos terrazas con los mismos metros pueden tener presupuestos muy distintos. Te explicamos de qué depende para que sepas qué estás pagando y puedas comparar.</p>
<div class="hero-actions">${R.btnQuote('#valoracion')}${R.btnWa('Quiero pedir presupuesto.', 'prices-hero')}</div></div></section>

${section(`<div class="split split-even"><div>${head2('unico-h', 'Lo primero', 'Por qué no hay un precio único por metro cuadrado')}</div>
<div class="prose"><p>El coste de impermeabilizar depende sobre todo de cosas que no se ven en una medida: si se puede trabajar sobre lo que hay o hay que retirarlo, cuántos encuentros hay que resolver, el estado del soporte, el acceso y el sistema elegido.</p><p>Un precio por metro cuadrado dado sin ver el caso suele dejar fuera partidas que luego aparecen. Preferimos explicarte qué influye y darte un presupuesto con el alcance claro.</p></div></div>`, { label: 'unico-h' })}

${cfg.prices.length ? section(head2('tarifas-h', 'Tarifas', 'Precios publicados') + `<div class="table-wrap"><table><thead><tr><th scope="col">Concepto</th><th scope="col">Importe</th><th scope="col">Alcance</th><th scope="col">Condiciones</th><th scope="col">Impuestos</th></tr></thead><tbody>${cfg.prices.map((p) => `<tr><th scope="row">${esc(p.concepto)}</th><td>${esc(p.importe)}</td><td>${esc(p.alcance)}</td><td>${esc(p.condiciones)}</td><td>${esc(p.impuestos)}</td></tr>`).join('')}</tbody></table></div>`, { label: 'tarifas-h' }) : ''}

${section(head2('partidas-h', 'Partidas', 'Qué partidas puede tener un presupuesto', 'No todas aparecen en todos los trabajos. Lo importante es que el presupuesto diga cuáles incluye y cuáles no.') +
  `<dl class="partidas">${PARTIDAS.map(([t, d]) => `<div class="partida reveal"><dt>${t}</dt><dd>${d}</dd></div>`).join('')}</dl>`, { cls: 'sec-tint', label: 'partidas-h' })}

${publishedServices.filter((s) => !s.external).length ? section(head2('factores-h', 'Por tipo de trabajo', 'Qué influye en el precio según el caso') +
  `<ul class="cards cards-factors">${publishedServices.filter((s) => !s.external).map((s) => `<li class="card reveal"><span class="card-ico">${icon(s.key)}</span><h3>${s.nav}</h3><ul class="dashes">${s.priceFactors.slice(0, 5).map((f) => `<li>${f}</li>`).join('')}</ul><a class="link-arrow" href="${s.slug}">Ver ${s.nav.toLowerCase()}${icon('arrow')}</a></li>`).join('')}</ul>`, { label: 'factores-h' }) : ''}

${section(`<div class="split split-even">
<div class="reveal">${head2('comparar-h', 'Comparar', 'Cómo comparar presupuestos')}<ul class="ticks">
<li>${icon('check')}<span>Compara el alcance, no solo el total: superficie, zonas y puntos singulares incluidos.</span></li>
<li>${icon('check')}<span>Comprueba qué sistema propone cada empresa y por qué.</span></li>
<li>${icon('check')}<span>Mira qué queda fuera: escombros, medios auxiliares, reposiciones interiores.</span></li>
<li>${icon('check')}<span>Revisa si el IVA está incluido y qué tipo se aplica.</span></li>
<li>${icon('check')}<span>Pide por escrito las condiciones: plazos, forma de pago y, si las hay, garantías con su alcance.</span></li>
</ul><p><a class="link-arrow" href="/consejos/como-pedir-presupuesto-impermeabilizacion/">Guía para pedir y comparar presupuestos${icon('arrow')}</a></p></div>
<div class="reveal"><h3 class="h3-alt">Sobre los impuestos</h3><p>El tipo de IVA aplicable depende del tipo de obra y de quién la contrata (por ejemplo, un particular en su vivienda o una empresa). En cada presupuesto indicamos si el importe incluye IVA y qué tipo se aplica.</p>
<h3 class="h3-alt">Para recibir una valoración más precisa</h3><ul class="dashes"><li>Localidad y tipo de inmueble.</li><li>Superficie aproximada.</li><li>Fotos generales y de detalle.</li><li>Cuándo aparece el agua.</li><li>Reparaciones anteriores.</li></ul></div>
</div>`, { label: 'comparar-h' })}

${R.ctaBand({ heading: 'Pide una valoración de tu caso', waProblem: 'Quiero pedir presupuesto.' })}`,
  });
}

/* ---------- TRABAJOS ---------- */
if (showWorks) {
  const crumbs = [{ name: 'Trabajos', path: '/trabajos/' }];
  add({
    path: '/trabajos/', file: 'trabajos/index.html',
    title: 'Trabajos de impermeabilización documentados',
    description: 'Casos reales de impermeabilización: problema inicial, diagnóstico, intervención y resultado comprobado, con fotografías autorizadas.',
    jsonld: [R.breadcrumbLd(crumbs)],
    body: () => `${R.breadcrumbs(crumbs)}
<section class="page-hero"><div class="wrap"><p class="eyebrow">Trabajos</p><h1>Trabajos de impermeabilización documentados</h1>
<p class="lead">Cada caso explica qué problema había, cómo localizamos el origen, qué hicimos y cómo lo comprobamos.</p></div></section>
${cases.length ? section(`<ul class="cards cards-case">${cases.map(caseCard).join('')}</ul>`) :
    section(`<div class="callout">${R.pend('Aún no hay casos publicados (content/casos). Esta página no se publica en producción hasta que exista al menos uno con fotos autorizadas.')}<p>Plantilla de caso: <code>content/casos/_plantilla.json</code>.</p></div>`)}
${R.ctaBand({})}`,
  });
  for (const c of cases) {
    const svc = svcByKey[c.servicio];
    const cc = [...crumbs, { name: c.titulo, path: `/trabajos/${c.slug}/` }];
    add({
      path: `/trabajos/${c.slug}/`, file: `trabajos/${c.slug}/index.html`,
      title: c.titulo, description: `${c.problemaInicial}`.slice(0, 155), ogType: 'article',
      jsonld: [R.breadcrumbLd(cc)],
      body: () => `${R.breadcrumbs(cc)}
<section class="page-hero"><div class="wrap"><p class="eyebrow">${esc(c.localidad)} · ${svc ? esc(svc.nav) : ''} · ${fmtDate(c.fecha)}</p><h1>${esc(c.titulo)}</h1></div></section>
${section(`<div class="case">
<div class="case-text prose">
<h2>Problema inicial</h2><p>${esc(c.problemaInicial)}</p>
<h2>Diagnóstico</h2><p>${esc(c.diagnostico)}</p>
<h2>Intervención</h2><p>${esc(c.intervencion)}</p>
<h2>Resultado comprobado</h2><p>${esc(c.resultadoComprobado)}</p>
${c.testimonio && c.testimonio.autorizado ? `<blockquote><p>“${esc(c.testimonio.texto)}”</p><footer>${esc(c.testimonio.autor)}</footer></blockquote>` : ''}
</div>
<div class="case-photos">${c.fotos.map((f) => `<figure>${R.picture(f, { sizes: '(min-width: 900px) 45vw, 100vw' })}<figcaption>${esc(f.momento)}</figcaption></figure>`).join('')}</div>
</div>`)}
${R.ctaBand({ service: svc ? svc.formService : '', waProblem: svc ? svc.waProblem : '' })}`,
    });
  }
}

/* ---------- SOBRE NOSOTROS ---------- */
{
  const crumbs = [{ name: 'Empresa', path: '/sobre-nosotros/' }];
  const VALUES = [
    { t: 'Trabajo bien hecho', d: 'Los detalles que no se ven, como un sumidero o un encuentro con el peto, son los que deciden si una impermeabilización funciona.' },
    { t: 'Responsabilidad', d: 'Si algo no es de nuestra especialidad o no tiene solución con una impermeabilización, lo decimos.' },
    { t: 'Claridad', d: 'Explicamos lo que hemos visto, las opciones y sus límites, con palabras que se entienden.' },
    { t: 'Soluciones duraderas', d: 'Elegimos el sistema a partir del diagnóstico, no al revés.' },
  ];
  add({
    path: '/sobre-nosotros/', file: 'sobre-nosotros/index.html',
    title: `Sobre ${brand.name}`,
    description: `Quiénes somos y cómo trabajamos en ${brand.name}: impermeabilizaciones con diagnóstico previo desde ${cfg.base.locality} para Granada y su área metropolitana.`,
    jsonld: [R.breadcrumbLd(crumbs)],
    body: () => `${R.breadcrumbs(crumbs)}
<section class="page-hero"><div class="wrap"><p class="eyebrow">Empresa</p><h1>Sobre ${esc(brand.name)}</h1>
<p class="lead">Impermeabilizaciones con diagnóstico previo, desde ${esc(cfg.base.locality)} para ${esc(cfg.serviceArea.summary)}.</p></div></section>
${section(`<div class="split split-even"><div>${head2('quien-h', 'Quiénes somos', cfg.team.intro || !prod ? 'Las personas detrás del trabajo' : 'A quién ayudamos')}</div>
<div class="prose">${cfg.team.intro ? `<p>${esc(cfg.team.intro)}</p>` : (prod ? '' : `<p>${R.pend('Texto real sobre el equipo (team.intro): trayectoria, formación y forma de trabajar')}</p>`)}
${cfg.team.members.length ? `<ul class="team">${cfg.team.members.map((m) => `<li class="member">${m.foto ? R.picture(m.foto, { sizes: '160px' }) : ''}<h3>${esc(m.nombre)}</h3><p class="member-role">${esc(m.cargo)}</p><p>${esc(m.texto)}</p></li>`).join('')}</ul>` : ''}
<p>Trabajamos para propietarios de viviendas, comunidades de vecinos, administradores de fincas y negocios.</p></div></div>`, { label: 'quien-h' })}
${section(head2('valores-h', 'Cómo entendemos el trabajo', 'Lo que guía cada intervención') + `<ul class="cards cards-diff">${VALUES.map((v) => `<li class="card card-diff reveal">${icon('check')}<h3>${v.t}</h3><p>${v.d}</p></li>`).join('')}</ul>`, { cls: 'sec-blue', label: 'valores-h' })}
${section(head2('metodo-h', 'Método', 'Cómo trabajamos') + steps(METHOD), { cls: 'sec-method', label: 'metodo-h' })}
${section(`<div class="callout reveal"><h2 id="comp-h">Nuestro compromiso con la información</h2><ul class="ticks">
<li>${icon('check')}<span>No prometemos una solución sin haber revisado el problema.</span></li>
<li>${icon('check')}<span>Solo publicamos trabajos que hemos hecho, con fotos autorizadas por el cliente.</span></li>
<li>${icon('check')}<span>Solo mostramos opiniones reales y enlazamos a su fuente.</span></li></ul></div>`, { cls: 'sec-callout', label: 'comp-h' })}
${areaBlock()}
${R.ctaBand({})}`,
  });
}

/* ---------- CONTACTO ---------- */
{
  const crumbs = [{ name: 'Contacto', path: '/contacto/' }];
  const c = cfg.contact;
  add({
    path: '/contacto/', file: 'contacto/index.html',
    title: 'Contacto: solicita una valoración',
    description: `Cuéntanos dónde aparece el agua y solicita una valoración por teléfono, WhatsApp o formulario. Atendemos Granada capital y su área metropolitana.`,
    jsonld: [R.breadcrumbLd(crumbs), R.businessLd()],
    body: () => `${R.breadcrumbs(crumbs)}
<section class="page-hero page-hero-tight"><div class="wrap"><p class="eyebrow">Contacto</p><h1>Solicita una valoración de tu impermeabilización</h1>
<p class="lead">Elige cómo prefieres contactar. Cuanta más información nos des, mejor podremos orientarte desde el principio.</p></div></section>
<section class="section"><div class="wrap contact-grid">
  <div>${R.form({ title: 'Formulario de valoración', intro: 'Te pedimos solo lo necesario para poder responderte.' })}
  <div class="wa-builder" hidden><p><strong>¿Prefieres WhatsApp?</strong> Te preparamos el mensaje con lo que has escrito en el formulario.</p><button type="button" class="btn btn-wa" data-wa-builder data-wa="${esc(c.whatsapp.replace(/\D/g, ''))}"${R.hasWa ? '' : ' data-pendiente'}>${icon('whatsapp')}<span>Abrir WhatsApp con mis datos</span></button></div></div>
  <aside class="contact-aside">
    <div class="contact-methods">
      <h2 class="h-small">Otras formas de contacto</h2>
      ${R.btnCall('contact', 'btn btn-ghost btn-block')}
      ${R.btnWa('', 'contact', 'Escribir por WhatsApp', 'btn btn-wa btn-block')}
      ${c.email ? `<a class="btn btn-ghost btn-block" href="mailto:${esc(c.email)}">${icon('mail')}<span>${esc(c.email)}</span></a>` : ''}
      ${c.hours ? `<p class="hours">${icon('clock')}<span>${esc(c.hours)}</span></p>` : (prod ? '' : `<p>${R.pend('Horario de atención (opcional)')}</p>`)}
      <p class="hours">${icon('pin')}<span>Base en ${esc(cfg.base.locality)} (${esc(cfg.base.province)}). Trabajamos en ${esc(cfg.serviceArea.summary)}.</span></p>
    </div>
    <div class="contact-info">
      <h2 class="h-small">Qué conviene contarnos</h2>
      <ul class="ticks">
        <li>${icon('check')}<span><strong>Ubicación:</strong> localidad y tipo de inmueble.</span></li>
        <li>${icon('check')}<span><strong>Superficie aproximada</strong> de la zona afectada.</span></li>
        <li>${icon('check')}<span><strong>Fotografías</strong> generales y de detalle (por WhatsApp).</span></li>
        <li>${icon('check')}<span><strong>Cuándo aparece la filtración:</strong> al llover, al regar, siempre.</span></li>
        <li>${icon('check')}<span>Si se ha reparado antes y si afecta a otros vecinos.</span></li>
      </ul>
      <h2 class="h-small">Qué pasa después</h2>
      <ol class="mini-steps"><li>Revisamos lo que nos cuentas.</li><li>Te contactamos para concretar y, si hace falta, acordar una visita.</li><li>Te explicamos lo que vemos y preparamos la propuesta.</li></ol>
    </div>
  </aside>
</div></section>
${areaBlock()}`,
  });
}

/* ---------- CONSEJOS ---------- */
if (articles.length) {
  const crumbs = [{ name: 'Consejos', path: '/consejos/' }];
  add({
    path: '/consejos/', file: 'consejos/index.html',
    title: 'Consejos sobre impermeabilización y humedades',
    description: 'Guías prácticas para entender filtraciones, humedades y presupuestos de impermeabilización antes de decidir.',
    jsonld: [R.breadcrumbLd(crumbs)],
    body: () => `${R.breadcrumbs(crumbs)}
<section class="page-hero"><div class="wrap"><p class="eyebrow">Consejos</p><h1>Consejos sobre impermeabilización y humedades</h1>
<p class="lead">Respuestas a las dudas que más nos plantean antes de pedir una valoración.</p></div></section>
${section(`<ul class="cards cards-art">${articles.map((a) => `<li class="card card-art reveal"><a href="${a.slug}"><p class="eyebrow">${fmtDate(a.fecha)}</p><h2 class="h3">${a.h1}</h2><p>${a.excerpt}</p><span class="card-more">Leer${icon('arrow')}</span></a></li>`).join('')}</ul>`)}
${R.ctaBand({})}`,
  });
  for (const a of articles) {
    const svc = a.servicio ? svcByKey[a.servicio] : null;
    const ac = [...crumbs, { name: a.h1, path: a.slug }];
    add({
      path: a.slug, file: a.slug.slice(1) + 'index.html',
      title: a.seoTitle, description: a.metaDescription, ogType: 'article', waProblem: svc ? svc.waProblem : '',
      jsonld: [R.breadcrumbLd(ac), {
        '@context': 'https://schema.org', '@type': 'BlogPosting', headline: a.h1, datePublished: a.fecha, dateModified: a.actualizado || a.fecha,
        author: { '@type': 'Organization', name: brand.name, url: R.abs('/') }, publisher: { '@id': R.abs('/#empresa') },
        mainEntityOfPage: R.abs(a.slug), inLanguage: 'es-ES',
      }],
      body: () => `${R.breadcrumbs(ac)}
<article class="article"><header class="page-hero"><div class="wrap wrap-text"><p class="eyebrow">Consejos · ${fmtDate(a.fecha)}</p><h1>${a.h1}</h1><p class="lead">${a.excerpt}</p></div></header>
<div class="wrap wrap-text prose">${a.body}</div></article>
${svc ? `<section class="section"><div class="wrap wrap-text"><div class="callout"><p class="eyebrow">Servicio relacionado</p><h2 class="h3"><a href="${svc.href}">${svc.h1}</a></h2><p>${svc.card}</p></div></div></section>` : ''}
${R.ctaBand({ service: svc ? svc.formService : '', waProblem: svc ? svc.waProblem : '' })}`,
    });
  }
}

/* ---------- LEGALES ---------- */
const L = cfg.legal;
const legalPage = (p, title, description, html) => add({ path: p, file: p.slice(1) + 'index.html', title, description, noindex: true, body: () => `<section class="page-hero page-hero-tight"><div class="wrap wrap-text"><h1>${title}</h1></div></section><section class="section"><div class="wrap wrap-text prose">${html()}</div></section>` });

legalPage('/aviso-legal/', 'Aviso legal', `Información legal sobre el titular de la web de ${brand.name}.`, () => `
<p>En cumplimiento de la Ley 34/2002, de servicios de la sociedad de la información y de comercio electrónico (LSSI), se informa de los datos del titular de este sitio web:</p>
<ul><li><strong>Titular:</strong> ${R.val(L.owner, 'Titular (legal.owner)')}</li><li><strong>NIF:</strong> ${R.val(L.nif, 'NIF (legal.nif)')}</li><li><strong>Domicilio:</strong> ${R.val(L.address, 'Domicilio legal (legal.address)')}</li><li><strong>Correo electrónico:</strong> ${R.val(L.email, 'Correo legal (legal.email)')}</li>${L.registry ? `<li><strong>Datos registrales:</strong> ${esc(L.registry)}</li>` : ''}</ul>
<h2>Uso del sitio</h2><p>El acceso a esta web es gratuito y no requiere registro. Quien la utiliza se compromete a hacer un uso adecuado de sus contenidos.</p>
<h2>Contenidos</h2><p>La información de esta web es orientativa y no sustituye a la revisión de cada caso concreto. Los esquemas que acompañan a los textos son ilustrativos y no representan obras concretas.</p>
<h2>Propiedad intelectual</h2><p>Los textos, fotografías propias, esquemas y elementos de diseño de esta web pertenecen a su titular o se usan con autorización. No se permite su reproducción sin permiso.</p>
<h2>Enlaces</h2><p>Esta web puede contener enlaces a servicios de terceros (por ejemplo, WhatsApp o Google). Su titular no se responsabiliza de los contenidos ni de las políticas de esos servicios.</p>`);

legalPage('/privacidad/', 'Política de privacidad', `Cómo trata ${brand.name} los datos personales de quienes solicitan una valoración.`, () => `
<h2>Responsable del tratamiento</h2><p>${R.val(L.owner, 'Titular (legal.owner)')}, NIF ${R.val(L.nif, 'NIF (legal.nif)')}, con domicilio en ${R.val(L.address, 'Domicilio legal (legal.address)')}. Contacto: ${R.val(L.email, 'Correo legal (legal.email)')}.</p>
<h2>Qué datos tratamos</h2><p>Los que nos facilitas al contactar por formulario, teléfono, WhatsApp o correo: nombre, teléfono, localidad, descripción del problema y, si los aportas, correo electrónico y fotografías.</p>
<h2>Para qué</h2><p>Para atender tu solicitud, valorar el problema, preparar un presupuesto y, si lo aceptas, gestionar el trabajo.</p>
<h2>Base legal</h2><p>La aplicación de medidas precontractuales a petición tuya y, en su caso, la ejecución del contrato (artículo 6.1.b del Reglamento General de Protección de Datos).</p>
<h2>Cuánto tiempo</h2><p>Mientras se gestiona tu solicitud y, si no llegamos a contratar, un máximo de un año. Si hay contrato, durante los plazos que exige la normativa fiscal y civil.</p>
<h2>Quién más accede</h2><p>No cedemos tus datos a terceros salvo obligación legal. Pueden acceder a ellos, como encargados del tratamiento, los proveedores que nos prestan servicios técnicos (alojamiento web y gestión del formulario)${cfg.form.provider === 'netlify' ? ', en este caso Netlify, Inc.' : ''}${cfg.analytics.gtmId ? ' y, solo si aceptas las cookies de medición, Google' : ''}. Algunos de estos proveedores pueden tratar datos fuera del Espacio Económico Europeo con las garantías previstas en la normativa.</p>
<h2>Tus derechos</h2><p>Puedes solicitar el acceso, la rectificación o la supresión de tus datos, la limitación u oposición a su tratamiento y su portabilidad escribiendo a ${R.val(L.email, 'Correo legal (legal.email)')}. Si consideras que no se han atendido correctamente, puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).</p>
<h2>WhatsApp</h2><p>Si nos escribes por WhatsApp, el servicio lo presta WhatsApp Ireland Ltd. con sus propias condiciones. Usaremos la conversación y las fotos solo para atender tu solicitud.</p>`);

legalPage('/cookies/', 'Política de cookies', `Información sobre las cookies que utiliza la web de ${brand.name}.`, () => cfg.analytics.gtmId ? `
<p>Esta web utiliza cookies de medición solo si las aceptas en el aviso que aparece al entrar. Puedes cambiar tu decisión en cualquier momento desde el enlace «Configurar cookies» del pie de página.</p>
<h2>Qué cookies usamos</h2><div class="table-wrap"><table><thead><tr><th>Cookie</th><th>Proveedor</th><th>Finalidad</th><th>Duración</th></tr></thead><tbody>
<tr><td>_ga, _ga_*</td><td>Google Analytics (Google Ireland Ltd.)</td><td>Medir visitas y uso de la web de forma agregada</td><td>Hasta 2 años</td></tr>
<tr><td>_gcl_*</td><td>Google Ads (Google Ireland Ltd.)</td><td>Medir las solicitudes que llegan desde nuestros anuncios</td><td>90 días</td></tr>
</tbody></table></div>
<p>Además, guardamos tu decisión sobre las cookies en el almacenamiento local de tu navegador (clave «rm-consent») para no volver a preguntarte.</p>
<h2>Cómo desactivarlas</h2><p>Puedes rechazarlas en el aviso, cambiar tu elección desde el pie de página o borrarlas desde la configuración de tu navegador.</p>` : `
<p>Esta web no utiliza cookies de análisis, publicidad ni seguimiento.</p><p>Si en el futuro se incorporan herramientas de medición, se pedirá tu consentimiento antes de usarlas y esta página se actualizará con el detalle.</p>`);

/* ---------- GRACIAS (solo para envíos sin JavaScript en Netlify) ---------- */
add({
  path: '/gracias/', file: 'gracias/index.html', noindex: true,
  title: 'Solicitud recibida', description: 'Hemos recibido tu solicitud de valoración. Te contactaremos en el teléfono que nos has indicado para concretar los detalles.',
  body: () => `<section class="page-hero"><div class="wrap wrap-text"><h1>Hemos recibido tu solicitud</h1><p class="lead">Gracias por contarnos tu caso. Revisaremos la información y te contactaremos en el teléfono que nos has indicado.</p>
<p>Si quieres adelantar fotos, puedes enviarlas por WhatsApp.</p><div class="hero-actions">${R.btnWa('Acabo de enviar el formulario y os mando fotos.', 'thanks')}<a class="btn btn-ghost" href="/">Volver al inicio</a></div></div></section>`,
});

/* ---------- 404 ---------- */
add({
  path: '/404.html', file: '404.html', noindex: true, noCanonical: true,
  title: 'Página no encontrada', description: 'La página que buscas no existe o ha cambiado de dirección. Consulta nuestros servicios de impermeabilización o contacta con nosotros.',
  body: () => `<section class="page-hero"><div class="wrap wrap-text"><p class="eyebrow">Error 404</p><h1>No encontramos esta página</h1><p class="lead">Puede que la dirección haya cambiado. Estas páginas te pueden ayudar:</p>
<ul class="dashes">${publishedServices.map((s) => `<li><a href="${s.href}">${s.h1}</a></li>`).join('')}<li><a href="/precio-impermeabilizacion-granada/">Precios</a></li><li><a href="/contacto/">Contacto</a></li></ul>
<div class="hero-actions"><a class="btn btn-primary" href="/">Ir al inicio${icon('arrow')}</a></div></div></section>`,
});

/* ------------------------------------------------------------------ render (2 pasadas para conocer todos los pendientes) */
function renderAll(writeFiles) {
  for (const p of pages) {
    ctx.currentPath = p.path;
    const html = R.layout({ ...p, body: p.body() });
    if (writeFiles) write(p.file, html);
  }
}
for (const s of SERVICES) if (cfg.services[s.key] && cfg.services[s.key].estado !== 'confirmado') ctx.pending.add(`Confirmar servicio: ${s.nav} (services.${s.key}.estado)`);
renderAll(false);
renderAll(true);

/* ------------------------------------------------------------------ sitemap, robots, cabeceras, redirecciones */
const base = (cfg.siteUrl || '').replace(/\/$/, '');
const indexable = pages.filter((p) => !p.noindex && p.path.endsWith('/'));
if (prod) {
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable.map((p) => `  <url><loc>${base}${p.path}</loc></url>`).join('\n')}
</urlset>
`);
  write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`);
} else {
  // Versión de pruebas: se permite rastrear para que los buscadores vean el noindex (meta + cabecera)
  write('robots.txt', 'User-agent: *\nAllow: /\n# Versión de pruebas: todas las páginas llevan noindex.\n');
}

const headers = [
  '/*',
  '  X-Content-Type-Options: nosniff',
  '  Referrer-Policy: strict-origin-when-cross-origin',
  '  X-Frame-Options: SAMEORIGIN',
  '  Permissions-Policy: camera=(), microphone=(), geolocation=()',
  ...(prod ? [] : ['  X-Robots-Tag: noindex, nofollow']),
  '/assets/*',
  '  Cache-Control: public, max-age=31536000, immutable',
  '/assets/img/*',
  '  Cache-Control: public, max-age=604800',
  '/assets/diagramas/*',
  '  Cache-Control: public, max-age=604800',
];
write('_headers', headers.join('\n') + '\n');

const redirects = [
  ['/index.html', '/'],
  ['/inicio', '/'],
  ['/precios', '/precio-impermeabilizacion-granada/'],
  ['/presupuesto', '/contacto/'],
  ['/empresa', '/sobre-nosotros/'],
  ['/quienes-somos', '/sobre-nosotros/'],
  ['/blog', '/consejos/'],
  ['/blog/*', '/consejos/'],
  ...(svcByKey.terrazas && !svcByKey.terrazas.external ? [['/terrazas', svcByKey.terrazas.slug]] : []),
  ...(svcByKey.cubiertas && !svcByKey.cubiertas.external ? [['/cubiertas', svcByKey.cubiertas.slug], ['/tejados', svcByKey.cubiertas.slug]] : []),
  ...(svcByKey.goteras && !svcByKey.goteras.external ? [['/goteras', svcByKey.goteras.slug], ['/filtraciones', svcByKey.goteras.slug]] : []),
  ...(svcByKey.piscinas && !svcByKey.piscinas.external ? [['/piscinas', svcByKey.piscinas.slug]] : []),
  ...(svcByKey.comunidades && !svcByKey.comunidades.external ? [['/comunidades', svcByKey.comunidades.slug]] : []),
];
write('_redirects', redirects.map(([a, b]) => `${a} ${b} 301`).join('\n') + '\n');

/* ------------------------------------------------------------------ resumen */
if (prod) {
  const rec = [];
  if (!cfg.team.intro) rec.push('team.intro: la página Empresa no presenta todavía a las personas');
  if (!cfg.serviceArea.localities.length) rec.push('serviceArea.localities: solo se publica la zona de forma genérica');
  if (!cfg.google.businessProfileUrl) rec.push('google.businessProfileUrl: enlaza el Perfil de Empresa existente');
  if (!cfg.analytics.gtmId) rec.push('analytics.gtmId: sin medición de conversiones');
  if (!cases.length) rec.push('content/casos: sin trabajos documentados (la sección no se publica)');
  if (rec.length) { console.log('\nRecomendado completar:'); rec.forEach((r) => console.log('  · ' + r)); }
}
console.log(`✔ ${prod ? 'Producción' : 'Pruebas'}: ${pages.length} páginas en ${path.relative(process.cwd(), OUT) || '.'}`);
if (!prod && ctx.pending.size) {
  console.log(`\nDatos pendientes (${ctx.pending.size}):`);
  [...ctx.pending].sort().forEach((p) => console.log('  · ' + p));
}
