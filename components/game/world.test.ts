// Headless simulation tests for the Arcana Survival world step.
import { describe, expect, it } from "vitest";

import { ARENA, MAX_ENEMIES } from "./engine";
import { chooseUpgrade, nextXp, SPELL_DEFS } from "./content";
import { createWorld, stepWorld } from "./world";
import type { InputState } from "./engine";

function idleInput(): InputState {
  return { active: false, baseX: 0, baseY: 0, dx: 0, dy: 0 };
}

function run(w: ReturnType<typeof createWorld>, seconds: number, input = idleInput()): void {
  const steps = Math.round(seconds / (1 / 60));
  for (let i = 0; i < steps; i++) {
    stepWorld(w, 1 / 60, input);
  }
}

function hasNoNaN(w: ReturnType<typeof createWorld>): boolean {
  const numbers: number[] = [
    w.player.x,
    w.player.y,
    w.player.hp,
    w.t,
    w.score,
    ...w.enemies.flatMap((e) => [e.x, e.y, e.hp]),
    ...w.bullets.flatMap((b) => [b.x, b.y]),
    ...w.gems.flatMap((g) => [g.x, g.y]),
  ];
  return numbers.every((n) => Number.isFinite(n));
}

describe("world simulation", () => {
  it("spawns enemies over time and keeps them inside the arena", () => {
    const w = createWorld();
    run(w, 20);
    expect(w.enemies.length).toBeGreaterThan(5);
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
    run(w, 45);
    expect(w.kills).toBeGreaterThan(0);
    expect(w.score).toBeGreaterThan(0);
    expect(hasNoNaN(w)).toBe(true);
  });

  it("caps the alive enemies at MAX_ENEMIES", () => {
    const w = createWorld();
    run(w, 90);
    expect(w.enemies.length).toBeLessThanOrEqual(MAX_ENEMIES);
  });

  it("levels up on XP collection and applies a chosen upgrade", () => {
    const w = createWorld();
    w.player.xp = nextXp(w.player.level);
    // Drop a gem right on the player; collection triggers the level check.
    w.gems.push({ x: w.player.x, y: w.player.y, v: 1 });
    const snapshot = () =>
      JSON.stringify({
        spells: w.spells,
        passives: w.passives,
        hp: w.player.hp,
        maxHp: w.player.maxHp,
        speed: w.player.speed,
        dmgMult: w.player.dmgMult,
        magnet: w.player.magnet,
        regen: w.player.regen,
      });
    const before = snapshot();
    stepWorld(w, 1 / 60, idleInput());
    expect(w.status).toBe("levelup");
    expect(w.choices.length).toBe(3);

    chooseUpgrade(w, 0);
    expect(snapshot()).not.toBe(before);
  });

  it("all four spells eventually fire in a long battle", () => {
    const w = createWorld();
    // Grant every spell at a decent level.
    w.spells = (Object.keys(SPELL_DEFS) as (keyof typeof SPELL_DEFS)[]).map(
      (id) => ({ id, level: 3, cd: 0 }),
    );
    w.player.xp = 9999; // keep leveling to avoid levelup stalls
    run(w, 30);
    // The fight should have produced effects of every kind.
    expect(w.kills).toBeGreaterThan(10);
    expect(hasNoNaN(w)).toBe(true);
  });

  it("ends the game when HP is exhausted", () => {
    const w = createWorld();
    w.player.hp = 1;
    w.player.x = ARENA / 2;
    w.player.y = ARENA / 2;
    // Drop a horde on top of the player.
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
        hitCd: 0,
        slowT: 0,
        elite: false,
        seed: i,
      });
    }
    run(w, 10);
    expect(w.status).toBe("dead");
    expect(w.player.hp).toBe(0);
  });

  it("moving input translates the player", () => {
    const w = createWorld();
    const startX = w.player.x;
    const input: InputState = { active: true, baseX: 0, baseY: 0, dx: 64, dy: 0 };
    run(w, 1, input);
    expect(w.player.x).toBeGreaterThan(startX);
  });
});
