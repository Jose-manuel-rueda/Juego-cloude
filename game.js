// Interfaz: dibujo en canvas, ratón / táctil / teclado.
(function () {
  'use strict';
  const L = window.Logic;

  const $ = (id) => document.getElementById(id);
  const canvas = $('board');
  const ctx = canvas.getContext('2d');
  const wrap = $('board-wrap');
  const offerEl = $('offer');
  const multipleEl = $('multiple');

  const BEST_KEY = 'cuadricula-best';
  const FLASH_MS = 450;

  let state;
  let cell = 24;
  let multiple = 8;
  let selected = 0;
  let rot = 0;
  let hover = null; // {x, y} casilla bajo el cursor
  let flashes = []; // animaciones de cuadrados que desaparecen
  let touch = { armed: false, down: null, placeOnUp: false };

  function readBest() {
    try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch (e) { return 0; }
  }
  function writeBest(v) {
    try { localStorage.setItem(BEST_KEY, String(v)); } catch (e) { /* sin almacenamiento */ }
  }

  function availSize() {
    const cs = getComputedStyle(wrap);
    const w = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const h = wrap.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    return { w: Math.max(w, 100), h: Math.max(h, 100) };
  }

  function minCell() {
    return Math.min(window.innerWidth, window.innerHeight) < 600 ? 18 : 22;
  }

  function newGame() {
    multiple = Number(multipleEl.value);
    // Pinta primero la oferta para que el panel tenga su tamaño real al medir.
    state = L.newGame(multiple, multiple);
    selected = 0;
    renderOffer();
    const { w, h } = availSize();
    const dims = L.gridDims(w, h, multiple, minCell());
    state = L.newGame(dims.cols, dims.rows);
    selected = 0;
    rot = 0;
    hover = null;
    flashes = [];
    touch.armed = false;
    resize();
    renderOffer();
    updateStats();
  }

  // Al cambiar el tamaño de la ventana solo se reescala la casilla.
  function resize() {
    const { w, h } = availSize();
    cell = Math.max(4, Math.floor(Math.min(w / state.cols, h / state.rows)));
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = state.cols * cell + 'px';
    canvas.style.height = state.rows * cell + 'px';
    canvas.width = Math.round(state.cols * cell * dpr);
    canvas.height = Math.round(state.rows * cell * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function currentType() {
    return state.offer[selected];
  }

  // La pieza se centra bajo el cursor.
  function placement() {
    if (!hover) return null;
    const { cells, w, h } = L.shapeOf(currentType(), rot);
    const ox = hover.x - Math.floor((w - 1) / 2);
    const oy = hover.y - Math.floor((h - 1) / 2);
    return { cells, ox, oy, ok: L.fits(state, cells, ox, oy) };
  }

  function drawPieceCells(g, list, size, colorOf, sameAs) {
    // list: [{x, y}], sameAs(a, b) indica si dos casillas son de la misma pieza
    const gap = Math.max(1, Math.round(size * 0.06));
    const key = (x, y) => x + ',' + y;
    const map = new Map(list.map((c) => [key(c.x, c.y), c]));
    for (const c of list) {
      g.fillStyle = colorOf(c);
      const px = c.x * size;
      const py = c.y * size;
      g.fillRect(px + gap, py + gap, size - 2 * gap, size - 2 * gap);
      const r = map.get(key(c.x + 1, c.y));
      const d = map.get(key(c.x, c.y + 1));
      const rd = map.get(key(c.x + 1, c.y + 1));
      if (r && sameAs(c, r)) g.fillRect(px + size - gap, py + gap, 2 * gap, size - 2 * gap);
      if (d && sameAs(c, d)) g.fillRect(px + gap, py + size - gap, size - 2 * gap, 2 * gap);
      if (r && d && rd && sameAs(c, r) && sameAs(c, d) && sameAs(c, rd)) {
        g.fillRect(px + size - gap, py + size - gap, 2 * gap, 2 * gap);
      }
    }
  }

  function draw() {
    const { cols, rows, grid, pieces } = state;
    const W = cols * cell;
    const H = rows * cell;
    ctx.fillStyle = '#10162a';
    ctx.fillRect(0, 0, W, H);

    // Líneas de la cuadrícula: finas por casilla, gruesas cada 4 y cada "múltiplo".
    for (let i = 0; i <= Math.max(cols, rows); i++) {
      const major = i % multiple === 0;
      const mid = i % 4 === 0;
      ctx.strokeStyle = major ? '#3a4668' : mid ? '#232c46' : '#182038';
      ctx.lineWidth = major ? 2 : 1;
      if (i <= cols) {
        ctx.beginPath();
        ctx.moveTo(i * cell + 0.5, 0);
        ctx.lineTo(i * cell + 0.5, H);
        ctx.stroke();
      }
      if (i <= rows) {
        ctx.beginPath();
        ctx.moveTo(0, i * cell + 0.5);
        ctx.lineTo(W, i * cell + 0.5);
        ctx.stroke();
      }
    }

    // Piezas colocadas
    const placed = [];
    for (let i = 0; i < grid.length; i++) {
      if (grid[i]) placed.push({ x: i % cols, y: Math.floor(i / cols), id: grid[i] });
    }
    drawPieceCells(ctx, placed, cell, (c) => pieces.get(c.id).color, (a, b) => a.id === b.id);

    // Vista previa
    const p = !state.over && placement();
    if (p) {
      const color = p.ok ? L.PIECES[currentType()].color : '#ff4d4d';
      ctx.globalAlpha = p.ok ? 0.55 : 0.4;
      const ghost = p.cells
        .map(([x, y]) => ({ x: p.ox + x, y: p.oy + y }))
        .filter((c) => c.x >= 0 && c.y >= 0 && c.x < cols && c.y < rows);
      drawPieceCells(ctx, ghost, cell, () => color, () => true);
      ctx.globalAlpha = 1;
    }

    // Destello de cuadrados que desaparecen
    const now = performance.now();
    flashes = flashes.filter((f) => now - f.t0 < FLASH_MS);
    for (const f of flashes) {
      const t = (now - f.t0) / FLASH_MS;
      ctx.globalAlpha = 1 - t;
      drawPieceCells(ctx, f.cells, cell, (c) => c.color, () => true);
      ctx.globalAlpha = (1 - t) * 0.8;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      const s = f.square;
      ctx.strokeRect(s.x * cell + 1.5, s.y * cell + 1.5, s.size * cell - 3, s.size * cell - 3);
      ctx.globalAlpha = 1;
    }
    if (flashes.length) requestAnimationFrame(draw);
  }

  function renderOffer() {
    offerEl.innerHTML = '';
    const small = window.matchMedia('(max-aspect-ratio: 1/1), (max-width: 700px)').matches;
    const box = small ? 56 : 120;
    state.offer.forEach((typeId, i) => {
      const piece = L.PIECES[typeId];
      const r = i === selected ? rot : 0;
      const { cells, w, h } = L.shapeOf(typeId, r);
      const size = Math.max(4, Math.floor(Math.min(box / w, box / h, small ? 12 : 20)));
      const card = document.createElement('div');
      card.className = 'card' + (i === selected ? ' selected' : '');
      if (!L.canFitAnywhere(state, typeId)) card.classList.add('blocked');
      const c = document.createElement('canvas');
      const dpr = window.devicePixelRatio || 1;
      c.width = w * size * dpr;
      c.height = h * size * dpr;
      c.style.width = w * size + 'px';
      c.style.height = h * size + 'px';
      const g = c.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawPieceCells(g, cells.map(([x, y]) => ({ x, y })), size, () => piece.color, () => true);
      const name = document.createElement('div');
      name.className = 'name';
      name.innerHTML = small
        ? `<b>${piece.area}</b>`
        : `<kbd>${i + 1}</kbd> ${piece.name} · <b>${piece.area}</b>`;
      card.append(c, name);
      card.addEventListener('click', () => select(i));
      offerEl.append(card);
    });
  }

  function select(i) {
    if (i < 0 || i >= state.offer.length) return;
    if (i !== selected) rot = 0;
    selected = i;
    renderOffer();
    draw();
  }

  function rotate() {
    rot = (rot + 1) % 4;
    renderOffer();
    draw();
  }

  function updateStats() {
    $('score').textContent = state.score;
    $('squares').textContent = state.squares;
    $('free').textContent = Math.round(L.freeRatio(state) * 100) + '%';
    const best = Math.max(readBest(), state.score);
    if (best > readBest()) writeBest(best);
    $('best').textContent = best;
  }

  function tryPlace() {
    const p = placement();
    if (!p || !p.ok) return false;
    const res = L.place(state, currentType(), rot, p.ox, p.oy);
    if (!res) return false;
    if (res.square) {
      flashes.push({
        t0: performance.now(),
        square: res.square,
        cells: res.cleared.map((c) => ({ x: c.idx % state.cols, y: Math.floor(c.idx / state.cols), color: c.color })),
      });
    }
    // Selecciona la primera pieza de la nueva oferta que quepa.
    selected = Math.max(0, state.offer.findIndex((t) => L.canFitAnywhere(state, t)));
    rot = 0;
    renderOffer();
    updateStats();
    draw();
    if (state.over) {
      $('final-score').textContent = state.score;
      setTimeout(() => $('gameover').showModal(), FLASH_MS);
    }
    return true;
  }

  function cellFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / cell);
    const y = Math.floor((e.clientY - rect.top) / cell);
    if (x < 0 || y < 0 || x >= state.cols || y >= state.rows) return null;
    return { x, y };
  }

  const same = (a, b) => a && b && a.x === b.x && a.y === b.y;

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  canvas.addEventListener('pointerdown', (e) => {
    const c = cellFromEvent(e);
    if (e.pointerType === 'mouse') {
      if (e.button === 2) return rotate();
      if (e.button === 0) {
        hover = c;
        tryPlace();
      }
      return;
    }
    // Táctil: primer toque muestra la pieza, segundo toque en el mismo sitio la coloca.
    canvas.setPointerCapture(e.pointerId);
    touch.down = c;
    touch.placeOnUp = touch.armed && same(c, hover);
    hover = c;
    draw();
  });

  canvas.addEventListener('pointermove', (e) => {
    const c = cellFromEvent(e);
    if (e.pointerType !== 'mouse') {
      if (!touch.down) return;
      if (!same(c, touch.down)) touch.placeOnUp = false;
    }
    if (!same(c, hover)) {
      hover = c;
      draw();
    }
  });

  canvas.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'mouse') return;
    if (touch.placeOnUp && tryPlace()) touch.armed = false;
    else touch.armed = !!hover;
    touch.down = null;
    touch.placeOnUp = false;
  });

  canvas.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse') {
      hover = null;
      draw();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (document.querySelector('dialog[open]')) return;
    if (e.key === 'r' || e.key === 'R') rotate();
    else if (e.key >= '1' && e.key <= '3') select(Number(e.key) - 1);
  });

  $('rotate').addEventListener('click', rotate);
  $('new').addEventListener('click', newGame);
  $('again').addEventListener('click', () => setTimeout(newGame, 0));
  multipleEl.addEventListener('change', newGame);
  $('help-btn').addEventListener('click', () => $('help').showModal());

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resize();
      renderOffer();
    }, 100);
  });

  $('best').textContent = readBest();
  newGame();
  $('help').showModal();
})();
