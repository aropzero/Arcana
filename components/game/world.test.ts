// Headless simulation tests for the Arcana Survival V2 world step.
import { describe, expect, it } from "vitest";

import { ARENA, IDLE_INPUT, MAX_ENEMIES, xpForLevel, type InputState, type World } from "./engine";
import { chooseUpgrade, SPELL_DEFS, SPELL_LIST } from "./content";
import { createWorld, killEnemy, nextDeathTime, stepWorld } from "./world";

function idleInput(): InputState {
  return { active: false, baseX: 0, baseY: 0, dx: 0, dy: 0 };
}

/** Runs the sim for `seconds`, auto-picking upgrades when level-ups occur. */
function runPlaying(w: World, seconds: number, input = idleInput()): void {
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i++) {
    stepWorld(w, 1 / 60, input);
    if (w.status === "levelup") {
      chooseUpgrade(w, 0);
    }
  }
}

function hasNoNaN(w: World): boolean {
  const numbers: number[] = [
    w.player.x,
    w.player.y,
    w.player.hp,
    w.t,
    w.score,
    ...w.enemies.flatMap((e) => [e.x, e.y, e.hp]),
    ...w.bullets.flatMap((b) => [b.x, b.y]),
    ...w.orbs.flatMap((o) => [o.x, o.y]),
  ];
  return numbers.every((n) => Number.isFinite(n));
}

describe("world simulation", () => {
  it("spawns enemies over time and keeps them inside the arena", () => {
    const w = createWorld();
    runPlaying(w, 40);
    expect(w.enemies.length).toBeGreaterThan(4);
    for (const e of w.enemies) {
      expect(e.x).toBeGreaterThanOrEqual(0);
      expect(e.x).toBeLessThanOrEqual(ARENA);
      expect(e.y).toBeGreaterThanOrEqual(0);
      expect(e.y).toBeLessThanOrEqual(ARENA);
    }
    expect(hasNoNaN(w)).toBe(true);
  });

  it("auto-fires bolts and scores kills while the player is idle", () => {
    const w = createWorld();
    runPlaying(w, 45);
    expect(w.player.kills).toBeGreaterThan(0);
    expect(w.score).toBeGreaterThan(0);
    expect(hasNoNaN(w)).toBe(true);
  });

  it("caps the alive enemies at MAX_ENEMIES", () => {
    const w = createWorld();
    w.player.maxHp = 1_000_000;
    w.player.hp = 1_000_000;
    runPlaying(w, 120);
    expect(w.enemies.length).toBeLessThanOrEqual(MAX_ENEMIES);
  });

  it("levels up through mana orbs and applies a chosen upgrade", () => {
    const w = createWorld();
    w.player.xp = xpForLevel(w.player.level) - 1;
    w.orbs.push({ id: w.nextId++, x: w.player.x, y: w.player.y, vx: 0, vy: 0, tier: 0, v: 1 });
    const before = JSON.stringify({ spells: w.spells, player: { ...w.player } });
    stepWorld(w, 1 / 60, idleInput());
    expect(w.status).toBe("levelup");
    expect(w.choices.length).toBe(3);
    chooseUpgrade(w, 0);
    expect(JSON.stringify({ spells: w.spells, player: { ...w.player } })).not.toBe(before);
  });

  it("fires every one of the 21 spells without errors", () => {
    const w = createWorld();
    w.spells = SPELL_LIST.map((id) => ({ id, level: Math.min(3, SPELL_DEFS[id].maxLevel), cd: 0.2 }));
    runPlaying(w, 30);
    expect(w.player.kills).toBeGreaterThan(20);
    expect(hasNoNaN(w)).toBe(true);
  });

  it("runs a death horde: clock freezes, giant spawns, and clearing resumes time", () => {
    const w = createWorld();
    runPlaying(w, 10); // build a small economy
    w.t = nextDeathTime(w.deathIdx) + 0.2;
    stepWorld(w, 0.5, idleInput());
    expect(w.hordeT).not.toBeNull();
    expect(w.giantId).not.toBeNull();
    const giant = w.enemies.find((e) => e.id === w.giantId);
    expect(giant).toBeDefined();
    const tFrozen = w.t;
    stepWorld(w, 1, idleInput());
    expect(w.t).toBe(tFrozen); // clock frozen during the horde
    if (giant) {
      giant.hp = 0;
      killEnemy(w, giant);
    }
    stepWorld(w, 0.2, idleInput());
    expect(w.hordeT).toBeNull();
  });

  it("unlocks later enemy kinds over time", () => {
    const w = createWorld();
    w.player.maxHp = 1_000_000;
    w.player.hp = 1_000_000;
    runPlaying(w, 260);
    const kinds = new Set(w.enemies.map((e) => e.kind));
    expect(kinds.has("runner")).toBe(true);
    expect(kinds.has("brute")).toBe(true);
    expect(kinds.has("caster")).toBe(true);
  });

  it("picks up runes and gains their effect", () => {
    const w = createWorld();
    w.runes.push({ id: w.nextId++, kind: "invuln", x: w.player.x, y: w.player.y, t: 0 });
    stepWorld(w, 1 / 60, idleInput());
    expect(w.player.invulnT).toBeGreaterThan(0);
    expect(w.runes.length).toBe(0);
  });

  it("ends the game when HP is exhausted", () => {
    const w = createWorld();
    w.player.hp = 1;
    w.player.x = ARENA / 2;
    w.player.y = ARENA / 2;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      w.enemies.push({
        id: w.nextId++,
        kind: "crawler",
        x: ARENA / 2 + Math.cos(a) * 30,
        y: ARENA / 2 + Math.sin(a) * 30,
        hp: 9999,
        maxHp: 9999,
        speed: 60,
        dmg: 10,
        r: 13,
        xp: 1,
        elite: false,
        hitCd: 0,
        slowT: 0,
        flashT: 0,
        aiT: 0,
        seed: i,
        orbCd: 0,
        waveHit: -1,
      });
    }
    runPlaying(w, 10);
    expect(w.status).toBe("dead");
    expect(w.player.hp).toBe(0);
  });

  it("moving input translates the player", () => {
    const w = createWorld();
    const startX = w.player.x;
    const input: InputState = { active: true, baseX: 0, baseY: 0, dx: 64, dy: 0 };
    runPlaying(w, 1, input);
    expect(w.player.x).toBeGreaterThan(startX);
  });
});
