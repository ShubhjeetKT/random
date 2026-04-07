const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const speedEl = document.getElementById('speed');
const streakEl = document.getElementById('streak');
const overlay = document.getElementById('overlay');
const titleEl = document.getElementById('title');
const subtitleEl = document.getElementById('subtitle');
const startBtn = document.getElementById('startBtn');

const W = canvas.width;
const H = canvas.height;

const SHAPES = ['dash', 'tank', 'phase'];
const SHAPE_COLORS = {
  dash: '#22d3ee',
  tank: '#f59e0b',
  phase: '#a78bfa',
};

let best = Number(localStorage.getItem('shape-shifter-best') || 0);
bestEl.textContent = best;

const state = {
  running: false,
  gameOver: false,
  score: 0,
  speed: 4,
  streak: 0,
  shapeIndex: 0,
  spawnTimer: 0,
  spawnEvery: 95,
  pulse: 0,
  obstacles: [],
  particles: [],
  stars: Array.from({ length: 90 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    s: 0.7 + Math.random() * 2.2,
    a: 0.2 + Math.random() * 0.6,
  })),
};

const player = {
  x: 120,
  y: H / 2,
  size: 34,
};

function shapeName(s) {
  return s[0].toUpperCase() + s.slice(1);
}

function currentShape() {
  return SHAPES[state.shapeIndex];
}

function cycleShape() {
  if (!state.running || state.gameOver) return;
  state.shapeIndex = (state.shapeIndex + 1) % SHAPES.length;
  state.pulse = 10;
}

function resetGame() {
  state.running = true;
  state.gameOver = false;
  state.score = 0;
  state.speed = 4;
  state.streak = 0;
  state.shapeIndex = 0;
  state.spawnTimer = 0;
  state.spawnEvery = 95;
  state.obstacles = [];
  state.particles = [];
  state.pulse = 0;
  overlay.classList.add('hidden');
  syncHud();
}

function syncHud() {
  scoreEl.textContent = Math.floor(state.score);
  streakEl.textContent = state.streak;
  speedEl.textContent = `${(state.speed / 4).toFixed(1)}x`;
  if (state.score > best) {
    best = Math.floor(state.score);
    localStorage.setItem('shape-shifter-best', String(best));
  }
  bestEl.textContent = best;
}

function spawnObstacle() {
  const required = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  const lane = Math.floor(Math.random() * 3);
  const laneY = [H * 0.28, H * 0.5, H * 0.72][lane];
  state.obstacles.push({
    x: W + 60,
    y: laneY,
    w: 68,
    h: 68,
    required,
    passed: false,
  });
}

function explode(x, y, color, count = 16) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 1 + Math.random() * 5;
    state.particles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 22 + Math.random() * 16,
      max: 36,
      c: color,
    });
  }
}

function fail(obstacle) {
  state.running = false;
  state.gameOver = true;
  explode(player.x, player.y, '#fb7185', 36);
  showOverlay(
    'Shape Mismatch!',
    `Gate wanted ${shapeName(obstacle.required)} • You were ${shapeName(currentShape())}`,
    'Try Again'
  );
}

function showOverlay(title, subtitle, button) {
  titleEl.textContent = title;
  subtitleEl.textContent = subtitle;
  startBtn.textContent = button;
  overlay.classList.remove('hidden');
}

function update() {
  for (const st of state.stars) {
    st.x -= st.s * 0.2;
    if (st.x < -2) st.x = W + 2;
  }

  for (const p of state.particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.life -= 1;
  }
  state.particles = state.particles.filter((p) => p.life > 0);

  if (!state.running) return;

  state.score += 0.12 + state.speed * 0.01;
  state.speed += 0.0008;
  state.spawnEvery = Math.max(48, 95 - state.score * 0.03);

  state.spawnTimer += 1;
  if (state.spawnTimer >= state.spawnEvery) {
    state.spawnTimer = 0;
    spawnObstacle();
  }

  const pLeft = player.x - player.size * 0.55;
  const pRight = player.x + player.size * 0.55;
  const pTop = player.y - player.size * 0.55;
  const pBottom = player.y + player.size * 0.55;

  for (const o of state.obstacles) {
    o.x -= state.speed;

    const overlap = !(pRight < o.x || pLeft > o.x + o.w || pBottom < o.y - o.h / 2 || pTop > o.y + o.h / 2);

    if (overlap && !o.passed) {
      if (o.required === currentShape()) {
        o.passed = true;
        state.streak += 1;
        state.score += 10 + state.streak * 1.5;
        explode(o.x + o.w / 2, o.y, SHAPE_COLORS[o.required], 10);
      } else {
        fail(o);
      }
    }

    if (o.x + o.w < 0 && !o.passed) {
      fail(o);
    }
  }

  const before = state.obstacles.length;
  state.obstacles = state.obstacles.filter((o) => o.x + o.w > -80);
  if (state.obstacles.length < before && state.streak > 0) {
    state.streak = Math.max(0, state.streak - 1);
  }

  if (state.pulse > 0) state.pulse -= 1;
  syncHud();
}

