// public/stars.js
(function () {
  if (window._paraleelStarsInitialized) return;
  window._paraleelStarsInitialized = true;

  const canvas = document.createElement("canvas");
  canvas.id = "stars";
  document.body.prepend(canvas); // al fondo visual si otros elementos tienen z-index mayor
  const ctx = canvas.getContext("2d", { alpha: true });

  // configuración
  const STAR_COUNT = 140; // cantidad base de estrellas
  const TWINKLE_FREQ = 0.02; // probabilidad de cambio de fase por frame (pequeño)
  const MICROB_LINK_PROB = 0.006; // prob. de micro-lineas entre estrellas (sutil)
  const CONST_MIN_INTERVAL = 20000; // 20s
  const CONST_MAX_INTERVAL = 40000; // 40s
  const CONST_DURATION = 5000; // 5s visibles + fade
  const STAR_MIN_RADIUS = 0.6;
  const STAR_MAX_RADIUS = 2.8;

  let DPR = Math.max(1, window.devicePixelRatio || 1);
  let width = 0;
  let height = 0;

  // arrays
  const stars = [];
  const constellations = [];

  // constelaciones definidas con coordenadas normalizadas (x,y 0..1)
  // He incluido 4 constelaciones: Orion, Big Dipper (Osa Mayor), Cassiopeia, Crux (Cruz del Sur)
  const CONST_DEFS = {
    orion: {
      name: "Orión",
      points: [
        [0.1, 0.8], // Rigel (approx)
        [0.35, 0.6], // Saiph
        [0.5, 0.4], // Belt left
        [0.55, 0.45], // Belt middle
        [0.6, 0.5], // Belt right
        [0.8, 0.2], // Betelgeuse
        [0.7, 0.35], // Bellatrix
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

  // Star object factory
  function createStar(x = Math.random() * width, y = Math.random() * height) {
    const r = rand(STAR_MIN_RADIUS, STAR_MAX_RADIUS);
    return {
      x,
      y,
      r,
      baseAlpha: rand(0.15, 0.9),
      alpha: 0,
      twinkleSpeed: rand(0.005, 0.03),
      phase: Math.random() * Math.PI * 2,
      driftX: rand(-6, 6), // subtle lateral drift per lifetime
      driftY: rand(6, 20)
    };
  }

  function initStars() {
    stars.length = 0;
    for (let i = 0; i < STAR_COUNT; i++) {
      // distribute more stars toward top area, fewer near bottom (atmosphere look)
      const x = Math.random() * width;
      const y = Math.pow(Math.random(), 1.2) * height * 0.9;
      stars.push(createStar(x, y));
    }
  }

  // Draw star with glow
  function drawStar(s) {
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 6);
    const glow = Math.min(0.9, s.baseAlpha);
    g.addColorStop(0, `rgba(10,200,255,${glow * s.alpha})`);
    g.addColorStop(0.3, `rgba(10,200,255,${0.25 * s.alpha})`);
    g.addColorStop(1, `rgba(10,200,255,0)`);
    ctx.beginPath();
    ctx.fillStyle = g;
    ctx.arc(s.x, s.y, s.r * (0.9 + 0.6 * s.alpha), 0, Math.PI * 2);
    ctx.fill();
  }

  // Constellation class
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
      // drawing progress for lines (0..1)
      this.progress = 0;
      this.fadeProgress = 0;
      // some sparkle stars for the constellation
      this.stars = this.points.map(pt => ({
        x: pt.x + rand(-4,4),
        y: pt.y + rand(-4,4),
        r: rand(1.2, 2.8),
        alpha: 0
      }));
    }
    update(dt) {
      this.age += dt;
      // progress grows until 0.9 then fade
      const half = this.duration * 0.6;
      if (this.age < half) {
        this.progress = Math.min(1, this.age / half);
      } else {
        this.fadeProgress = Math.min(1, (this.age - half) / (this.duration - half));
        this.progress = Math.max(0, 1 - this.fadeProgress);
      }
      // update internal star alphas
      this.stars.forEach((s, i) => {
        s.alpha = 0.6 * Math.sin((this.age / 200) + i) + 0.4;
      });
    }
    draw(ctx) {
      // draw connecting lines gradually
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // glow behind lines
      ctx.strokeStyle = `rgba(10,200,255,${0.12 * this.progress})`;
      ctx.lineWidth = 6 * this.progress;
      this.drawAllLines(ctx, true);

      // main lines
      ctx.strokeStyle = `rgba(10,200,255,${0.85 * this.progress})`;
      ctx.lineWidth = 1.2 + 1.8 * this.progress;
      this.drawAllLines(ctx, false);

      // draw stars
      this.stars.forEach(s => {
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 6);
        g.addColorStop(0, `rgba(255,255,255,${0.9 * s.alpha * this.progress})`);
        g.addColorStop(0.3, `rgba(10,200,255,${0.35 * s.alpha * this.progress})`);
        g.addColorStop(1, `rgba(10,200,255,0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * (1 + 0.3 * this.progress), 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
    }
    drawAllLines(ctx, glow) {
      // draw each line with portion according to progress
      this.def.lines.forEach(line => {
        const a = this.points[line[0]];
        const b = this.points[line[1]];
        const portion = this.progress; // how much of the line to draw
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

  // spawn constellation at random place with random scale
  function spawnConstellation() {
    const defs = Object.values(CONST_DEFS);
    const def = defs[Math.floor(Math.random() * defs.length)];
    // choose center not too close to edges: within 15%..85%
    const cx = rand(width * 0.15, width * 0.85);
    const cy = rand(height * 0.12, height * 0.7);
    // scale relative to viewport: between 8% and 28% of width
    const scale = rand(width * 0.12, width * 0.28);
    const c = new Constellation(def, cx, cy, scale);
    constellations.push(c);
  }

  // small random twinkles and micro-lines between nearby stars
  function maybeCreateMicroEffects() {
    // randomly brighten some stars
    for (let i = 0; i < 3; i++) {
      if (chance(0.06)) {
        const s = stars[Math.floor(Math.random() * stars.length)];
        if (s) s.phase += Math.PI * rand(0.6, 1.6);
      }
    }
  }

  // animate loop
  let last = performance.now();
  function loop(now) {
    const dt = now - last;
    last = now;
    // clear (transparent)
    ctx.clearRect(0, 0, width, height);

    // subtle radial vignette focusing on center/top (optional)
    // draw background faint radial for depth
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
      // twinkle via sinus + random flicker
      s.phase += s.twinkleSpeed * dt;
      s.alpha = (Math.sin(s.phase) + 1) / 2 * s.baseAlpha;
      // minor vertical drift to simulate subtle movement
      s.y += (s.driftY * dt / 10000) * (0.2 + Math.random() * 0.6);
      s.x += (s.driftX * dt / 100000);

      // respawn if goes beyond bottom
      if (s.y > height + 20) {
        s.x = Math.random() * width;
        s.y = -10;
        s.phase = Math.random() * Math.PI * 2;
      }
      drawStar(s);
    }

    // occasional micro connections (very subtle)
    if (chance(MICROB_LINK_PROB)) {
      const a = stars[Math.floor(Math.random() * stars.length)];
      const b = stars[Math.floor(Math.random() * stars.length)];
      if (a && b && Math.hypot(a.x - b.x, a.y - b.y) < 120) {
        ctx.save();
        ctx.strokeStyle = "rgba(10,200,255,0.06)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.restore();
      }
    }

    // update and draw constellations
    for (let i = constellations.length - 1; i >= 0; i--) {
      const c = constellations[i];
      c.update(dt);
      c.draw(ctx);
      if (c.isDone()) {
        constellations.splice(i, 1);
      }
    }

    // occasional micro effects
    if (chance(0.02)) maybeCreateMicroEffects();

    requestAnimationFrame(loop);
  }

  // responsive + init
  function start() {
    resize();
    initStars();
    last = performance.now();
    requestAnimationFrame(loop);
  }

  window.addEventListener("resize", () => {
    resize();
  });

  // spawn constellations periodically with randomized interval
  let constTimer = null;
  function scheduleNextConstellation() {
    const interval = rand(CONST_MIN_INTERVAL, CONST_MAX_INTERVAL);
    constTimer = setTimeout(() => {
      spawnConstellation();
      scheduleNextConstellation();
    }, interval);
  }

  // start everything
  start();
  scheduleNextConstellation();

  // expose a small API for interaction (optional)
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
