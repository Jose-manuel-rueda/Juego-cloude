# Informe de entrega: primera versión

## 1. Qué está implementado

**Web completa y navegable** (20 páginas en la versión de pruebas, 17 en producción con los servicios que se confirmen):

| Página | URL | Intención |
|---|---|---|
| Inicio | `/` | Impermeabilizaciones en Granada |
| Terrazas | `/impermeabilizacion-terrazas-granada/` | Contratar impermeabilización de terrazas |
| Cubiertas | `/impermeabilizacion-cubiertas-granada/` | Contratar impermeabilización de cubiertas y tejados |
| Goteras y filtraciones | `/reparacion-goteras-granada/` | Resolver entradas de agua (incluye filtración / condensación / capilaridad) |
| Piscinas | `/impermeabilizacion-piscinas-granada/` | Impermeabilizar una piscina |
| Comunidades | `/impermeabilizaciones-comunidades-granada/` | Comunidades y administradores |
| Precios | `/precio-impermeabilizacion-granada/` | Entender costes y pedir presupuesto (sin importes inventados) |
| Trabajos | `/trabajos/` | Solo se publica cuando exista un caso real con fotos autorizadas |
| Empresa | `/sobre-nosotros/` | Conocer a los profesionales |
| Contacto | `/contacto/` | Solicitar valoración |
| Consejos | `/consejos/` + 4 guías | Cada guía apoya a una página comercial |
| Legales | `/aviso-legal/`, `/privacidad/`, `/cookies/` | LSSI / RGPD (`noindex`) |
| 404 y gracias | `/404.html`, `/gracias/` | `noindex` |

No se ha unificado ninguna página: Goteras (problema), Terrazas/Cubiertas (elemento) y Comunidades (tipo de cliente) responden a búsquedas y necesidades distintas.

**Contenido**: todos los textos están redactados. Cada servicio explica problemas, señales, qué se revisa (soporte, pendientes, desagües, juntas, encuentros, impermeabilización existente), opciones con sus límites, qué incluye y qué depende de la revisión, cómo se prepara el presupuesto, factores de precio, preguntas frecuentes y siguiente paso. No se recomienda ningún producto universal ni se promete trabajar sin levantar el pavimento.

**Diseño**: identidad provisional tipográfica (Bricolage Grotesque + Figtree, alojadas en la propia web), paleta clara / antracita / azul profundo en variables CSS. Como no hay fotos reales, la imagen visual son **esquemas técnicos propios** (terraza, cubierta, humedades, piscina, edificio) marcados como ilustrativos. El sistema de fotos (WebP a 3 tamaños, dimensiones fijas, carga diferida) está listo para cuando haya fotos reales.

**Conversión**: barra inferior en móvil (Llamar / WhatsApp) que se oculta al escribir en un formulario y no tapa contenido; WhatsApp con mensaje según el servicio («Hola, necesito valorar una impermeabilización en [tu localidad]. El problema está en la terraza. Puedo enviar fotos.»); en Contacto, botón que compone el mensaje de WhatsApp con lo escrito en el formulario; formulario de 4 campos obligatorios + correo opcional, validación con mensajes claros, campo trampa, tiempo mínimo, Turnstile opcional, información de privacidad junto al botón, y confirmación **solo** con respuesta correcta del servidor.

**SEO técnico**: título y descripción únicos, un H1 por página, encabezados ordenados, canonical absoluto, `sitemap.xml` y `robots.txt` en producción, 404 propia, `_redirects` (URLs cortas y antiguas habituales → páginas nuevas), Open Graph con imagen 1200×630, datos estructurados `HomeAndConstructionBusiness` (solo datos reales: nombre, Padul, zona y, cuando existan, teléfono, correo y perfiles), `Service`, `BlogPosting` y `BreadcrumbList`. Sin valoraciones ni estrellas en el marcado.

**Pruebas frente a producción**: la versión de pruebas lleva `noindex` (meta y cabecera), muestra la lista de datos pendientes y marca los botones sin dato. La de producción **no se genera** mientras falte un dato obligatorio y publica solo servicios, diferenciales, casos y artículos confirmados.

**Medición**: GTM con Consent Mode v2 (denegado por defecto) y aviso de cookies solo si se configura `gtmId`. Eventos separados: `form_submit_success`, `form_submit_error`, `click_call`, `click_whatsapp` (con ubicación del botón).

## 2. Qué se ha probado realmente

`node tests/check.js`: **1.948 comprobaciones, 0 fallos**. La producción se probó con datos **ficticios** de test (`tests/fixture-config.js`), nunca publicados.

