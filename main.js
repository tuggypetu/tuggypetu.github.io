// Land-cover raster: a synthetic classified satellite tile.
// On load, pixels "classify" from grey reflectance to land-cover colours in one sweep.
(function () {
  const canvas = document.getElementById('landcover');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const N = 36;                       // grid cells per side
  const cell = canvas.width / N;
  const colours = {
    forest: '#2F6B4F', crop: '#9DBB6A', water: '#2C6E8F', built: '#8A8F96', bare: '#B08D57'
  };

  // Seeded random so the tile looks the same on every visit
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  // Smooth value noise
  const G = 7, grid = [];
  for (let i = 0; i <= G; i++) { grid[i] = []; for (let j = 0; j <= G; j++) grid[i][j] = rand(); }
  const lerp = (a, b, t) => a + (b - a) * (t * t * (3 - 2 * t));
  const noise = (x, y) => {
    const gx = x * G, gy = y * G, i = Math.floor(gx), j = Math.floor(gy);
    const tx = gx - i, ty = gy - j;
    return lerp(lerp(grid[i][j], grid[i + 1][j], tx), lerp(grid[i][j + 1], grid[i + 1][j + 1], tx), ty);
  };

  const cells = [];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N;
      const elev = noise(u * 0.98, v * 0.98);
      // a river winding through the tile
      const river = Math.abs(v - (0.55 + 0.18 * Math.sin(u * 5.5) + 0.05 * Math.sin(u * 13)));
      let cls;
      if (river < 0.035 || elev < 0.18) cls = 'water';
      else if (u > 0.62 && v < 0.38 && noise(u, v * 1.3) > 0.42) cls = 'built';
      else if (elev > 0.58) cls = 'forest';
      else if (elev > 0.36) cls = (Math.floor(u * 9) + Math.floor(v * 7)) % 3 === 0 ? 'bare' : 'crop';
      else cls = rand() > 0.85 ? 'bare' : 'crop';
      const grey = Math.round(120 + elev * 90 + rand() * 18);
      cells.push({ x, y, cls, grey, delay: (x + y) / (2 * N) + rand() * 0.08 });
    }
  }

  const draw = (progress) => {
    for (const c of cells) {
      ctx.fillStyle = progress >= c.delay ? colours[c.cls] : `rgb(${c.grey},${c.grey + 4},${c.grey})`;
      ctx.fillRect(c.x * cell, c.y * cell, cell + 0.5, cell + 0.5);
    }
  };

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { draw(2); return; }

  draw(-1);
  const start = performance.now() + 400, dur = 1800;
  const tick = (now) => {
    const p = Math.max(-1, (now - start) / dur);
    draw(p * 1.1);
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();

// Project filters
(function () {
  const buttons = document.querySelectorAll('.filters button');
  const items = document.querySelectorAll('.project, .labs');
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
