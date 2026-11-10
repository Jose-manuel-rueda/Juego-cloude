# Plan de lanzamiento y captación

## A. Publicación

**Antes de publicar (bloqueante)**
1. Dominio definitivo y HTTPS. Si ya existen **ruema.es** o **granadapiscinas.es**:
   - Decidir qué dominio aloja esta web. Si sustituye a una web existente, hacer un inventario de sus URLs actuales (Search Console → Páginas, o rastreo) y añadir una redirección 301 por cada URL con tráfico o enlaces a su equivalente nueva en `_redirects` **antes** del cambio.
   - Si las piscinas siguen en granadapiscinas.es, poner su URL en `services.piscinas.urlExterna`: no se genera la página duplicada y los enlaces llevan a esa web.
2. Rellenar en `config/site.js`: teléfono, WhatsApp, datos legales, servicios confirmados, localidades reales, horario (si es real).
3. Conectar el formulario y **enviar al menos una solicitud real** desde móvil y escritorio; confirmar que llega al correo de quien atiende.
4. Probar desde un móvil real: llamada, WhatsApp con mensaje prellenado, barra inferior, menú.
5. `node build.js --production` sin errores y `node tests/check.js` en verde.
6. **Perfil de Empresa de Google**: revisar que nombre, teléfono y web coinciden exactamente con la web. Si es empresa de área de servicio, ocultar la dirección y definir la zona. No crear fichas nuevas si ya existe una (reclamarla o unificarla).
7. Tras publicar: comprobar que la versión pública **no** lleva `noindex` (`curl -I` y código fuente) y que la de pruebas sí.

**Protección de la versión de pruebas**: ya lleva `noindex` en meta y cabecera. Para más seguridad, protegerla con contraseña (Netlify: Password protection; Cloudflare: Access).

## B. Medición

1. **Search Console**: verificar el dominio por DNS (o `analytics.searchConsoleToken`), enviar `sitemap.xml`, revisar indexación a los 7 días.
2. **Google Tag Manager** (`analytics.gtmId`): la web ya envía los eventos y gestiona el consentimiento (Consent Mode v2, denegado por defecto).
3. En GTM crear:
   - Etiqueta de Google (GA4).
   - Eventos GA4 para `form_submit_success`, `click_call`, `click_whatsapp` (parámetro `link_location`).
   - Marcar como **eventos clave** por separado. Importarlos a Google Ads como conversiones: *Formulario enviado* (principal), *Clic en llamar* y *Clic en WhatsApp* (secundarias hasta comprobar su calidad).
   - Si se usa Google Ads con teléfono en anuncios, activar el seguimiento de llamadas desde anuncios.
4. **Un clic no es un cliente.** Llevar una hoja sencilla con cada consulta recibida: fecha, canal (formulario / llamada / WhatsApp), origen (orgánico / anuncio / Perfil de Empresa / recomendación), servicio, localidad, ¿cualificada? (zona y servicio que se presta), ¿presupuesto enviado?, importe, ¿contratado?
5. Revisar cada mes: consultas cualificadas, presupuestos, trabajos contratados y **coste por trabajo contratado** = inversión ÷ trabajos contratados.

## C. Publicidad de búsqueda (borrador, sin activar)

**Configuración común**
- Red de Búsqueda únicamente (sin Display ni socios de búsqueda al inicio).
- Ubicación: Granada capital y los municipios realmente atendidos (radio o lista). Opción **«Presencia: personas que están o suelen estar en las ubicaciones»** (no «interés»).
- Idioma: español. Horario: cuando haya alguien para atender llamadas y WhatsApp.
- Conversión principal: formulario enviado. Llamadas y WhatsApp como secundarias.
- Puja inicial: maximizar clics con CPC máximo limitado durante 2–4 semanas para reunir datos; después, maximizar conversiones cuando haya al menos ~15–30 conversiones/mes.
- Activar solo los grupos de servicios **confirmados**.

**Estructura: una campaña, un grupo por servicio, cada uno con su página**

| Grupo | Página de destino | Palabras clave (concordancia de frase / exacta) |
|---|---|---|
| Terrazas | /impermeabilizacion-terrazas-granada/ | "impermeabilizar terraza granada", "impermeabilización de terrazas granada", "empresa impermeabilizar terraza", "filtración terraza vecino de abajo", "reparar terraza filtraciones" |
| Cubiertas | /impermeabilizacion-cubiertas-granada/ | "impermeabilización cubiertas granada", "impermeabilizar azotea granada", "reparar cubierta plana", "impermeabilizar tejado granada" |
| Goteras | /reparacion-goteras-granada/ | "reparar goteras granada", "reparación de goteras", "filtraciones de agua techo", "empresa de goteras granada" |
| Piscinas | /impermeabilizacion-piscinas-granada/ | "impermeabilizar piscina granada", "piscina pierde agua reparación", "reparar piscina gresite granada" |
| Comunidades | /impermeabilizaciones-comunidades-granada/ | "impermeabilización comunidad de vecinos", "filtraciones comunidad de propietarios granada", "impermeabilizar cubierta comunidad" |

