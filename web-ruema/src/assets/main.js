/* RueMa · JavaScript mínimo: menú, formulario, medición y consentimiento. */
(function () {
  'use strict';
  var d = document;
  var dl = (window.dataLayer = window.dataLayer || []);
  function track(event, params) { var o = { event: event }; for (var k in params) o[k] = params[k]; dl.push(o); }

  /* ---------- menú ---------- */
  var toggle = d.querySelector('.nav-toggle');
  var nav = d.getElementById('site-nav');
  function setNav(open) {
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('open', open);
    d.body.classList.toggle('nav-open', open);
  }
  if (toggle && nav) {
    toggle.addEventListener('click', function () { setNav(toggle.getAttribute('aria-expanded') !== 'true'); });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) { setNav(false); toggle.focus(); }
    });
  }
  d.querySelectorAll('.sub-toggle').forEach(function (b) {
    var li = b.parentElement;
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', String(open));
      li.classList.toggle('open', open);
    });
    li.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && li.classList.contains('open')) { b.setAttribute('aria-expanded', 'false'); li.classList.remove('open'); b.focus(); }
    });
    d.addEventListener('click', function (e) {
      if (!li.contains(e.target)) { b.setAttribute('aria-expanded', 'false'); li.classList.remove('open'); }
    });
    li.addEventListener('focusout', function (e) {
      if (window.matchMedia('(min-width: 1061px)').matches && !li.contains(e.relatedTarget)) { b.setAttribute('aria-expanded', 'false'); li.classList.remove('open'); }
    });
  });

  /* ---------- barra móvil: se oculta al escribir para no tapar el teclado ni los campos ---------- */
  d.addEventListener('focusin', function (e) { if (e.target.matches('input, textarea, select')) d.body.classList.add('typing'); });
  d.addEventListener('focusout', function (e) { if (e.target.matches('input, textarea, select')) d.body.classList.remove('typing'); });

  /* ---------- medición de clics (llamadas y WhatsApp por separado) ---------- */
  d.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-track], button[data-wa-builder]');
    if (!a) return;
    if (a.hasAttribute('data-pendiente')) { e.preventDefault(); alert('Versión de pruebas: este dato de contacto está pendiente en config/site.js.'); return; }
    var kind = a.getAttribute('data-track') || 'whatsapp';
    track(kind === 'call' ? 'click_call' : 'click_whatsapp', { link_location: a.getAttribute('data-loc') || 'builder', page_path: location.pathname });
  });

  /* ---------- animaciones discretas ---------- */
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var items = d.querySelectorAll('.reveal');
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- formulario ---------- */
  var MSG = {
    nombre: 'Escribe tu nombre.',
    telefono: 'Escribe un teléfono válido (9 cifras, con o sin prefijo +34).',
    localidad: 'Indica la localidad donde está el inmueble.',
    descripcion: 'Cuéntanos el problema con un poco más de detalle (al menos 15 caracteres).',
    email: 'El correo no parece válido. Revísalo o déjalo en blanco.',
  };
  function validPhone(v) {
    var n = v.replace(/[\s().-]/g, '');
    return /^(\+34|0034)?[6789]\d{8}$/.test(n) || /^\+\d{8,15}$/.test(n);
  }
  function check(form) {
    var errors = [];
    function f(name) { return form.elements[name]; }
    function set(name, ok) {
      var el = f(name); if (!el) return;
      var err = d.getElementById(el.id + '-e');
      el.setAttribute('aria-invalid', ok ? 'false' : 'true');
      if (err) { err.hidden = ok; err.textContent = ok ? '' : MSG[name]; }
      if (!ok) errors.push({ el: el, msg: MSG[name] });
    }
    set('nombre', f('nombre').value.trim().length >= 2);
    set('telefono', validPhone(f('telefono').value.trim()));
    set('localidad', f('localidad').value.trim().length >= 2);
    set('descripcion', f('descripcion').value.trim().length >= 15);
    var em = f('email').value.trim();
    set('email', !em || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em));
    return errors;
  }

  function contactAlternatives(onlyWa) {
    var tel = d.querySelector('.mobile-bar a[data-track="call"]');
    var wa = d.querySelector('.mobile-bar a[data-track="whatsapp"]');
    var html = '';
    if (!onlyWa && tel && !tel.hasAttribute('data-pendiente')) html += '<a class="btn btn-ghost btn-sm" href="' + tel.getAttribute('href') + '" data-track="call" data-loc="form-error">Llamar</a> ';
    if (wa && !wa.hasAttribute('data-pendiente')) html += '<a class="btn btn-wa btn-sm" href="' + wa.getAttribute('href') + '" target="_blank" rel="noopener" data-track="whatsapp" data-loc="form-error">WhatsApp</a>';
    return html;
  }

  d.querySelectorAll('form.lead-form').forEach(function (form) {
    var t0 = Date.now();
    var card = form.parentElement;
    var status = card.querySelector('.form-status');
    var summary = form.querySelector('.form-errors');
    var btn = form.querySelector('button[type="submit"]');
    var label = btn.querySelector('.btn-label');
    var provider = form.getAttribute('data-provider');
    var endpoint = form.getAttribute('data-endpoint');
    var fastTries = 0;

    form.addEventListener('input', function (e) {
      if (e.target.getAttribute('aria-invalid') === 'true') check(form);
    });

    function showError(text) {
      status.hidden = false;
      status.className = 'form-status is-error';
      status.innerHTML = '<p><strong>No se ha podido enviar la solicitud.</strong> ' + text + '</p>' + contactAlternatives();
      status.focus();
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      status.hidden = true;
      var errors = check(form);
      if (errors.length) {
        summary.hidden = false;
        summary.innerHTML = '<strong>Revisa ' + (errors.length === 1 ? 'este campo' : 'estos campos') + ':</strong><ul>' +
          errors.map(function (x) { return '<li><a href="#' + x.el.id + '">' + x.msg + '</a></li>'; }).join('') + '</ul>';
        summary.focus();
        return;
      }
      summary.hidden = true;

      // Antispam: campo trampa y tiempo mínimo de rellenado
      if (form.elements.empresa_web && form.elements.empresa_web.value) { showError('Inténtalo de nuevo más tarde.'); return; }
      if (Date.now() - t0 < 2500 && fastTries++ === 0) { showError('Revisa los datos y pulsa de nuevo «Enviar solicitud».'); return; }

      if (provider !== 'netlify' && !(provider === 'endpoint' && endpoint)) {
        showError('El formulario todavía no está conectado (versión de pruebas). No se ha enviado ningún dato.');
        track('form_submit_error', { reason: 'not_connected', page_path: location.pathname });
        return;
      }

      var data = new FormData(form);
      if (window.turnstile && !data.get('cf-turnstile-response')) { showError('Completa la verificación antes de enviar.'); return; }
      btn.disabled = true; label.textContent = 'Enviando…';
      var ctrl = 'AbortController' in window ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);
      var req = provider === 'netlify'
        ? fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(data).toString(), signal: ctrl && ctrl.signal })
        : fetch(endpoint, { method: 'POST', headers: { Accept: 'application/json' }, body: data, signal: ctrl && ctrl.signal });

      req.then(function (res) {
        clearTimeout(timer);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        // Éxito confirmado por el servidor: solo ahora se muestra la confirmación
        form.hidden = true;
        status.hidden = false;
        status.className = 'form-status is-ok';
        status.innerHTML = '<h3>Solicitud enviada</h3><p>Hemos recibido tu solicitud. Te contactaremos en el teléfono que nos has indicado.</p><p>Si quieres adelantar fotos, puedes enviarlas por WhatsApp.</p>' + contactAlternatives(true);
        status.focus();
        track('form_submit_success', { form_service: data.get('servicio') || form.getAttribute('data-service') || '', page_path: location.pathname });
      }).catch(function (err) {
        clearTimeout(timer);
        btn.disabled = false; label.textContent = 'Enviar solicitud';
        showError(err && err.name === 'AbortError' ? 'La conexión ha tardado demasiado. Vuelve a intentarlo o contacta por teléfono o WhatsApp.' : 'Vuelve a intentarlo en unos minutos o contacta por teléfono o WhatsApp.');
        track('form_submit_error', { reason: String(err && err.message || err), page_path: location.pathname });
      });
    });
  });

  /* ---------- WhatsApp con los datos del formulario (contacto) ---------- */
  var builder = d.querySelector('[data-wa-builder]');
  if (builder) {
    builder.closest('.wa-builder').hidden = false;
    builder.addEventListener('click', function () {
      if (builder.hasAttribute('data-pendiente')) return;
      var f = d.querySelector('form.lead-form');
      var v = function (n) { return f.elements[n] && f.elements[n].value.trim(); };
      var msg = 'Hola' + (v('nombre') ? ', soy ' + v('nombre') : '') + '. Necesito valorar una impermeabilización en ' + (v('localidad') || '[tu localidad]') + '. ' +
        (v('servicio') ? 'El problema está en: ' + v('servicio') + '. ' : '') + (v('descripcion') ? v('descripcion') + ' ' : '') + 'Puedo enviar fotos.';
      window.open('https://wa.me/' + builder.getAttribute('data-wa') + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
    });
  }

  /* ---------- consentimiento de cookies (solo si hay medición configurada) ---------- */
  var banner = d.getElementById('consent');
  if (banner) {
    var stored = null;
    try { stored = localStorage.getItem('rm-consent'); } catch (e) { /* sin almacenamiento */ }
    if (!stored) banner.hidden = false;
    banner.addEventListener('click', function (e) {
      var b = e.target.closest('[data-consent]'); if (!b) return;
      var v = b.getAttribute('data-consent');
      try { localStorage.setItem('rm-consent', v); } catch (err) { /* sin almacenamiento */ }
      if (typeof window.gtag === 'function') window.gtag('consent', 'update', { ad_storage: v, ad_user_data: v, ad_personalization: v, analytics_storage: v });
      banner.hidden = true;
    });
    d.querySelectorAll('[data-consent-open]').forEach(function (b) { b.addEventListener('click', function () { banner.hidden = false; }); });
  }
})();
