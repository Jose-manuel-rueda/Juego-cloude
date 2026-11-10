/*
 * Plantillas compartidas: cabecera, pie, componentes, formulario.
 * Sin dependencias. Todo el contenido sale en HTML estático.
 */
'use strict';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const ICONS = {
  terrazas: '<path d="M3 15h18M5 15v5M19 15v5M7 11h10l2 4H5z"/><path d="M8 7l2-3M12 7l2-3M16 7l2-3"/>',
  cubiertas: '<path d="M2 12L12 4l10 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
  goteras: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>',
  piscinas: '<path d="M2 18c2 0 2-1.5 4-1.5S8 18 10 18s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5"/><path d="M8 15V5a2 2 0 0 1 4 0M16 15V5a2 2 0 0 0-4 0M8 9h8M8 12h8"/>',
  comunidades: '<path d="M4 21V5l8-2v18M12 7l8 2v12M7 8h2M7 12h2M7 16h2M15 12h2M15 16h2M2 21h20"/>',
  phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
  whatsapp: '<path d="M3 21l1.6-4.7A8.5 8.5 0 1 1 7.8 19.6z"/><path d="M9 8.5c0 3 2.5 6 6 6.5l1.2-1.6-2-1-1 .8a4.6 4.6 0 0 1-2.4-2.4l.8-1-1-2z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pin: '<path d="M12 21s7-6.3 7-12a7 7 0 0 0-14 0c0 5.7 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  chevron: '<path d="M6 9l6 6 6-6"/>',
};
const icon = (name, cls = 'ico') =>
  `<svg class="${cls}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name] || ''}</svg>`;

