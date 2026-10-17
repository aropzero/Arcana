// Arcana Survival — engine core: types, tuning constants, math helpers.
// Pure TypeScript, no React/Skia imports, so the simulation stays testable.

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------
export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const rand = (a: number, b: number): number => a + Math.random() * (b - a);

export const randInt = (a: number, b: number): number => Math.floor(rand(a, b + 1));

export const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const dist2 = (ax: number, ay: number, bx: number, by: number): number => {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
};

export const dist = (ax: number, ay: number, bx: number, by: number): number =>
  Math.sqrt(dist2(ax, ay, bx, by));

export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const formatTime = (seconds: number): string => {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

// ---------------------------------------------------------------------------
// Tuning
// ---------------------------------------------------------------------------
export const ARENA = 2600; // square arena side (world units)
export const PLAYER_R = 13;
export const PLAYER_BASE_SPEED = 180;
export const PLAYER_BASE_HP = 100;
export const BASE_PICKUP = 120;

export const MAX_ENEMIES = 150;
export const MAX_BULLETS = 280;
export const MAX_EBULLETS = 90;
export const MAX_PARTICLES = 320;
export const MAX_NUMBERS = 60;
export const MAX_ORBS = 240;
export const MAX_ZONES = 24;
export const MAX_FX = 90;
export const MAX_SUMMONS = 6;
export const MAX_RUNES = 2;

/** Death hordes (source pacing): 6:00, 11:00, 15:00, 18:00, then every +2:30. */
export const DEATH_EVENTS = [360, 660, 900, 1080];
export const DEATH_EVENT_GAP = 150;
export const HORDE_TIMEOUT = 45; // clock unfreezes anyway after this

/** XP (mana) needed to advance from level `lv` to `lv+1`. */
export function xpForLevel(lv: number): number {
  return Math.round(5 + 2.1 * Math.pow(lv, 1.38));
}

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------
export type EnemyKind =
  | "crawler"
  | "runner"
  | "brute"
  | "caster"
  | "exploder"
  | "splitter"
  | "mini"
  | "giant";

export interface Enemy {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  dmg: number;
  r: number;
  xp: number;
  elite: boolean;
  hitCd: number; // contact-damage cooldown
  slowT: number;
  flashT: number; // white hit flash
  aiT: number; // generic AI timer (caster shot, exploder fuse)
  seed: number; // animation offset
  orbCd: number; // satellite contact cooldown
  waveHit: number; // last tsunami id that hit
}

export type BulletKind =
  | "bolt"
  | "fire"
  | "wind"
  | "energy"
  | "spirit"
  | "ice"
  | "wave";

export interface Bullet {
  id: number;
  kind: BulletKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  dmg: number;
  pierce: number; // remaining pierces
  hitIds: number[];
  life: number;
  aoe: number; // explosion radius on final hit (0 = none)
  crit: boolean;
  grow: number; // radius growth per second
  waveId: number; // tsunami wave identity
}

export interface EnemyBullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  dmg: number;
  life: number;
  color: string;
}

export type ZoneKind = "lava" | "ezone" | "cyclone";

export interface Zone {
  id: number;
  kind: ZoneKind;
  x: number;
  y: number;
  r: number;
  grow: number;
  dps: number;
  tickT: number;
  life: number;
  pull: number;
}

export interface Summon {
  id: number;
  x: number;
  y: number;
  cd: number;
  life: number;
  dmg: number;
  range: number;
}

export type FxKind = "beam" | "meteor" | "thunder";

export interface Fx {
  id: number;
  kind: FxKind;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  t: number; // beam: remaining life; meteor/thunder: remaining delay
  maxT: number;
  w: number;
  dmg: number;
  aoe: number;
  color: string;
  crit: boolean;
}

export type OrbTier = 0 | 1 | 2 | 3; // blue, yellow, pink, green

export const ORB_VALUE: Record<OrbTier, number> = { 0: 1, 1: 5, 2: 25, 3: 60 };
export const ORB_HEAL: Record<OrbTier, number> = { 0: 0, 1: 0, 2: 0, 3: 25 };

export interface Orb {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  tier: OrbTier;
  v: number; // actual mana (XP) value carried
}

export type RuneKind = "invuln" | "magnet" | "frenzy" | "wipe" | "elite";

export interface RunePickup {
  id: number;
  kind: RuneKind;
  x: number;
  y: number;
  t: number;
}

export interface DamageNumber {
  x: number;
  y: number;
  vy: number;
  life: number;
  text: string;
  crit: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  r: number;
}

export interface Player {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  xpNext: number;
  kills: number;
  facingX: number;
  facingY: number;
  // passive skill levels
  sAtk: number;
  sCrit: number;
  sArea: number;
  sHp: number;
  sPickup: number;
  sSpeed: number;
  sDuration: number;
  sCd: number;
  // buffs
  shield: number; // charges 0-2
  shieldCd: number;
  cloakT: number;
  circleT: number; // Lingkar Sihir attack amp
  circleAmp: number; // amp multiplier while circleT active
  invulnT: number;
  magnetT: number;
  frenzyT: number;
  hitFlash: number;
}

export type SpellId =
  | "bolt"
  | "flash"
  | "inciner"
  | "meteor"
  | "fireball"
  | "lava"
  | "spirit"
  | "energy"
  | "satellite"
  | "ray"
  | "cyclone"
  | "tsunami"
  | "frost"
  | "blizzard"
  | "shock"
  | "ezone"
  | "thunder"
  | "armageddon"
  | "cloak"
  | "shield"
  | "circle";

export type PassiveId =
  | "atk"
  | "crit"
  | "area"
  | "hp"
  | "pickup"
  | "speed"
  | "duration"
  | "cdr";

export interface SpellSlot {
  id: SpellId;
  level: number;
  cd: number;
}

export interface UpgradeChoice {
  key: string;
  kind: "spell-new" | "spell-up" | "skill";
  id: SpellId | PassiveId;
  level: number; // resulting level
  title: string;
  desc: string;
}

export type WorldStatus = "running" | "levelup" | "paused" | "dead";

export interface Banner {
  title: string;
  sub: string;
  t: number;
  color: string;
}

export interface World {
  t: number; // gameplay clock (frozen during death hordes)
  realT: number; // wall clock for cosmetics
  status: WorldStatus;
  player: Player;
  enemies: Enemy[];
  bullets: Bullet[];
  ebullets: EnemyBullet[];
  zones: Zone[];
  summons: Summon[];
  fx: Fx[];
  orbs: Orb[];
  runes: RunePickup[];
  particles: Particle[];
  numbers: DamageNumber[];
  orbitAngle: number;
  spells: SpellSlot[];
  wave: number; // death hordes survived
  deathIdx: number; // next death event index
  hordeT: number | null; // active horde remaining timeout
  hordeKilled: boolean;
  giantId: number | null;
  runeEliteLeft: number; // elites pending for the elite rune reward
  banner: Banner | null;
  shakeT: number;
  shakeMag: number;
  screenFlash: number;
  score: number;
  choices: UpgradeChoice[];
  nextId: number;
  spawnT: number;
  runeT: number;
}

export interface InputState {
  active: boolean;
  baseX: number;
  baseY: number;
  dx: number;
  dy: number;
}

export const IDLE_INPUT: InputState = { active: false, baseX: 0, baseY: 0, dx: 0, dy: 0 };
