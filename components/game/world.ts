// Arcana Survival — world simulation. A plain mutable state object stepped
// with a fixed timestep by the game screen. No React or rendering here.

import {
  ARENA,
  MAX_ENEMIES,
  MAX_GEMS,
  MAX_PARTICLES,
  PLAYER_R,
  clamp,
  dist2,
  randRange,
} from "./engine";
import type { Enemy, EnemyKind, InputState, World } from "./engine";
import { ENEMY_DEFS, SPELL_DEFS, buildChoices, nextXp } from "./content";

export function createWorld(): World {
  const world: World = {
    t: 0,
    status: "running",
    player: {
      x: ARENA / 2,
      y: ARENA / 2,
      hp: 100,
      maxHp: 100,
      speed: 175,
      level: 1,
      xp: 0,
      xpNext: nextXp(1),
      magnet: 100,
      dmgMult: 1,
      regen: 0,
      flash: 0,
      aim: -Math.PI / 2,
    },
    enemies: [],
    bullets: [],
    gems: [],
    particles: [],
    beams: [],
    rings: [],
    spells: [{ id: "bolt", level: 1, cd: 0.5 }],
    passives: { speed: 0, vitality: 0, power: 0, magnet: 0, regen: 0 },
    nextId: 1,
    spawnT: 1.2,
    kills: 0,
    score: 0,
    choices: [],
    view: { w: 390, h: 780 },
    cam: { x: ARENA / 2 - 195, y: ARENA / 2 - 390 },
  };
  return world;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addParticles(
  w: World,
  x: number,
  y: number,
  color: string,
  count: number,
  power: number,
): void {
  for (let i = 0; i < count; i++) {
    if (w.particles.length >= MAX_PARTICLES) w.particles.shift();
    const a = Math.random() * Math.PI * 2;
    const sp = randRange(30, 130) * power;
    w.particles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: randRange(0.25, 0.6),
      maxLife: 0.6,
      r: randRange(1.5, 3.5),
      color,
    });
  }
}

function damageEnemy(w: World, e: Enemy, dmg: number): void {
  e.hp -= dmg;
  if (e.hp <= 0) {
    w.kills += 1;
    addParticles(w, e.x, e.y, ENEMY_DEFS[e.kind].color, 6, 1);
    if (w.gems.length < MAX_GEMS) {
      w.gems.push({ x: e.x, y: e.y, v: e.xp });
    } else {
      // Overflow gems are collected instantly so no XP is lost.
      collectXp(w, e.xp);
    }
    e.hp = -1; // marked dead, filtered below
  }
}

function collectXp(w: World, v: number): void {
  const p = w.player;
  p.xp += v;
  if (p.xp >= p.xpNext) {
    // One level per collection; chained levels re-roll after the pick.
    p.xp -= p.xpNext;
    p.level += 1;
    p.xpNext = nextXp(p.level);
    w.status = "levelup";
    w.choices = buildChoices(w);
  }
}

function nearestEnemies(
  w: World,
  x: number,
  y: number,
  k: number,
  maxDist: number,
): Enemy[] {
  const maxD2 = maxDist * maxDist;
  const found: { e: Enemy; d2: number }[] = [];
  for (const e of w.enemies) {
    if (e.hp <= 0) continue;
    const d2 = dist2(x, y, e.x, e.y);
    if (d2 <= maxD2) found.push({ e, d2 });
  }
  found.sort((a, b) => a.d2 - b.d2);
  return found.slice(0, k).map((f) => f.e);
}

// ---------------------------------------------------------------------------
// Spells
// ---------------------------------------------------------------------------

function jaggedPoints(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): { x: number; y: number }[] {
  const pts = [{ x: x0, y: y0 }];
  const segs = 4;
  for (let i = 1; i < segs; i++) {
    const t = i / segs;
    pts.push({
      x: x0 + (x1 - x0) * t + randRange(-14, 14),
      y: y0 + (y1 - y0) * t + randRange(-14, 14),
    });
  }
  pts.push({ x: x1, y: y1 });
  return pts;
}

