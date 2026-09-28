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

const LEVELS = require('../levels.js');

test('hay 30 retos y cada uno tiene gemas y jugadas de sobra', () => {
  assert.strictEqual(LEVELS.length, 30);
  for (const lv of LEVELS) {
    assert.ok(lv.gems.length > 0);
    assert.ok(lv.moves > lv.par);
  }
});

test('liberar todas las gemas gana el reto', () => {
  const lv = { n: 1, gems: [0, 1], moves: 5, par: 2 };
  const s = L.newGame(8, lv);
  assert.strictEqual(s.gems, 2);
  // gemas en (0,0) y (1,0): un O4 debajo y una barra de 2x... completan un 3x3 con I4 y D2
  put(s, 'D2', 0, 2, 0); // fila 0 llena de 0..3? x=2,3
  put(s, 'I4', 0, 0, 1);
  const res = put(s, 'I4', 0, 0, 2);
  assert.ok(res.gemsFreed >= 2);
  assert.ok(s.won && s.over);
});

test('en un reto, quedarse sin jugadas termina la partida', () => {
  const s = L.newGame(8, { n: 1, gems: [63], moves: 1, par: 1 });
  put(s, 'D2', 0, 0, 0);
  assert.ok(s.over && !s.won);
});

test('bomba y martillo quitan casillas sin gastar jugada', () => {
  const s = L.newGame(8, { n: 1, gems: [9, 10], moves: 5, par: 1 });
  const b = L.bomb(s, 1, 1);
  assert.strictEqual(b.cleared.length, 2);
  assert.ok(s.won);
  const t = L.newGame(8);
  put(t, 'O4', 0, 0, 0);
  assert.strictEqual(L.hammer(t, 0).cleared.length, 1);
  assert.strictEqual(L.hammer(t, 0), null);
});

test('misiones dan poderes y se reemplazan', () => {
  const p = L.newProfile();
  const bombs = p.powers.bomb;
  const s = L.newGame(8);
  const m = p.missions.find((x) => x.type === 'clears');
  m.progress = m.target - 1;
  put(s, 'R8', 0, 0, 0);
  const res = put(s, 'R8', 0, 0, 2);
  const out = L.recordMove(p, s, res);
  assert.strictEqual(out.done.length >= 1, true);
  assert.ok(p.missions.every((x) => x.progress < x.target));
  assert.ok(Object.values(p.powers).reduce((a, b) => a + b) > bombs);
});

test('subir de nivel regala un poder', () => {
  const p = L.newProfile();
  const total = () => Object.values(p.powers).reduce((a, b) => a + b);
  const before = total();
  const ups = L.addXp(p, L.xpForLevel(1));
  assert.strictEqual(ups.length, 1);
  assert.strictEqual(p.level, 2);
  assert.strictEqual(total(), before + 1);
});

test('estrellas de reto según jugadas', () => {
  const lv = { par: 10, moves: 16 };
  assert.strictEqual(L.levelStars(lv, 9), 3);
  assert.strictEqual(L.levelStars(lv, 13), 2);
  assert.strictEqual(L.levelStars(lv, 16), 1);
});

console.log(`\n${passed} tests OK`);
