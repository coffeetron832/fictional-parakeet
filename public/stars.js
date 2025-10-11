// public/stars.js
(function () {
  if (window._paraleelStarsInitialized) return;
  window._paraleelStarsInitialized = true;

  const canvas = document.createElement("canvas");
  canvas.id = "stars";
  document.body.prepend(canvas);
  const ctx = canvas.getContext("2d", { alpha: true });

  // configuración (ajustada)
  const STAR_COUNT = 55; // reducido aún más para menos destellos simultáneos
  const MICROB_LINK_PROB = 0.001; // micro-líneas raras
  const STAR_MIN_RADIUS = 0.6;
  const STAR_MAX_RADIUS = 2.2;

  // shooting star (estrella fugaz) timing
  const SHOOT_MIN_INTERVAL = 12000; // 12s
  const SHOOT_MAX_INTERVAL = 35000; // 35s
  const SHOOT_MIN_SPEED = 900; // px/s
  const SHOOT_MAX_SPEED = 1800; // px/s
  const SHOOT_MIN_LEN = 80; // px tail length
  const SHOOT_MAX_LEN = 240;

  let DPR = Math.max(1, window.devicePixelRatio || 1);
  let width = 0;
  let height = 0;

  const stars = [];
  const shootingStars = [];

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

  // Star factory (menor brillo y más lento)
  function createStar(x = Math.random() * width, y = Math.random() * height) {
    const r = rand(STAR_MIN_RADIUS, STAR_MAX_RADIUS);
    return {
      x,
      y,
      r,
      baseAlpha: rand(0.03, 0.45), // menos prob. de brillos fuertes
      alpha: 0,
      twinkleSpeed: rand(0.001, 0.012), // más lento
      phase: Math.random() * Math.PI * 2,
      driftX: rand(-6, 6),
      driftY: rand(6, 18)
    };
  }

  function initStars() {
    stars.length = 0;
    for (let i = 0; i < STAR_COUNT; i++) {
      // distribuir ligeramente hacia la parte superior
      const x = Math.random() * width;
      const y = Math.pow(Math.random(), 1.2) * height * 0.85;
      stars.push(createStar(x, y));
    }
  }

  // Draw star using white gradients
  function drawStar(s) {
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 6);
    const glow = Math.min(1, s.baseAlpha);
    g.addColorStop(0, `rgba(255,255,255,${glow * s.alpha})`);
    g.addColorStop(0.25, `rgba(255,255,255,${0.12 * s.alpha})`);
    g.addColorStop(1, `rgba(255,255,255,0)`);
    ctx.beginPath();
    ctx.fillStyle = g;
    ctx.arc(s.x, s.y, s.r * (0.9 + 0.5 * s.alpha), 0, Math.PI * 2);
    ctx.fill();
  }

  // Shooting star factory
  function spawnShootingStar() {
    // start near top-left or top-right, move across diagonally toward bottom/center
    const fromLeft = Math.random() < 0.5;
    const x0 = fromLeft ? rand(-0.05 * width, 0.2 * width) : rand(0.8 * width, width * 1.05);
    const y0 = rand(0.02 * height, 0.25 * height);
    // pick angle roughly downward towards center-ish
    const angle = fromLeft ? rand(0.2, 0.6) : rand(2.5, 3.0); // radians approx
    const speed = rand(SHOOT_MIN_SPEED, SHOOT_MAX_SPEED); // px/s
    const len = rand(SHOOT_MIN_LEN, SHOOT_MAX_LEN);
    const life = Math.min(6, (Math.hypot(width, height) / speed)); // cap life ~6s

    shootingStars.push({
      x: x0,
      y: y0,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      len,
      life,
      age: 0
    });

    // schedule next
    scheduleNextShootingStar();
  }

  let shootTimer = null;
  function scheduleNextShootingStar() {
    if (shootTimer) clearTimeout(shootTimer);
    const interval = rand(SHOOT_MIN_INTERVAL, SHOOT_MAX_INTERVAL);
    shootTimer = setTimeout(() => {
      // small chance to spawn 1-2 quick meteors
      spawnShootingStar();
      if (Math.random() < 0.12) {
        setTimeout(spawnShootingStar, rand(220, 900));
      }
    }, interval);
  }

  // draw shooting star (head + tail gradient)
  function drawShootingStar(s) {
    // head
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    // compute tail end
    const tx = s.x - (s.vx / Math.hypot(s.vx, s.vy)) * s.len;
    const ty = s.y - (s.vy / Math.hypot(s.vx, s.vy)) * s.len;

    // tail gradient
    const grad = ctx.createLinearGradient(s.x, s.y, tx, ty);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.3, "rgba(255,255,255,0.6)");
    grad.addColorStop(1, "rgba(255,255,255,0)");

    ctx.strokeStyle = grad;
    ctx.lineWidth = Math.max(1, s.len / 40);
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(tx, ty);
    ctx.stroke();

    // head glow
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 12);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.3, "rgba(255,255,255,0.6)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 3.5 + (s.len / 120), 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // occasional micro connections (very subtle, white)
  function maybeMicroLinks() {
    if (!chance(MICROB_LINK_PROB)) return;
    const a = stars[Math.floor(Math.random() * stars.length)];
    const b = stars[Math.floor(Math.random() * stars.length)];
    if (a && b && Math.hypot(a.x - b.x, a.y - b.y) < 120) {
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  // animation loop
  let last = performance.now();
  function loop(now) {
    const dt = Math.max(16, now - last); // ms
    last = now;
    ctx.clearRect(0, 0, width, height);

    // faint radial vignette for depth
    const cx = width / 2;
    const cy = height / 2;
    const rg = ctx.createRadialGradient(cx, cy - height * 0.15, 50, cx, cy, Math.max(width, height) * 0.9);
    rg.addColorStop(0, "rgba(0,0,0,0)");
    rg.addColorStop(1, "rgba(0,0,0,0.12)");
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, width, height);

    // update & draw stars
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.phase += s.twinkleSpeed * dt;
      s.alpha = (Math.sin(s.phase) + 1) / 2 * s.baseAlpha;
      // very subtle motion
      s.y += (s.driftY * dt / 10000) * (0.12 + Math.random() * 0.5);
      s.x += (s.driftX * dt / 100000);

      // respawn if below
      if (s.y > height + 20) {
        s.x = Math.random() * width;
        s.y = -10;
        s.phase = Math.random() * Math.PI * 2;
      }
      drawStar(s);
    }

    // micro links occasionally
    maybeMicroLinks();

    // update & draw shooting stars
    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const s = shootingStars[i];
      const dtSec = dt / 1000;
      s.x += s.vx * dtSec;
      s.y += s.vy * dtSec;
      s.age += dtSec;

      drawShootingStar(s);

      // remove if out of bounds or life ended
      if (s.age >= s.life || s.x < -100 || s.x > width + 100 || s.y < -100 || s.y > height + 100) {
        shootingStars.splice(i, 1);
      }
    }

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
    // regenerate stars a bit to adapt density visually
    initStars();
  });

  // start & schedule shooting stars
  start();
  scheduleNextShootingStar();

  // expose small API
  window._paraleelStars = {
    createStarAt: (x, y) => {
      stars.push(createStar(x, y));
    },
    spawnShootingStar: spawnShootingStar,
    stop: () => {
      if (shootTimer) clearTimeout(shootTimer);
      window._paraleelStarsInitialized = false;
    }
  };

})();
