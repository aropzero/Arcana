// Arcana Survival — world simulation: player, 21 spells, 8 enemy kinds, mana
// orbs, runes, death hordes. Plain mutable state stepped with a fixed
// timestep by the game screen. No React or rendering here.

import {
  ARENA,
  BASE_PICKUP,
  clamp,
  DEATH_EVENTS,
  DEATH_EVENT_GAP,
  dist2,
  HORDE_TIMEOUT,
  MAX_BULLETS,
  MAX_EBULLETS,
  MAX_ENEMIES,
  MAX_NUMBERS,
  MAX_ORBS,
  MAX_PARTICLES,
  MAX_RUNES,
  MAX_SUMMONS,
  MAX_ZONES,
  ORB_HEAL,
  ORB_VALUE,
  PLAYER_BASE_HP,
  PLAYER_BASE_SPEED,
  PLAYER_R,
  rand,
  xpForLevel,
  type Bullet,
  type Enemy,
  type EnemyKind,
  type InputState,
  type Orb,
  type OrbTier,
  type Player,
  type RuneKind,
  type SpellId,
  type SpellSlot,
  type World,
} from "./engine";
import {
  buildUpgradeChoices,
  ENEMY_DEFS,
  enemyDmgMult,
  enemyHpMult,
  enemySpeedMult,
  levelUp,
  SPELL_DEFS,
  type SpellStats,
} from "./content";

const CRIT_MULT = 1.75;

// ---------------------------------------------------------------------------
// Derived stats
// ---------------------------------------------------------------------------
export function dmgMult(p: Player): number {
  let m = 1 + 0.12 * p.sAtk;
  if (p.circleT > 0) m *= p.circleAmp;
  if (p.frenzyT > 0) m *= 1.3;
  return m;
}

export const critChance = (p: Player): number => 0.05 + 0.07 * p.sCrit;
export const areaMult = (p: Player): number => 1 + 0.1 * p.sArea;
export const durMult = (p: Player): number => 1 + 0.14 * p.sDuration;
export const cdMult = (p: Player): number => 1 / (1 + 0.085 * p.sCd);
export const moveSpeed = (p: Player): number =>
  (PLAYER_BASE_SPEED + 12 * p.sSpeed) * (p.frenzyT > 0 ? 1.2 : 1);
export const pickupRadius = (p: Player): number =>
  p.magnetT > 0 ? 2200 : BASE_PICKUP + 28 * p.sPickup;

function rollDamage(w: World, base: number): { dmg: number; crit: boolean } {
  const p = w.player;
  const crit = Math.random() < critChance(p);
  return { dmg: base * dmgMult(p) * rand(0.92, 1.08) * (crit ? CRIT_MULT : 1), crit };
}

