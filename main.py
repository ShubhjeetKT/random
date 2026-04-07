import pygame
import random
import math

WIDTH, HEIGHT   = 800, 600
FPS             = 60
WHITE           = (255, 255, 255)
BLACK           = (0,   0,   0)
RED             = (220,  50,  50)
GREEN           = ( 50, 220,  50)
CYAN            = (  0, 220, 220)
YELLOW          = (255, 220,   0)
ORANGE          = (255, 140,   0)
PURPLE          = (160,  32, 240)
DARK_BLUE       = (  5,   5,  25)
NEON_BLUE       = ( 30, 144, 255)

class Star:
    def __init__(self):
        self.reset(random.randint(0, HEIGHT))
    def reset(self, y=0):
        self.x      = random.randint(0, WIDTH)
        self.y      = y
        self.speed  = random.uniform(0.5, 2.5)
        self.size   = random.randint(1, 3)
        self.bright = random.randint(100, 255)
    def update(self):
        self.y += self.speed
        if self.y > HEIGHT:
            self.reset()
    def draw(self, s):
        c = (self.bright, self.bright, self.bright)
        pygame.draw.circle(s, c, (int(self.x), int(self.y)), self.size)

class Bullet:
    def __init__(self, x, y, dy=-10, color=YELLOW, radius=4):
        self.x, self.y = x, y
        self.dy = dy; self.color = color; self.radius = radius; self.active = True
    def update(self):
        self.y += self.dy
        if self.y < -10 or self.y > HEIGHT + 10:
            self.active = False
    def draw(self, s):
        pygame.draw.circle(s, self.color, (int(self.x), int(self.y)), self.radius)
        pygame.draw.circle(s, self.color, (int(self.x), int(self.y + self.radius + 2)), self.radius - 1)

class Particle:
    def __init__(self, x, y, color):
        self.x, self.y = x, y
        angle = random.uniform(0, 2 * math.pi)
        speed = random.uniform(1, 6)
        self.vx = math.cos(angle) * speed
        self.vy = math.sin(angle) * speed
        self.color = color
        self.life = random.randint(20, 45)
        self.max_life = self.life
    def update(self):
        self.x += self.vx; self.y += self.vy
        self.vx *= 0.92;   self.vy *= 0.92
        self.life -= 1
    def draw(self, s):
        if self.life > 0:
            r = max(1, int(4 * self.life / self.max_life))
            col = tuple(min(255, c) for c in self.color)
            pygame.draw.circle(s, col, (int(self.x), int(self.y)), r)

