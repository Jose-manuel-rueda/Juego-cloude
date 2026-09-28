// Ejecutar con: node tests/logic.test.js
const assert = require('assert');
const L = require('../logic.js');

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log('ok -', name);
}

test('todas las piezas tienen 2, 4, 8 o 16 casillas', () => {
  for (const d of L.DEFS) assert.ok([2, 4, 8, 16].includes(L.PIECES[d.id].area), d.id);
});

test('los colores no se repiten', () => {
  const colors = L.DEFS.map((d) => d.color);
  assert.strictEqual(new Set(colors).size, colors.length);
});

test('la cuadrícula usa múltiplos del valor elegido', () => {
  for (const m of [4, 8, 16, 32]) {
    const { cols, rows } = L.gridDims(1280, 700, m, 28);
    assert.strictEqual(cols % m, 0);
    assert.strictEqual(rows % m, 0);
  }
});

test('la oferta es determinista y no repite piezas recientes', () => {
  const a = L.computeOffer('O4', ['D2', 'I4', 'O4']);
  const b = L.computeOffer('O4', ['D2', 'I4', 'O4']);
  assert.deepStrictEqual(a, b);
  assert.strictEqual(a.length, 3);
  for (const id of ['D2', 'I4', 'O4']) assert.ok(!a.includes(id), id);
});

test('la oferta depende de la pieza anterior', () => {
  assert.notDeepStrictEqual(L.computeOffer('D2', ['D2']), L.computeOffer('Q16', ['Q16']));
});

test('dos piezas que forman un cuadrado exacto desaparecen', () => {
  const s = L.newGame(8, 8);
  s.offer = ['O4', 'L8'];
  // L8 en (0,0) deja un hueco 2x2 arriba a la derecha y forma 4x3.
  assert.ok(L.place(s, 'L8', 0, 0, 0));
  s.offer = ['O4'];
  assert.ok(L.place(s, 'O4', 0, 2, 0));
  s.offer = ['I4'];
  const res = L.place(s, 'I4', 0, 0, 3);
  assert.ok(res.square, 'debería formar un 4x4');
  assert.strictEqual(res.square.size, 4);
  assert.strictEqual(L.freeRatio(s), 1);
});

test('una sola pieza cuadrada no cuenta como cuadrado', () => {
  const s = L.newGame(8, 8);
  s.offer = ['Q16'];
  const res = L.place(s, 'Q16', 0, 0, 0);
  assert.strictEqual(res.square, null);
});

test('un cuadrado lleno con una pieza asomando no es exacto', () => {
  const s = L.newGame(8, 8);
  s.offer = ['R8'];
  L.place(s, 'R8', 0, 0, 0); // 4x2 arriba
  s.offer = ['I8'];
  L.place(s, 'I8', 0, 0, 2); // barra de 8 que sobresale del 4x4
  s.offer = ['I4'];
  const res = L.place(s, 'I4', 0, 0, 3);
  assert.strictEqual(res.square, null);
});

test('no se puede colocar encima ni fuera', () => {
  const s = L.newGame(8, 8);
  s.offer = ['O4', 'D2'];
  assert.ok(L.place(s, 'O4', 0, 0, 0));
  s.offer = ['D2'];
  assert.strictEqual(L.place(s, 'D2', 0, 1, 1), null);
  assert.strictEqual(L.place(s, 'D2', 0, 7, 0), null);
});

test('solo se pueden colocar piezas ofrecidas', () => {
  const s = L.newGame(8, 8);
  assert.strictEqual(L.place(s, 'Q16', 0, 0, 0), null);
});

console.log(`\n${passed} tests OK`);
