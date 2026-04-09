const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const hpEl = document.getElementById('hp');
const ammoEl = document.getElementById('ammo');
const waveEl = document.getElementById('wave');
const killsEl = document.getElementById('kills');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const ovTitle = document.getElementById('ovTitle');
const ovText = document.getElementById('ovText');
const startBtn = document.getElementById('startBtn');

const W = canvas.width;
const H = canvas.height;
const FOV = Math.PI / 3;
const keys = {};
const map = [
  '1111111111111111',
  '1000000000000001',
  '1011110111111101',
  '1000010000000101',
  '1011011110110101',
  '1011000010110101',
  '1000011010000101',
  '1011111011111101',
  '1000001000000001',
  '1110111011110101',
  '1000100000010001',
  '1011101111011101',
  '1000000000000001',
  '1011111111111101',
  '1000000000000001',
  '1111111111111111',
];

const state = {
  running: false,
  gameOver: false,
  hp: 100,
  ammo: 12,
  maxAmmo: 12,
  reloadTime: 0,
  shootCd: 0,
  kills: 0,
  wave: 1,
  muzzle: 0,
  waveTimer: 0,
  enemies: [],
  zBuffer: new Array(W).fill(1e9),
};

const player = {
  x: 2.5,
  y: 2.5,
  angle: 0,
};

let lastTime = 0;
let best = Number(localStorage.getItem('fps-blitz-best') || 0);
bestEl.textContent = best;

function isWall(x, y) {
  const mx = Math.floor(x);
  const my = Math.floor(y);
  if (my < 0 || my >= map.length || mx < 0 || mx >= map[0].length) return true;
  return map[my][mx] === '1';
}

function canMove(x, y, r = 0.18) {
  return !(
    isWall(x - r, y - r) || isWall(x + r, y - r) ||
    isWall(x - r, y + r) || isWall(x + r, y + r)
  );
}

function randomSpawnPoint() {
  for (let i = 0; i < 120; i++) {
    const x = 1.5 + Math.random() * 13;
    const y = 1.5 + Math.random() * 13;
    if (!isWall(x, y) && Math.hypot(x - player.x, y - player.y) > 4) return { x, y };
  }
  return { x: 13.5, y: 13.5 };
}

function spawnWave(level) {
  const count = 2 + level * 2;
  for (let i = 0; i < count; i++) {
    const p = randomSpawnPoint();
    state.enemies.push({
      x: p.x,
      y: p.y,
      hp: 60 + level * 8,
      speed: 0.75 + level * 0.04,
      hitCd: 0,
      alive: true,
      screen: null,
    });
  }
}

function resetGame() {
  state.running = true;
  state.gameOver = false;
  state.hp = 100;
  state.ammo = state.maxAmmo;
  state.reloadTime = 0;
  state.shootCd = 0;
  state.kills = 0;
  state.wave = 1;
  state.muzzle = 0;
  state.waveTimer = 0;
  state.enemies = [];
  player.x = 2.5;
  player.y = 2.5;
  player.angle = 0;
  spawnWave(state.wave);
  overlay.classList.add('hidden');
  syncHud();
}

function syncHud() {
  hpEl.textContent = Math.max(0, Math.floor(state.hp));
  ammoEl.textContent = state.reloadTime > 0 ? 'Reload...' : `${state.ammo}`;
  waveEl.textContent = state.wave;
  killsEl.textContent = state.kills;
  if (state.kills > best) {
    best = state.kills;
    localStorage.setItem('fps-blitz-best', String(best));
  }
  bestEl.textContent = best;
}

function showOverlay(title, text, button = 'Start') {
  ovTitle.textContent = title;
  ovText.textContent = text;
  startBtn.textContent = button;
  overlay.classList.remove('hidden');
}

function gameOver() {
  state.running = false;
  state.gameOver = true;
  showOverlay('Mission Failed', `Kills: ${state.kills} • Wave: ${state.wave}`, 'Retry');
}

function reload() {
  if (state.reloadTime > 0 || state.ammo === state.maxAmmo) return;
  state.reloadTime = 1.1;
}

function handleShoot() {
  if (!state.running || state.reloadTime > 0 || state.shootCd > 0) return;
  if (state.ammo <= 0) {
    reload();
    return;
  }

  state.ammo -= 1;
  state.shootCd = 0.2;
  state.muzzle = 0.08;

  const cx = W / 2;
  const cy = H / 2;
  let bestTarget = null;
  let bestDist = Infinity;

  for (const enemy of state.enemies) {
    if (!enemy.alive || !enemy.screen) continue;
    const s = enemy.screen;
    const hit = cx >= s.x && cx <= s.x + s.w && cy >= s.y && cy <= s.y + s.h;
    if (hit && s.dist < bestDist) {
      bestDist = s.dist;
      bestTarget = enemy;
    }
  }

  if (bestTarget) {
    bestTarget.hp -= 40;
    if (bestTarget.hp <= 0) {
      bestTarget.alive = false;
      state.kills += 1;
    }
  }
}

