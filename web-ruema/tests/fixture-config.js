/* Configuración FICTICIA solo para tests: permite generar y verificar la versión de producción.
   Estos datos nunca se publican. */
const base = require('../config/site.js');
const clone = JSON.parse(JSON.stringify(base));
module.exports = Object.assign(clone, {
  siteUrl: 'https://www.ejemplo-pruebas.test',
  contact: { phone: '+34600000000', phoneDisplay: '600 00 00 00', whatsapp: '34600000000', email: 'pruebas@ejemplo-pruebas.test', hours: '' },
  legal: { owner: 'Titular de Pruebas', nif: '00000000T', address: 'Calle de Pruebas 1, Padul', email: 'pruebas@ejemplo-pruebas.test', registry: '' },
  form: { provider: 'endpoint', endpoint: '/__form', turnstileSiteKey: '' },
  services: { terrazas: { estado: 'confirmado' }, cubiertas: { estado: 'confirmado' }, goteras: { estado: 'confirmado' }, piscinas: { estado: 'pendiente', urlExterna: '' }, comunidades: { estado: 'confirmado' } },
});