function drawPlayer() {
  const shape = currentShape();
  const c = SHAPE_COLORS[shape];
  const s = player.size + state.pulse * 0.9;

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.shadowBlur = 18;
  ctx.shadowColor = c;
  ctx.fillStyle = c;

  if (shape === 'dash') {
    ctx.beginPath();
    ctx.moveTo(-s * 0.68, 0);
    ctx.lineTo(0, -s * 0.58);
    ctx.lineTo(s * 0.68, 0);
    ctx.lineTo(0, s * 0.58);
    ctx.closePath();
    ctx.fill();
  } else if (shape === 'tank') {
    const w = s * 1.15;
    const h = s * 0.9;
    roundRect(ctx, -w / 2, -h / 2, w, h, 10);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.52, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(s * 0.14, -s * 0.12, s * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawObstacle(o) {
  ctx.save();
  ctx.translate(o.x + o.w / 2, o.y);
  ctx.strokeStyle = SHAPE_COLORS[o.required];
  ctx.lineWidth = 3;
  ctx.fillStyle = 'rgba(8, 14, 30, 0.72)';
  roundRect(ctx, -o.w / 2, -o.h / 2, o.w, o.h, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = SHAPE_COLORS[o.required];
  if (o.required === 'dash') {
    ctx.beginPath();
    ctx.moveTo(-16, 0);
    ctx.lineTo(0, -14);
    ctx.lineTo(16, 0);
    ctx.lineTo(0, 14);
    ctx.closePath();
    ctx.fill();
  } else if (o.required === 'tank') {
    roundRect(ctx, -15, -12, 30, 24, 6);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawParticles() {
  for (const p of state.particles) {
    const a = Math.max(0, p.life / p.max);
    ctx.fillStyle = `${hexToRgba(p.c, a)}`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.6 * a + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBackground() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#060b1a';
  ctx.fillRect(0, 0, W, H);

  for (const st of state.stars) {
    ctx.fillStyle = `rgba(255,255,255,${st.a})`;
    ctx.fillRect(st.x, st.y, st.s, st.s);
  }

  const lanes = [H * 0.28, H * 0.5, H * 0.72];
  ctx.strokeStyle = 'rgba(128, 181, 255, 0.15)';
  ctx.lineWidth = 2;
  for (const y of lanes) {
    ctx.beginPath();
    ctx.moveTo(0, y + 38);
    ctx.lineTo(W, y + 38);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(123, 180, 255, 0.12)';
  ctx.fillRect(player.x - 4, 0, 8, H);
}

function drawShapeHint() {
  const shape = currentShape();
  ctx.fillStyle = 'rgba(7, 14, 30, 0.72)';
  roundRect(ctx, 18, 18, 145, 58, 10);
  ctx.fill();
  ctx.strokeStyle = SHAPE_COLORS[shape];
  ctx.lineWidth = 2;
  roundRect(ctx, 18, 18, 145, 58, 10);
  ctx.stroke();
  ctx.fillStyle = '#cfe6ff';
  ctx.font = 'bold 14px Segoe UI';
  ctx.fillText('Current Shape', 30, 40);
  ctx.fillStyle = SHAPE_COLORS[shape];
  ctx.font = 'bold 18px Segoe UI';
  ctx.fillText(shapeName(shape), 30, 63);
}

function draw() {
  drawBackground();
  for (const o of state.obstacles) drawObstacle(o);
  drawPlayer();
  drawParticles();
  drawShapeHint();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const bigint = parseInt(h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (!state.running) {
      resetGame();
    } else {
      cycleShape();
    }
  }
});

canvas.addEventListener('pointerdown', () => {
  if (!state.running) {
    resetGame();
  } else {
    cycleShape();
  }
});

startBtn.addEventListener('click', () => {
  resetGame();
});

showOverlay('Ready?', 'One button. Infinite chaos.', 'Start');
loop();