- La producción se niega a generarse con la configuración real actual.
- Estático (pruebas y producción): un H1, longitud y unicidad de títulos y descripciones, canonical, `noindex` correcto según versión, jerarquía de encabezados, `alt` y dimensiones de imágenes, ids únicos, etiquetas de campos, enlaces internos y anclas, JSON-LD válido y sin valoraciones, ausencia de marcadores pendientes en producción, servicio no confirmado (piscinas en el test) sin páginas ni enlaces, Trabajos ausente sin casos, sitemap solo con URLs indexables, cabeceras `X-Robots-Tag`.
- Navegador (Chromium) a 390, 768 y 1366 px en todas las páginas: código 200, sin desbordamiento horizontal, sin errores de consola. 404 real para URLs inexistentes y redirección `/terrazas`.
- Menú móvil y submenú, navegación a un servicio, enlaces `tel:` y `wa.me` con el mensaje del servicio, barra inferior sin tapar el pie y oculta al escribir.
- Formulario: errores con envío vacío, `aria-invalid`, correo opcional validado, **error del servidor (500) sin confirmación**, envío correcto (200) con confirmación y datos recibidos, campo trampa que bloquea sin confirmar.
- Eventos `click_call`, `click_whatsapp`, `form_submit_success` y `form_submit_error` en `dataLayer`.
- Teclado (primer Tab al enlace «Saltar al contenido», submenú con Enter y Escape), movimiento reducido (contenido visible sin animación) y contenido y menú disponibles sin JavaScript.
- Build con `gtmId` de prueba: consentimiento denegado por defecto, aviso de cookies y política de cookies con detalle.

**Rendimiento: medición de laboratorio**, no datos de usuarios reales. Móvil emulado con 4× ralentización de CPU, red de unos 1,6 Mbps y 150 ms de latencia, mediana de 3 cargas:

| Página | LCP | CLS | Interacción (abrir menú) | Peso transferido |
|---|---|---|---|---|
| Inicio | ~0,93 s | 0,000 | ~40 ms | ~173 KB |
| Terrazas | ~0,97 s | 0,000 | ~32 ms | ~172 KB |
| Contacto | ~0,90 s | 0,000 | ~40 ms | ~156 KB |

Los datos de campo (CrUX/PageSpeed) solo existirán cuando la web esté publicada y tenga tráfico suficiente.

**No probado**: envío real a Netlify Forms o Formspree (no hay cuenta), llamada y WhatsApp desde un teléfono físico, Safari/iOS y Firefox, lectores de pantalla reales, competencia (red bloqueada, ver `COMPETENCIA.md`).

## 3. Datos y conexiones que faltan

Todos están en `config/site.js`. La franja amarilla de la versión de pruebas los lista.

**Obligatorios para publicar**: dominio (`siteUrl`), teléfono, WhatsApp, conexión del formulario, titular, NIF, domicilio y correo legal, y confirmar qué servicios se prestan de verdad (ahora los 5 están en `pendiente`).

**Recomendados**: localidades reales atendidas, texto real del equipo (página Empresa), horario si es real, logotipo oficial, enlace al Perfil de Empresa de Google, ID de GTM, fotos reales y primeros casos, reseñas verificables.

**Afirmaciones de los textos que conviene confirmar** antes de marcar un servicio como `confirmado` (no son datos inventados, pero son compromisos de método):
- «Visita cuando haga falta» y «pruebas de confirmación del origen cuando es posible» (Terrazas, Goteras).
- Diferencial «Propuesta por escrito con partidas» (ahora `confirmado: false`, no se publica).
- Comunidades: propuesta escrita para la junta, coordinación de accesos y avisos a vecinos, fotografías del proceso.
- Cubiertas: si se trabaja también en tejados de teja.
- Piscinas: alcance real (reparación localizada, revestimientos, lámina armada). Si las piscinas se atienden desde granadapiscinas.es, usar `services.piscinas.urlExterna` para no duplicar.

## 4. Antes de publicar

1. Completar los datos obligatorios y confirmar servicios.
2. Decidir el dominio. Si ya existen ruema.es o granadapiscinas.es, hacer inventario de URLs y redirecciones 301 antes del cambio (ver `PLAN-LANZAMIENTO.md`, A).
3. Conectar el formulario y enviar una solicitud real de prueba desde móvil.
4. Probar llamada y WhatsApp en un teléfono real (Android e iPhone).
5. Revisar que nombre y teléfono coinciden exactamente con el Perfil de Empresa de Google.
6. `node build.js --production` y `node tests/check.js` sin errores.
7. Tras publicar: comprobar que la versión pública no lleva `noindex`, verificar Search Console y enviar el sitemap.
8. Revisión legal de los textos de aviso legal, privacidad y cookies por quien asesore a la empresa.

## 5. Primeros 30 días

- Search Console y GTM/GA4 con eventos clave separados (formulario / llamada / WhatsApp). Hoja de registro de consultas con origen, servicio y resultado.
- Perfil de Empresa completo y coherente con la web, con enlace UTM.
- Documentar 2–3 obras reales con la plantilla de casos (fotos autorizadas).
- Pedir reseña a cada cliente satisfecho al terminar el trabajo.
- Si se activa Google Ads: campaña de búsqueda por servicios confirmados, ubicación por presencia, negativas de empleo, formación y bricolaje, presupuesto de prueba calculado con el Planificador (ver `PLAN-LANZAMIENTO.md`, C). Revisar términos de búsqueda cada semana.
- Hacer la revisión de competencia desde Granada (`COMPETENCIA.md`) y ajustar textos según las dudas reales que lleguen.