function fireSpells(w: World, dt: number): void {
  const p = w.player;
  for (const slot of w.spells) {
    slot.cd -= dt;
    if (slot.cd > 0) continue;
    const def = SPELL_DEFS[slot.id];
    const dmg = def.dmg(slot.level) * p.dmgMult;
    let fired = false;

    if (slot.id === "bolt") {
      const count = 1 + Math.floor((slot.level - 1) / 2);
      const targets = nearestEnemies(w, p.x, p.y, count, 300);
      for (const target of targets) {
        const a = Math.atan2(target.y - p.y, target.x - p.x);
        w.bullets.push({
          x: p.x,
          y: p.y,
          vx: Math.cos(a) * 460,
          vy: Math.sin(a) * 460,
          dmg,
          r: 6,
          life: 1.2,
          kind: "bolt",
          aoe: 0,
          hit: [],
        });
        fired = true;
      }
      if (targets.length > 0) {
        p.aim = Math.atan2(targets[0].y - p.y, targets[0].x - p.x);
      }
    } else if (slot.id === "fireball") {
      const targets = nearestEnemies(w, p.x, p.y, 1, 360);
      if (targets.length > 0) {
        const target = targets[0];
        const a = Math.atan2(target.y - p.y, target.x - p.x);
        w.bullets.push({
          x: p.x,
          y: p.y,
          vx: Math.cos(a) * 290,
          vy: Math.sin(a) * 290,
          dmg,
          r: 8,
          life: 2,
          kind: "fireball",
          aoe: 80 + 6 * (slot.level - 1),
          hit: [],
        });
        fired = true;
      }
    } else if (slot.id === "chain") {
      const first = nearestEnemies(w, p.x, p.y, 1, 320);
      if (first.length > 0) {
        const jumps = 3 + (slot.level - 1);
        const hitIds = new Set<number>();
        let from = { x: p.x, y: p.y };
        let current: Enemy | undefined = first[0];
        for (let j = 0; j < jumps && current; j++) {
          hitIds.add(current.id);
          w.beams.push({
            pts: jaggedPoints(from.x, from.y, current.x, current.y),
            life: 0.22,
            maxLife: 0.22,
          });
          damageEnemy(w, current, dmg);
          from = { x: current.x, y: current.y };
          const pool = nearestEnemies(w, from.x, from.y, 4, 190);
          current = pool.find((e) => !hitIds.has(e.id) && e.hp > 0);
        }
        fired = true;
      }
    } else if (slot.id === "nova") {
      const radius = 200 + 18 * (slot.level - 1);
      w.rings.push({
        x: p.x,
        y: p.y,
        r: 24,
        maxR: radius,
        life: 0.45,
        maxLife: 0.45,
        color: "#93C5FD",
      });
      const r2 = radius * radius;
      for (const e of w.enemies) {
        if (e.hp <= 0) continue;
        if (dist2(p.x, p.y, e.x, e.y) <= r2) {
          e.slowT = 2.2;
          damageEnemy(w, e, dmg);
        }
      }
      fired = true;
    }

    slot.cd = fired ? def.cd(slot.level) : 0.15;
  }
}

// ---------------------------------------------------------------------------
// Spawning
// ---------------------------------------------------------------------------

function pickKind(t: number): EnemyKind {
  let total = 0;
  const weights: { kind: EnemyKind; w: number }[] = [];
  for (const def of Object.values(ENEMY_DEFS)) {
    if (t < def.unlockT) continue;
    const weight = def.weight(t);
    weights.push({ kind: def.kind, w: weight });
    total += weight;
  }
  let roll = Math.random() * total;
  for (const entry of weights) {
    roll -= entry.w;
    if (roll <= 0) return entry.kind;
  }
  return "crawler";
}

function spawnEnemy(w: World): void {
  if (w.enemies.length >= MAX_ENEMIES) return;
  const t = w.t;
  const kind = pickKind(t);
  const def = ENEMY_DEFS[kind];

  const hpMul = 1 + Math.pow(t / 60, 1.15) * 0.35;
  const dmgMul = 1 + (t / 240) * 0.35;
  const spdMul = 1 + Math.min(0.6, (t / 600) * 0.5);
  const elite = t > 300 && Math.random() < 0.08;

  const a = Math.random() * Math.PI * 2;
  const x = clamp(w.player.x + Math.cos(a) * 640, 30, ARENA - 30);
  const y = clamp(w.player.y + Math.sin(a) * 640, 30, ARENA - 30);

  const hp = def.hp * hpMul * (elite ? 3 : 1);
  w.enemies.push({
    id: w.nextId++,
    kind,
    x,
    y,
    hp,
    maxHp: hp,
    speed: def.speed * spdMul,
    dmg: def.dmg * dmgMul * (elite ? 1.5 : 1),
    r: def.r * (elite ? 1.5 : 1),
    xp: def.xp * (elite ? 4 : 1),
    hitCd: 0,
    slowT: 0,
    elite,
    seed: Math.random() * Math.PI * 2,
  });
}

// ---------------------------------------------------------------------------
// Main step
// ---------------------------------------------------------------------------

