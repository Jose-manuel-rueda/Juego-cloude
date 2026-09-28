// Genera levels.js: retos con gemas que un bot sencillo ha resuelto de verdad.
// Uso: node tools/gen-levels.js
const fs = require('fs');
const path = require('path');
const L = require('../logic.js');
const { bestMove } = require('./bot.js');

const COUNT = 30;
const SIZE = 8;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeGems(n, rand) {
  const want = Math.min(26, 3 + Math.floor(n * 0.8));
  const set = new Set();
  let guard = 0;
  while (set.size < want && guard++ < 500) {
    const w = rand() < 0.5 ? 1 : 2;
    const h = rand() < 0.5 ? 1 : 2;
    const x0 = Math.floor(rand() * (SIZE - w + 1));
    const y0 = Math.floor(rand() * (SIZE - h + 1));
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (set.size < want) set.add(y * SIZE + x);
  }
  return [...set].sort((a, b) => a - b);
}

function solve(level) {
  const s = L.newGame(SIZE, { ...level, moves: 999 });
  for (let k = 0; k < 80 && !s.won; k++) {
    const m = bestMove(s);
    if (!m) {
      if (s.stars > 0) L.discard(s, s.offer[0]);
      else return null;
      continue;
    }
    L.place(s, m.t, m.r, m.ox, m.oy);
  }
  return s.won ? s.turns : null;
}

const levels = [];
for (let n = 1; n <= COUNT; n++) {
  let made = null;
  for (let attempt = 0; attempt < 40 && !made; attempt++) {
    const rand = rng(n * 7919 + attempt * 104729);
    const gems = makeGems(Math.max(1, n - Math.floor(attempt / 4)), rand);
    const start = L.DEFS[(n * 5) % L.DEFS.length].id;
    const level = { n, gems, start };
    const par = solve(level);
    if (par) made = { ...level, par, moves: par + Math.max(3, Math.ceil(par * 0.35)) };
  }
  if (!made) throw new Error('No se pudo generar el nivel ' + n);
  levels.push(made);
  console.log(`nivel ${n}: ${made.gems.length} gemas, marca ${made.par}, jugadas ${made.moves}`);
}

// Orden por dificultad para que la curva sea suave.
levels.sort((a, b) => a.par + a.gems.length / 2 - (b.par + b.gems.length / 2));
levels.forEach((l, i) => (l.n = i + 1));

const out =
  '// Generado por tools/gen-levels.js; no editar a mano.\n' +
  '(function (root) {\n  const LEVELS = ' +
  JSON.stringify(levels) +
  ";\n  if (typeof module !== 'undefined' && module.exports) module.exports = LEVELS;\n  else root.LEVELS = LEVELS;\n" +
  "})(typeof window !== 'undefined' ? window : globalThis);\n";
fs.writeFileSync(path.join(__dirname, '..', 'levels.js'), out);