function createRenderer(ctx) {
  const { cfg, prod } = ctx;
  const brand = cfg.brand;

  /* ---- datos pendientes ---- */
  function pend(label) {
    ctx.pending.add(label);
    if (prod) throw new Error(`Dato pendiente usado en producción: ${label}`);
    return `<mark class="pend" title="Dato pendiente en config/site.js">Pendiente: ${esc(label)}</mark>`;
  }
  const val = (v, label) => (v ? esc(v) : pend(label));
  const abs = (p) => (cfg.siteUrl ? cfg.siteUrl.replace(/\/$/, '') + p : p);

  /* ---- enlaces de contacto ---- */
  const hasPhone = !!cfg.contact.phone;
  const hasWa = !!cfg.contact.whatsapp;
  function telHref() {
    if (hasPhone) return 'tel:' + cfg.contact.phone.replace(/[^+\d]/g, '');
    ctx.pending.add('Teléfono');
    return '#pendiente-telefono';
  }
  function waText(problem) {
    return `Hola, necesito valorar una impermeabilización en [tu localidad]. ${problem || 'Te cuento el problema:'} Puedo enviar fotos.`;
  }
  function waHref(problem) {
    if (!hasWa) { ctx.pending.add('WhatsApp'); return '#pendiente-whatsapp'; }
    return `https://wa.me/${cfg.contact.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(waText(problem))}`;
  }
  const pendAttr = (ok) => (ok ? '' : ' data-pendiente');

  function btnCall(loc, cls = 'btn btn-ghost') {
    const label = hasPhone ? `Llamar al ${esc(cfg.contact.phoneDisplay || cfg.contact.phone)}` : 'Llamar';
    return `<a class="${cls}" href="${telHref()}" data-track="call" data-loc="${loc}"${pendAttr(hasPhone)}>${icon('phone')}<span>${label}</span></a>`;
  }
  function btnWa(problem, loc, label = 'Enviar fotos por WhatsApp', cls = 'btn btn-wa') {
    return `<a class="${cls}" href="${waHref(problem)}" target="_blank" rel="noopener" data-track="whatsapp" data-loc="${loc}"${pendAttr(hasWa)}>${icon('whatsapp')}<span>${label}</span></a>`;
  }
  const btnQuote = (href = '#valoracion', label = 'Solicitar valoración') =>
    `<a class="btn btn-primary" href="${href}">${label}${icon('arrow')}</a>`;

  /* ---- imágenes ---- */
  function picture(photo, { sizes = '100vw', priority = false, cls = '' } = {}) {
    const m = ctx.photos[photo.name];
    if (!m) { ctx.pending.add(`Foto "${photo.name}" sin procesar (node tools/fotos.js)`); return ''; }
    const srcset = m.widths.map((w) => `/assets/img/fotos/${photo.name}-${w}.webp ${w}w`).join(', ');
    const largest = m.widths[m.widths.length - 1];
    const h = Math.round((m.height / m.width) * largest);
    return `<img class="${cls}" src="/assets/img/fotos/${photo.name}-${largest}.webp" srcset="${srcset}" sizes="${sizes}" width="${largest}" height="${h}" alt="${esc(photo.alt)}"${priority ? ' fetchpriority="high"' : ' loading="lazy" decoding="async"'}>`;
  }

  /* ---- componentes ---- */
  const section = (inner, { cls = '', id = '', label = '' } = {}) =>
    `<section class="section ${cls}"${id ? ` id="${id}"` : ''}${label ? ` aria-labelledby="${label}"` : ''}><div class="wrap">${inner}</div></section>`;

  const head2 = (id, eyebrow, title, intro = '') =>
    `<header class="sec-head">${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}<h2 id="${id}">${title}</h2>${intro ? `<p class="sec-intro">${intro}</p>` : ''}</header>`;

  function faq(items, id = 'faq', title = 'Preguntas frecuentes') {
    return section(
      head2(id, 'Dudas habituales', title) +
      `<div class="faq">${items.map((f) => `<details class="faq-item"><summary><span>${f.q}</span>${icon('chevron', 'ico chev')}</summary><div class="faq-a"><p>${f.a}</p></div></details>`).join('')}</div>`,
      { cls: 'sec-faq', label: id });
  }

  function figure(d) {
    return `<figure class="diagram reveal"><div class="diagram-img"><img src="${d.src}" width="${d.width}" height="${d.height}" alt="${esc(d.alt)}" loading="lazy" decoding="async"></div>
<figcaption><strong>${d.caption}</strong><ol class="legend">${d.legend.map((l) => `<li>${l}</li>`).join('')}</ol><span class="diagram-note">Esquema ilustrativo, no corresponde a una obra concreta.</span></figcaption></figure>`;
  }

  function breadcrumbs(items) {
    if (!items || !items.length) return '';
    const all = [{ name: 'Inicio', path: '/' }, ...items];
    return `<nav class="crumbs wrap" aria-label="Migas de pan"><ol>${all.map((b, i) => i === all.length - 1
      ? `<li aria-current="page">${esc(b.name)}</li>`
      : `<li><a href="${b.path}">${esc(b.name)}</a></li>`).join('')}</ol></nav>`;
  }
  function breadcrumbLd(items) {
    const all = [{ name: 'Inicio', path: '/' }, ...items];
    return {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: all.map((b, i) => ({ '@type': 'ListItem', position: i + 1, name: b.name, item: abs(b.path) })),
    };
  }

  function businessLd() {
    const c = cfg.contact;
    const ld = {
      '@context': 'https://schema.org', '@type': 'HomeAndConstructionBusiness',
      '@id': abs('/#empresa'), name: brand.name, url: abs('/'),
      address: {
        '@type': 'PostalAddress', addressLocality: cfg.base.locality, addressRegion: cfg.base.province, addressCountry: 'ES',
        ...(cfg.base.postalCode ? { postalCode: cfg.base.postalCode } : {}),
        ...(cfg.base.showStreet && cfg.base.street ? { streetAddress: cfg.base.street } : {}),
      },
      areaServed: [{ '@type': 'City', name: 'Granada' }, ...cfg.serviceArea.localities.filter((l) => l !== 'Granada').map((n) => ({ '@type': 'City', name: n }))],
    };
    if (c.phone) ld.telephone = c.phone;
    if (c.email) ld.email = c.email;
    if (brand.logo) ld.logo = abs(brand.logo.src);
    const same = [cfg.google.businessProfileUrl, cfg.social.instagram, cfg.social.facebook].filter(Boolean);
    if (same.length) ld.sameAs = same;
    if (ctx.publishedServices.length) {
      ld.knowsAbout = ctx.publishedServices.map((s) => s.h1.replace(/ en Granada$/, ''));
    }
    return ld;
  }

  /* ---- formulario ---- */
  function form({ id = 'valoracion', service = '', showSelect = true, title = 'Solicita tu valoración', intro = '' } = {}) {
    const f = cfg.form;
    const connected = f.provider === 'netlify' || (f.provider === 'endpoint' && f.endpoint);
    if (!connected) ctx.pending.add('Conexión del formulario (form.provider)');
    const action = f.provider === 'netlify' ? '/gracias/' : (f.provider === 'endpoint' ? f.endpoint : '');
    const services = ctx.publishedServices.map((s) => s.formService);
    const options = [...services, 'Otro / no lo sé'];
    const locs = (cfg.serviceArea.localities.length ? cfg.serviceArea.localities : (prod ? [] : cfg.serviceArea.suggested));
    const uid = id;
    const owner = cfg.legal.owner ? esc(cfg.legal.owner) : pend('Titular (legal.owner)');
    return `<div class="form-card" id="${id}">
<h2 class="form-title" id="${uid}-t">${title}</h2>
${intro ? `<p class="form-intro">${intro}</p>` : ''}
${connected ? '' : '<p class="form-warning" role="note">Versión de pruebas: el formulario aún no está conectado y no envía datos.</p>'}
<form class="lead-form" name="valoracion" method="POST" action="${esc(action)}" novalidate data-provider="${esc(f.provider)}" data-endpoint="${esc(f.provider === 'endpoint' ? f.endpoint : '')}" data-service="${esc(service)}" aria-labelledby="${uid}-t"${f.provider === 'netlify' ? ' data-netlify="true" netlify-honeypot="empresa_web"' : ''}>
  <input type="hidden" name="form-name" value="valoracion">
  <input type="hidden" name="pagina" value="${esc(ctx.currentPath || '')}">
  <div class="form-errors" role="alert" tabindex="-1" hidden></div>
  <div class="field">
    <label for="${uid}-nombre">Nombre</label>
    <input id="${uid}-nombre" name="nombre" type="text" autocomplete="name" required maxlength="80" aria-describedby="${uid}-nombre-e">
    <p class="field-error" id="${uid}-nombre-e" hidden></p>
  </div>
  <div class="field-row">
    <div class="field">
      <label for="${uid}-telefono">Teléfono</label>
      <input id="${uid}-telefono" name="telefono" type="tel" inputmode="tel" autocomplete="tel" required maxlength="20" aria-describedby="${uid}-telefono-e">
      <p class="field-error" id="${uid}-telefono-e" hidden></p>
    </div>
    <div class="field">
      <label for="${uid}-localidad">Localidad</label>
      <input id="${uid}-localidad" name="localidad" type="text" autocomplete="address-level2" required maxlength="60"${locs.length ? ` list="${uid}-locs"` : ''} aria-describedby="${uid}-localidad-e">
      ${locs.length ? `<datalist id="${uid}-locs">${locs.map((l) => `<option value="${esc(l)}">`).join('')}</datalist>` : ''}
      <p class="field-error" id="${uid}-localidad-e" hidden></p>
    </div>
  </div>
  ${showSelect ? `<div class="field">
    <label for="${uid}-servicio">¿Dónde está el problema? <span class="opt">(opcional)</span></label>
    <select id="${uid}-servicio" name="servicio">${['<option value="">Elige una opción</option>', ...options.map((o) => `<option${o === service ? ' selected' : ''}>${esc(o)}</option>`)].join('')}</select>
  </div>` : `<input type="hidden" name="servicio" value="${esc(service)}">`}
  <div class="field">
    <label for="${uid}-descripcion">Cuéntanos el problema</label>
    <textarea id="${uid}-descripcion" name="descripcion" rows="4" required minlength="15" maxlength="2000" aria-describedby="${uid}-descripcion-h ${uid}-descripcion-e"></textarea>
    <p class="field-hint" id="${uid}-descripcion-h">Dónde aparece el agua, desde cuándo, si empeora con la lluvia y la superficie aproximada.</p>
    <p class="field-error" id="${uid}-descripcion-e" hidden></p>
  </div>
  <div class="field">
    <label for="${uid}-email">Correo electrónico <span class="opt">(opcional)</span></label>
    <input id="${uid}-email" name="email" type="email" autocomplete="email" maxlength="120" aria-describedby="${uid}-email-e">
    <p class="field-error" id="${uid}-email-e" hidden></p>
  </div>
  <p class="hp" aria-hidden="true"><label>No rellenes este campo <input name="empresa_web" type="text" tabindex="-1" autocomplete="off"></label></p>
  ${f.turnstileSiteKey ? `<div class="cf-turnstile" data-sitekey="${esc(f.turnstileSiteKey)}" data-language="es"></div>` : ''}
  <p class="privacy-note"><strong>Protección de datos.</strong> Responsable: ${owner}. Usamos estos datos solo para responder a tu solicitud y preparar la valoración, a petición tuya. No se ceden a terceros salvo obligación legal o a proveedores que nos prestan el servicio técnico. Puedes acceder, rectificar o suprimir tus datos y ejercer tus demás derechos como se indica en la <a href="/privacidad/">política de privacidad</a>.</p>
  <button class="btn btn-primary btn-block" type="submit"><span class="btn-label">Enviar solicitud</span>${icon('arrow')}</button>
  <p class="form-photos">¿Tienes fotos? Puedes enviarlas por <a href="${waHref(service ? `El problema está en: ${service}.` : '')}" target="_blank" rel="noopener" data-track="whatsapp" data-loc="form"${pendAttr(hasWa)}>WhatsApp</a>; nos ayudan a valorar mejor.</p>
</form>
<div class="form-status" role="status" aria-live="polite" tabindex="-1" hidden></div>
</div>`;
  }

  function ctaBand({ service = '', showSelect = true, waProblem = '', heading = '¿Dónde aparece el agua? Cuéntanoslo', text = 'Explícanos qué ves y, si puedes, envía fotos. Con esa información te decimos qué conviene revisar y cómo preparamos la valoración.' } = {}) {
    return `<section class="section sec-cta" aria-labelledby="cta-h"><div class="wrap cta-grid">
<div class="cta-copy">
  <p class="eyebrow">Siguiente paso</p>
  <h2 id="cta-h">${heading}</h2>
  <p>${text}</p>
  <h3 class="h-small">Qué conviene contarnos</h3>
  <ul class="ticks">
    <li>${icon('check')}<span>Dónde está: localidad y tipo de inmueble.</span></li>
    <li>${icon('check')}<span>Superficie aproximada de la zona.</span></li>
    <li>${icon('check')}<span>Fotos generales y de detalle.</span></li>
    <li>${icon('check')}<span>Cuándo aparece el agua: al llover, al regar, siempre.</span></li>
  </ul>
  <div class="cta-actions">${btnWa(waProblem, 'cta')}${btnCall('cta', 'btn btn-ghost-light')}</div>
</div>
${form({ service, showSelect })}
</div></section>`;
  }

  /* ---- marca ---- */
  function logo() {
    if (brand.logo) {
      return `<a class="logo" href="/" aria-label="${esc(brand.name)}, inicio"><img src="${brand.logo.src}" width="${brand.logo.width}" height="${brand.logo.height}" alt="${esc(brand.name)}"></a>`;
    }
    return `<a class="logo" href="/" aria-label="${esc(brand.name)}, inicio"><span class="logo-mark" aria-hidden="true"><svg viewBox="0 0 32 32" width="32" height="32"><rect width="32" height="32" rx="7" fill="currentColor"/><path d="M16 7s7 8 7 12.5a7 7 0 0 1-14 0C9 15 16 7 16 7z" fill="#fff"/><path d="M6 25h20" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg></span><span class="logo-text"><span class="logo-name">${esc(brand.shortName)}</span><span class="logo-tag">${esc(brand.tagline)}</span></span></a>`;
  }

  /* ---- cabecera y pie ---- */
  function header(path) {
    const svcs = ctx.publishedServices;
    const cur = (p) => (path === p ? ' aria-current="page"' : '');
    const svcLinks = svcs.map((s) => `<li><a href="${s.href}"${cur(s.slug)}${s.external ? ' rel="noopener"' : ''}>${icon(s.key)}<span>${s.nav}</span></a></li>`).join('');
    const links = ctx.navLinks.map((l) => `<li><a class="nav-link" href="${l.path}"${cur(l.path)}>${l.name}</a></li>`).join('');
    return `<header class="site-header" id="top"><div class="wrap header-inner">
${logo()}
<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav"><span class="open">${icon('menu')}</span><span class="close">${icon('close')}</span><span class="sr">Menú</span></button>
<nav class="site-nav" id="site-nav" aria-label="Principal">
  <ul class="nav-list">
    ${svcs.length ? `<li class="has-sub"><button class="nav-link sub-toggle" type="button" aria-expanded="false" aria-controls="sub-servicios">Servicios${icon('chevron', 'ico chev')}</button>
      <ul class="sub" id="sub-servicios">${svcLinks}</ul></li>` : ''}
    ${links}
  </ul>
  <div class="nav-cta">${hasPhone || !prod ? `<a class="nav-phone" href="${telHref()}" data-track="call" data-loc="header"${pendAttr(hasPhone)}>${icon('phone')}<span>${hasPhone ? esc(cfg.contact.phoneDisplay || cfg.contact.phone) : 'Teléfono'}</span></a>` : ''}
  <a class="btn btn-primary btn-sm" href="/contacto/">Solicitar valoración</a></div>
</nav>
</div></header>`;
  }

  function footer() {
    const c = cfg.contact;
    const year = new Date().getFullYear();
    const area = cfg.serviceArea.localities.length
      ? `<p class="foot-area">Trabajamos en ${cfg.serviceArea.localities.map(esc).join(', ')}.</p>` : '';
    return `<footer class="site-footer"><div class="wrap">
<div class="foot-grid">
  <div class="foot-brand">${logo()}
    <p>Impermeabilizaciones con diagnóstico previo para viviendas, comunidades y negocios. Desde ${esc(cfg.base.locality)} para ${esc(cfg.serviceArea.summary)}.</p>${area}
  </div>
  ${ctx.publishedServices.length ? `<div><h2 class="foot-h">Servicios</h2><ul>${ctx.publishedServices.map((s) => `<li><a href="${s.href}">${s.nav}</a></li>`).join('')}</ul></div>` : ''}
  <div><h2 class="foot-h">Información</h2><ul>${ctx.navLinks.map((l) => `<li><a href="${l.path}">${l.name}</a></li>`).join('')}</ul></div>
  <div><h2 class="foot-h">Contacto</h2><ul class="foot-contact">
    <li><a href="${telHref()}" data-track="call" data-loc="footer"${pendAttr(hasPhone)}>${icon('phone')}<span>${hasPhone ? esc(c.phoneDisplay || c.phone) : 'Teléfono pendiente'}</span></a></li>
    <li><a href="${waHref('')}" target="_blank" rel="noopener" data-track="whatsapp" data-loc="footer"${pendAttr(hasWa)}>${icon('whatsapp')}<span>WhatsApp</span></a></li>
    ${c.email ? `<li><a href="mailto:${esc(c.email)}">${icon('mail')}<span>${esc(c.email)}</span></a></li>` : ''}
    ${c.hours ? `<li>${icon('clock')}<span>${esc(c.hours)}</span></li>` : ''}
    <li>${icon('pin')}<span>${esc(cfg.base.locality)} (${esc(cfg.base.province)})</span></li>
  </ul></div>
</div>
<div class="foot-legal">
  <p>© ${year} ${esc(cfg.legal.owner || brand.name)}</p>
  <ul><li><a href="/aviso-legal/">Aviso legal</a></li><li><a href="/privacidad/">Privacidad</a></li><li><a href="/cookies/">Cookies</a></li>${cfg.analytics.gtmId ? '<li><button type="button" class="linklike" data-consent-open>Configurar cookies</button></li>' : ''}</ul>
</div>
</div></footer>`;
  }

  function mobileBar(waProblem) {
    return `<div class="mobile-bar" aria-label="Contacto rápido">
<a href="${telHref()}" data-track="call" data-loc="mobile-bar"${pendAttr(hasPhone)}>${icon('phone')}<span>Llamar</span></a>
<a href="${waHref(waProblem)}" target="_blank" rel="noopener" data-track="whatsapp" data-loc="mobile-bar"${pendAttr(hasWa)} class="wa">${icon('whatsapp')}<span>WhatsApp</span></a>
</div>`;
  }

  function consentBanner() {
    if (!cfg.analytics.gtmId) return '';
    return `<div class="consent" id="consent" role="dialog" aria-labelledby="consent-t" hidden>
<p id="consent-t"><strong>Cookies de medición.</strong> Con tu permiso usamos cookies para saber cómo se usa la web y medir nuestras campañas. Puedes aceptarlas o rechazarlas; la web funciona igual. <a href="/cookies/">Más información</a>.</p>
<div class="consent-btns"><button type="button" class="btn btn-ghost btn-sm" data-consent="denied">Rechazar</button><button type="button" class="btn btn-primary btn-sm" data-consent="granted">Aceptar</button></div>
</div>`;
  }

  /* ---- documento completo ---- */
  function layout(page) {
    ctx.currentPath = page.path;
    const title = page.fullTitle || `${page.title} | ${brand.shortName}`;
    const noindex = !prod || page.noindex;
    const ld = (page.jsonld || []).map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('\n');
    const gtm = cfg.analytics.gtmId;
    const ogImage = abs('/assets/img/og.jpg');
    // El cuerpo se genera antes que la cabecera para que el formulario sepa en qué página está
    const body = page.body;
    const pendingList = [...ctx.pending].sort();
    return `<!doctype html>
<html lang="es-ES" class="no-js">
<head>
<meta charset="utf-8">
<script>document.documentElement.className='js'</script>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(page.description)}">
${noindex ? '<meta name="robots" content="noindex, nofollow">' : '<meta name="robots" content="index, follow, max-image-preview:large">'}
${page.noCanonical ? '' : `<link rel="canonical" href="${abs(page.path)}">`}
<meta property="og:type" content="${page.ogType || 'website'}">
<meta property="og:locale" content="es_ES">
<meta property="og:site_name" content="${esc(brand.name)}">
<meta property="og:title" content="${esc(page.ogTitle || page.title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:url" content="${abs(page.path)}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#1F2429">
${cfg.analytics.searchConsoleToken ? `<meta name="google-site-verification" content="${esc(cfg.analytics.searchConsoleToken)}">` : ''}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/figtree-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/bricolage-grotesque-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${ctx.assets.css}">
${page.headExtra || ''}
${gtm ? `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});try{var c=localStorage.getItem('rm-consent');if(c==='granted'){gtag('consent','update',{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted',analytics_storage:'granted'})}}catch(e){}
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f)})(window,document,'script','dataLayer','${esc(gtm)}');</script>` : ''}
${cfg.form.turnstileSiteKey ? '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>' : ''}
${ld}
</head>
<body class="${page.bodyClass || ''}">
<a class="skip" href="#main">Saltar al contenido</a>
${prod ? '' : `<div class="staging"><div class="wrap"><strong>Versión de pruebas</strong> · no indexable${pendingList.length ? ` · <details><summary>${pendingList.length} datos pendientes</summary><ul>${pendingList.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></details>` : ''}</div></div>`}
${header(page.path)}
<main id="main">
${body}
</main>
${footer()}
${mobileBar(page.waProblem || '')}
${consentBanner()}
<script src="${ctx.assets.js}" defer></script>
</body>
</html>
`;
  }

  return { esc, icon, pend, val, abs, telHref, waHref, waText, btnCall, btnWa, btnQuote, picture, section, head2, faq, figure, breadcrumbs, breadcrumbLd, businessLd, form, ctaBand, layout, hasPhone, hasWa };
}

module.exports = { createRenderer, esc, icon };
