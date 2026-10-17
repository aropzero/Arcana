// Arcana Survival — engine core: types, tuning constants, math helpers.
// Pure TypeScript, no React/Skia imports, so the simulation stays testable.

export const ARENA = 2600; // square arena side length (world units)
export const MAX_ENEMIES = 150;
export const MAX_GEMS = 160;
export const MAX_PARTICLES = 260;
export const PLAYER_R = 14;

export type EnemyKind = "crawler" | "runner" | "brute";
export type SpellId = "bolt" | "fireball" | "chain" | "nova";
export type PassiveId = "speed" | "vitality" | "power" | "magnet" | "regen";
export type WorldStatus = "running" | "levelup" | "paused" | "dead";

export interface Player {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  level: number;
  xp: number;
  xpNext: number;
  magnet: number;
  dmgMult: number;
  regen: number;
  flash: number; // hit flash timer
  aim: number; // facing angle (radians)
}

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
  hitCd: number; // contact-damage cooldown
  slowT: number; // remaining slow time
  elite: boolean;
  seed: number; // per-entity animation offset
}

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  r: number;
  life: number;
  kind: "bolt" | "fireball";
  aoe: number; // explosion radius (fireball only)
  hit: number[]; // enemy ids already damaged (pierce tracking)
}

export interface Gem {
  x: number;
  y: number;
  v: number; // xp value
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  r: number;
  color: string;
}

export interface Beam {
  pts: { x: number; y: number }[];
  life: number;
  maxLife: number;
}

export interface Ring {
  x: number;
  y: number;
  r: number;
  maxR: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface SpellSlot {
  id: SpellId;
  level: number;
  cd: number;
}

export interface PassiveLevels {
  speed: number;
  vitality: number;
  power: number;
  magnet: number;
  regen: number;
}

export type UpgradeKind = "spell-new" | "spell-up" | "passive" | "heal";

export interface UpgradeChoice {
  key: string;
  kind: UpgradeKind;
  spell?: SpellId;
  passive?: PassiveId;
  glyph: string;
  title: string;
  desc: string;
}

export interface World {
  t: number; // elapsed seconds
  status: WorldStatus;
  player: Player;
  enemies: Enemy[];
  bullets: Bullet[];
  gems: Gem[];
  particles: Particle[];
  beams: Beam[];
  rings: Ring[];
  spells: SpellSlot[];
  passives: PassiveLevels;
  nextId: number;
  spawnT: number;
  kills: number;
  score: number;
  choices: UpgradeChoice[];
  view: { w: number; h: number }; // viewport size, updated by the screen
  cam: { x: number; y: number };
}

export interface InputState {
  active: boolean;
  baseX: number;
  baseY: number;
  dx: number;
  dy: number;
}

export function emptyInput(): InputState {
  return { active: false, baseX: 0, baseY: 0, dx: 0, dy: 0 };
}

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function randRange(lo: number, hi: number): number {
  return lo + Math.random() * (hi - lo);
}

export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

export function formatTime(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}
