// Ejecutar con: node tests/logic.test.js
const assert = require('assert');
const L = require('../logic.js');

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log('ok -', name);
}

// Coloca sin importar la oferta (para preparar tableros de prueba).
function put(s, type, rot, x, y) {
  s.offer = [type];
  const r = L.place(s, type, rot, x, y);
  assert.ok(r, `no se pudo colocar ${type} en ${x},${y}`);
  return r;
}

test('todas las piezas tienen 2, 4, 8 o 16 casillas', () => {
  for (const d of L.DEFS) assert.ok([2, 4, 8, 16].includes(L.PIECES[d.id].area), d.id);
});

test('los colores no se repiten', () => {
  const colors = L.DEFS.map((d) => d.color);
  assert.strictEqual(new Set(colors).size, colors.length);
});

test('los tableros son múltiplos de 8', () => {
  for (const n of L.SIZES) assert.strictEqual(n % 8, 0);
});

test('la oferta es determinista y no repite piezas recientes', () => {
  const a = L.computeOffer('O4', ['D2', 'I4', 'O4']);
  assert.deepStrictEqual(a, L.computeOffer('O4', ['D2', 'I4', 'O4']));
  assert.strictEqual(a.length, 3);
  for (const id of ['D2', 'I4', 'O4']) assert.ok(!a.includes(id), id);
});

test('la oferta depende de la pieza anterior', () => {
  assert.notDeepStrictEqual(L.computeOffer('D2', ['D2']), L.computeOffer('Q16', ['Q16']));
});

test('upcoming coincide con lo que se ofrece tras colocar', () => {
  const s = L.newGame(8);
  const next = L.upcoming(s);
  const type = s.offer[1];
  L.place(s, type, 0, 0, 0);
  assert.deepStrictEqual(s.offer, next[1]);
});

test('dos piezas que forman un 4x4 explotan', () => {
  const s = L.newGame(8);
  put(s, 'R8', 0, 0, 0);
  const res = put(s, 'R8', 0, 0, 2);
  assert.strictEqual(res.cleared.length, 16);
  assert.strictEqual(res.biggest, 4);
  assert.ok(res.boardClean);
  assert.strictEqual(L.fillRatio(s), 0);
});

test('un cuadrado 3x3 explota aunque las piezas sobresalgan', () => {
  const s = L.newGame(8);
  put(s, 'I4', 0, 0, 0); // fila 0, x 0..3
  put(s, 'I4', 0, 0, 1); // fila 1
  const res = put(s, 'I4', 0, 0, 2); // fila 2 -> 4x3 lleno: dos 3x3 -> 12 casillas
  assert.strictEqual(res.cleared.length, 12);
});

test('una sola pieza no explota sola', () => {
  const s = L.newGame(8);
  const res = put(s, 'Q16', 0, 0, 0);
  assert.strictEqual(res.cleared.length, 0);
});

test('la racha multiplica y se pierde tras 3 jugadas sin explotar', () => {
  const s = L.newGame(8);
  put(s, 'R8', 0, 0, 0);
  put(s, 'R8', 0, 0, 2);
  assert.strictEqual(s.combo, 1);
  put(s, 'D2', 0, 6, 6);
  put(s, 'D2', 0, 6, 7);
  assert.strictEqual(s.combo, 1);
  put(s, 'D2', 0, 0, 7);
  assert.strictEqual(s.combo, 0);
});

test('limpiar 16 casillas da una estrella y descartar la gasta', () => {
  const s = L.newGame(8);
  assert.strictEqual(s.stars, 1);
  put(s, 'R8', 0, 0, 0);
  put(s, 'R8', 0, 0, 2);
  assert.strictEqual(s.stars, 2);
  const before = s.offer.slice();
  assert.ok(L.discard(s, before[0]));
  assert.strictEqual(s.stars, 1);
  assert.deepStrictEqual(s.offer, L.computeOffer(before[0], s.history));
});

test('previewClears no cambia el tablero', () => {
  const s = L.newGame(8);
  put(s, 'R8', 0, 0, 0);
  const snap = Array.from(s.grid);
  const cells = L.previewClears(s, 'R8', 0, 0, 2);
  assert.strictEqual(cells.length, 16);
  assert.deepStrictEqual(Array.from(s.grid), snap);
});

test('no se puede colocar encima, fuera ni piezas no ofrecidas', () => {
  const s = L.newGame(8);
  put(s, 'O4', 0, 0, 0);
  s.offer = ['D2'];
  assert.strictEqual(L.place(s, 'D2', 0, 1, 1), null);
  assert.strictEqual(L.place(s, 'D2', 0, 7, 0), null);
  assert.strictEqual(L.place(s, 'Q16', 0, 4, 4), null);
});

test('guardar y cargar la partida', () => {
  const s = L.newGame(16);
  put(s, 'T8', 1, 3, 3);
  const t = L.deserialize(L.serialize(s));
  assert.deepStrictEqual(Array.from(t.grid), Array.from(s.grid));
  assert.strictEqual(t.score, s.score);
  assert.strictEqual(L.deserialize('{"size":5}'), null);
});

test('fin de partida solo sin estrellas y sin hueco', () => {
  const s = L.newGame(8);
  s.grid.fill(99);
  s.grid[0] = 0;
  s.offer = ['I4'];
  s.stars = 0;
  s.colors[99] = '#fff';
  L.discard(s, 'I4'); // sin estrellas no hace nada
  s.offer = ['Q16', 'R16', 'L16'];
  assert.strictEqual(s.offer.some((t) => L.canFitAnywhere(s, t)), false);
});

console.log(`\n${passed} tests OK`);
