// Lógica pura del juego (sin DOM). Se usa en el navegador y en los tests de Node.
(function (root) {
  'use strict';

  // Piezas de 2, 4, 8 y 16 casillas, cada una con su color.
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

  // Nada es al azar: lo que se ofrece depende de la pieza elegida antes.
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
  const NO_REPEAT = 3; // una pieza usada no vuelve hasta pasados 3 turnos
  const MIN_SQUARE = 3; // lado mínimo de un cuadrado que explota
  const COMBO_GRACE = 3; // jugadas sin explotar antes de perder la racha
  const MAX_STARS = 3;
  const STAR_CELLS = 16; // limpiar esto de golpe da una estrella
  const CLEAN_BONUS = 500;
  const SIZES = [8, 16];

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

  // Lo que se ofrecería después de elegir cada pieza de la oferta actual.
  function upcoming(state) {
    return state.offer.map((t) => computeOffer(t, state.history.concat(t)));
  }

  const GEM_COLOR = '#d9d4ff';

  // level: { n, gems: [idx], moves, par, start } para el modo Retos.
  function newGame(size, level = null) {
    const state = {
      size,
      grid: new Int32Array(size * size),
      colors: {},
      nextId: 1,
      history: [],
      offer: computeOffer(null, []),
      score: 0,
      combo: 0,
      grace: 0,
      stars: 1,
      clears: 0,
      turns: 0,
      over: false,
      won: false,
      level: null,
      gemId: 0,
      gems: 0,
      movesLeft: 0,
    };
    if (level) {
      state.level = level.n;
      state.gemId = state.nextId++;
      state.colors[state.gemId] = GEM_COLOR;
      level.gems.forEach((i) => (state.grid[i] = state.gemId));
      state.gems = level.gems.length;
      state.movesLeft = level.moves;
      if (level.start) state.offer = computeOffer(level.start, [level.start]);
    }
    return state;
  }

  function isGem(state, idx) {
    return state.gemId !== 0 && state.grid[idx] === state.gemId;
  }

  function fits(state, cells, ox, oy) {
    const n = state.size;
    for (const [x, y] of cells) {
      const X = ox + x;
      const Y = oy + y;
      if (X < 0 || Y < 0 || X >= n || Y >= n) return false;
      if (state.grid[Y * n + X] !== 0) return false;
    }
    return true;
  }

  function canFitAnywhere(state, typeId) {
    for (let r = 0; r < 4; r++) {
      const { cells, w, h } = shapeOf(typeId, r);
      for (let oy = 0; oy + h <= state.size; oy++) {
        for (let ox = 0; ox + w <= state.size; ox++) {
          if (fits(state, cells, ox, oy)) return true;
        }
      }
    }
    return false;
  }

  // Todas las casillas de cuadrados llenos (lado >= 3, al menos 2 piezas)
  // que tocan alguna de las casillas `placed`.
  function findClears(state, placed) {
    const n = state.size;
    const grid = state.grid;
    // Suma acumulada de casillas ocupadas para saber en O(1) si un cuadrado está lleno.
    const S = new Int32Array((n + 1) * (n + 1));
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        S[(y + 1) * (n + 1) + x + 1] =
          (grid[y * n + x] ? 1 : 0) + S[y * (n + 1) + x + 1] + S[(y + 1) * (n + 1) + x] - S[y * (n + 1) + x];
      }
    }
    const filled = (x0, y0, k) =>
      S[(y0 + k) * (n + 1) + x0 + k] - S[y0 * (n + 1) + x0 + k] - S[(y0 + k) * (n + 1) + x0] + S[y0 * (n + 1) + x0] ===
      k * k;
    const pts = placed.map((i) => [i % n, Math.floor(i / n)]);
    const minX = Math.min(...pts.map((p) => p[0]));
    const maxX = Math.max(...pts.map((p) => p[0]));
    const minY = Math.min(...pts.map((p) => p[1]));
    const maxY = Math.max(...pts.map((p) => p[1]));

    const cells = new Set();
    let biggest = 0;
    for (let k = MIN_SQUARE; k <= n; k++) {
      for (let y0 = Math.max(0, minY - k + 1); y0 <= Math.min(maxY, n - k); y0++) {
        for (let x0 = Math.max(0, minX - k + 1); x0 <= Math.min(maxX, n - k); x0++) {
          if (!pts.some(([x, y]) => x >= x0 && x < x0 + k && y >= y0 && y < y0 + k)) continue;
          if (!filled(x0, y0, k)) continue;
          const first = grid[y0 * n + x0];
          let mixed = false;
          for (let y = y0; y < y0 + k && !mixed; y++) {
            for (let x = x0; x < x0 + k; x++) {
              if (grid[y * n + x] !== first) {
                mixed = true;
                break;
              }
            }
          }
          if (!mixed) continue;
          biggest = Math.max(biggest, k);
          for (let y = y0; y < y0 + k; y++) for (let x = x0; x < x0 + k; x++) cells.add(y * n + x);
        }
      }
    }
    return { cells: [...cells], biggest };
  }

  // Qué casillas explotarían si se colocara la pieza ahí (sin cambiar el estado).
  function previewClears(state, typeId, rot, ox, oy) {
    const { cells } = shapeOf(typeId, rot);
    if (!fits(state, cells, ox, oy)) return null;
    const idxs = cells.map(([x, y]) => (oy + y) * state.size + (ox + x));
    idxs.forEach((i) => (state.grid[i] = state.nextId));
    const res = findClears(state, idxs);
    idxs.forEach((i) => (state.grid[i] = 0));
    return res.cells;
  }

  function isStuck(state) {
    return !state.offer.some((t) => canFitAnywhere(state, t));
  }

  function updateOver(state) {
    if (state.level && state.gems === 0) state.won = true;
    state.over =
      state.won || (state.level !== null && state.movesLeft <= 0) || (state.stars === 0 && isStuck(state));
  }

  function afterChoice(state, typeId) {
    state.turns++;
    state.history.push(typeId);
    if (state.history.length > 20) state.history.shift();
    state.offer = computeOffer(typeId, state.history);
    if (state.level) state.movesLeft--;
    updateOver(state);
  }

  // Quita casillas del tablero y descuenta las gemas liberadas.
  function removeCells(state, idxs) {
    const out = [];
    for (const i of idxs) {
      const v = state.grid[i];
      if (!v) continue;
      if (v === state.gemId) state.gems--;
      out.push({ idx: i, color: state.colors[v], gem: v === state.gemId });
      state.grid[i] = 0;
    }
    return out;
  }

  function place(state, typeId, rot, ox, oy) {
    if (state.over || !state.offer.includes(typeId)) return null;
    const { cells } = shapeOf(typeId, rot);
    if (!fits(state, cells, ox, oy)) return null;

    const piece = PIECES[typeId];
    const id = state.nextId++;
    state.colors[id] = piece.color;
    const idxs = cells.map(([x, y]) => (oy + y) * state.size + (ox + x));
    idxs.forEach((i) => (state.grid[i] = id));

    let gained = piece.area;
    const found = findClears(state, idxs);
    const cleared = removeCells(state, found.cells);
    const gemsFreed = cleared.filter((c) => c.gem).length;
    let starGained = false;
    let boardClean = false;
    if (cleared.length) {
      state.combo++;
      state.grace = COMBO_GRACE;
      gained += cleared.length * 5 * state.combo + gemsFreed * 20;
      state.clears++;
      if (cleared.length >= STAR_CELLS && state.stars < MAX_STARS) {
        state.stars++;
        starGained = true;
      }
      if (state.grid.every((v) => v === 0)) {
        boardClean = true;
        gained += CLEAN_BONUS;
      }
    } else if (state.grace > 0 && --state.grace === 0) {
      state.combo = 0;
    }

    state.score += gained;
    afterChoice(state, typeId);
    return {
      id,
      type: typeId,
      idxs,
      cleared,
      gemsFreed,
      biggest: found.biggest,
      gained,
      combo: state.combo,
      starGained,
      boardClean,
    };
  }

  // Poderes: no gastan jugada.
  function bomb(state, cx, cy) {
    const n = state.size;
    const idxs = [];
    for (let y = cy - 1; y <= cy + 1; y++) {
      for (let x = cx - 1; x <= cx + 1; x++) if (x >= 0 && y >= 0 && x < n && y < n) idxs.push(y * n + x);
    }
    return usePower(state, idxs);
  }

  function hammer(state, idx) {
    return usePower(state, [idx]);
  }

  function usePower(state, idxs) {
    if (state.won) return null;
    const cleared = removeCells(state, idxs);
    if (!cleared.length) return null;
    const gained = cleared.length * 3;
    state.score += gained;
    updateOver(state);
    return { cleared, gemsFreed: cleared.filter((c) => c.gem).length, gained };
  }

  // Gasta una estrella para "elegir" una pieza sin colocarla.
  function discard(state, typeId) {
    if (state.stars <= 0 || !state.offer.includes(typeId)) return false;
    state.stars--;
    afterChoice(state, typeId);
    return true;
  }

  function fillRatio(state) {
    let used = 0;
    for (let i = 0; i < state.grid.length; i++) if (state.grid[i]) used++;
    return used / state.grid.length;
  }

  // ---------- Progreso del jugador (entre partidas) ----------
  const POWERS = ['bomb', 'hammer', 'undo'];
  const MISSIONS = [
    { type: 'clears', base: 5, step: 5, sum: true, text: (n) => `Haz ${n} explosiones` },
    { type: 'combo', base: 3, step: 1, text: (n) => `Consigue una racha ×${n}` },
    { type: 'square', base: 4, step: 1, max: 8, text: (n) => `Explota un cuadrado de ${n}×${n}` },
    { type: 'cells', base: 18, step: 6, text: (n) => `Limpia ${n} casillas de una vez` },
    { type: 'score', base: 800, step: 700, text: (n) => `Llega a ${n} puntos en una partida` },
    { type: 'big', base: 3, step: 2, sum: true, text: (n) => `Coloca ${n} piezas de 16` },
    { type: 'clean', base: 1, step: 1, sum: true, text: (n) => `Deja el tablero vacío ${n} ${n > 1 ? 'veces' : 'vez'}` },
    { type: 'gems', base: 10, step: 10, sum: true, text: (n) => `Libera ${n} gemas en Retos` },
  ];
  const ACTIVE_MISSIONS = 3;

  function missionAt(i) {
    const t = MISSIONS[i % MISSIONS.length];
    const tier = Math.floor(i / MISSIONS.length);
    let target = t.base + t.step * tier;
    if (t.max) target = Math.min(t.max, target);
    return { id: i, type: t.type, target, progress: 0, text: t.text(target), reward: POWERS[i % POWERS.length] };
  }

  function xpForLevel(level) {
    return 300 + level * 200;
  }

  function newProfile() {
    return {
      xp: 0,
      level: 1,
      powers: { bomb: 1, hammer: 2, undo: 1 },
      missions: [0, 1, 2].map(missionAt),
      nextMission: ACTIVE_MISSIONS,
      levelStars: {},
      best: 0,
    };
  }

  // Aplica una jugada al perfil. Devuelve las misiones completadas y subidas de nivel.
  function recordMove(profile, state, res) {
    const done = [];
    for (const m of profile.missions) {
      const t = MISSIONS.find((x) => x.type === m.type);
      let v = 0;
      if (m.type === 'clears') v = res.cleared.length ? 1 : 0;
      else if (m.type === 'combo') v = res.combo || 0;
      else if (m.type === 'square') v = res.biggest || 0;
      else if (m.type === 'cells') v = res.cleared.length;
      else if (m.type === 'score') v = state.score;
      else if (m.type === 'big') v = res.type && PIECES[res.type].area === 16 ? 1 : 0;
      else if (m.type === 'clean') v = res.boardClean ? 1 : 0;
      else if (m.type === 'gems') v = res.gemsFreed || 0;
      m.progress = t.sum ? m.progress + v : Math.max(m.progress, v);
      if (m.progress >= m.target) done.push(m);
    }
    for (const m of done) {
      profile.powers[m.reward] = (profile.powers[m.reward] || 0) + 1;
      profile.xp += 150;
      const i = profile.missions.indexOf(m);
      profile.missions[i] = missionAt(profile.nextMission++);
    }
    const levelUps = addXp(profile, res.gained || 0);
    if (!state.level) profile.best = Math.max(profile.best, state.score);
    return { done, levelUps };
  }

  function addXp(profile, xp) {
    profile.xp += xp;
    const ups = [];
    while (profile.xp >= xpForLevel(profile.level)) {
      profile.xp -= xpForLevel(profile.level);
      profile.level++;
      const gift = POWERS[profile.level % POWERS.length];
      profile.powers[gift] = (profile.powers[gift] || 0) + 1;
      ups.push({ level: profile.level, gift });
    }
    return ups;
  }

  // Estrellas de un reto superado: 3 si iguala la marca, 2 si va cerca, 1 si no.
  function levelStars(level, movesUsed) {
    if (movesUsed <= level.par) return 3;
    if (movesUsed <= level.par + Math.ceil((level.moves - level.par) / 2)) return 2;
    return 1;
  }

  function serialize(state) {
    return JSON.stringify({ ...state, grid: Array.from(state.grid) });
  }

  function deserialize(text) {
    const s = JSON.parse(text);
    if (!SIZES.includes(s.size) || !Array.isArray(s.grid) || s.grid.length !== s.size * s.size) return null;
    if (!Array.isArray(s.offer) || !s.offer.every((t) => PIECES[t])) return null;
    s.grid = Int32Array.from(s.grid);
    return s;
  }

  const api = {
    DEFS,
    NEXT,
    PIECES,
    NO_REPEAT,
    MIN_SQUARE,
    COMBO_GRACE,
    MAX_STARS,
    STAR_CELLS,
    SIZES,
    POWERS,
    MISSIONS,
    GEM_COLOR,
    shapeOf,
    computeOffer,
    isGem,
    isStuck,
    bomb,
    hammer,
    missionAt,
    xpForLevel,
    newProfile,
    recordMove,
    addXp,
    levelStars,
    upcoming,
    newGame,
    fits,
    canFitAnywhere,
    findClears,
    previewClears,
    place,
    discard,
    fillRatio,
    serialize,
    deserialize,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Logic = api;
})(typeof window !== 'undefined' ? window : globalThis);