// ---------------------------------------------------------------------------
// Creation
// ---------------------------------------------------------------------------
export function createWorld(): World {
  const p: Player = {
    x: ARENA / 2,
    y: ARENA / 2,
    hp: PLAYER_BASE_HP,
    maxHp: PLAYER_BASE_HP,
    level: 1,
    xp: 0,
    xpNext: xpForLevel(1),
    kills: 0,
    facingX: 0,
    facingY: 1,
    sAtk: 0,
    sCrit: 0,
    sArea: 0,
    sHp: 0,
    sPickup: 0,
    sSpeed: 0,
    sDuration: 0,
    sCd: 0,
    shield: 0,
    shieldCd: 0,
    cloakT: 0,
    circleT: 0,
    circleAmp: 1,
    invulnT: 0,
    magnetT: 0,
    frenzyT: 0,
    hitFlash: 0,
  };
  return {
    t: 0,
    realT: 0,
    status: "running",
    player: p,
    enemies: [],
    bullets: [],
    ebullets: [],
    zones: [],
    summons: [],
    fx: [],
    orbs: [],
    runes: [],
    particles: [],
    numbers: [],
    orbitAngle: 0,
    spells: [{ id: "bolt", level: 1, cd: 0.5 }],
    wave: 0,
    deathIdx: 0,
    hordeT: null,
    hordeKilled: false,
    giantId: null,
    runeEliteLeft: 0,
    banner: null,
    shakeT: 0,
    shakeMag: 0,
    screenFlash: 0,
    score: 0,
    choices: [],
    nextId: 1,
    spawnT: 1.2,
    runeT: 38,
  };
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
export function shake(w: World, t: number, mag: number): void {
  w.shakeT = Math.max(w.shakeT, t);
  w.shakeMag = Math.max(w.shakeMag, mag);
}

function addParticle(w: World, x: number, y: number, color: string, speed = 90, r = 2.4): void {
  if (w.particles.length >= MAX_PARTICLES) w.particles.shift();
  const a = rand(0, Math.PI * 2);
  const v = rand(speed * 0.3, speed);
  w.particles.push({
    x,
    y,
    vx: Math.cos(a) * v,
    vy: Math.sin(a) * v,
    life: rand(0.3, 0.7),
    maxLife: 0.7,
    color,
    r: rand(r * 0.6, r * 1.4),
  });
}

function burst(w: World, x: number, y: number, color: string, n = 6, speed = 90): void {
  for (let i = 0; i < n; i++) addParticle(w, x, y, color, speed);
}

function addNumber(w: World, x: number, y: number, dmg: number, crit: boolean): void {
  if (w.numbers.length >= MAX_NUMBERS) w.numbers.shift();
  w.numbers.push({
    x: x + rand(-7, 7),
    y: y - 6,
    vy: -52,
    life: 0.62,
    text: String(Math.max(1, Math.round(dmg))),
    crit,
  });
}

function nearestEnemies(w: World, x: number, y: number, n: number, maxDist: number): Enemy[] {
  const max2 = maxDist * maxDist;
  const found = w.enemies
    .filter((e) => e.hp > 0 && dist2(x, y, e.x, e.y) <= max2)
    .sort((a, b) => dist2(x, y, a.x, a.y) - dist2(x, y, b.x, b.y));
  return found.slice(0, n);
}

function spawnBullet(w: World, b: Partial<Bullet> & { x: number; y: number; vx: number; vy: number; dmg: number }): void {
  if (w.bullets.length >= MAX_BULLETS) return;
  w.bullets.push({
    id: w.nextId++,
    kind: "bolt",
    r: 5,
    pierce: 0,
    hitIds: [],
    life: 1.6,
    aoe: 0,
    crit: false,
    grow: 0,
    waveId: -1,
    ...b,
  });
}

function addBeam(w: World, x1: number, y1: number, x2: number, y2: number, life: number, color: string, width = 4): void {
  if (w.fx.length >= 90) return;
  w.fx.push({
    id: w.nextId++,
    kind: "beam",
    x1,
    y1,
    x2,
    y2,
    t: life,
    maxT: life,
    w: width,
    dmg: 0,
    aoe: 0,
    color,
    crit: false,
  });
}

function addDelayed(
  w: World,
  kind: "meteor" | "thunder",
  x: number,
  y: number,
  delay: number,
  dmg: number,
  aoe: number,
  color: string,
  crit: boolean,
): void {
  if (w.fx.length >= 90) return;
  w.fx.push({
    id: w.nextId++,
    kind,
    x1: x,
    y1: y - 420,
    x2: x,
    y2: y,
    t: delay,
    maxT: delay,
    w: kind === "thunder" ? 7 : 10,
    dmg,
    aoe,
    color,
    crit,
  });
}

export function explode(
  w: World,
  x: number,
  y: number,
  radius: number,
  dmg: number,
  crit: boolean,
  color: string,
): void {
  for (const e of w.enemies) {
    if (e.hp <= 0) continue;
    const rr = radius + e.r;
    if (dist2(x, y, e.x, e.y) <= rr * rr) damageEnemy(w, e, dmg, crit);
  }
  burst(w, x, y, color, 12, 200);
  shake(w, 0.28, 6);
}

function spawnOrb(w: World, x: number, y: number, tier: OrbTier, v: number): void {
  if (w.orbs.length >= MAX_ORBS) {
    // Field saturated: merge the value into a random existing orb instead of
    // dropping it, so player XP income is never silently lost.
    const host = w.orbs[Math.floor(Math.random() * w.orbs.length)];
    host.v += v;
    if (host.v > ORB_VALUE[host.tier] * 2 && host.tier < 3) {
      host.tier = (host.tier + 1) as OrbTier;
    }
    return;
  }
  const a = rand(0, Math.PI * 2);
  const sp = rand(20, 70);
  w.orbs.push({
    id: w.nextId++,
    x: clamp(x + rand(-6, 6), 20, ARENA - 20),
    y: clamp(y + rand(-6, 6), 20, ARENA - 20),
    vx: Math.cos(a) * sp,
    vy: Math.sin(a) * sp,
    tier,
    v,
  });
}

function dropOrbForKill(w: World, e: Enemy): void {
  if (e.kind === "mini") return;
  if (e.kind === "giant") {
    for (let i = 0; i < 3; i++) spawnOrb(w, e.x, e.y, 3, ORB_VALUE[3]);
    for (let i = 0; i < 2; i++) spawnOrb(w, e.x, e.y, 2, ORB_VALUE[2]);
    return;
  }
  if (e.elite) {
    spawnOrb(w, e.x, e.y, 2, e.xp);
    spawnOrb(w, e.x, e.y, 0, 2);
    return;
  }
  const roll = Math.random();
  if (roll < 0.035) {
    spawnOrb(w, e.x, e.y, 2, e.xp * 6);
  } else if (roll < 0.18) {
    spawnOrb(w, e.x, e.y, 1, e.xp * 2);
  } else {
    spawnOrb(w, e.x, e.y, 0, e.xp);
  }
}

// ---------------------------------------------------------------------------
// Damage & death
// ---------------------------------------------------------------------------
export function damageEnemy(w: World, e: Enemy, dmg: number, crit: boolean): void {
  if (e.hp <= 0) return;
  e.hp -= dmg;
  e.flashT = 0.12;
  addNumber(w, e.x, e.y - e.r, dmg, crit);
  if (e.hp <= 0) killEnemy(w, e);
}

function damagePlayer(w: World, dmg: number): void {
  const p = w.player;
  if (p.invulnT > 0 || p.cloakT > 0 || w.status !== "running") return;
  if (p.shield > 0) {
    p.shield -= 1;
    burst(w, p.x, p.y, "#FCD34D", 8, 130);
    return;
  }
  p.hp -= dmg;
  p.hitFlash = 0.3;
  shake(w, 0.22, 5);
  if (p.hp <= 0) {
    p.hp = 0;
    w.status = "dead";
    burst(w, p.x, p.y, "#5EEAD4", 26, 260);
    shake(w, 0.7, 12);
  }
}

export function killEnemy(w: World, e: Enemy): void {
  if (e.hp > 0) e.hp = 0;
  const p = w.player;
  p.kills += 1;
  // Ink-splat death like the source: black droplets scatter from the kill.
  burst(w, e.x, e.y, "#1F1B16", e.kind === "giant" ? 34 : 10, e.kind === "giant" ? 260 : 150);
  dropOrbForKill(w, e);

  // Exploders detonate on death.
  if (e.kind === "exploder") {
    const r = 92;
    burst(w, e.x, e.y, "#FB923C", 14, 220);
    if (dist2(e.x, e.y, p.x, p.y) <= r * r) damagePlayer(w, e.dmg);
    shake(w, 0.3, 7);
  }

  // Splitters release two minis.
  if (e.kind === "splitter") {
    for (let i = 0; i < 2; i++) spawnEnemy(w, "mini", e.x + rand(-14, 14), e.y + rand(-14, 14), false);
  }

  // Elite rune squad tracking.
  if (e.elite && w.runeEliteLeft > 0) {
    w.runeEliteLeft -= 1;
    if (w.runeEliteLeft === 0) {
      for (let i = 0; i < 2; i++) spawnOrb(w, p.x + rand(-30, 30), p.y + rand(-30, 30), 2, ORB_VALUE[2]);
      p.hp = Math.min(p.maxHp, p.hp + 30);
      w.banner = { title: "HADIAH ELITE", sub: "+30 HP dan orb mana", t: 2, color: "#A3E635" };
    }
  }

  // Giant down — the death horde clears.
  if (e.id === w.giantId) {
    w.hordeKilled = true;
    w.screenFlash = 0.5;
    shake(w, 0.9, 13);
  }
}

// ---------------------------------------------------------------------------
// Spawning
// ---------------------------------------------------------------------------
function ringPos(w: World, minR: number, maxR: number): { x: number; y: number } {
  const p = w.player;
  const a = rand(0, Math.PI * 2);
  const r = rand(minR, maxR);
  return {
    x: clamp(p.x + Math.cos(a) * r, 30, ARENA - 30),
    y: clamp(p.y + Math.sin(a) * r, 30, ARENA - 30),
  };
}

function spawnEnemy(w: World, kind: EnemyKind, x: number, y: number, elite: boolean): Enemy | null {
  // Hard cap (giants exempt — they anchor death hordes).
  if (w.enemies.length >= MAX_ENEMIES && kind !== "giant") return null;
  const def = ENEMY_DEFS[kind];
  const giantScale = kind === "giant" ? Math.pow(1.6, w.wave) : 1;
  const hp = def.hp * enemyHpMult(w.t) * (elite ? 4 : 1) * giantScale;
  const e: Enemy = {
    id: w.nextId++,
    kind,
    x,
    y,
    hp,
    maxHp: hp,
    speed: def.speed * enemySpeedMult(w.t) * (elite ? 0.95 : 1),
    dmg: def.dmg * enemyDmgMult(w.t) * (elite ? 1.5 : 1),
    r: def.r * (elite ? 1.25 : 1),
    xp: def.xp * (elite ? 8 : 1),
    elite,
    hitCd: 0,
    slowT: 0,
    flashT: 0,
    aiT: rand(0.5, 2.2),
    seed: rand(0, 100),
    orbCd: 0,
    waveHit: -1,
  };
  w.enemies.push(e);
  return e;
}

function pickKind(t: number): EnemyKind {
  const pool: [EnemyKind, number][] = [["crawler", 10]];
  if (t >= 90) pool.push(["runner", 4 + t / 90]);
  if (t >= 180) pool.push(["brute", 2 + t / 150]);
  if (t >= 240) pool.push(["caster", 2 + t / 200]);
  if (t >= 330) pool.push(["exploder", 2 + t / 200]);
  if (t >= 420) pool.push(["splitter", 1.6 + t / 320]);
  let total = 0;
  for (const [, weight] of pool) total += weight;
  let roll = Math.random() * total;
  for (const [kind, weight] of pool) {
    roll -= weight;
    if (roll <= 0) return kind;
  }
  return "crawler";
}

function spawnDirector(w: World, dt: number): void {
  w.spawnT -= dt;
  if (w.spawnT > 0 || w.enemies.length >= MAX_ENEMIES) return;
  const t = w.t;
  w.spawnT = Math.max(0.3, 1.35 - t / 140);
  const batch = 1 + Math.floor(t / 220);
  for (let i = 0; i < batch; i++) {
    const pos = ringPos(w, 480, 660);
    const elite = t > 300 && Math.random() < 0.03 + t / 22000;
    spawnEnemy(w, pickKind(t), pos.x, pos.y, elite);
  }
}

// ---------------------------------------------------------------------------
// Death horde (Gelombang Kematian)
// ---------------------------------------------------------------------------
export function nextDeathTime(idx: number): number {
  if (idx < DEATH_EVENTS.length) return DEATH_EVENTS[idx];
  return DEATH_EVENTS[DEATH_EVENTS.length - 1] + DEATH_EVENT_GAP * (idx - DEATH_EVENTS.length + 1);
}

function startDeathHorde(w: World): void {
  w.deathIdx += 1;
  w.wave = w.deathIdx;
  w.hordeT = HORDE_TIMEOUT;
  w.hordeKilled = false;
  w.banner = {
    title: `GELOMBANG KEMATIAN ${w.wave}`,
    sub: "Waktu berhenti — musnahkan si Raksasa!",
    t: 3.6,
    color: "#F43F5E",
  };
  shake(w, 0.7, 10);

  const dir = rand(0, Math.PI * 2);
  const g = spawnEnemy(
    w,
    "giant",
    clamp(w.player.x + Math.cos(dir) * 400, 60, ARENA - 60),
    clamp(w.player.y + Math.sin(dir) * 400, 60, ARENA - 60),
    false,
  );
  if (g) w.giantId = g.id;

  const ringN = 12 + w.wave * 5;
  for (let i = 0; i < ringN; i++) {
    const a = (i / ringN) * Math.PI * 2;
    spawnEnemy(
      w,
      i % 3 === 0 ? "brute" : "crawler",
      clamp(w.player.x + Math.cos(a) * 480, 30, ARENA - 30),
      clamp(w.player.y + Math.sin(a) * 480, 30, ARENA - 30),
      false,
    );
  }
  for (let i = 0; i < 4 + w.wave * 2; i++) {
    const pos = ringPos(w, 430, 520);
    spawnEnemy(w, "runner", pos.x, pos.y, false);
  }
}

function endDeathHorde(w: World): void {
  w.hordeT = null;
  w.hordeKilled = false;
  w.giantId = null;
  w.banner = {
    title: "TERTAHAN!",
    sub: "Waktu kembali berjalan",
    t: 2.4,
    color: "#4ADE80",
  };
}

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------
function updatePlayer(w: World, dt: number, input: InputState): void {
  const p = w.player;
  if (input.active) {
    const raw = Math.hypot(input.dx, input.dy);
    if (raw > 0.01) {
      const nx = input.dx / raw;
      const ny = input.dy / raw;
      const power = Math.min(1, raw / 70);
      const spd = moveSpeed(p) * power;
      p.x += nx * spd * dt;
      p.y += ny * spd * dt;
      p.facingX = nx;
      p.facingY = ny;
    }
  }
  p.x = clamp(p.x, PLAYER_R, ARENA - PLAYER_R);
  p.y = clamp(p.y, PLAYER_R, ARENA - PLAYER_R);

  p.hitFlash = Math.max(0, p.hitFlash - dt);
  p.invulnT = Math.max(0, p.invulnT - dt);
  p.magnetT = Math.max(0, p.magnetT - dt);
  p.frenzyT = Math.max(0, p.frenzyT - dt);
  p.cloakT = Math.max(0, p.cloakT - dt);
  p.circleT = Math.max(0, p.circleT - dt);
}

// ---------------------------------------------------------------------------
// Spells
// ---------------------------------------------------------------------------
function updateSpells(w: World, dt: number): void {
  const p = w.player;
  for (const slot of w.spells) {
    if (slot.id === "satellite") continue; // persistent orbit, handled below
    slot.cd -= dt;
    if (slot.cd > 0) continue;
    const def = SPELL_DEFS[slot.id];
    const st = def.stats(slot.level);
    slot.cd = (st.cd ?? 1) * cdMult(p) * rand(0.98, 1.02);
    fireSpell(w, slot.id, slot.level, st);
  }
}

function fireSpell(w: World, id: SpellId, lv: number, st: Partial<SpellStats>): void {
  const p = w.player;
  const area = areaMult(p);
  const dur = durMult(p);
  switch (id) {
    case "bolt": {
      const targets = nearestEnemies(w, p.x, p.y, st.count ?? 1, 460);
      for (const t of targets) {
        const a = Math.atan2(t.y - p.y, t.x - p.x) + rand(-0.05, 0.05);
        const { dmg, crit } = rollDamage(w, st.dmg ?? 8);
        spawnBullet(w, {
          kind: "bolt",
          x: p.x,
          y: p.y,
          vx: Math.cos(a) * (st.speed ?? 470),
          vy: Math.sin(a) * (st.speed ?? 470),
          dmg,
          r: 5,
          life: 1.6,
          crit,
        });
      }
      break;
    }
    case "flash": {
      const target = nearestEnemies(w, p.x, p.y, 1, 900)[0] ?? null;
      const cx = target ? target.x : p.x;
      const cy = target ? target.y : p.y;
      const vertical = Math.random() < 0.5;
      const half = 900;
      addBeam(
        w,
        vertical ? cx : cx - half,
        vertical ? cy - half : cy,
        vertical ? cx : cx + half,
        vertical ? cy + half : cy,
        0.3,
        "#FDE047",
        18,
      );
      const r2 = (st.r ?? 24) * area;
      const { dmg, crit } = rollDamage(w, st.dmg ?? 22);
      for (const e of w.enemies) {
        if (e.hp <= 0) continue;
        const d = vertical ? Math.abs(e.x - cx) : Math.abs(e.y - cy);
        if (d <= r2) damageEnemy(w, e, dmg, crit);
      }
      shake(w, 0.2, 4);
      break;
    }
    case "inciner": {
      const baseA = Math.atan2(p.facingY, p.facingX);
      for (let i = 0; i < (st.count ?? 3); i++) {
        const a = baseA + rand(-0.42, 0.42);
        const { dmg, crit } = rollDamage(w, st.dmg ?? 6);
        spawnBullet(w, {
          kind: "fire",
          x: p.x,
          y: p.y,
          vx: Math.cos(a) * (st.speed ?? 330),
          vy: Math.sin(a) * (st.speed ?? 330),
          dmg,
          r: 8,
          life: 0.45,
          crit,
        });
      }
      break;
    }
    case "meteor": {
      const pool = nearestEnemies(w, p.x, p.y, 8, 520);
      const t = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
      const tx = t ? t.x : p.x + rand(-200, 200);
      const ty = t ? t.y : p.y + rand(-200, 200);
      const { dmg, crit } = rollDamage(w, st.dmg ?? 40);
      addDelayed(w, "meteor", tx, ty, (st.life ?? 0.95) / dur, dmg, (st.r ?? 88) * area, "#F97316", crit);
      break;
    }
    case "fireball": {
      for (let i = 0; i < (st.count ?? 1); i++) {
        const a = rand(0, Math.PI * 2);
        const { dmg, crit } = rollDamage(w, st.dmg ?? 16);
        spawnBullet(w, {
          kind: "fire",
          x: p.x,
          y: p.y,
          vx: Math.cos(a) * (st.speed ?? 300),
          vy: Math.sin(a) * (st.speed ?? 300),
          dmg,
          r: 9,
          life: 2.2,
          aoe: (st.r ?? 70) * area,
          crit,
        });
      }
      break;
    }
    case "lava": {
      if (w.zones.length < MAX_ZONES) {
        const { dmg } = rollDamage(w, st.dmg ?? 11);
        w.zones.push({
          id: w.nextId++,
          kind: "lava",
          x: clamp(p.x + rand(-280, 280), 40, ARENA - 40),
          y: clamp(p.y + rand(-280, 280), 40, ARENA - 40),
          r: (st.r ?? 82) * area,
          grow: 0,
          dps: dmg,
          tickT: 0.4,
          life: (st.life ?? 4) * dur,
          pull: 0,
        });
      }
      break;
    }
    case "spirit": {
      const want = Math.min(st.count ?? 1, MAX_SUMMONS);
      if (w.summons.length >= want && w.summons.length > 0) {
        const old = w.summons[0];
        old.life = (st.life ?? 12) * dur;
        old.dmg = st.dmg ?? 7;
      } else if (w.summons.length < want) {
        const a = rand(0, Math.PI * 2);
        w.summons.push({
          id: w.nextId++,
          x: p.x + Math.cos(a) * 42,
          y: p.y + Math.sin(a) * 42,
          cd: 0.4,
          life: (st.life ?? 12) * dur,
          dmg: st.dmg ?? 7,
          range: 320,
        });
      }
      break;
    }
    case "energy": {
      const baseA = Math.atan2(p.facingY, p.facingX);
      for (let i = 0; i < (st.count ?? 4); i++) {
        const a = baseA + rand(-0.3, 0.3);
        const { dmg, crit } = rollDamage(w, st.dmg ?? 4.5);
        spawnBullet(w, {
          kind: "energy",
          x: p.x,
          y: p.y,
          vx: Math.cos(a) * (st.speed ?? 540),
          vy: Math.sin(a) * (st.speed ?? 540),
          dmg,
          r: 4.5,
          pierce: 1,
          life: 0.9,
          crit,
        });
      }
      break;
    }
    case "ray": {
      const n = st.count ?? 6;
      const off = rand(0, Math.PI * 2);
      const len = (st.r ?? 300) * area;
      const { dmg, crit } = rollDamage(w, st.dmg ?? 20);
      for (let i = 0; i < n; i++) {
        const a = off + (i / n) * Math.PI * 2;
        const x2 = p.x + Math.cos(a) * len;
        const y2 = p.y + Math.sin(a) * len;
        addBeam(w, p.x, p.y, x2, y2, 0.28, "#E879F9", 5);
        const dx = x2 - p.x;
        const dy = y2 - p.y;
        const len2 = dx * dx + dy * dy || 1;
        for (const e of w.enemies) {
          if (e.hp <= 0) continue;
          const t = clamp(((e.x - p.x) * dx + (e.y - p.y) * dy) / len2, 0, 1);
          const px = p.x + dx * t;
          const py = p.y + dy * t;
          const rr = 12 + e.r;
          if (dist2(px, py, e.x, e.y) <= rr * rr) damageEnemy(w, e, dmg, crit);
        }
      }
      break;
    }
    case "cyclone": {
      if (w.zones.length < MAX_ZONES) {
        const pool = nearestEnemies(w, p.x, p.y, 6, 380);
        const t = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
        const { dmg } = rollDamage(w, st.dmg ?? 13);
        w.zones.push({
          id: w.nextId++,
          kind: "cyclone",
          x: t ? t.x : p.x + rand(-180, 180),
          y: t ? t.y : p.y + rand(-180, 180),
          r: (st.r ?? 58) * area,
          grow: st.grow ?? 17,
          dps: dmg,
          tickT: 0.4,
          life: (st.life ?? 3) * dur,
          pull: st.pull ?? 170,
        });
      }
      break;
    }
    case "tsunami": {
      const target = nearestEnemies(w, p.x, p.y, 1, 700)[0];
      const a = target
        ? Math.atan2(target.y - p.y, target.x - p.x)
        : Math.atan2(p.facingY, p.facingX);
      const { dmg, crit } = rollDamage(w, st.dmg ?? 26);
      spawnBullet(w, {
        kind: "wave",
        x: p.x,
        y: p.y,
        vx: Math.cos(a) * (st.speed ?? 250),
        vy: Math.sin(a) * (st.speed ?? 250),
        dmg,
        r: (st.r ?? 120) * area,
        life: st.life ?? 3.2,
        pierce: 9999,
        crit,
        waveId: w.nextId++,
      });
      shake(w, 0.25, 5);
      break;
    }
    case "frost": {
      const r = (st.r ?? 150) * area;
      const { dmg, crit } = rollDamage(w, st.dmg ?? 14);
      for (const e of w.enemies) {
        if (e.hp <= 0) continue;
        const rr = r + e.r;
        if (dist2(p.x, p.y, e.x, e.y) <= rr * rr) {
          damageEnemy(w, e, dmg, crit);
          e.slowT = (st.life ?? 2.2) * dur;
        }
      }
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        addParticle(w, p.x + Math.cos(a) * r * 0.8, p.y + Math.sin(a) * r * 0.8, "#93C5FD", 60, 3);
      }
      break;
    }
    case "blizzard": {
      const n = st.count ?? 8;
      for (let i = 0; i < n; i++) {
        const pool = nearestEnemies(w, p.x, p.y, 10, 420);
        const t = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
        const tx = t ? t.x + rand(-70, 70) : p.x + rand(-260, 260);
        const ty = t ? t.y + rand(-70, 70) : p.y + rand(-260, 260);
        const { dmg, crit } = rollDamage(w, st.dmg ?? 9);
        addDelayed(w, "meteor", tx, ty, 0.2 + (i / n) * (st.life ?? 1.6), dmg, (st.r ?? 46) * area, "#BAE6FD", crit);
      }
      break;
    }
    case "shock": {
      const first = nearestEnemies(w, p.x, p.y, 1, 560)[0];
      if (!first) break;
      const links = 1 + (st.count ?? 0);
      const { dmg, crit } = rollDamage(w, st.dmg ?? 22);
      let cur = first;
      addBeam(w, p.x, p.y, cur.x, cur.y, 0.24, "#FACC15", 4);
      damageEnemy(w, cur, dmg, crit);
      for (let i = 1; i < links; i++) {
        const next = nearestEnemies(w, cur.x, cur.y, 3, (st.r ?? 150) + 40).find(
          (e) => e !== cur && e.hp > 0,
        );
        if (!next) break;
        addBeam(w, cur.x, cur.y, next.x, next.y, 0.22, "#FACC15", 3.4);
        damageEnemy(w, next, dmg * 0.72, crit);
        cur = next;
      }
      break;
    }
    case "ezone": {
      if (w.zones.length < MAX_ZONES) {
        const pool = nearestEnemies(w, p.x, p.y, 6, 420);
        const t = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
        const { dmg } = rollDamage(w, st.dmg ?? 14);
        w.zones.push({
          id: w.nextId++,
          kind: "ezone",
          x: t ? t.x : p.x + rand(-200, 200),
          y: t ? t.y : p.y + rand(-200, 200),
          r: (st.r ?? 92) * area,
          grow: 0,
          dps: dmg,
          tickT: 0.3,
          life: (st.life ?? 3) * dur,
          pull: 0,
        });
      }
      break;
    }
    case "thunder": {
      const n = st.count ?? 2;
      for (let i = 0; i < n; i++) {
        const pool = nearestEnemies(w, p.x, p.y, 12, 560);
        const t = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
        const tx = t ? t.x : p.x + rand(-300, 300);
        const ty = t ? t.y : p.y + rand(-300, 300);
        const { dmg, crit } = rollDamage(w, st.dmg ?? 30);
        addDelayed(w, "thunder", tx, ty, (st.life ?? 0.38) / dur, dmg, (st.r ?? 62) * area, "#FDE68A", crit);
      }
      break;
    }
    case "armageddon": {
      const r = st.r ?? 640;
      const { dmg, crit } = rollDamage(w, st.dmg ?? 140);
      for (const e of w.enemies) {
        if (e.hp <= 0) continue;
        const rr = r + e.r;
        if (dist2(p.x, p.y, e.x, e.y) <= rr * rr) {
          damageEnemy(w, e, e.kind === "giant" ? dmg * 0.35 : dmg * 2.2, crit);
        }
      }
      w.screenFlash = 0.55;
      shake(w, 1.1, 14);
      break;
    }
    case "cloak": {
      p.cloakT = (st.life ?? 2.2) * dur;
      burst(w, p.x, p.y, "#9CA3AF", 10, 120);
      break;
    }
    case "shield": {
      p.shield = 2;
      burst(w, p.x, p.y, "#FCD34D", 10, 120);
      break;
    }
    case "circle": {
      p.circleT = (st.life ?? 8) * dur;
      p.circleAmp = st.dmg ?? 1.4;
      burst(w, p.x, p.y, "#D8B4FE", 12, 140);
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Orbit (satellite) & summons
// ---------------------------------------------------------------------------
function updateOrbit(w: World, dt: number): void {
  const slot: SpellSlot | undefined = w.spells.find((s) => s.id === "satellite");
  if (!slot) return;
  const p = w.player;
  const st = SPELL_DEFS.satellite.stats(slot.level);
  w.orbitAngle += 2.3 * dt;
  const count = st.count ?? 1;
  const orbitR = (st.r ?? 80) * areaMult(p);
  for (let i = 0; i < count; i++) {
    const a = w.orbitAngle + (i / count) * Math.PI * 2;
    const ox = p.x + Math.cos(a) * orbitR;
    const oy = p.y + Math.sin(a) * orbitR;
    for (const e of w.enemies) {
      if (e.hp <= 0 || e.orbCd > 0) continue;
      const rr = 14 + e.r;
      if (dist2(ox, oy, e.x, e.y) <= rr * rr) {
        const { dmg, crit } = rollDamage(w, st.dmg ?? 10);
        damageEnemy(w, e, dmg, crit);
        e.orbCd = 0.5;
      }
    }
  }
}

function updateSummons(w: World, dt: number): void {
  const p = w.player;
  for (const s of w.summons) {
    s.life -= dt;
    s.cd -= dt;
    const d = Math.hypot(s.x - p.x, s.y - p.y);
    if (d > 140) {
      const a = Math.atan2(p.y - s.y, p.x - s.x);
      s.x += Math.cos(a) * 150 * dt;
      s.y += Math.sin(a) * 150 * dt;
    } else {
      s.x += Math.sin(w.realT * 2 + s.id) * 12 * dt;
      s.y += Math.cos(w.realT * 2 + s.id) * 12 * dt;
    }
    if (s.cd <= 0) {
      const target = nearestEnemies(w, s.x, s.y, 1, s.range)[0];
      if (target) {
        const a = Math.atan2(target.y - s.y, target.x - s.x);
        const { dmg, crit } = rollDamage(w, s.dmg);
        spawnBullet(w, { kind: "spirit", x: s.x, y: s.y, vx: Math.cos(a) * 440, vy: Math.sin(a) * 440, dmg, r: 5, life: 1.4, crit });
        s.cd = 0.85;
      } else {
        s.cd = 0.4;
      }
    }
  }
  w.summons = w.summons.filter((s) => s.life > 0);
}

// ---------------------------------------------------------------------------
// Bullets, zones, fx
// ---------------------------------------------------------------------------
function updateBullets(w: World, dt: number): void {
  const alive: Bullet[] = [];
  for (const b of w.bullets) {
    b.life -= dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.grow > 0) b.r += b.grow * dt;

    let dead = b.life <= 0;
    if (dead && b.aoe > 0) {
      explode(w, b.x, b.y, b.aoe, b.dmg, b.crit, "#FB923C");
    }
    if (!dead) {
      for (const e of w.enemies) {
        if (e.hp <= 0) continue;
        if (b.waveId >= 0 && e.waveHit === b.waveId) continue;
        if (b.hitIds.includes(e.id)) continue;
        const rr = b.r + e.r;
        if (dist2(b.x, b.y, e.x, e.y) > rr * rr) continue;

        if (b.aoe > 0) {
          explode(w, b.x, b.y, b.aoe, b.dmg, b.crit, "#FB923C");
          dead = true;
          break;
        }
        if (b.waveId >= 0) {
          e.waveHit = b.waveId;
          damageEnemy(w, e, b.dmg, b.crit);
        } else {
          damageEnemy(w, e, b.dmg, b.crit);
          if (b.pierce > 0) {
            b.pierce -= 1;
            b.hitIds.push(e.id);
          } else {
            dead = true;
            break;
          }
        }
      }
    }
    if (!dead && b.x > -80 && b.x < ARENA + 80 && b.y > -80 && b.y < ARENA + 80) {
      alive.push(b);
    }
  }
  w.bullets = alive;
}

function updateZones(w: World, dt: number): void {
  const keep = [];
  for (const z of w.zones) {
    z.life -= dt;
    z.r += z.grow * dt;
    z.tickT -= dt;
    if (z.pull > 0) {
      for (const e of w.enemies) {
        if (e.hp <= 0) continue;
        if (dist2(z.x, z.y, e.x, e.y) <= z.r * z.r * 2.2) {
          const a = Math.atan2(z.y - e.y, z.x - e.x);
          e.x += Math.cos(a) * z.pull * dt;
          e.y += Math.sin(a) * z.pull * dt;
        }
      }
    }
    if (z.tickT <= 0) {
      z.tickT = 0.4;
      for (const e of w.enemies) {
        if (e.hp <= 0) continue;
        const rr = z.r + e.r;
        if (dist2(z.x, z.y, e.x, e.y) <= rr * rr) {
          damageEnemy(w, e, z.dps * 0.4, false);
        }
      }
    }
    if (z.life > 0) keep.push(z);
  }
  w.zones = keep;
}

function updateFx(w: World, dt: number): void {
  const keep = [];
  for (const fx of w.fx) {
    const before = fx.t;
    fx.t -= dt;
    if (fx.kind === "beam") {
      if (fx.t > 0) keep.push(fx);
      continue;
    }
    if (before > 0 && fx.t <= 0) {
      explode(w, fx.x2, fx.y2, fx.aoe, fx.dmg, fx.crit, fx.color);
      if (fx.kind === "thunder") {
        addBeam(w, fx.x1, fx.y1, fx.x2, fx.y2, 0.18, fx.color, 6);
        shake(w, 0.18, 4);
      }
    }
    if (fx.t > 0) keep.push(fx);
  }
  w.fx = keep;
}

// ---------------------------------------------------------------------------
// Enemies
// ---------------------------------------------------------------------------
function updateEnemies(w: World, dt: number): void {
  const p = w.player;
  const keep: Enemy[] = [];
  for (const e of w.enemies) {
    if (e.hp <= 0) continue;
    e.flashT = Math.max(0, e.flashT - dt);
    e.hitCd = Math.max(0, e.hitCd - dt);
    e.slowT = Math.max(0, e.slowT - dt);
    e.orbCd = Math.max(0, e.orbCd - dt);
    e.aiT -= dt;

    const slow = e.slowT > 0 ? 0.45 : 1;
    const spd = e.speed * slow;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;

    switch (e.kind) {
      case "caster": {
        if (d > 300) {
          e.x += (dx / d) * spd * dt;
          e.y += (dy / d) * spd * dt;
        } else if (d < 190) {
          e.x -= (dx / d) * spd * 0.6 * dt;
          e.y -= (dy / d) * spd * 0.6 * dt;
        }
        if (e.aiT <= 0 && d < 560) {
          e.aiT = 2.4;
          if (w.ebullets.length < MAX_EBULLETS) {
            const a = Math.atan2(dy, dx);
            w.ebullets.push({
              id: w.nextId++,
              x: e.x,
              y: e.y,
              vx: Math.cos(a) * 215,
              vy: Math.sin(a) * 215,
              r: 6,
              dmg: e.dmg * 1.2,
              life: 3.4,
              color: "#C084FC",
            });
          }
        }
        break;
      }
      case "giant": {
        e.x += (dx / d) * spd * dt;
        e.y += (dy / d) * spd * dt;
        if (e.aiT <= 0) {
          e.aiT = 3.4;
          const n = 10;
          for (let i = 0; i < n; i++) {
            if (w.ebullets.length >= MAX_EBULLETS) break;
            const a = (i / n) * Math.PI * 2 + w.realT;
            w.ebullets.push({
              id: w.nextId++,
              x: e.x,
              y: e.y,
              vx: Math.cos(a) * 170,
              vy: Math.sin(a) * 170,
              r: 7,
              dmg: e.dmg * 0.8,
              life: 3.2,
              color: "#F87171",
            });
          }
        }
        break;
      }
      default: {
        e.x += (dx / d) * spd * dt;
        e.y += (dy / d) * spd * dt;
        // Exploders detonate when they reach the player.
        if (e.kind === "exploder" && d < e.r + PLAYER_R + 8) {
          e.hp = 0;
          killEnemy(w, e);
          continue;
        }
        break;
      }
    }

    // Contact damage (exploders only hurt through their blast).
    if (e.kind !== "exploder" && d < e.r + PLAYER_R && e.hitCd <= 0) {
      e.hitCd = 0.8;
      damagePlayer(w, e.dmg);
      e.x -= (dx / d) * 10;
      e.y -= (dy / d) * 10;
    }

    e.x = clamp(e.x, e.r, ARENA - e.r);
    e.y = clamp(e.y, e.r, ARENA - e.r);
    keep.push(e);
  }
  w.enemies = keep;
}

function updateEnemyBullets(w: World, dt: number): void {
  const p = w.player;
  const keep = [];
  for (const b of w.ebullets) {
    b.life -= dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    const rr = b.r + PLAYER_R;
    if (dist2(b.x, b.y, p.x, p.y) <= rr * rr) {
      damagePlayer(w, b.dmg);
      continue;
    }
    if (b.life > 0 && b.x > -60 && b.x < ARENA + 60 && b.y > -60 && b.y < ARENA + 60) {
      keep.push(b);
    }
  }
  w.ebullets = keep;
}

// ---------------------------------------------------------------------------
// Orbs & runes
// ---------------------------------------------------------------------------
function updateOrbs(w: World, dt: number): void {
  const p = w.player;
  const range = pickupRadius(p);
  const keep: Orb[] = [];
  for (const o of w.orbs) {
    const d = Math.hypot(o.x - p.x, o.y - p.y);
    if (d < range) {
      // Pure homing: velocity is set directly each frame, so an orb can never
      // stall or drift away once it is inside the pickup radius.
      const nx = (p.x - o.x) / (d || 1);
      const ny = (p.y - o.y) / (d || 1);
      const speed = Math.min(780, 280 + (range - d) * 3.6);
      o.vx = nx * speed;
      o.vy = ny * speed;
    } else {
      o.vx *= 0.94;
      o.vy *= 0.94;
    }
    o.x += o.vx * dt;
    o.y += o.vy * dt;
    o.x = clamp(o.x, 16, ARENA - 16);
    o.y = clamp(o.y, 16, ARENA - 16);

    if (d < PLAYER_R + 16) {
      collectOrb(w, o);
      continue;
    }
    keep.push(o);
  }
  w.orbs = keep;
}

function collectOrb(w: World, o: Orb): void {
  const p = w.player;
  p.xp += o.v;
  if (ORB_HEAL[o.tier] > 0) {
    p.hp = Math.min(p.maxHp, p.hp + ORB_HEAL[o.tier]);
    burst(w, p.x, p.y, "#4ADE80", 8, 110);
  }
  burst(w, o.x, o.y, o.tier === 0 ? "#60A5FA" : o.tier === 1 ? "#FBBF24" : o.tier === 2 ? "#F472B6" : "#4ADE80", 3, 60);
}

function updateRunes(w: World, dt: number): void {
  const p = w.player;
  w.runeT -= dt;
  if (w.runeT <= 0 && w.runes.length < MAX_RUNES) {
    w.runeT = rand(42, 70);
    const kinds: RuneKind[] = ["invuln", "magnet", "frenzy", "wipe", "elite"];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const pos = ringPos(w, 160, 340);
    w.runes.push({ id: w.nextId++, kind, x: pos.x, y: pos.y, t: 0 });
  }
  const keep = [];
  for (const r of w.runes) {
    r.t += dt;
    const rr = PLAYER_R + 18;
    if (dist2(r.x, r.y, p.x, p.y) <= rr * rr) {
      applyRune(w, r.kind);
      continue;
    }
    keep.push(r);
  }
  w.runes = keep;
}

function applyRune(w: World, kind: RuneKind): void {
  const p = w.player;
  switch (kind) {
    case "invuln":
      p.invulnT = 6;
      w.banner = { title: "KEKEBALAN", sub: "6 detik kebal total", t: 1.6, color: "#FCD34D" };
      break;
    case "magnet":
      p.magnetT = 10;
      w.banner = { title: "MAGNET", sub: "Semua orb tertarik kepadamu", t: 1.6, color: "#38BDF8" };
      break;
    case "frenzy":
      p.frenzyT = 10;
      w.banner = { title: "AMUK", sub: "+30% damage, +20% kecepatan", t: 1.6, color: "#F87171" };
      break;
    case "wipe": {
      let hits = 0;
      for (const e of w.enemies) {
        if (e.hp <= 0) continue;
        if (dist2(p.x, p.y, e.x, e.y) <= 560 * 560) {
          if (e.kind === "giant") {
            damageEnemy(w, e, 260, false);
          } else {
            e.hp = 0;
            killEnemy(w, e);
          }
          hits++;
        }
      }
      w.screenFlash = 0.45;
      shake(w, 0.7, 10);
      w.banner = { title: "PEMUSNAHAN", sub: `${hits} monster dimusnahkan`, t: 1.8, color: "#E879F9" };
      break;
    }
    case "elite": {
      for (let i = 0; i < 3; i++) {
        const pos = ringPos(w, 200, 280);
        spawnEnemy(w, i === 0 ? "runner" : i === 1 ? "brute" : "caster", pos.x, pos.y, true);
      }
      w.runeEliteLeft += 3;
      w.banner = { title: "TANTANGAN ELITE", sub: "Bunuh 3 elite untuk hadiah", t: 2, color: "#A3E635" };
      break;
    }
  }
  burst(w, p.x, p.y, "#FFFFFF", 8, 140);
}

// ---------------------------------------------------------------------------
// Cosmetics
// ---------------------------------------------------------------------------
function updateParticles(w: World, dt: number): void {
  const keep = [];
  for (const q of w.particles) {
    q.life -= dt;
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.vx *= 0.96;
    q.vy *= 0.96;
    if (q.life > 0) keep.push(q);
  }
  w.particles = keep;
}

function updateNumbers(w: World, dt: number): void {
  const keep = [];
  for (const n of w.numbers) {
    n.life -= dt;
    n.y += n.vy * dt;
    n.vy *= 0.94;
    if (n.life > 0) keep.push(n);
  }
  w.numbers = keep;
}

// ---------------------------------------------------------------------------
// Level flow
// ---------------------------------------------------------------------------
function checkLevelUp(w: World): void {
  const p = w.player;
  if (p.xp < p.xpNext) return;
  levelUp(w);
  w.status = "levelup";
}

// ---------------------------------------------------------------------------
// Main step
// ---------------------------------------------------------------------------
export function stepWorld(w: World, dt: number, input: InputState): void {
  w.realT += dt;
  if (w.banner) {
    w.banner.t -= dt;
    if (w.banner.t <= 0) w.banner = null;
  }
  w.shakeT = Math.max(0, w.shakeT - dt);
  w.screenFlash = Math.max(0, w.screenFlash - dt);
  if (w.status !== "running") return;

  // Death horde lifecycle (clock frozen while active).
  if (w.hordeT !== null) {
    w.hordeT -= dt;
    if (w.hordeKilled || w.hordeT <= 0) endDeathHorde(w);
  } else if (w.t >= nextDeathTime(w.deathIdx)) {
    startDeathHorde(w);
  }

  w.t += w.hordeT !== null ? 0 : dt;

  updatePlayer(w, dt, input);
  spawnDirector(w, dt);
  updateSpells(w, dt);
  updateOrbit(w, dt);
  updateSummons(w, dt);
  updateBullets(w, dt);
  updateZones(w, dt);
  updateFx(w, dt);
  updateEnemies(w, dt);
  updateEnemyBullets(w, dt);
  updateOrbs(w, dt);
  updateRunes(w, dt);
  updateParticles(w, dt);
  updateNumbers(w, dt);

  w.score = Math.floor(w.t) * 10 + w.player.kills * 25 + w.player.level * 100 + w.wave * 500;
  checkLevelUp(w);
}
