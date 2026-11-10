/*
 * CONFIGURACIÓN CENTRAL DE LA WEB
 * ---------------------------------------------------------------
 * Todo lo que es dato del negocio está aquí. Los campos vacíos ('')
 * son datos PENDIENTES: la versión de pruebas los marca y la versión
 * de producción (node build.js --production) se niega a generarse
 * mientras falte alguno obligatorio.
 *
 * Regla: no rellenes nada que no puedas acreditar (teléfonos,
 * reseñas, años, certificaciones, garantías, precios, urgencias...).
 */

module.exports = {
  /* ---------- Marca ---------- */
  brand: {
    name: 'RueMa Impermeabilizaciones', // Nombre provisional: cámbialo aquí y se actualiza en toda la web
    shortName: 'RueMa',
    tagline: 'Impermeabilizaciones',
    // Logotipo oficial. Cuando exista: { src: '/assets/img/logo.svg', width: 180, height: 48 }
    // Se mostrará con sus proporciones originales (no se recorta ni deforma).
    logo: null,
  },

  /* ---------- Dominio ---------- */
  // URL definitiva SIN barra final, p. ej. 'https://www.ejemplo.es'. Obligatoria en producción.
  siteUrl: '',

  /* ---------- Contacto (NAP: debe coincidir con el Perfil de Empresa de Google) ---------- */
  contact: {
    phone: '',          // Formato internacional para enlaces: '+34XXXXXXXXX'
    phoneDisplay: '',   // Cómo se ve: 'XXX XX XX XX'
    whatsapp: '',       // Número de WhatsApp en formato internacional sin '+': '34XXXXXXXXX'
    email: '',          // Opcional
    hours: '',          // Opcional, p. ej. 'Lunes a viernes, de 8:00 a 18:00'. Solo si es real.
  },

  /* ---------- Base de actividad ---------- */
  // Empresa de área de servicio: no hace falta mostrar calle si no se atiende al público en el local.
  base: {
    locality: 'Padul',
    province: 'Granada',
    region: 'Andalucía',
    postalCode: '',     // Opcional (p. ej. el CP de Padul si se quiere en los datos estructurados)
    street: '',         // Opcional. Solo si coincide con el Perfil de Empresa y se quiere publicar
    showStreet: false,
  },

  /* ---------- Zona de servicio ---------- */
  serviceArea: {
    summary: 'Granada capital y su área metropolitana',
    // Localidades donde SE TRABAJA REALMENTE. Hasta confirmarlas, en producción solo se publica el resumen.
    localities: [],
    // Sugerencia para revisar (no se publica en producción). Pasa a "localities" las que sean reales.
    suggested: [
      'Granada', 'Armilla', 'Maracena', 'Las Gabias', 'Churriana de la Vega', 'Ogíjares',
      'La Zubia', 'Alhendín', 'Huétor Vega', 'Cájar', 'Monachil', 'Albolote', 'Atarfe',
      'Peligros', 'Santa Fe', 'Cúllar Vega', 'Otura', 'Padul', 'Dúrcal',
    ],
  },

  /* ---------- Servicios ---------- */
  // estado: 'confirmado' → se publica en producción | 'pendiente' → solo en la versión de pruebas
  // urlExterna: si ese servicio ya vive en otra web propia (p. ej. granadapiscinas.es), pon aquí
  //   su URL: no se generará la página y los enlaces irán a esa web (evita contenido duplicado).
  services: {
    terrazas: { estado: 'pendiente' },
    cubiertas: { estado: 'pendiente' },
    goteras: { estado: 'pendiente' },
    piscinas: { estado: 'pendiente', urlExterna: '' },
    comunidades: { estado: 'pendiente' },
  },

  /* ---------- Diferenciales ---------- */
  // Solo se publican los que tengan confirmado: true. Deben ser concretos y verificables.
  differentiators: [
    {
      titulo: 'Primero el diagnóstico',
      texto: 'Antes de hablar de productos buscamos el origen del agua. La solución depende de lo que encontremos.',
      confirmado: true, // Coincide con el método de trabajo definido para la marca
    },
    {
      titulo: 'Opciones explicadas, con sus límites',
      texto: 'Te contamos qué alternativas tiene sentido valorar, qué resuelve cada una y qué no.',
      confirmado: true,
    },
    {
      titulo: 'Propuesta por escrito con partidas',
      texto: 'Alcance, sistema propuesto y lo que incluye y no incluye, separado para que puedas comparar.',
      confirmado: false, // PENDIENTE: confirmar que siempre se entrega así
    },
    {
      titulo: 'Comprobaciones acordadas al terminar',
      texto: 'Antes de cerrar el trabajo hacemos las comprobaciones que hayamos acordado y te las mostramos.',
      confirmado: true,
    },
  ],

  /* ---------- Reseñas ---------- */
  // Solo reseñas auténticas y verificables (texto literal, autor tal como aparece, fecha y enlace a la fuente).
  // { autor: 'Nombre o inicial', texto: '...', fecha: '2026-05-01', fuente: 'Google', url: 'https://...' }
  // No se genera marcado de estrellas con reseñas propias.
  reviews: [],

  /* ---------- Equipo / empresa ---------- */
  team: {
    // Texto real sobre quién está detrás (trayectoria, formación, forma de trabajar). PENDIENTE.
    intro: '',
    // { nombre: '', cargo: '', texto: '', foto: { src, width, height, alt } }
    members: [],
  },

  /* ---------- Precios ---------- */
  // Publica importes SOLO si son reales. Cada fila necesita alcance, condiciones e indicación de impuestos.
  // { concepto: 'Revisión ...', importe: 'XX €', alcance: '...', condiciones: '...', impuestos: 'IVA no incluido' }
  prices: [],

  /* ---------- Formulario ---------- */
  form: {
    // 'netlify'  → Netlify Forms (sin credenciales; solo funciona alojado en Netlify)
    // 'endpoint' → cualquier servicio que acepte POST (Formspree, Getform, función propia...)
    // ''         → sin conexión: el formulario NO envía y lo dice claramente (solo pruebas)
    provider: '',
    endpoint: '', // Para provider 'endpoint', p. ej. 'https://formspree.io/f/XXXXXX'
    turnstileSiteKey: '', // Opcional: Cloudflare Turnstile (requiere validar el token en el servidor)
  },

  /* ---------- Medición ---------- */
  analytics: {
    gtmId: '',                 // 'GTM-XXXXXXX'. Si está vacío no se carga nada ni aparece aviso de cookies
    searchConsoleToken: '',    // Contenido de la meta google-site-verification (o verifica por DNS)
  },

  /* ---------- Google ---------- */
  google: {
    businessProfileUrl: '',    // Enlace al Perfil de Empresa existente (para sameAs y "Cómo llegar")
    reviewUrl: '',             // Enlace para pedir reseñas (se usa en la documentación, no en la web)
  },

  /* ---------- Redes (solo perfiles reales y activos) ---------- */
  social: {
    instagram: '',
    facebook: '',
  },

  /* ---------- Datos legales (LSSI / RGPD) ---------- */
  legal: {
    owner: '',      // Titular: nombre y apellidos o razón social
    nif: '',        // NIF / CIF
    address: '',    // Domicilio a efectos legales
    email: '',      // Correo para ejercer derechos de protección de datos
    registry: '',   // Datos registrales si es sociedad (opcional según forma jurídica)
  },

  /* ---------- Fotografías ---------- */
  // Generadas con: node tools/fotos.js (desde fotos/originales). stock: true = imagen de recurso
  // de ambientación: nunca se presenta como obra de la empresa.
  photos: {
    hero: null, // { name: 'portada', alt: '...', stock: false }
  },
};
