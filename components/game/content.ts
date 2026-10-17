// Arcana Survival — game content: spells, passives, enemy stats, upgrades.
// All names, numbers and descriptions are original work.

import type {
  EnemyKind,
  PassiveId,
  SpellId,
  UpgradeChoice,
  World,
} from "./engine";
import { shuffle } from "./engine";

// ---------------------------------------------------------------------------
// Spells
// ---------------------------------------------------------------------------

export interface SpellDef {
  id: SpellId;
  name: string;
  glyph: string;
  color: string;
  maxLevel: number;
  cd: (level: number) => number;
  dmg: (level: number) => number;
  blurb: string;
  upBlurb: (level: number) => string; // effect of reaching `level` (next)
}

export const SPELL_DEFS: Record<SpellId, SpellDef> = {
  bolt: {
    id: "bolt",
    name: "Bolt Sihir",
    glyph: "✦",
    color: "#7DD3FC",
    maxLevel: 5,
    cd: (l) => Math.max(0.35, 0.85 - 0.09 * (l - 1)),
    dmg: (l) => 9 + 4 * (l - 1),
    blurb: "Menembak bolt ke musuh terdekat secara otomatis.",
    upBlurb: () => "Damage lebih besar & tembakan lebih cepat.",
  },
  fireball: {
    id: "fireball",
    name: "Bola Api",
    glyph: "☄",
    color: "#FB923C",
    maxLevel: 5,
    cd: (l) => Math.max(1.6, 3.0 - 0.25 * (l - 1)),
    dmg: (l) => 20 + 9 * (l - 1),
    blurb: "Bola api meledak melukai musuh di area.",
    upBlurb: () => "Ledakan lebih luas & damage lebih besar.",
  },
  chain: {
    id: "chain",
    name: "Petir Berantai",
    glyph: "⚡",
    color: "#FDE047",
    maxLevel: 5,
    cd: (l) => Math.max(1.8, 3.4 - 0.3 * (l - 1)),
    dmg: (l) => 16 + 7 * (l - 1),
    blurb: "Petir menyambar musuh lalu melompat ke musuh lain.",
    upBlurb: () => "Lebih banyak lompatan & damage lebih besar.",
  },
  nova: {
    id: "nova",
    name: "Nova Es",
    glyph: "❄",
    color: "#93C5FD",
    maxLevel: 5,
    cd: (l) => Math.max(2.8, 5.0 - 0.4 * (l - 1)),
    dmg: (l) => 14 + 7 * (l - 1),
    blurb: "Gelombang dingin melukai & memperlambat musuh sekeliling.",
    upBlurb: () => "Radius lebih luas & damage lebih besar.",
  },
};

// ---------------------------------------------------------------------------
// Passives
// ---------------------------------------------------------------------------

export interface PassiveDef {
  id: PassiveId;
  name: string;
  glyph: string;
  maxLevel: number;
  desc: string;
}

export const PASSIVE_DEFS: Record<PassiveId, PassiveDef> = {
  speed: {
    id: "speed",
    name: "Sepatu Angin",
    glyph: "➤",
    maxLevel: 3,
    desc: "Kecepatan gerak +12%.",
  },
  vitality: {
    id: "vitality",
    name: "Jantung Baja",
    glyph: "♥",
    maxLevel: 3,
    desc: "Nyawa maksimum +25 dan pulih 25 HP.",
  },
  power: {
    id: "power",
    name: "Sikat Mantra",
    glyph: "✧",
    maxLevel: 4,
    desc: "Damage semua mantra +12%.",
  },
  magnet: {
    id: "magnet",
    name: "Kristal Tarik",
    glyph: "◎",
    maxLevel: 3,
    desc: "Jarak tarik kristal XP +35%.",
  },
  regen: {
    id: "regen",
    name: "Aura Pulih",
    glyph: "✚",
    maxLevel: 3,
    desc: "Regenerasi HP +0,8 / detik.",
  },
};

const HEAL_CHOICE: UpgradeChoice = {
  key: "heal",
  kind: "heal",
  glyph: "✚",
  title: "Ramuan Penyembuhan",
  desc: "Pulihkan 40 HP sekarang.",
};

// ---------------------------------------------------------------------------
// Enemies
// ---------------------------------------------------------------------------

