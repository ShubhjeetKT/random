const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const livesEl = document.getElementById('lives');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayText = document.getElementById('overlayText');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const keys = {};
const bestKey = 'space-shooter-best-score';
let bestScore = Number(localStorage.getItem(bestKey) || 0);
bestEl.textContent = bestScore;

class Star {
  constructor() {
    this.reset(Math.random() * HEIGHT);
  }
  reset(y = 0) {
    this.x = Math.random() * WIDTH;
    this.y = y;
    this.speed = 0.5 + Math.random() * 2.5;
    this.radius = 1 + Math.random() * 2;
    this.alpha = 0.4 + Math.random() * 0.6;
  }
  update() {
    this.y += this.speed;
    if (this.y > HEIGHT) this.reset(0);
  }
  draw() {
    ctx.beginPath();
    ctx.fillStyle = `rgba(255,255,255,${this.alpha})`;
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

class Bullet {
  constructor(x, y, dy, color, radius = 4) {
    this.x = x;
    this.y = y;
    this.dy = dy;
    this.color = color;
    this.radius = radius;
    this.active = true;
  }
  update() {
    this.y += this.dy;
    if (this.y < -20 || this.y > HEIGHT + 20) this.active = false;
  }
  draw() {
    ctx.beginPath();
    ctx.fillStyle = this.color;
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 5;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 20 + Math.random() * 25;
    this.maxLife = this.life;
    this.color = color;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.96;
    this.vy *= 0.96;
    this.life -= 1;
  }
  draw() {
    if (this.life <= 0) return;
    const alpha = this.life / this.maxLife;
    ctx.beginPath();
    ctx.fillStyle = `${this.color}${Math.max(0.15, alpha).toFixed(2)})`;
    ctx.arc(this.x, this.y, Math.max(1, 4 * alpha), 0, Math.PI * 2);
    ctx.fill();
  }
}

class Player {
  constructor() {
    this.reset();
  }
  reset() {
    this.x = WIDTH / 2;
    this.y = HEIGHT - 70;
    this.width = 36;
    this.height = 40;
    this.speed = 5;
    this.lives = 3;
    this.score = 0;
    this.cooldown = 0;
    this.invincible = 0;
  }
  update(state) {
    if (keys['ArrowLeft'] || keys['a']) this.x -= this.speed;
    if (keys['ArrowRight'] || keys['d']) this.x += this.speed;
    if (keys['ArrowUp'] || keys['w']) this.y -= this.speed;
    if (keys['ArrowDown'] || keys['s']) this.y += this.speed;

    this.x = Math.max(24, Math.min(WIDTH - 24, this.x));
    this.y = Math.max(30, Math.min(HEIGHT - 24, this.y));

    if (this.cooldown > 0) this.cooldown -= 1;
    if (this.invincible > 0) this.invincible -= 1;

    const fireRate = state.rapid > 0 ? 6 : 12;
    if (keys[' '] && this.cooldown <= 0) {
      this.cooldown = fireRate;
      state.playerBullets.push(new Bullet(this.x - 10, this.y - 16, -10, '#4cc9f0'));
      state.playerBullets.push(new Bullet(this.x + 10, this.y - 16, -10, '#4cc9f0'));
    }
  }
  rect() {
    return { x: this.x - 18, y: this.y - 20, w: 36, h: 40 };
  }
  draw(state) {
    if (this.invincible > 0 && Math.floor(this.invincible / 4) % 2 === 0) return;
    const x = this.x;
    const y = this.y;

    if (state.shield > 0) {
      ctx.beginPath();
      ctx.strokeStyle = '#4cc9f0';
      ctx.lineWidth = 2;
      ctx.arc(x, y, 30, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = '#ff9f1c';
    ctx.beginPath();
    ctx.ellipse(x, y + 20, 10, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1f6feb';
    ctx.beginPath();
    ctx.moveTo(x, y - 24);
    ctx.lineTo(x + 18, y + 18);
    ctx.lineTo(x, y + 8);
    ctx.lineTo(x - 18, y + 18);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#cbe7ff';
    ctx.beginPath();
    ctx.ellipse(x, y - 8, 6, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

class Enemy {
  constructor(kind, level) {
    this.kind = kind;
    const types = {
      basic: { hp: 1, speed: 2 + level * 0.08, color: '#ef4444', size: 18, score: 10 },
      fast: { hp: 1, speed: 3.5 + level * 0.1, color: '#f59e0b', size: 14, score: 20 },
      zigzag: { hp: 2, speed: 2.6 + level * 0.08, color: '#22c55e', size: 16, score: 30 },
      tank: { hp: 4, speed: 1.5 + level * 0.05, color: '#a855f7', size: 24, score: 50 },
    };
    Object.assign(this, types[kind]);
    this.maxHp = this.hp;
    this.x = this.size + Math.random() * (WIDTH - this.size * 2);
    this.y = -50 - Math.random() * 120;
    this.shootTimer = 50 + Math.random() * 120;
  }
  update(level) {
    this.y += this.speed;
    if (this.kind === 'zigzag') {
      this.x += Math.sin(this.y * 0.04) * 2.5;
    }
    this.shootTimer -= 1;
  }
  maybeShoot(state) {
    if (this.shootTimer <= 0) {
      this.shootTimer = 80 + Math.random() * 90;
      state.enemyBullets.push(new Bullet(this.x, this.y + this.size, 4.5, '#ff6b6b', 5));
    }
  }
  rect() {
    return { x: this.x - this.size, y: this.y - this.size, w: this.size * 2, h: this.size * 2 };
  }
  hit() {
    this.hp -= 1;
    return this.hp <= 0;
  }
  draw() {
    ctx.fillStyle = this.color;
    if (this.kind === 'tank') {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        const px = this.x + Math.cos(a) * this.size;
        const py = this.y + Math.sin(a) * this.size;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#111827';
      ctx.fillRect(this.x - this.size, this.y - this.size - 10, this.size * 2, 5);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(this.x - this.size, this.y - this.size - 10, (this.size * 2) * (this.hp / this.maxHp), 5);
    } else {
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, this.size, this.size * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

class PowerUp {
  constructor() {
    this.kind = ['shield', 'rapid', 'bomb'][Math.floor(Math.random() * 3)];
    this.x = 30 + Math.random() * (WIDTH - 60);
    this.y = -20;
    this.speed = 2;
    this.angle = 0;
    this.active = true;
  }
  update() {
    this.y += this.speed;
    this.angle += 0.06;
    if (this.y > HEIGHT + 30) this.active = false;
  }
  rect() {
    return { x: this.x - 14, y: this.y - 14, w: 28, h: 28 };
  }
  draw() {
    const colors = { shield: '#4cc9f0', rapid: '#ffd166', bomb: '#f97316' };
    const letters = { shield: 'S', rapid: 'R', bomb: 'B' };
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      const px = Math.cos(a) * 14;
      const py = Math.sin(a) * 14;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = colors[this.kind];
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#08111f';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letters[this.kind], this.x, this.y + 1);
  }
}

function rectsIntersect(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

const state = {
  stars: Array.from({ length: 110 }, () => new Star()),
  player: new Player(),
  playerBullets: [],
  enemyBullets: [],
  enemies: [],
  particles: [],
  powerUps: [],
  running: false,
  gameOver: false,
  level: 1,
  spawnTick: 0,
  powerTick: 0,
  rapid: 0,
  shield: 0,
  bombFlash: 0,
};

function resetGame() {
  state.player.reset();
  state.playerBullets = [];
  state.enemyBullets = [];
  state.enemies = [];
  state.particles = [];
  state.powerUps = [];
  state.running = true;
  state.gameOver = false;
  state.level = 1;
  state.spawnTick = 0;
  state.powerTick = 0;
  state.rapid = 0;
  state.shield = 0;
  state.bombFlash = 0;
  overlay.classList.add('hidden');
  syncHud();
}

function syncHud() {
  scoreEl.textContent = state.player.score;
  levelEl.textContent = state.level;
  livesEl.textContent = state.player.lives;
  if (state.player.score > bestScore) {
    bestScore = state.player.score;
    localStorage.setItem(bestKey, String(bestScore));
  }
  bestEl.textContent = bestScore;
}

function explode(x, y, color, count = 18) {
  for (let i = 0; i < count; i++) state.particles.push(new Particle(x, y, color.replace('rgb', 'rgba')));
}

function enemyKindsForLevel(level) {
  const kinds = ['basic', 'basic', 'fast'];
  if (level >= 2) kinds.push('zigzag');
  if (level >= 3) kinds.push('tank');
  return kinds;
}

function spawnEnemy() {
  const kinds = enemyKindsForLevel(state.level);
  const kind = kinds[Math.floor(Math.random() * kinds.length)];
  state.enemies.push(new Enemy(kind, state.level));
}

function update() {
  for (const s of state.stars) s.update();
  if (!state.running) return;

  state.player.update(state);

  if (state.rapid > 0) state.rapid -= 1;
  if (state.shield > 0) state.shield -= 1;
  if (state.bombFlash > 0) state.bombFlash -= 1;

  state.spawnTick += 1;
  state.powerTick += 1;

  const spawnRate = Math.max(22, 60 - state.level * 3);
  if (state.spawnTick >= spawnRate) {
    state.spawnTick = 0;
    spawnEnemy();
  }

  if (state.powerTick >= 700) {
    state.powerTick = 0;
    state.powerUps.push(new PowerUp());
  }

  if (state.player.score >= state.level * 250) state.level += 1;

  state.playerBullets.forEach(b => b.update());
  state.enemyBullets.forEach(b => b.update());
  state.enemies.forEach(e => {
    e.update(state.level);
    e.maybeShoot(state);
  });
  state.powerUps.forEach(p => p.update());
  state.particles.forEach(p => p.update());

  state.playerBullets = state.playerBullets.filter(b => b.active);
  state.enemyBullets = state.enemyBullets.filter(b => b.active);
  state.enemies = state.enemies.filter(e => e.y < HEIGHT + 80);
  state.powerUps = state.powerUps.filter(p => p.active);
  state.particles = state.particles.filter(p => p.life > 0);

  for (const bullet of state.playerBullets) {
    for (const enemy of [...state.enemies]) {
      if (bullet.active && pointInRect(bullet.x, bullet.y, enemy.rect())) {
        bullet.active = false;
        if (enemy.hit()) {
          state.player.score += enemy.score;
          explode(enemy.x, enemy.y, 'rgba(255,180,80,');
          state.enemies.splice(state.enemies.indexOf(enemy), 1);
        } else {
          explode(enemy.x, enemy.y, 'rgba(255,220,120,', 8);
        }
      }
    }
  }

  if (state.player.invincible <= 0 && state.shield <= 0) {
    for (const bullet of state.enemyBullets) {
      if (bullet.active && pointInRect(bullet.x, bullet.y, state.player.rect())) {
        bullet.active = false;
        damagePlayer();
      }
    }

    for (const enemy of [...state.enemies]) {
      if (rectsIntersect(enemy.rect(), state.player.rect())) {
        state.enemies.splice(state.enemies.indexOf(enemy), 1);
        explode(enemy.x, enemy.y, 'rgba(255,120,120,');
        damagePlayer();
      }
    }
  }

  for (const power of state.powerUps) {
    if (rectsIntersect(power.rect(), state.player.rect())) {
      power.active = false;
      if (power.kind === 'shield') state.shield = 320;
      if (power.kind === 'rapid') state.rapid = 320;
      if (power.kind === 'bomb') {
        state.player.score += state.enemies.length * 5;
        state.enemies.forEach(e => explode(e.x, e.y, 'rgba(255,160,60,'));
        state.enemies = [];
        state.enemyBullets = [];
        state.bombFlash = 16;
      }
    }
  }

  syncHud();
}

function damagePlayer() {
  state.player.lives -= 1;
  state.player.invincible = 90;
  explode(state.player.x, state.player.y, 'rgba(100,200,255,', 14);
  if (state.player.lives <= 0) {
    state.running = false;
    state.gameOver = true;
    overlayTitle.textContent = 'Game Over';
    overlayText.textContent = `Score: ${state.player.score} • Press R to restart`;
    overlay.classList.remove('hidden');
  }
}

function drawStatusBadges() {
  let y = 58;
  if (state.rapid > 0) {
    drawBadge(18, y, `Rapid Fire ${Math.ceil(state.rapid / 60)}s`, '#ffd166');
    y += 28;
  }
  if (state.shield > 0) {
    drawBadge(18, y, `Shield ${Math.ceil(state.shield / 60)}s`, '#4cc9f0');
  }
}

function drawBadge(x, y, text, color) {
  ctx.font = '14px Arial';
  const width = ctx.measureText(text).width + 20;
  ctx.fillStyle = 'rgba(8,17,31,0.8)';
  ctx.fillRect(x, y, width, 22);
  ctx.strokeStyle = color;
  ctx.strokeRect(x, y, width, 22);
  ctx.fillStyle = color;
  ctx.fillText(text, x + 10, y + 15);
}

function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = '#040814';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (const s of state.stars) s.draw();
  for (const p of state.particles) p.draw();
  for (const power of state.powerUps) power.draw();
  for (const e of state.enemies) e.draw();
  for (const b of state.enemyBullets) b.draw();
  for (const b of state.playerBullets) b.draw();

  if (state.bombFlash > 0) {
    ctx.fillStyle = `rgba(255, 120, 0, ${state.bombFlash / 16 * 0.35})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  state.player.draw(state);
  drawStatusBadges();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (e) => {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  keys[key] = true;

  if (!state.running && !state.gameOver && e.key === ' ') {
    resetGame();
  }
  if (state.gameOver && (e.key === 'r' || e.key === 'R')) {
    resetGame();
  }

  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
    e.preventDefault();
  }
});

window.addEventListener('keyup', (e) => {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  keys[key] = false;
});

overlay.classList.remove('hidden');
overlayTitle.textContent = 'Space Shooter';
overlayText.textContent = 'Press Space to start';
loop();
