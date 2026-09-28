// Lógica pura del juego (sin DOM). Se usa en el navegador y en los tests de Node.
(function (root) {
  'use strict';

  // Regla 2: piezas de 2, 4, 8 y 16 casillas, cada una con su color.
  // Casi todas se construyen con bloques de 2 para que encajen entre sí.
  const DEFS = [
    { id: 'D2', name: 'Dominó', color: '#ffd166', shape: ['XX'] },
    { id: 'I4', name: 'Barra 4', color: '#4cc9f0', shape: ['XXXX'] },
    { id: 'O4', name: 'Cuadro 2', color: '#f28482', shape: ['XX', 'XX'] },
    { id: 'L4', name: 'Ele', color: '#90be6d', shape: ['X.', 'X.', 'XX'] },
    { id: 'T4', name: 'Te', color: '#b388eb', shape: ['XXX', '.X.'] },
    { id: 'S4', name: 'Ese', color: '#f8961e', shape: ['.XX', 'XX.'] },
    { id: 'R8', name: 'Bloque 2×4', color: '#43aa8b', shape: ['XXXX', 'XXXX'] },
    { id: 'I8', name: 'Barra 8', color: '#7b9acc', shape: ['XXXXXXXX'] },
    { id: 'L8', name: 'Ele gruesa', color: '#ef476f', shape: ['XX..', 'XX..', 'XXXX'] },
    { id: 'T8', name: 'Te gruesa', color: '#06d6a0', shape: ['XXXX', '.XX.', '.XX.'] },
    { id: 'U8', name: 'U', color: '#ffafcc', shape: ['X..X', 'X..X', 'XXXX'] },
    { id: 'Q16', name: 'Cuadro 4', color: '#e76f51', shape: ['XXXX', 'XXXX', 'XXXX', 'XXXX'] },
    { id: 'R16', name: 'Bloque 2×8', color: '#8ecae6', shape: ['XXXXXXXX', 'XXXXXXXX'] },
    { id: 'L16', name: 'Ele grande', color: '#c77dff', shape: ['XX....', 'XX....', 'XXXXXX', 'XXXXXX'] },
    { id: 'S16', name: 'Escalón', color: '#a3b18a', shape: ['XXXX..', 'XXXX..', '..XXXX', '..XXXX'] },
  ];

  // Regla 3: nada de azar. Lo que se ofrece depende de la pieza elegida antes.
  // Cada pieza "llama" a las que mejor la complementan para cerrar cuadrados.
  const NEXT = {
    D2: ['O4', 'T4', 'I4'],
    I4: ['O4', 'L8', 'U8'],
    O4: ['I4', 'L8', 'U8'],
    L4: ['D2', 'T4', 'S4'],
    T4: ['D2', 'L4', 'T8'],
    S4: ['L4', 'T4', 'R8'],
    R8: ['Q16', 'I4', 'L8'],
    I8: ['R8', 'L16', 'D2'],
    L8: ['O4', 'I4', 'R8'],
    T8: ['D2', 'I4', 'S4'],
    U8: ['O4', 'I4', 'T8'],
    Q16: ['R16', 'S16', 'D2'],
    R16: ['Q16', 'I8', 'L16'],
    L16: ['R8', 'O4', 'S16'],
    S16: ['O4', 'L16', 'R8'],
  };
  const FIRST_OFFER = ['D2', 'O4', 'L8'];
  const OFFER_SIZE = 3;
  // Una pieza usada no vuelve a ofrecerse hasta pasados estos turnos.
  const NO_REPEAT = 3;

  function parseShape(rows) {
    const cells = [];
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) if (row[x] === 'X') cells.push([x, y]);
    });
    return cells;
  }

  function normalize(cells) {
    const minX = Math.min(...cells.map((c) => c[0]));
    const minY = Math.min(...cells.map((c) => c[1]));
    return cells
      .map(([x, y]) => [x - minX, y - minY])
      .sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  }

  // Giro de 90° en sentido horario.
  function rotate(cells) {
    const h = Math.max(...cells.map((c) => c[1])) + 1;
    return normalize(cells.map(([x, y]) => [h - 1 - y, x]));
  }

  const PIECES = {};
  DEFS.forEach((d) => {
    const base = normalize(parseShape(d.shape));
    const rotations = [base];
    for (let r = 1; r < 4; r++) rotations.push(rotate(rotations[r - 1]));
    PIECES[d.id] = { ...d, area: base.length, rotations };
  });

  function shapeOf(typeId, rot) {
    const cells = PIECES[typeId].rotations[((rot % 4) + 4) % 4];
    const w = Math.max(...cells.map((c) => c[0])) + 1;
    const h = Math.max(...cells.map((c) => c[1])) + 1;
    return { cells, w, h };
  }

  function computeOffer(lastId, history) {
    if (!lastId) return FIRST_OFFER.slice();
    const recent = new Set(history.slice(-NO_REPEAT));
    const out = [];
    const take = (id) => {
      if (!recent.has(id) && !out.includes(id)) out.push(id);
    };
    NEXT[lastId].forEach(take);
    // Relleno determinista: recorre el catálogo a partir de la última pieza.
    let i = DEFS.findIndex((d) => d.id === lastId);
    while (out.length < OFFER_SIZE) {
      i = (i + 1) % DEFS.length;
      take(DEFS[i].id);
    }
    return out.slice(0, OFFER_SIZE);
  }

  // Regla 1: las dimensiones de la cuadrícula son múltiplos de `multiple`.
  // Prueba tamaños de casilla entre minCell y maxCell. Entre los que cubren
  // casi toda la pantalla, se queda con el que da más casillas.
  function gridDims(availW, availH, multiple, minCell, maxCell = minCell * 2) {
    const minCells = Math.max(multiple, Math.ceil(8 / multiple) * multiple);
    const fit = (px, c) => Math.max(minCells, Math.floor(px / c / multiple) * multiple);
    const options = [];
    for (let c = maxCell; c >= minCell; c--) {
      const cols = fit(availW, c);
      const rows = fit(availH, c);
      const cell = Math.max(4, Math.floor(Math.min(availW / cols, availH / rows)));
      options.push({ cols, rows, cell, cover: cols * rows * cell * cell });
    }
    const maxCover = Math.max(...options.map((o) => o.cover));
    const best = options
      .filter((o) => o.cover >= maxCover * 0.85)
      .sort((a, b) => b.cols * b.rows - a.cols * a.rows || b.cover - a.cover)[0];
    return { cols: best.cols, rows: best.rows, cell: best.cell };
  }

  function newGame(cols, rows) {
    return {
      cols,
      rows,
      grid: new Int32Array(cols * rows),
      pieces: new Map(),
      nextId: 1,
      history: [],
      offer: computeOffer(null, []),
      score: 0,
      squares: 0,
      turns: 0,
      over: false,
    };
  }

  function fits(state, cells, ox, oy) {
    for (const [x, y] of cells) {
      const X = ox + x;
      const Y = oy + y;
      if (X < 0 || Y < 0 || X >= state.cols || Y >= state.rows) return false;
      if (state.grid[Y * state.cols + X] !== 0) return false;
    }
    return true;
  }

  function canFitAnywhere(state, typeId) {
    for (let r = 0; r < 4; r++) {
      const { cells, w, h } = shapeOf(typeId, r);
      for (let oy = 0; oy + h <= state.rows; oy++) {
        for (let ox = 0; ox + w <= state.cols; ox++) {
          if (fits(state, cells, ox, oy)) return true;
        }
      }
    }
    return false;
  }

  // Un cuadrado es "exacto" si está lleno, tiene al menos 2 piezas y
  // ninguna de ellas asoma fuera del cuadrado.
  function checkSquare(state, x0, y0, k) {
    const { cols, grid, pieces } = state;
    const ids = new Set();
    for (let y = y0; y < y0 + k; y++) {
      for (let x = x0; x < x0 + k; x++) {
        const v = grid[y * cols + x];
        if (v === 0) return null;
        ids.add(v);
      }
    }
    if (ids.size < 2) return null;
    for (const id of ids) {
      for (const idx of pieces.get(id).cells) {
        const x = idx % cols;
        const y = (idx - x) / cols;
        if (x < x0 || x >= x0 + k || y < y0 || y >= y0 + k) return null;
      }
    }
    return { x: x0, y: y0, size: k, ids: [...ids] };
  }

  // Busca el mayor cuadrado exacto que contenga la pieza recién colocada.
  function findSquare(state, pieceId) {
    const { cols, rows } = state;
    const cells = state.pieces.get(pieceId).cells;
    const xs = cells.map((i) => i % cols);
    const ys = cells.map((i) => Math.floor(i / cols));
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const need = Math.max(maxX - minX + 1, maxY - minY + 1, 2);
    for (let k = Math.min(cols, rows); k >= need; k--) {
      for (let y0 = Math.max(0, maxY - k + 1); y0 <= Math.min(minY, rows - k); y0++) {
        for (let x0 = Math.max(0, maxX - k + 1); x0 <= Math.min(minX, cols - k); x0++) {
          const sq = checkSquare(state, x0, y0, k);
          if (sq) return sq;
        }
      }
    }
    return null;
  }

  function place(state, typeId, rot, ox, oy) {
    if (state.over || !state.offer.includes(typeId)) return null;
    const { cells } = shapeOf(typeId, rot);
    if (!fits(state, cells, ox, oy)) return null;

    const piece = PIECES[typeId];
    const id = state.nextId++;
    const idxs = cells.map(([x, y]) => (oy + y) * state.cols + (ox + x));
    idxs.forEach((i) => (state.grid[i] = id));
    state.pieces.set(id, { type: typeId, color: piece.color, cells: idxs });

    let gained = piece.area;
    const square = findSquare(state, id);
    let cleared = [];
    if (square) {
      // Regla 4: el cuadrado desaparece y libera espacio.
      for (const pid of square.ids) {
        const p = state.pieces.get(pid);
        p.cells.forEach((i) => {
          state.grid[i] = 0;
          cleared.push({ idx: i, color: p.color });
        });
        state.pieces.delete(pid);
      }
      gained += square.size * square.size * square.ids.length;
      state.squares++;
    }

    state.score += gained;
    state.turns++;
    state.history.push(typeId);
    state.offer = computeOffer(typeId, state.history);
    state.over = !state.offer.some((t) => canFitAnywhere(state, t));
    return { id, square, cleared, gained };
  }

  function freeRatio(state) {
    let free = 0;
    for (let i = 0; i < state.grid.length; i++) if (state.grid[i] === 0) free++;
    return free / state.grid.length;
  }

  const api = {
    DEFS,
    NEXT,
    PIECES,
    NO_REPEAT,
    shapeOf,
    computeOffer,
    gridDims,
    newGame,
    fits,
    canFitAnywhere,
    findSquare,
    place,
    freeRatio,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Logic = api;
})(typeof window !== 'undefined' ? window : globalThis);