function movePlayer(dt) {
  const moveSpeed = 2.9 * dt;
  const rotSpeed = 2.2 * dt;

  if (keys['ArrowLeft']) player.angle -= rotSpeed;
  if (keys['ArrowRight']) player.angle += rotSpeed;

  const forward = (keys['w'] ? 1 : 0) - (keys['s'] ? 1 : 0);
  const strafe = (keys['d'] ? 1 : 0) - (keys['a'] ? 1 : 0);

  let nx = player.x;
  let ny = player.y;

  if (forward !== 0) {
    nx += Math.cos(player.angle) * moveSpeed * forward;
    ny += Math.sin(player.angle) * moveSpeed * forward;
  }
  if (strafe !== 0) {
    nx += Math.cos(player.angle + Math.PI / 2) * moveSpeed * strafe;
    ny += Math.sin(player.angle + Math.PI / 2) * moveSpeed * strafe;
  }

  if (canMove(nx, player.y)) player.x = nx;
  if (canMove(player.x, ny)) player.y = ny;
}

function updateEnemies(dt) {
  for (const e of state.enemies) {
    if (!e.alive) continue;

    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 1.15) {
      const vx = (dx / dist) * e.speed * dt;
      const vy = (dy / dist) * e.speed * dt;
      const nx = e.x + vx;
      const ny = e.y + vy;
      if (canMove(nx, e.y, 0.16)) e.x = nx;
      if (canMove(e.x, ny, 0.16)) e.y = ny;
    }

    if (e.hitCd > 0) e.hitCd -= dt;
    if (dist <= 1.35 && e.hitCd <= 0) {
      state.hp -= 10;
      e.hitCd = 0.9;
      if (state.hp <= 0) {
        state.hp = 0;
        gameOver();
      }
    }
  }

  state.enemies = state.enemies.filter((e) => e.alive);

  if (state.enemies.length === 0 && state.running) {
    state.waveTimer += dt;
    if (state.waveTimer >= 1.2) {
      state.wave += 1;
      state.waveTimer = 0;
      spawnWave(state.wave);
    }
  }
}

function update(dt) {
  if (!state.running) return;

  if (state.reloadTime > 0) {
    state.reloadTime -= dt;
    if (state.reloadTime <= 0) {
      state.reloadTime = 0;
      state.ammo = state.maxAmmo;
    }
  }

  if (state.shootCd > 0) state.shootCd -= dt;
  if (state.muzzle > 0) state.muzzle -= dt;

  movePlayer(dt);
  updateEnemies(dt);

  if (keys[' ']) handleShoot();

  syncHud();
}

function raycastColumn(col) {
  const cameraX = 2 * col / W - 1;
  const rayAngle = player.angle + Math.atan(cameraX * Math.tan(FOV / 2));
  const rayDirX = Math.cos(rayAngle);
  const rayDirY = Math.sin(rayAngle);

  let mapX = Math.floor(player.x);
  let mapY = Math.floor(player.y);

  const deltaDistX = Math.abs(1 / (rayDirX || 1e-6));
  const deltaDistY = Math.abs(1 / (rayDirY || 1e-6));

  let stepX, sideDistX;
  if (rayDirX < 0) {
    stepX = -1;
    sideDistX = (player.x - mapX) * deltaDistX;
  } else {
    stepX = 1;
    sideDistX = (mapX + 1 - player.x) * deltaDistX;
  }

  let stepY, sideDistY;
  if (rayDirY < 0) {
    stepY = -1;
    sideDistY = (player.y - mapY) * deltaDistY;
  } else {
    stepY = 1;
    sideDistY = (mapY + 1 - player.y) * deltaDistY;
  }

  let hit = false;
  let side = 0;
  while (!hit) {
    if (sideDistX < sideDistY) {
      sideDistX += deltaDistX;
      mapX += stepX;
      side = 0;
    } else {
      sideDistY += deltaDistY;
      mapY += stepY;
      side = 1;
    }
    if (map[mapY]?.[mapX] === '1') hit = true;
  }

  let perpDist;
  if (side === 0) perpDist = (mapX - player.x + (1 - stepX) / 2) / (rayDirX || 1e-6);
  else perpDist = (mapY - player.y + (1 - stepY) / 2) / (rayDirY || 1e-6);

  return { dist: Math.max(0.0001, perpDist), side };
}