export function stepWorld(w: World, dt: number, input: InputState): void {
  if (w.status !== "running") return;
  const p = w.player;
  w.t += dt;

  // --- Player movement (joystick) ---
  if (input.active) {
    const raw = Math.hypot(input.dx, input.dy);
    const mag = Math.min(1, raw / 64);
    if (mag > 0.08) {
      const nx = input.dx / (raw || 1);
      const ny = input.dy / (raw || 1);
      p.x = clamp(p.x + nx * p.speed * mag * dt, PLAYER_R + 10, ARENA - PLAYER_R - 10);
      p.y = clamp(p.y + ny * p.speed * mag * dt, PLAYER_R + 10, ARENA - PLAYER_R - 10);
      p.aim = Math.atan2(ny, nx);
    }
  }

  // Regeneration & hit flash
  p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);
  if (p.flash > 0) p.flash = Math.max(0, p.flash - dt * 4);

  // --- Spells ---
  fireSpells(w, dt);

  // --- Bullets ---
  for (const b of w.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0) continue;

    for (const e of w.enemies) {
      if (e.hp <= 0 || b.hit.includes(e.id)) continue;
      const rr = b.r + e.r;
      if (dist2(b.x, b.y, e.x, e.y) > rr * rr) continue;

      b.hit.push(e.id);
      if (b.kind === "fireball") {
        // Explosion: damage everything in the blast radius once.
        w.rings.push({
          x: b.x,
          y: b.y,
          r: 12,
          maxR: b.aoe,
          life: 0.35,
          maxLife: 0.35,
          color: "#FDBA74",
        });
        addParticles(w, b.x, b.y, "#FB923C", 10, 1.2);
        const aoe2 = b.aoe * b.aoe;
        for (const other of w.enemies) {
          if (other.hp <= 0) continue;
          if (dist2(b.x, b.y, other.x, other.y) <= aoe2) {
            damageEnemy(w, other, b.dmg);
          }
        }
        b.life = 0; // explodes on first contact
      } else {
        damageEnemy(w, e, b.dmg);
        addParticles(w, b.x, b.y, "#7DD3FC", 2, 0.6);
        b.life = 0; // bolt dies on first hit
      }
      break;
    }
  }
  w.bullets = w.bullets.filter((b) => b.life > 0);

  // --- Enemies ---
  for (const e of w.enemies) {
    if (e.hp <= 0) continue;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const slow = e.slowT > 0 ? 0.55 : 1;
    if (e.slowT > 0) e.slowT -= dt;
    const sp = e.speed * slow;
    e.x += (dx / d) * sp * dt;
    e.y += (dy / d) * sp * dt;

    if (e.hitCd > 0) e.hitCd -= dt;
    const touch = e.r + PLAYER_R;
    if (d <= touch && e.hitCd <= 0) {
      e.hitCd = 0.7;
      p.hp -= e.dmg;
      p.flash = 1;
      addParticles(w, p.x, p.y, "#EF4444", 3, 0.8);
      if (p.hp <= 0) {
        p.hp = 0;
        w.status = "dead";
        addParticles(w, p.x, p.y, "#5EEAD4", 18, 1.4);
        return;
      }
    }
  }
  w.enemies = w.enemies.filter((e) => e.hp > 0);

  // --- Effects decay ---
  for (const pt of w.particles) {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 0.92;
    pt.vy *= 0.92;
    pt.life -= dt;
  }
  w.particles = w.particles.filter((pt) => pt.life > 0);
  for (const beam of w.beams) beam.life -= dt;
  w.beams = w.beams.filter((b) => b.life > 0);
  for (const ring of w.rings) {
    ring.life -= dt;
    ring.r = ring.maxR * (1 - ring.life / ring.maxLife);
  }
  w.rings = w.rings.filter((r) => r.life > 0);

  // --- Gems (magnet + collect) ---
  const mag2 = p.magnet * p.magnet;
  for (const g of w.gems) {
    const d2 = dist2(p.x, p.y, g.x, g.y);
    if (d2 < mag2) {
      const d = Math.sqrt(d2) || 1;
      const pull = 320 + (1 - d / p.magnet) * 520;
      g.x += ((p.x - g.x) / d) * pull * dt;
      g.y += ((p.y - g.y) / d) * pull * dt;
    }
    if (d2 < 576) {
      collectXp(w, g.v);
      g.v = -1; // collected marker, filtered below
    }
  }
  w.gems = w.gems.filter((g) => g.v >= 0);
  if (w.status !== "running") return; // level-up pauses the world

  // --- Spawn director ---
  w.spawnT -= dt;
  if (w.spawnT <= 0) {
    const batch = 1 + Math.floor(w.t / 60);
    for (let i = 0; i < batch; i++) spawnEnemy(w);
    w.spawnT += Math.max(0.5, 1.4 - w.t * 0.008);
  }

  // --- Camera & score ---
  w.cam.x = clamp(p.x - w.view.w / 2, 0, Math.max(0, ARENA - w.view.w));
  w.cam.y = clamp(p.y - w.view.h / 2, 0, Math.max(0, ARENA - w.view.h));
  w.score = Math.floor(w.t) * 10 + w.kills * 25 + (p.level - 1) * 100;
}
