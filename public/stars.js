// public/stars.js (versión ajustada: menos titileo simultáneo + todo en blanco)
(function () {
  if (window._paraleelStarsInitialized) return;
  window._paraleelStarsInitialized = true;

  const canvas = document.createElement("canvas");
  canvas.id = "stars";
  document.body.prepend(canvas);
  const ctx = canvas.getContext("2d", { alpha: true });

  // configuración (ajustada)
  const STAR_COUNT = 90; // reducido para menos destellos simultáneos
  const MICROB_LINK_PROB = 0.002; // menos micro-líneas
  const CONST_MIN_INTERVAL = 20000; // 20s
  const CONST_MAX_INTERVAL = 40000; // 40s
  const CONST_DURATION = 5000; // 5s visibles + fade
  const STAR_MIN_RADIUS = 0.6;
  const STAR_MAX_RADIUS = 2.8;

  let DPR = Math.max(1, window.devicePixelRatio || 1);
  let width = 0;
  let height = 0;

  const stars = [];
  const constellations = [];

  const CONST_DEFS = {
    orion: {
      name: "Orión",
      points: [
        [0.1, 0.8],
        [0.35, 0.6],
        [0.5, 0.4],
        [0.55, 0.45],
        [0.6, 0.5],
        [0.8, 0.2],
        [0.7, 0.35],
      ],
      lines: [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [4, 6],
        [2, 5],
      ]
    },
    osa_mayor: {
      name: "Osa Mayor",
      points: [
        [0.15, 0.35],
        [0.3, 0.28],
        [0.45, 0.27],
        [0.6, 0.33],
        [0.7, 0.42],
        [0.82, 0.6],
        [0.95, 0.55]
      ],
      lines: [
        [0,1],[1,2],[2,3],[3,4],[4,5],[5,6]
      ]
    },
    casiopea: {
      name: "Casiopea",
      points: [
        [0.2, 0.6],
        [0.33, 0.5],
        [0.5, 0.45],
        [0.66, 0.5],
        [0.8, 0.6]
      ],
      lines: [[0,1],[1,2],[2,3],[3,4]]
    },
    crux: {
      name: "Cruz del Sur",
      points: [
        [0.45, 0.2],
        [0.5, 0.35],
        [0.55, 0.45],
        [0.6, 0.3],
        [0.68, 0.15]
      ],
      lines: [[0,1],[1,2],[2,3],[3,4]]
    }
  };

  // Helpers
  function rand(min, max) { return min + Math.random() * (max - min); }
  function chance(p) { return Math.random() < p; }

  function resize() {
    DPR = Math.max(1, window.devicePixelRatio || 1);
    width = Math.max(1, Math.floor(innerWidth));
    height = Math.max(1, Math.floor(innerHeight));
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    canvas.width = Math.floor(width * DPR);
    canvas.height = Math.floor(height * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  // Star factory (ajustado baseAlpha y twinkleSpeed)
  function createStar(x = Math.random() * width, y = Math.random() * height) {
    const r = rand(STAR_MIN_RADIUS, STAR_MAX_RADIUS);
    return {
      x,
      y,
      r,
      baseAlpha: rand(0.06, 0.5), // menor máximo → menos brillan muy fuerte simultáneo
      alpha: 0,
      twinkleSpeed: rand(0.002, 0.018), // más lento en general
      phase: Math.random() * Math.PI * 2,
      driftX: rand(-6, 6),
      driftY: rand(6, 20)
    };
  }

  function initStars() {
    stars.length = 0;
    for (let i = 0; i < STAR_COUNT; i++) {
      const x = Math.random() * width;
      const y = Math.pow(Math.random(), 1.2) * height * 0.9;
      stars.push(createStar(x, y));
    }
  }

  // Draw star using white gradients (en lugar de cian)
  function drawStar(s) {
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 6);
    const glow = Math.min(1, s.baseAlpha);
    g.addColorStop(0, `rgba(255,255,255,${glow * s.alpha})`);
    g.addColorStop(0.3, `rgba(255,255,255,${0.18 * s.alpha})`);
    g.addColorStop(1, `rgba(255,255,255,0)`);
    ctx.beginPath();
    ctx.fillStyle = g;
    ctx.arc(s.x, s.y, s.r * (0.9 + 0.6 * s.alpha), 0, Math.PI * 2);
    ctx.fill();
  }

  // Constellation class (dibujado en blanco)
  class Constellation {
    constructor(def, centerX, centerY, scale) {
      this.def = def;
      this.centerX = centerX;
      this.centerY = centerY;
      this.scale = scale;
      this.age = 0;
      this.duration = CONST_DURATION;
      this.points = def.points.map(p => ({
        x: centerX + (p[0] - 0.5) * scale,
        y: centerY + (p[1] - 0.5) * scale
      }));
      this.progress = 0;
      this.fadeProgress = 0;
      this.stars = this.points.map(pt => ({
        x: pt.x + rand(-4,4),
        y: pt.y + rand(-4,4),
        r: rand(1.2, 2.8),
        alpha: 0
      }));
    }
    update(dt) {
      this.age += dt;
      const half = this.duration * 0.6;
      if (this.age < half) {
        this.progress = Math.min(1, this.age / half);
      } else {
        this.fadeProgress = Math.min(1, (this.age - half) / (this.duration - half));
        this.progress = Math.max(0, 1 - this.fadeProgress);
      }
      this.stars.forEach((s, i) => {
        s.alpha = 0.6 * Math.sin((this.age / 200) + i) + 0.4;
      });
    }
    draw(ctx) {
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // glow behind lines (blanco suave)
      ctx.strokeStyle = `rgba(255,255,255,${0.08 * this.progress})`;
      ctx.lineWidth = 5 * this.progress;
      this.drawAllLines(ctx, true);

      // main lines (blanco)
      ctx.strokeStyle = `rgba(255,255,255,${0.9 * this.progress})`;
      ctx.lineWidth = 1.0 + 1.8 * this.progress;
      this.drawAllLines(ctx, false);

      // draw stars (white)
      this.stars.forEach(s => {
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 6);
        g.addColorStop(0, `rgba(255,255,255,${0.9 * s.alpha * this.progress})`);
        g.addColorStop(0.3, `rgba(255,255,255,${0.3 * s.alpha * this.progress})`);
        g.addColorStop(1, `rgba(255,255,255,0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * (1 + 0.3 * this.progress), 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
    }
    drawAllLines(ctx, glow) {
      this.def.lines.forEach(line => {
        const a = this.points[line[0]];
        const b = this.points[line[1]];
        const portion = this.progress;
        const x = a.x + (b.x - a.x) * portion;
        const y = a.y + (b.y - a.y) * portion;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      });
    }
    isDone() {
      return this.age >= this.duration;
    }
  }

  function spawnConstellation() {
    const defs = Object.values(CONST_DEFS);
    const def = defs[Math.floor(Math.random() * defs.length)];
    const cx = rand(width * 0.15, width * 0.85);
    const cy = rand(height * 0.12, height * 0.7);
    const scale = rand(width * 0.12, width * 0.28);
    const c = new Constellation(def, cx, cy, scale);
    constellations.push(c);
  }

  function maybeCreateMicroEffects() {
    for (let i = 0; i < 2; i++) {
      if (chance(0.04)) {
        const s = stars[Math.floor(Math.random() * stars.length)];
        if (s) s.phase += Math.PI * rand(0.6, 1.6);
      }
    }
  }

  // animation loop
  let last = performance.now();
  function loop(now) {
    const dt = now - last;
    last = now;
    ctx.clearRect(0, 0, width, height);

    // faint radial vignette
    const cx = width / 2;
    const cy = height / 2;
    const rg = ctx.createRadialGradient(cx, cy - height * 0.15, 50, cx, cy, Math.max(width, height) * 0.9);
    rg.addColorStop(0, "rgba(0,0,0,0)");
    rg.addColorStop(1, "rgba(0,0,0,0.15)");
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, width, height);

    // update and draw stars
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.phase += s.twinkleSpeed * dt;
      s.alpha = (Math.sin(s.phase) + 1) / 2 * s.baseAlpha;
      s.y += (s.driftY * dt / 10000) * (0.2 + Math.random() * 0.6);
      s.x += (s.driftX * dt / 100000);

      if (s.y > height + 20) {
        s.x = Math.random() * width;
        s.y = -10;
        s.phase = Math.random() * Math.PI * 2;
      }
      drawStar(s);
    }

    // occasional micro connections (very subtle, white)
    if (chance(MICROB_LINK_PROB)) {
      const a = stars[Math.floor(Math.random() * stars.length)];
      const b = stars[Math.floor(Math.random() * stars.length)];
      if (a && b && Math.hypot(a.x - b.x, a.y - b.y) < 120) {
        ctx.save();
        ctx.strokeStyle = "rgba(255,255,255,0.04)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.restore();
      }
    }

    // update and draw constellations (white)
    for (let i = constellations.length - 1; i >= 0; i--) {
      const c = constellations[i];
      c.update(dt);
      c.draw(ctx);
      if (c.isDone()) {
        constellations.splice(i, 1);
      }
    }

    if (chance(0.015)) maybeCreateMicroEffects();

    requestAnimationFrame(loop);
  }

  function start() {
    resize();
    initStars();
    last = performance.now();
    requestAnimationFrame(loop);
  }

  window.addEventListener("resize", () => {
    resize();
  });

  let constTimer = null;
  function scheduleNextConstellation() {
    const interval = rand(CONST_MIN_INTERVAL, CONST_MAX_INTERVAL);
    constTimer = setTimeout(() => {
      spawnConstellation();
      scheduleNextConstellation();
    }, interval);
  }

  start();
  scheduleNextConstellation();

  window._paraleelStars = {
    spawnConstellation,
    createStarAt: (x, y) => {
      stars.push(createStar(x, y));
    },
    stop: () => {
      if (constTimer) clearTimeout(constTimer);
      window._paraleelStarsInitialized = false;
    }
  };

})();
