// Interfaz: tablero en canvas, bandeja con arrastrar y soltar, efectos y sonido.
(function () {
  'use strict';
  const L = window.Logic;
  const $ = (id) => document.getElementById(id);

  const canvas = $('board');
  const ctx = canvas.getContext('2d');
  const wrap = $('board-wrap');
  const fx = $('fx');
  const trayEl = $('tray');
  const floater = $('floater');
  const fctx = floater.getContext('2d');

  const KEY_GAME = 'cuadricula-v2-game';
  const KEY_BEST = 'cuadricula-v2-best';
  const KEY_SOUND = 'cuadricula-v2-sound';
  const KEY_HELP = 'cuadricula-v2-help';

  const store = {
    get(k) {
      try { return localStorage.getItem(k); } catch (e) { return null; }
    },
    set(k, v) {
      try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ }
    },
  };

  let state;
  let best = Number(store.get(KEY_BEST)) || 0;
  let cell = 32;
  let rots = [0, 0, 0];
  let drag = null;
  let discardMode = false;
  let anims = []; // {kind: 'pop'|'flash', cells, t0, dur}
  let particles = [];
  let raf = 0;

  // ---------- Sonido ----------
  let soundOn = store.get(KEY_SOUND) !== '0';
  let actx = null;
  function audio() {
    if (!soundOn) return null;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      return actx;
    } catch (e) {
      return null;
    }
  }
  function tone(freq, dur, type = 'sine', vol = 0.07, delay = 0) {
    const a = audio();
    if (!a) return;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.value = freq;
    const t = a.currentTime + delay;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  const sfx = {
    pick: () => tone(520, 0.05, 'triangle', 0.05),
    rotate: () => tone(700, 0.04, 'square', 0.025),
    place: (area) => tone(260 - area * 5, 0.09, 'triangle', 0.09),
    clear: (combo) => {
      const base = 440 * Math.pow(2, Math.min(combo - 1, 12) / 12);
      [0, 4, 7, 12].forEach((s, i) => tone(base * Math.pow(2, s / 12), 0.18, 'sine', 0.07, i * 0.06));
    },
    star: () => [1318, 1760].forEach((f, i) => tone(f, 0.25, 'sine', 0.05, 0.3 + i * 0.08)),
    over: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'triangle', 0.07, i * 0.15)),
  };
  function buzz(ms) {
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* no disponible */ }
  }

  // ---------- Dibujo ----------
  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  // Casilla tipo "caramelo": color, brillo arriba y sombra abajo.
  function block(g, x, y, s, color, scale = 1) {
    const pad = Math.max(1, s * 0.06);
    const sz = (s - 2 * pad) * scale;
    const px = x + (s - sz) / 2;
    const py = y + (s - sz) / 2;
    const r = sz * 0.22;
    g.fillStyle = color;
    roundRect(g, px, py, sz, sz, r);
    g.fill();
    g.fillStyle = 'rgba(0,0,0,.22)';
    roundRect(g, px + sz * 0.1, py + sz * 0.76, sz * 0.8, sz * 0.14, sz * 0.07);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)';
    roundRect(g, px + sz * 0.14, py + sz * 0.1, sz * 0.72, sz * 0.18, sz * 0.09);
    g.fill();
  }

  function drawShape(g, typeId, rot, size) {
    const { cells } = L.shapeOf(typeId, rot);
    const color = L.PIECES[typeId].color;
    cells.forEach(([x, y]) => block(g, x * size, y * size, size, color));
  }

  function sizeCanvas(c, g, w, h) {
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    c.style.width = w + 'px';
    c.style.height = h + 'px';
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function layout() {
    const n = state.size;
    const side = Math.max(n * 8, Math.min(wrap.clientWidth, wrap.clientHeight));
    cell = Math.floor(side / n);
    sizeCanvas(canvas, ctx, cell * n, cell * n);
    kick();
  }

  function kick() {
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function frame(now) {
    raf = 0;
    draw(now);
    if (anims.length || particles.length || (drag && drag.clears.length)) kick();
  }

  function draw(now = performance.now()) {
    const n = state.size;
    const W = n * cell;
    ctx.clearRect(0, 0, W, W);
    ctx.fillStyle = '#211d42';
    roundRect(ctx, 0, 0, W, W, Math.min(14, cell * 0.4));
    ctx.fill();

    // Casillas vacías y guías cada 4
    const popping = new Map();
    for (const a of anims) if (a.kind === 'pop') a.cells.forEach((i) => popping.set(i, a));
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const v = state.grid[y * n + x];
        if (!v) {
          const pad = cell * 0.12;
          ctx.fillStyle = (Math.floor(x / 4) + Math.floor(y / 4)) % 2 ? '#2c2757' : '#29244f';
          roundRect(ctx, x * cell + pad, y * cell + pad, cell - 2 * pad, cell - 2 * pad, cell * 0.18);
          ctx.fill();
        }
      }
    }
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const i = y * n + x;
        const v = state.grid[i];
        if (!v) continue;
        const a = popping.get(i);
        const t = a ? Math.min(1, (now - a.t0) / a.dur) : 1;
        const scale = a ? 0.7 + 0.3 * easeOutBack(t) : 1;
        block(ctx, x * cell, y * cell, cell, state.colors[v], scale);
      }
    }

    // Vista previa al arrastrar
    if (drag && drag.ok) {
      const { cells } = L.shapeOf(drag.type, drag.rot);
      ctx.globalAlpha = 0.45;
      cells.forEach(([x, y]) =>
        block(ctx, (drag.ox + x) * cell, (drag.oy + y) * cell, cell, L.PIECES[drag.type].color)
      );
      ctx.globalAlpha = 1;
      if (drag.clears.length) {
        const pulse = 0.35 + 0.25 * Math.sin(now / 90);
        ctx.fillStyle = `rgba(255,255,255,${pulse})`;
        drag.clears.forEach((i) => {
          const pad = cell * 0.06;
          roundRect(ctx, (i % n) * cell + pad, Math.floor(i / n) * cell + pad, cell - 2 * pad, cell - 2 * pad, cell * 0.2);
          ctx.fill();
        });
      }
    }

    // Casillas que explotan
    anims = anims.filter((a) => now - a.t0 < a.dur);
    for (const a of anims) {
      if (a.kind !== 'flash') continue;
      const t = (now - a.t0) / a.dur;
      a.cells.forEach((c) => {
        ctx.globalAlpha = 1 - t;
        block(ctx, (c.idx % n) * cell, Math.floor(c.idx / n) * cell, cell, t < 0.25 ? '#ffffff' : c.color, 1 + t * 0.3);
      });
      ctx.globalAlpha = 1;
    }

    // Partículas
    particles = particles.filter((p) => p.life > 0);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35;
      p.life -= 1;
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
    }
    ctx.globalAlpha = 1;
  }

  function easeOutBack(t) {
    const c = 1.7;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  }

  function floatText(text, x, y, cls = '') {
    const el = document.createElement('div');
    el.className = 'float ' + cls;
    el.textContent = text;
    const bx = canvas.offsetLeft;
    const by = canvas.offsetTop;
    el.style.left = bx + x + 'px';
    el.style.top = by + y + 'px';
    fx.append(el);
    setTimeout(() => el.remove(), 1000);
  }

  // ---------- Bandeja ----------
  function renderTray() {
    trayEl.innerHTML = '';
    const next = L.upcoming(state);
    const horizontal = matchMedia('(min-aspect-ratio: 6/5)').matches;
    state.offer.forEach((typeId, i) => {
      const slot = document.createElement('div');
      slot.className = 'slot';
      if (!L.canFitAnywhere(state, typeId)) slot.classList.add('blocked');
      if (discardMode) slot.classList.add('discard');

      const box = document.createElement('div');
      box.className = 'piece-box';
      const c = document.createElement('canvas');
      const { w, h } = L.shapeOf(typeId, rots[i]);
      const room = horizontal ? 150 : Math.min(110, (trayEl.clientWidth - 16) / 3 - 16);
      const tall = horizontal ? 60 : Math.max(60, Math.min(100, window.innerHeight * 0.11));
      const size = Math.max(6, Math.min(horizontal ? 20 : 26, Math.floor(Math.min(room / w, tall / h))));
      const g = c.getContext('2d');
      sizeCanvas(c, g, w * size, h * size);
      drawShape(g, typeId, rots[i], size);
      box.append(c);

      const nx = document.createElement('div');
      nx.className = 'next';
      nx.title = 'Si eliges esta, luego saldrán estas';
      nx.append('luego');
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.gap = '4px';
      row.style.alignItems = 'center';
      next[i].forEach((t) => {
        const m = document.createElement('canvas');
        const s = L.shapeOf(t, 0);
        const ms = Math.max(2, Math.min(4, Math.floor(26 / Math.max(s.w, s.h))));
        const mg = m.getContext('2d');
        sizeCanvas(m, mg, s.w * ms, s.h * ms);
        mg.fillStyle = L.PIECES[t].color;
        s.cells.forEach(([x, y]) => mg.fillRect(x * ms, y * ms, ms - 0.5, ms - 0.5));
        row.append(m);
      });
      nx.append(row);

      slot.append(box, nx);
      bindSlot(slot, i);
      trayEl.append(slot);
    });
  }

  function bindSlot(slot, i) {
    slot.addEventListener('pointerdown', (e) => {
      if (state.over || drag) return;
      audio();
      if (discardMode) {
        doDiscard(i);
        return;
      }
      if (e.button === 2) return;
      e.preventDefault();
      slot.setPointerCapture(e.pointerId);
      drag = {
        i,
        slot,
        type: state.offer[i],
        rot: rots[i],
        x0: e.clientX,
        y0: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
        moved: false,
        touch: e.pointerType !== 'mouse',
        ok: false,
        clears: [],
      };
    });
    slot.addEventListener('pointermove', (e) => {
      if (!drag || drag.slot !== slot) return;
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
      if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 6) {
        drag.moved = true;
        slot.classList.add('dragging');
        buildFloater();
        sfx.pick();
      }
      if (drag.moved) moveDrag();
    });
    slot.addEventListener('pointerup', () => {
      if (!drag || drag.slot !== slot) return;
      if (!drag.moved) rotateSlot(i);
      else if (drag.ok) drop();
      endDrag();
    });
    slot.addEventListener('pointercancel', endDrag);
    slot.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (!drag) rotateSlot(i);
    });
  }

  function rotateSlot(i) {
    rots[i] = (rots[i] + 1) % 4;
    sfx.rotate();
    renderTray();
  }

  function buildFloater() {
    const { w, h } = L.shapeOf(drag.type, drag.rot);
    sizeCanvas(floater, fctx, w * cell, h * cell);
    drawShape(fctx, drag.type, drag.rot, cell);
    floater.hidden = false;
  }

  function moveDrag() {
    const { w, h } = L.shapeOf(drag.type, drag.rot);
    const W = w * cell;
    const H = h * cell;
    const left = drag.lastX - W / 2;
    // En táctil la pieza va por encima del dedo para que se vea.
    const top = drag.touch ? drag.lastY - H - cell * 1.2 : drag.lastY - H / 2;
    floater.style.transform = `translate(${left}px, ${top}px)`;

    const r = canvas.getBoundingClientRect();
    const ox = Math.round((left - r.left) / cell);
    const oy = Math.round((top - r.top) / cell);
    if (ox !== drag.ox || oy !== drag.oy || drag.dirty) {
      drag.ox = ox;
      drag.oy = oy;
      drag.dirty = false;
      const clears = L.previewClears(state, drag.type, drag.rot, ox, oy);
      drag.ok = clears !== null;
      drag.clears = clears || [];
      kick();
    }
  }

  function endDrag() {
    if (!drag) return;
    drag.slot.classList.remove('dragging');
    floater.hidden = true;
    drag = null;
    kick();
  }

  function drop() {
    const { type, rot, ox, oy } = drag;
    const res = L.place(state, type, rot, ox, oy);
    if (!res) return;
    const n = state.size;
    const now = performance.now();
    anims.push({ kind: 'pop', cells: res.idxs, t0: now, dur: 180 });
    sfx.place(L.PIECES[type].area);
    buzz(8);

    const centroid = (idxs) => {
      const xs = idxs.map((i) => (i % n) + 0.5);
      const ys = idxs.map((i) => Math.floor(i / n) + 0.5);
      return [(xs.reduce((a, b) => a + b) / xs.length) * cell, (ys.reduce((a, b) => a + b) / ys.length) * cell];
    };

    if (res.cleared.length) {
      anims.push({ kind: 'flash', cells: res.cleared, t0: now, dur: 420 });
      res.cleared.forEach((c) => {
        const cx = ((c.idx % n) + 0.5) * cell;
        const cy = (Math.floor(c.idx / n) + 0.5) * cell;
        for (let k = 0; k < 3; k++) {
          const life = 30 + Math.random() * 20;
          particles.push({
            x: cx,
            y: cy,
            vx: (Math.random() - 0.5) * 7,
            vy: -Math.random() * 7 - 1,
            s: Math.max(3, cell * 0.22),
            color: c.color,
            life,
            max: life,
          });
        }
      });
      const [cx, cy] = centroid(res.cleared.map((c) => c.idx));
      floatText('+' + res.gained, cx, cy, res.cleared.length >= 16 ? 'big' : '');
      if (res.combo >= 2) setTimeout(() => floatText('RACHA ×' + res.combo, cx, cy - cell * 1.2, 'combo'), 120);
      if (res.boardClean) setTimeout(() => floatText('¡TABLERO LIMPIO!', (n * cell) / 2, (n * cell) / 2, 'big'), 250);
      if (res.starGained) {
        setTimeout(() => floatText('+★', cx, cy + cell, 'big'), 300);
        sfx.star();
      }
      sfx.clear(res.combo);
      buzz(res.cleared.length >= 16 ? [20, 40, 30] : 18);
      if (res.cleared.length >= 16) {
        canvas.classList.remove('shake');
        void canvas.offsetWidth;
        canvas.classList.add('shake');
      }
    } else {
      const [cx, cy] = centroid(res.idxs);
      floatText('+' + res.gained, cx, cy);
    }

    afterMove();
  }

  function doDiscard(i) {
    if (!L.discard(state, state.offer[i])) return;
    discardMode = false;
    sfx.rotate();
    afterMove();
  }

  function afterMove() {
    rots = [0, 0, 0];
    const el = $('score');
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
    save();
    renderTray();
    updateHud();
    kick();
    if (state.over) setTimeout(showOver, 800);
  }

  // ---------- Marcadores ----------
  function updateHud() {
    $('score').textContent = state.score;
    if (state.score > best) {
      best = state.score;
      store.set(KEY_BEST, String(best));
    }
    $('best').textContent = best;

    const combo = $('combo');
    combo.hidden = state.combo === 0;
    $('combo-x').textContent = '×' + (state.combo + 1);
    combo.title = 'La próxima explosión vale ×' + (state.combo + 1);
    $('combo-dots').textContent = '●'.repeat(state.grace) + '○'.repeat(L.COMBO_GRACE - state.grace);

    const stars = $('stars');
    stars.textContent = '★'.repeat(state.stars) + '☆'.repeat(L.MAX_STARS - state.stars) + (discardMode ? ' Cancelar' : ' Descartar');
    stars.disabled = state.stars === 0;
    stars.classList.toggle('armed', discardMode);

    const stuck = !state.offer.some((t) => L.canFitAnywhere(state, t));
    $('hint').textContent = discardMode
      ? 'Toca la pieza que quieres descartar'
      : stuck && state.stars > 0
        ? 'Ninguna pieza cabe: toca ★ para descartar una'
        : 'Arrastra una pieza al tablero · tócala para girarla';
  }

  function save() {
    store.set(KEY_GAME, L.serialize(state));
  }

  function newGame(size = state ? state.size : 8) {
    state = L.newGame(size);
    rots = [0, 0, 0];
    discardMode = false;
    anims = [];
    particles = [];
    fx.innerHTML = '';
    save();
    renderTray();
    layout();
    updateHud();
  }

  function showOver() {
    sfx.over();
    $('final-score').textContent = state.score;
    $('record').hidden = !(state.score > 0 && state.score >= best);
    $('final-stats').textContent = `${state.turns} jugadas · ${state.clears} explosiones`;
    open('over');
  }

  // ---------- Ventanas ----------
  function open(id) {
    if (id === 'menu') {
      document.querySelectorAll('[data-size]').forEach((b) =>
        b.setAttribute('aria-pressed', String(Number(b.dataset.size) === state.size))
      );
      $('sound-btn').textContent = soundOn ? 'Sí' : 'No';
    }
    $(id).hidden = false;
  }
  function close(id) {
    $(id).hidden = true;
  }

  document.querySelectorAll('.overlay').forEach((o) => {
    o.addEventListener('click', (e) => {
      if (e.target === o && o.id !== 'over') close(o.id);
    });
    o.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => close(o.id)));
  });

  $('help-btn').addEventListener('click', () => open('help'));
  $('menu-btn').addEventListener('click', () => open('menu'));
  $('new-btn').addEventListener('click', () => {
    close('menu');
    newGame();
  });
  $('again-btn').addEventListener('click', () => {
    close('over');
    newGame();
  });
  document.querySelectorAll('[data-size]').forEach((b) =>
    b.addEventListener('click', () => {
      close('menu');
      newGame(Number(b.dataset.size));
    })
  );
  $('sound-btn').addEventListener('click', () => {
    soundOn = !soundOn;
    store.set(KEY_SOUND, soundOn ? '1' : '0');
    $('sound-btn').textContent = soundOn ? 'Sí' : 'No';
    sfx.rotate();
  });
  $('stars').addEventListener('click', () => {
    if (state.stars === 0 || state.over) return;
    discardMode = !discardMode;
    renderTray();
    updateHud();
  });

  // Teclado / ratón mientras se arrastra: R o clic derecho gira.
  function rotateDragging() {
    if (!drag || !drag.moved) return;
    drag.rot = (drag.rot + 1) % 4;
    rots[drag.i] = drag.rot;
    drag.dirty = true;
    buildFloater();
    moveDrag();
    sfx.rotate();
  }
  window.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') rotateDragging();
    if (e.key === 'Escape') {
      endDrag();
      ['help', 'menu'].forEach(close);
    }
  });
  window.addEventListener('contextmenu', (e) => {
    if (drag) {
      e.preventDefault();
      rotateDragging();
    }
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      renderTray();
      layout();
    }, 80);
  });

  // ---------- Arranque ----------
  const saved = store.get(KEY_GAME);
  let loaded = null;
  try { loaded = saved && L.deserialize(saved); } catch (e) { loaded = null; }
  if (loaded && !loaded.over) {
    state = loaded;
    renderTray();
    layout();
    updateHud();
  } else {
    newGame(8);
  }
  if (!store.get(KEY_HELP)) {
    store.set(KEY_HELP, '1');
    if (store.get(KEY_HELP)) open('help');
  }
  if (document.fonts) document.fonts.ready.then(() => { renderTray(); layout(); });
})();