class Player:
    W = 40; H = 50; SPEED = 5
    def __init__(self):
        self.x = WIDTH // 2; self.y = HEIGHT - 80
        self.hp = 3; self.shoot_cooldown = 0; self.invincible = 0; self.score = 0
    def update(self, keys):
        if keys[pygame.K_LEFT]  or keys[pygame.K_a]: self.x -= self.SPEED
        if keys[pygame.K_RIGHT] or keys[pygame.K_d]: self.x += self.SPEED
        if keys[pygame.K_UP]    or keys[pygame.K_w]: self.y -= self.SPEED
        if keys[pygame.K_DOWN]  or keys[pygame.K_s]: self.y += self.SPEED
        self.x = max(self.W // 2, min(WIDTH  - self.W // 2, self.x))
        self.y = max(self.H // 2, min(HEIGHT - self.H // 2, self.y))
        if self.shoot_cooldown > 0: self.shoot_cooldown -= 1
        if self.invincible     > 0: self.invincible     -= 1
    def shoot(self):
        if self.shoot_cooldown == 0:
            self.shoot_cooldown = 12
            return [Bullet(self.x-12, self.y-20, dy=-12, color=CYAN),
                    Bullet(self.x+12, self.y-20, dy=-12, color=CYAN)]
        return []
    def draw(self, s):
        if self.invincible > 0 and (self.invincible // 4) % 2 == 0:
            return
        cx, cy = self.x, self.y
        pygame.draw.ellipse(s, (255,100,0), (cx-12, cy+18, 24, 14))
        pygame.draw.ellipse(s, YELLOW,      (cx-8,  cy+20, 16,  8))
        body = [(cx,cy-25),(cx+20,cy+20),(cx,cy+10),(cx-20,cy+20)]
        pygame.draw.polygon(s, NEON_BLUE, body)
        pygame.draw.polygon(s, CYAN, body, 2)
        lw = [(cx-20,cy+20),(cx-38,cy+28),(cx-14,cy+4)]
        rw = [(cx+20,cy+20),(cx+38,cy+28),(cx+14,cy+4)]
        pygame.draw.polygon(s,(30,90,180),lw); pygame.draw.polygon(s,CYAN,lw,2)
        pygame.draw.polygon(s,(30,90,180),rw); pygame.draw.polygon(s,CYAN,rw,2)
        pygame.draw.ellipse(s,(200,230,255),(cx-7,cy-14,14,18))
    def rect(self):
        return pygame.Rect(self.x-18, self.y-20, 36, 40)

class Enemy:
    TYPES = {
        'basic':  {'hp':1,'speed':2.0,'color':RED,   'score':10,'size':20},
        'fast':   {'hp':1,'speed':4.0,'color':ORANGE,'score':20,'size':16},
        'tank':   {'hp':4,'speed':1.2,'color':PURPLE,'score':50,'size':28},
        'zigzag': {'hp':2,'speed':2.5,'color':GREEN, 'score':30,'size':18},
    }
    def __init__(self, kind='basic'):
        self.kind = kind
        cfg = self.TYPES[kind]
        self.hp = self.max_hp = cfg['hp']
        self.speed = cfg['speed']; self.color = cfg['color']
        self.score_val = cfg['score']; self.size = cfg['size']
        self.x = random.randint(self.size, WIDTH - self.size)
        self.y = random.randint(-120, -self.size)
        self.angle = 0; self.shoot_timer = random.randint(60, 180)
    def update(self):
        self.y += self.speed
        if self.kind == 'zigzag':
            self.x += math.sin(self.y * 0.05) * 3
            self.x = max(self.size, min(WIDTH - self.size, self.x))
        self.angle += 2; self.shoot_timer -= 1
    def should_shoot(self):
        if self.shoot_timer <= 0:
            self.shoot_timer = random.randint(90, 200); return True
        return False
    def shoot(self):
        return [Bullet(self.x, self.y + self.size, dy=5, color=RED, radius=5)]
    def draw(self, s):
        cx, cy, sz = int(self.x), int(self.y), self.size
        if self.kind == 'tank':
            pts = [(cx+int(sz*math.cos(math.radians(self.angle+60*i))),
                    cy+int(sz*math.sin(math.radians(self.angle+60*i)))) for i in range(6)]
            pygame.draw.polygon(s, self.color, pts)
            pygame.draw.polygon(s, WHITE, pts, 2)
            bw = sz*2; filled = int(bw * self.hp / self.max_hp)
            pygame.draw.rect(s, RED,   (cx-sz, cy-sz-10, bw, 5))
            pygame.draw.rect(s, GREEN, (cx-sz, cy-sz-10, filled, 5))
        else:
            pygame.draw.ellipse(s, self.color, (cx-sz, cy-sz//2, sz*2, sz))
            pygame.draw.ellipse(s, WHITE,       (cx-sz, cy-sz//2, sz*2, sz), 2)
            dp = [(cx+int((sz*0.6)*math.cos(math.radians(a))),
                   cy-sz//2+int((sz*0.5)*math.sin(math.radians(a)))) for a in range(180,360,20)]
            if len(dp) > 2:
                pygame.draw.polygon(s, tuple(min(255,c+60) for c in self.color), dp)
    def rect(self):
        return pygame.Rect(self.x-self.size, self.y-self.size, self.size*2, self.size*2)
    def hit(self):
        self.hp -= 1; return self.hp <= 0

class PowerUp:
    def __init__(self):
        self.x = random.randint(30, WIDTH-30); self.y = -20
        self.kind = random.choice(['shield','rapid','bomb'])
        self.speed = 2.0; self.angle = 0; self.active = True
        self.color = {'shield':(0,200,255),'rapid':YELLOW,'bomb':ORANGE}[self.kind]
    def update(self):
        self.y += self.speed; self.angle += 3
        if self.y > HEIGHT + 20: self.active = False
    def draw(self, s):
        cx, cy = int(self.x), int(self.y)
        pts = [(cx+int(14*math.cos(math.radians(self.angle+60*i))),
                cy+int(14*math.sin(math.radians(self.angle+60*i)))) for i in range(6)]
        pygame.draw.polygon(s, self.color, pts)
        pygame.draw.polygon(s, WHITE, pts, 2)
        fs = pygame.font.SysFont('Arial', 12, bold=True)
        lbl = fs.render({'shield':'S','rapid':'R','bomb':'B'}[self.kind], True, BLACK)
        s.blit(lbl, (cx - lbl.get_width()//2, cy - lbl.get_height()//2))
    def rect(self):
        return pygame.Rect(self.x-14, self.y-14, 28, 28)

def draw_hud(screen, player, level, font, sf):
    screen.blit(font.render(f"SCORE: {player.score}", True, CYAN), (10, 10))
    lt = font.render(f"LVL: {level}", True, YELLOW)
    screen.blit(lt, (WIDTH//2 - lt.get_width()//2, 10))
    for i in range(player.hp):
        pygame.draw.polygon(screen, RED, [
            (WIDTH-30-i*35,18),(WIDTH-42-i*35,10),(WIDTH-50-i*35,18),(WIDTH-42-i*35,30)])
    ht = sf.render("WASD/Arrows: Move  |  SPACE: Shoot  |  ESC: Quit", True, (100,100,120))
    screen.blit(ht, (WIDTH//2 - ht.get_width()//2, HEIGHT-22))

def draw_overlay(screen, title, sub, color, fb, font):
    ov = pygame.Surface((WIDTH, HEIGHT), pygame.SRCALPHA)
    ov.fill((0,0,0,160)); screen.blit(ov,(0,0))
    t = fb.render(title, True, color); s = font.render(sub, True, WHITE)
    screen.blit(t,(WIDTH//2-t.get_width()//2, HEIGHT//2-60))
    screen.blit(s,(WIDTH//2-s.get_width()//2, HEIGHT//2+10))

def run_game():
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("SPACE SHOOTER  |  GitHub Copilot Edition")
    clock  = pygame.time.Clock()
    fb     = pygame.font.SysFont('Arial', 56, bold=True)
    font   = pygame.font.SysFont('Arial', 26, bold=True)
    sf     = pygame.font.SysFont('Arial', 16)

    stars    = [Star() for _ in range(120)]
    player   = Player()
    pb = []; eb = []; enemies = []; particles = []; powerups = []
    level=1; et=0; ei=60; pt=0; state='playing'
    bomb=0; rapid=0; shield=0
    KINDS = ['basic','basic','basic','fast','zigzag','tank']

    def spawn():
        enemies.append(Enemy(random.choice(KINDS[:max(2,min(len(KINDS),2+level))])))

    def explode(x, y, color, n=18):
        for _ in range(n): particles.append(Particle(x, y, color))

    running = True
    while running:
        clock.tick(FPS)
        for ev in pygame.event.get():
            if ev.type == pygame.QUIT: running = False
            if ev.type == pygame.KEYDOWN:
                if ev.key == pygame.K_ESCAPE: running = False
                if state != 'playing' and ev.key == pygame.K_r:
                    run_game(); return

        keys = pygame.key.get_pressed()

        if state == 'playing':
            player.update(keys)
            if keys[pygame.K_SPACE]:
                player.shoot_cooldown = min(player.shoot_cooldown, 6 if rapid>0 else 12)
                pb.extend(player.shoot())
            if rapid>0:  rapid  -= 1
            if shield>0: shield -= 1
            if bomb>0:   bomb   -= 1
            et += 1
            if et >= ei:
                spawn(); et=0; ei=max(25, 60-level*4)
            pt += 1
            if pt >= 600:
                powerups.append(PowerUp()); pt=0
            if player.score >= level * 300:
                level += 1
            for o in stars:    o.update()
            for b in pb:       b.update()
            for b in eb:       b.update()
            for e in enemies:
                e.update()
                if e.should_shoot(): eb.extend(e.shoot())
            for p in particles: p.update()
            for pu in powerups: pu.update()
            pb[:]       = [b for b in pb if b.active]
            eb[:]       = [b for b in eb if b.active]
            enemies[:]  = [e for e in enemies if e.y < HEIGHT+60]
            particles[:]= [p for p in particles if p.life > 0]
            powerups[:] = [pu for pu in powerups if pu.active]

            for b in pb[:]:
                for e in enemies[:]:
                    if b.active and e.rect().collidepoint(b.x, b.y):
                        b.active = False
                        if e.hit():
                            player.score += e.score_val
                            explode(e.x, e.y, e.color)
                            enemies.remove(e)
                        else:
                            explode(e.x, e.y, (255,200,0), n=6)

            if player.invincible == 0 and shield == 0:
                for b in eb[:]:
                    if b.active and player.rect().collidepoint(b.x, b.y):
                        b.active=False; player.hp-=1; player.invincible=90
                        explode(player.x, player.y, (100,180,255), n=10)
                        if player.hp<=0: explode(player.x,player.y,CYAN,n=40); state='dead'
                for e in enemies[:]:
                    if e.rect().colliderect(player.rect()):
                        player.hp-=1; player.invincible=90
                        explode(e.x,e.y,e.color); enemies.remove(e)
                        if player.hp<=0: state='dead'

            for pu in powerups[:]:
                if pu.rect().colliderect(player.rect()):
                    pu.active=False
                    if pu.kind=='shield':
                        shield=300; explode(player.x,player.y,(0,200,255),n=12)
                    elif pu.kind=='rapid':
                        rapid=300;  explode(player.x,player.y,YELLOW,n=12)
                    elif pu.kind=='bomb':
                        for e in enemies: explode(e.x,e.y,e.color)
                        player.score+=len(enemies)*5
                        enemies.clear(); eb.clear(); bomb=30

        screen.fill(DARK_BLUE)
        for o in stars:    o.draw(screen)
        for p in particles: p.draw(screen)
        for pu in powerups: pu.draw(screen)
        for e in enemies:   e.draw(screen)
        for b in eb:        b.draw(screen)
        for b in pb:        b.draw(screen)
        if shield>0:
            pygame.draw.circle(screen,(0,200,255),(player.x,player.y),32,2)
        if bomb>0:
            fl=pygame.Surface((WIDTH,HEIGHT)); fl.set_alpha(min(200,bomb*6))
            fl.fill(ORANGE); screen.blit(fl,(0,0))
        player.draw(screen)
        draw_hud(screen, player, level, font, sf)
        if rapid>0:
            screen.blit(sf.render(f"RAPID FIRE: {rapid//60+1}s",True,YELLOW),(10,45))
        if shield>0:
            screen.blit(sf.render(f"SHIELD: {shield//60+1}s",True,(0,200,255)),(10,65 if rapid>0 else 45))
        if state=='dead':
            draw_overlay(screen,"GAME OVER",f"Score: {player.score}  |  Press R to restart",RED,fb,font)
        pygame.display.flip()

    pygame.quit()

if __name__ == '__main__':
    run_game()
