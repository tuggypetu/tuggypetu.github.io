// Hero mosaic: four small drawings of the kinds of data I work with.
// On load they fill in once, one after another. Reduced motion draws them finished.
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ease = (t) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);

  // Seeded random so the drawings look the same on every visit
  const rng = (s) => () => (s = (s * 16807) % 2147483647) / 2147483647;

  const setup = (id) => {
    const c = document.getElementById(id);
    if (!c) return null;
    const ctx = c.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = c.width, H = c.height;
    c.width = W * dpr; c.height = H * dpr;
    ctx.scale(dpr, dpr);
    return { ctx, W, H };
  };

  // 1. Satellite tile: classified land-cover pixels sweeping in
  const sat = setup('sig-sat');
  const satCells = [];
  if (sat) {
    const r = rng(7), N = 16, G = 5, grid = [];
    for (let i = 0; i <= G; i++) { grid[i] = []; for (let j = 0; j <= G; j++) grid[i][j] = r(); }
    const sm = (a, b, t) => a + (b - a) * (t * t * (3 - 2 * t));
    const noise = (x, y) => {
      const gx = x * G, gy = y * G, i = Math.min(Math.floor(gx), G - 1), j = Math.min(Math.floor(gy), G - 1);
      return sm(sm(grid[i][j], grid[i + 1][j], gx - i), sm(grid[i][j + 1], grid[i + 1][j + 1], gx - i), gy - j);
    };
    const col = { forest: '#2F7D57', crop: '#9CCB72', water: '#3B7FC4', built: '#9AA3B2', bare: '#E0B86A' };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N, e = noise(u, v);
      const river = Math.abs(v - (0.55 + 0.2 * Math.sin(u * 5)));
      let k = river < 0.06 ? 'water' : (u > 0.6 && v < 0.35) ? 'built' : e > 0.55 ? 'forest' : e > 0.3 ? ((x + y) % 4 === 0 ? 'bare' : 'crop') : 'crop';
      satCells.push({ x, y, fill: col[k], d: (x + y) / (2 * N) });
    }
    sat.N = N;
  }
  const drawSat = (p) => {
    if (!sat) return;
    const { ctx, W, N } = sat, s = W / N;
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, W);
    for (const c of satCells) {
      const t = ease((p - c.d * 0.7) / 0.3);
      ctx.globalAlpha = 0.15 + 0.85 * t;
      ctx.fillStyle = t > 0 ? c.fill : '#C9D2CC';
      ctx.fillRect(c.x * s + 1, c.y * s + 1, s - 2, s - 2);
    }
    ctx.globalAlpha = 1;
  };

  // 2. Clinical audio: a spectrogram with short bursts (bowel sounds)
  const aud = setup('sig-audio');
  const audCols = [];
  if (aud) {
    const r = rng(11), C = 30, R = 18;
    const bursts = [5, 13, 21, 26];
    for (let x = 0; x < C; x++) {
      const col = [];
      const b = bursts.some((k) => Math.abs(x - k) <= 1);
      for (let y = 0; y < R; y++) {
        const low = 1 - y / R;
        col.push(Math.min(1, (b ? 0.55 + 0.45 * low : 0.12 * low) + r() * 0.15));
      }
      audCols.push(col);
    }
  }
  const drawAudio = (p) => {
    if (!aud) return;
    const { ctx, W, H } = aud, C = audCols.length, R = audCols[0].length;
    const cw = W / C, ch = H / R;
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
    const shown = Math.floor(ease(p) * C);
    for (let x = 0; x < shown; x++) for (let y = 0; y < R; y++) {
      const v = audCols[x][y];
      ctx.fillStyle = `rgba(110, 78, 200, ${0.08 + v * 0.85})`;
      ctx.fillRect(x * cw + 0.5, H - (y + 1) * ch + 0.5, cw - 1, ch - 1);
    }
  };

  // 3. Registry data: credits by registry, bars growing
  const mkt = setup('sig-market');
  const bars = [0.82, 0.55, 0.68, 0.34, 0.47, 0.25];
  const drawMarket = (p) => {
    if (!mkt) return;
    const { ctx, W, H } = mkt, n = bars.length, pad = 22, gap = 10;
    const bw = (W - pad * 2 - gap * (n - 1)) / n;
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#EADFC0'; ctx.fillRect(pad, H - pad, W - pad * 2, 2);
    bars.forEach((v, i) => {
      const h = (H - pad * 2.4) * v * ease(p * 1.4 - i * 0.08);
      ctx.fillStyle = i === 0 ? '#E8A400' : '#FFC93C';
      const x = pad + i * (bw + gap), y = H - pad - h;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x, y, bw, h, [6, 6, 0, 0]) : ctx.rect(x, y, bw, h);
      ctx.fill();
    });
  };

  // 4. Documents: lines of text, with retrieved passages highlighted
  const doc = setup('sig-docs');
  const lines = [0.9, 0.75, 0.85, 0.6, 0.95, 0.7, 0.8, 0.5, 0.88, 0.65];
  const hits = new Set([2, 3, 6]);
  const drawDocs = (p) => {
    if (!doc) return;
    const { ctx, W, H } = doc, pad = 24, lh = (H - pad * 2) / lines.length;
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
    lines.forEach((w, i) => {
      const y = pad + i * lh + lh * 0.3, len = (W - pad * 2) * w;
      ctx.fillStyle = '#D5DCEB';
      ctx.fillRect(pad, y, len, lh * 0.38);
      if (hits.has(i)) {
        const t = ease(p * 1.5 - 0.3 - i * 0.04);
        ctx.fillStyle = '#2747C9';
        ctx.fillRect(pad, y, len * t, lh * 0.38);
      }
    });
  };

  const all = [drawSat, drawAudio, drawMarket, drawDocs];
  if (reduce) { all.forEach((d) => d(2)); return; }
  all.forEach((d) => d(0));
  const start = performance.now() + 300, dur = 1400, stagger = 260;
  const tick = (now) => {
    let done = true;
    all.forEach((d, i) => {
      const p = (now - start - i * stagger) / dur;
      if (p < 1.6) done = false;
      d(Math.max(0, p));
    });
    if (!done) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();

// Project filters
(function () {
  const buttons = document.querySelectorAll('.filters button');
  const items = document.querySelectorAll('.project, .drawer');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const f = btn.dataset.filter;
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      items.forEach((el) => {
        el.hidden = f !== 'all' && !el.dataset.tags.split(' ').includes(f);
      });
    });
  });
})();
