# Web RueMa Impermeabilizaciones

Web estática generada con Node.js (sin dependencias). Todo el contenido sale en HTML; el JavaScript (12 KB) solo añade el menú, el formulario, la medición y las animaciones.

## Uso rápido

```bash
node build.js                 # versión de pruebas → dist/ (noindex, marca los datos pendientes)
node build.js --production    # versión pública → dist/ (se niega a generarse si falta algún dato obligatorio)
node tests/check.js           # comprobaciones completas (SEO, enlaces, accesibilidad, formulario, móvil…)
```

Para verla en local: `python3 -m http.server 8080 -d dist` y abrir http://localhost:8080

## Dónde se edita cada cosa

| Quiero cambiar… | Archivo |
|---|---|
| Nombre, teléfono, WhatsApp, correo, horario, datos legales, logotipo | `config/site.js` |
| Qué servicios se publican (y si alguno vive en otra web) | `config/site.js` → `services` |
| Localidades donde se trabaja | `config/site.js` → `serviceArea.localities` |
| Reseñas reales, precios reales, equipo | `config/site.js` → `reviews`, `prices`, `team` |
| Textos de las páginas de servicio | `content/servicios.js` |
| Artículos de consejos | `content/consejos.js` |
| Trabajos documentados | `content/casos/*.json` (copiar `_plantilla.json`) |
| Colores y tipografía | `src/assets/styles.css` (variables en `:root`) |
| Portada, precios, empresa, contacto, legales | `build.js` |

### Logotipo oficial
Copia el archivo (SVG preferiblemente) a `src/assets/img/logo.svg` e indica en `config/site.js`:
`logo: { src: '/assets/img/logo.svg', width: 180, height: 48 }` con sus proporciones reales. Se muestra sin recortar ni deformar. Después ejecuta `node tools/og.js` para regenerar la imagen de compartir.

### Fotografías
1. Copia las fotos originales (JPG/PNG) a `fotos/originales/` con un nombre descriptivo, p. ej. `terraza-armilla-antes.jpg`.
2. Ejecuta `node tools/fotos.js` → genera WebP a 480/960/1600 px y guarda sus dimensiones.
3. Úsalas por su nombre (`terraza-armilla-antes`) en un caso de `content/casos/` o en `config/site.js → photos.hero`.

Las fotos de recurso (no propias) solo pueden usarse como ambientación, con `stock: true`, y nunca en Trabajos.

### Publicar un trabajo
Copia `content/casos/_plantilla.json`, rellena problema inicial, localidad, diagnóstico, intervención y resultado comprobado. Se publica solo con `"publicado": true` y todas las fotos con `"autorizada": true` (permiso del cliente por escrito). La sección Trabajos aparece en menú y portada automáticamente al existir el primer caso.

## Versión de pruebas y producción

- **Pruebas** (`node build.js`): todas las páginas llevan `noindex` (meta y cabecera `X-Robots-Tag`), una franja amarilla lista los datos pendientes y los enlaces sin dato aparecen con borde discontinuo. El formulario avisa de que no está conectado y no simula envíos.
- **Producción** (`--production`): exige dominio, teléfono, WhatsApp, formulario conectado, datos legales y al menos un servicio confirmado. Solo publica servicios `confirmado`, diferenciales confirmados, casos autorizados y artículos cuyo servicio se publica. Genera `sitemap.xml`, `robots.txt`, `_headers` y `_redirects`.

## Alojamiento

Preparado para **Netlify** (`netlify.toml`, directorio base `web-ruema`) o **Cloudflare Pages** (comando `node build.js --production`, salida `dist`). Ambos interpretan `_headers`, `_redirects` y sirven `404.html` con código 404.

### Formulario
- `form.provider: 'netlify'` → Netlify Forms, sin credenciales (activa la detección de formularios en el panel y las notificaciones por correo).
- `form.provider: 'endpoint'` + `form.endpoint` → cualquier servicio que acepte POST y responda 2xx (Formspree, Getform, función propia).
- La confirmación solo se muestra cuando el servidor responde correctamente. Antispam: campo trampa, tiempo mínimo y, opcional, Cloudflare Turnstile (`form.turnstileSiteKey`; requiere validar el token en el servidor).

### Medición
Con `analytics.gtmId` se carga Google Tag Manager en modo de consentimiento (denegado por defecto) y aparece el aviso de cookies. Eventos enviados a `dataLayer`, por separado:
`form_submit_success`, `form_submit_error`, `click_call`, `click_whatsapp` (con `link_location`: hero, mobile-bar, header, footer, cta…).

Documentación de entrega y plan de lanzamiento: carpeta [`docs/`](docs/).
