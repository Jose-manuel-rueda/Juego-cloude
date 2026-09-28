// Bot voraz: elige la jugada que más gemas y casillas libera.
const L = require('../logic.js');

function bestMove(s) {
  const n = s.size;
  let best = null;
  for (const t of s.offer) {
    const seen = new Set();
    for (let r = 0; r < 4; r++) {
      const { cells, w, h } = L.shapeOf(t, r);
      const key = JSON.stringify(cells);
      if (seen.has(key)) continue;
      seen.add(key);
      for (let oy = 0; oy + h <= n; oy++) {
        for (let ox = 0; ox + w <= n; ox++) {
          const clears = L.previewClears(s, t, r, ox, oy);
          if (!clears) continue;
          const gems = clears.filter((i) => L.isGem(s, i)).length;
          let adj = 0;
          let gemAdj = 0;
          const mine = new Set(cells.map(([x, y]) => (oy + y) * n + ox + x));
          for (const [x, y] of cells) {
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const X = ox + x + dx;
              const Y = oy + y + dy;
              if (X < 0 || Y < 0 || X >= n || Y >= n) adj++;
              else if (!mine.has(Y * n + X) && s.grid[Y * n + X]) {
                adj++;
                if (L.isGem(s, Y * n + X)) gemAdj++;
              }
            }
          }
          const score = gems * 1000 + clears.length * 8 + adj * 2 + gemAdj * 6;
          if (!best || score > best.score) best = { t, r, ox, oy, score };
        }
      }
    }
  }
  return best;
}

module.exports = { bestMove };