**Palabras clave negativas (lista compartida)**
- Empleo y formación: empleo, trabajo, oferta, ofertas, curso, cursos, formación, oposiciones, sueldo, salario, prácticas.
- Bricolaje y materiales: bricomart, leroy, leroy merlin, brico, comprar, venta, tienda, precio pintura, pintura impermeabilizante, lámina asfáltica precio, sika, kit, cómo hacer, tutorial, youtube, casero, manual.
- Otros: gratis, segunda mano, pdf, wikipedia, definición, qué es.
- Ajustar «precio»: **no** excluirlo (busca quien quiere contratar), pero sí términos de compra de producto.
- Revisar el informe de términos de búsqueda cada semana el primer mes.

**Anuncios (adaptables, sin promesas no verificadas)**

*Terrazas*
- Títulos (≤30): «Impermeabilizar tu terraza» · «Terrazas con filtraciones» · «Revisamos sumideros y juntas» · «Primero el diagnóstico» · «Granada y área metropolitana» · «Envía fotos por WhatsApp» · «Pide tu valoración» · «Agua en el piso de abajo»
- Descripciones (≤90): «Localizamos por dónde entra el agua antes de proponer la solución para tu terraza.» · «Cuéntanos el problema y envía fotos. Te explicamos las opciones y sus límites.»

*Cubiertas*
- Títulos: «Impermeabilizar cubiertas» · «Azoteas y cubiertas planas» · «Lámina agrietada o despegada» · «Revisamos remates y desagües» · «Granada y área metropolitana» · «Pide tu valoración»
- Descripciones: «Revisamos la cubierta y te explicamos si basta reparar o conviene renovar.» · «Envía fotos de la cubierta y del techo afectado. Te decimos qué hay que revisar.»

*Goteras*
- Títulos: «Goteras y filtraciones» · «Localizamos el origen» · «¿Gotera al llover?» · «Filtración o condensación» · «Envía fotos por WhatsApp» · «Pide tu valoración»
- Descripciones: «La mancha es el síntoma. Buscamos por dónde entra el agua para que no vuelva.» · «Si no es una filtración te lo diremos. Cuéntanos cuándo aparece la humedad.»

*Comunidades*
- Títulos: «Comunidades de vecinos» · «Propuestas para la junta» · «Cubiertas comunitarias» · «Para administradores de fincas» · «Pide tu valoración»
- Descripciones: «Propuesta escrita con alternativas y alcance claro para que la comunidad decida.» · «Revisamos la zona afectada y coordinamos accesos con la comunidad.»

*Recursos*: extensión de llamada (con el teléfono real), enlaces de sitio (Precios, Contacto, Consejos, cada servicio), texto destacado «Diagnóstico previo», «Granada y área metropolitana». **No** usar «presupuesto gratis», «sin compromiso», «urgencias 24 h», años de experiencia ni garantías hasta que estén confirmados.

**Inversión de prueba**
No hay datos reales de coste por clic en esta sesión, así que no se fija una cifra. Método:
1. En el Planificador de palabras clave (cuenta de Google Ads, ubicación Granada) anotar la «puja por la parte superior de la página (rango alto)» de las palabras de cada grupo confirmado.
2. Presupuesto mensual de prueba ≈ CPC estimado × **clics objetivo**. Como referencia de decisión: unos 150–200 clics al mes en total permiten ver si llegan consultas con una tasa de conversión normal.
3. Mantener 6–8 semanas sin cambios bruscos y decidir con los datos de la hoja de consultas (coste por consulta cualificada y por trabajo contratado), no con los clics.

## D. Primeros 90 días

**Días 1–30**
- Publicar y verificar (sección A). Enviar sitemap.
- Perfil de Empresa: completar servicios confirmados, zona, horario real, fotos propias de obras y enlace a la web con parámetro UTM (`?utm_source=google&utm_medium=organic&utm_campaign=gbp`).
- Documentar **2–3 obras reales** con la plantilla (fotos antes/durante/después con autorización).
- Pedir reseña a cada cliente satisfecho al terminar, con el enlace directo del Perfil (`google.reviewUrl`). Sin incentivos ni filtrado de clientes.
- Activar la campaña de búsqueda (si se decide) con los grupos confirmados.
- Revisar términos de búsqueda semanalmente; ampliar negativas.

**Días 31–60**
- Añadir a cada página de servicio las preguntas reales que hagan los clientes en llamadas y WhatsApp.
- Publicar 1–2 consejos nuevos que respondan dudas comerciales recibidas (p. ej. «Qué hacer si la filtración viene de la terraza del vecino»).
- Revisar en Search Console las búsquedas por las que aparecemos y ajustar títulos/descripciones de las páginas con muchas impresiones y pocos clics.
- Añadir las primeras reseñas reales a `config.reviews` (con enlace a la fuente).

**Días 61–90**
- Con 5 o más casos de una misma zona, valorar una página local con contenido propio (casos, particularidades). No crear páginas que solo cambien el municipio.
- Cambiar la puja a maximizar conversiones si hay volumen suficiente.
- Informe trimestral: consultas cualificadas por canal, presupuestos, contratados, coste de adquisición, páginas con más consultas.