export interface EnemyDef {
  kind: EnemyKind;
  hp: number;
  speed: number;
  dmg: number;
  r: number;
  xp: number;
  color: string;
  unlockT: number; // seconds before this kind starts spawning
  weight: (t: number) => number;
}

export const ENEMY_DEFS: Record<EnemyKind, EnemyDef> = {
  crawler: {
    kind: "crawler",
    hp: 14,
    speed: 58,
    dmg: 8,
    r: 13,
    xp: 1,
    color: "#7CB342",
    unlockT: 0,
    weight: () => 10,
  },
  runner: {
    kind: "runner",
    hp: 9,
    speed: 118,
    dmg: 6,
    r: 10,
    xp: 1,
    color: "#F472B6",
    unlockT: 75,
    weight: (t) => 5 + t / 60,
  },
  brute: {
    kind: "brute",
    hp: 110,
    speed: 40,
    dmg: 22,
    r: 24,
    xp: 6,
    color: "#EF5350",
    unlockT: 200,
    weight: (t) => 2 + t / 120,
  },
};

// ---------------------------------------------------------------------------
// Upgrade flow
// ---------------------------------------------------------------------------

export function nextXp(level: number): number {
  return 5 + (level - 1) * 4 + Math.floor(Math.pow(level - 1, 1.7));
}

export function buildChoices(w: World): UpgradeChoice[] {
  const pool: UpgradeChoice[] = [];

  for (const def of Object.values(SPELL_DEFS)) {
    const owned = w.spells.find((s) => s.id === def.id);
    if (!owned) {
      pool.push({
        key: `spell-new:${def.id}`,
        kind: "spell-new",
        spell: def.id,
        glyph: def.glyph,
        title: def.name,
        desc: def.blurb,
      });
    } else if (owned.level < def.maxLevel) {
      pool.push({
        key: `spell-up:${def.id}`,
        kind: "spell-up",
        spell: def.id,
        glyph: def.glyph,
        title: `${def.name} → Lv.${owned.level + 1}`,
        desc: def.upBlurb(owned.level + 1),
      });
    }
  }

  for (const def of Object.values(PASSIVE_DEFS)) {
    const lvl = w.passives[def.id];
    if (lvl < def.maxLevel) {
      pool.push({
        key: `passive:${def.id}`,
        kind: "passive",
        passive: def.id,
        glyph: def.glyph,
        title: `${def.name} ${lvl > 0 ? `→ Lv.${lvl + 1}` : ""}`.trim(),
        desc: def.desc,
      });
    }
  }

  const picks = shuffle(pool).slice(0, 3);
  while (picks.length < 3) picks.push(HEAL_CHOICE);
  return picks;
}

export function applyUpgrade(w: World, choice: UpgradeChoice): void {
  const p = w.player;
  if (choice.kind === "spell-new" && choice.spell) {
    w.spells.push({ id: choice.spell, level: 1, cd: 0.4 });
  } else if (choice.kind === "spell-up" && choice.spell) {
    const slot = w.spells.find((s) => s.id === choice.spell);
    if (slot) slot.level += 1;
  } else if (choice.kind === "passive" && choice.passive) {
    w.passives[choice.passive] += 1;
    switch (choice.passive) {
      case "speed":
        p.speed *= 1.12;
        break;
      case "vitality":
        p.maxHp += 25;
        p.hp = Math.min(p.maxHp, p.hp + 25);
        break;
      case "power":
        p.dmgMult *= 1.12;
        break;
      case "magnet":
        p.magnet *= 1.35;
        break;
      case "regen":
        p.regen += 0.8;
        break;
    }
  } else if (choice.kind === "heal") {
    p.hp = Math.min(p.maxHp, p.hp + 40);
  }
}

/** Applies the picked choice, then chains pending level-ups from overflow XP. */
export function chooseUpgrade(w: World, index: number): void {
  const choice = w.choices[index];
  if (choice) applyUpgrade(w, choice);
  w.choices = [];

  if (w.player.xp >= w.player.xpNext) {
    levelUp(w);
    w.status = "levelup";
  } else {
    w.status = "running";
  }
}

/** Consumes overflow XP, raises the level and rolls a new set of choices. */
export function levelUp(w: World): void {
  const p = w.player;
  if (p.xp < p.xpNext) return;
  p.xp -= p.xpNext;
  p.level += 1;
  p.xpNext = nextXp(p.level);
  w.choices = buildChoices(w);
}