function renderWorld() {
  ctx.fillStyle = '#10244b';
  ctx.fillRect(0, 0, W, H / 2);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, H / 2, W, H / 2);

  for (let x = 0; x < W; x++) {
    const ray = raycastColumn(x);
    state.zBuffer[x] = ray.dist;

    const lineHeight = Math.min(H, Math.floor(H / ray.dist));
    const y = (H - lineHeight) / 2;
    const shade = Math.max(45, 210 - ray.dist * 22 - (ray.side ? 25 : 0));
    ctx.fillStyle = `rgb(${shade * 0.55}, ${shade * 0.75}, ${shade})`;
    ctx.fillRect(x, y, 1, lineHeight);
  }
}

function renderEnemies() {
  const list = state.enemies.map((e) => {
    const dx = e.x - player.x;
    const dy = e.y - player.y;
    return { e, dist: Math.hypot(dx, dy) };
  }).sort((a, b) => b.dist - a.dist);

  for (const item of list) {
    const e = item.e;
    const dx = e.x - player.x;
    const dy = e.y - player.y;
    let angle = Math.atan2(dy, dx) - player.angle;
    while (angle < -Math.PI) angle += Math.PI * 2;
    while (angle > Math.PI) angle -= Math.PI * 2;

    if (Math.abs(angle) > FOV * 0.65) {
      e.screen = null;
      continue;
    }

    const dist = Math.max(0.0001, item.dist);
    const size = Math.min(H * 0.85, H / dist);
    const sx = (0.5 + angle / FOV) * W;
    const sy = H / 2 - size / 2;
    const startX = Math.floor(sx - size / 2);
    const endX = Math.floor(sx + size / 2);

    for (let x = startX; x <= endX; x++) {
      if (x < 0 || x >= W) continue;
      if (dist < state.zBuffer[x]) {
        const intensity = Math.max(0.25, 1 - dist / 11);
        ctx.fillStyle = `rgba(${Math.floor(240 * intensity)},${Math.floor(70 * intensity)},${Math.floor(70 * intensity)},1)`;
        ctx.fillRect(x, sy, 1, size);
      }
    }

    e.screen = { x: sx - size / 2, y: sy, w: size, h: size, dist };

    // health bar
    const hpPct = Math.max(0, e.hp / (60 + state.wave * 8));
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(sx - size / 2, sy - 10, size, 5);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(sx - size / 2, sy - 10, size * hpPct, 5);
  }
}

function renderCrosshair() {
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  const cx = W / 2;
  const cy = H / 2;
  ctx.beginPath();
  ctx.moveTo(cx - 10, cy);
  ctx.lineTo(cx + 10, cy);
  ctx.moveTo(cx, cy - 10);
  ctx.lineTo(cx, cy + 10);
  ctx.stroke();

  if (state.muzzle > 0) {
    ctx.fillStyle = `rgba(255,180,60,${Math.min(0.6, state.muzzle * 8)})`;
    ctx.beginPath();
    ctx.arc(cx, cy, 16 + state.muzzle * 120, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderMiniMap() {
  const scale = 8;
  const ox = 14;
  const oy = H - map.length * scale - 14;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(ox - 6, oy - 6, map[0].length * scale + 12, map.length * scale + 12);

  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      ctx.fillStyle = map[y][x] === '1' ? '#334155' : '#0b1226';
      ctx.fillRect(ox + x * scale, oy + y * scale, scale - 1, scale - 1);
    }
  }

  for (const e of state.enemies) {
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(ox + e.x * scale - 2, oy + e.y * scale - 2, 4, 4);
  }

  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(ox + player.x * scale - 2, oy + player.y * scale - 2, 4, 4);
  ctx.strokeStyle = '#38bdf8';
  ctx.beginPath();
  ctx.moveTo(ox + player.x * scale, oy + player.y * scale);
  ctx.lineTo(ox + (player.x + Math.cos(player.angle) * 1.2) * scale, oy + (player.y + Math.sin(player.angle) * 1.2) * scale);
  ctx.stroke();
}

function render() {
  renderWorld();
  renderEnemies();
  renderCrosshair();
  renderMiniMap();
}

function loop(ts) {
  const dt = Math.min(0.033, (ts - lastTime) / 1000 || 0.016);
  lastTime = ts;

  update(dt);
  render();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (e) => {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  keys[key] = true;

  if (e.code === 'Space') {
    e.preventDefault();
    if (!state.running) resetGame();
    else handleShoot();
  }

  if ((e.key === 'r' || e.key === 'R') && state.running) reload();
});

window.addEventListener('keyup', (e) => {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  keys[key] = false;
});

canvas.addEventListener('pointerdown', () => {
  if (!state.running) resetGame();
  else handleShoot();
});

startBtn.addEventListener('click', () => {
  resetGame();
});

showOverlay('FPS Blitz', 'WASD move • Arrow keys turn • Click/Space shoot • R reload', 'Start Mission');
syncHud();
requestAnimationFrame(loop);
