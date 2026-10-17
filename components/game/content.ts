// Arcana Survival — content data: spells, passives, runes, enemies.
// Original names/wording; behaviors are inspired-by, never copied assets.

import type { EnemyKind, PassiveId, RuneKind, SpellId } from "./engine";
import type { UpgradeChoice, World } from "./engine";
import { xpForLevel } from "./engine";

// ---------------------------------------------------------------------------
// Spells — 21 active spells (17 up to Lv.7, 4 utility up to Lv.5)
// ---------------------------------------------------------------------------

export interface SpellStats {
  cd: number; // seconds between casts (before CDR)
  dmg: number;
  count: number;
  speed: number;
  r: number; // radius / aoe base
  pierce: number;
  life: number; // seconds (zones, summons, bullets)
  slow: number; // slow factor applied
  grow: number;
  pull: number;
}

export interface SpellDef {
  id: SpellId;
  name: string;
  maxLevel: number;
  color: string;
  desc: string; // what the spell does (card text for new spell)
  upDesc: string; // generic level-up line
  stats: (lv: number) => Partial<SpellStats>;
}

const S = (o: Partial<SpellStats>): Partial<SpellStats> => o;

export const SPELL_DEFS: Record<SpellId, SpellDef> = {
  bolt: {
    id: "bolt",
    name: "Peluru Sihir",
    maxLevel: 7,
    color: "#7DD3FC",
    desc: "Menembak peluru sihir ke monster terdekat.",
    upDesc: "Damage lebih besar, tembakan lebih rapat.",
    stats: (lv) => S({ cd: 0.95 - 0.07 * lv, dmg: 7 + 2.3 * lv, count: 1 + Math.floor(lv / 3), speed: 470, r: 5, life: 1.6 }),
  },
  flash: {
    id: "flash",
    name: "Kejutan Kilat",
    maxLevel: 7,
    color: "#FDE047",
    desc: "Kilatan melintasi layar, melukai semua yang dilewati.",
    upDesc: "Damage dan lebar kilatan bertambah.",
    stats: (lv) => S({ cd: 7 - 0.55 * lv, dmg: 22 + 9 * lv, r: 26, life: 0.32 }),
  },
  inciner: {
    id: "inciner",
    name: "Pembakaran",
    maxLevel: 7,
    color: "#FB923C",
    desc: "Menyemburkan api searah gerakmu.",
    upDesc: "Semprotan lebih lebat dan panas.",
    stats: (lv) => S({ cd: 1.9 - 0.13 * lv, dmg: 5 + 2.1 * lv, count: 2 + Math.floor(lv / 2), speed: 330, r: 8, life: 0.42 }),
  },
  meteor: {
    id: "meteor",
    name: "Meteor",
    maxLevel: 7,
    color: "#F97316",
    desc: "Memanggil meteor dari langit ke gumpalan musuh.",
    upDesc: "Meteor lebih besar dan lebih sering.",
    stats: (lv) => S({ cd: 6 - 0.35 * lv, dmg: 42 + 14 * lv, r: 88, life: 0.95 }),
  },
  fireball: {
    id: "fireball",
    name: "Bola Api",
    maxLevel: 7,
    color: "#F87171",
    desc: "Bola api meledak ke arah acak.",
    upDesc: "Lebih banyak bola api, ledakan lebih luas.",
    stats: (lv) => S({ cd: 2.7 - 0.15 * lv, dmg: 16 + 6 * lv, count: 1 + Math.floor(lv / 2), speed: 300, r: 70, life: 2.2 }),
  },
  lava: {
    id: "lava",
    name: "Zona Lava",
    maxLevel: 7,
    color: "#EF4444",
    desc: "Membakar tanah menjadi lava yang melukai perlahan.",
    upDesc: "Lava lebih luas dan lebih lama mendidih.",
    stats: (lv) => S({ cd: 8.5 - 0.5 * lv, dmg: 11 + 4 * lv, r: 82, life: 4 + 0.35 * lv }),
  },
  spirit: {
    id: "spirit",
    name: "Roh Kecil",
    maxLevel: 7,
    color: "#A5F3FC",
    desc: "Memanggil roh yang menembaki musuh di dekatmu.",
    upDesc: "Roh tambahan dengan tembakan lebih sakit.",
    stats: (lv) => S({ cd: 3.5 - 0.2 * lv, dmg: 6 + 2.4 * lv, count: 1 + Math.floor(lv / 3), speed: 430, r: 5, life: 12 + 1.5 * lv }),
  },
  energy: {
    id: "energy",
    name: "Peluru Energi",
    maxLevel: 7,
    color: "#818CF8",
    desc: "Rentetan partikel energi searah hadapmu, menembus musuh.",
    upDesc: "Rentetan lebih panjang dan menembus lebih dalam.",
    stats: (lv) => S({ cd: 2.3 - 0.11 * lv, dmg: 4.5 + 1.7 * lv, count: 3 + lv, speed: 540, r: 4.5, pierce: 1, life: 0.85 }),
  },
  satellite: {
    id: "satellite",
    name: "Satelit",
    maxLevel: 7,
    color: "#C4B5FD",
    desc: "Bola energi mengorbit dan menghantam apa pun yang disentuh.",
    upDesc: "Satelit tambahan mengorbit lebih luas.",
    stats: (lv) => S({ cd: 0.55, dmg: 9 + 3.6 * lv, count: 1 + Math.floor(lv / 2), r: 72 + 9 * lv }),
  },
  ray: {
    id: "ray",
    name: "Sinar Arkana",
    maxLevel: 7,
    color: "#E879F9",
    desc: "Sinar memancar ke segala arah dari tubuhmu.",
    upDesc: "Lebih banyak sinar dengan jangkauan jauh.",
    stats: (lv) => S({ cd: 4.4 - 0.26 * lv, dmg: 20 + 8 * lv, count: 5 + lv, r: 300, life: 0.3 }),
  },
  cyclone: {
    id: "cyclone",
    name: "Tomadoi",
    maxLevel: 7,
    color: "#67E8F9",
    desc: "Puting beliung yang tumbuh dan menghisap musuh.",
    upDesc: "Puting beliung lebih besar dan lebih lama.",
    stats: (lv) => S({ cd: 9.5 - 0.55 * lv, dmg: 13 + 5 * lv, r: 58, grow: 17, pull: 170, life: 3 + 0.4 * lv }),
  },
  tsunami: {
    id: "tsunami",
    name: "Gelombang Pasang",
    maxLevel: 7,
    color: "#38BDF8",
    desc: "Gelombang raksasa menyapu segala yang di jalannya.",
    upDesc: "Gelombang lebih tinggi dan lebih sering.",
    stats: (lv) => S({ cd: 11.5 - 0.65 * lv, dmg: 26 + 10 * lv, speed: 250, r: 120, life: 3.2 }),
  },
  frost: {
    id: "frost",
    name: "Nova Es",
    maxLevel: 7,
    color: "#93C5FD",
    desc: "Ledakan es di sekelilingmu yang membekukan musuh.",
    upDesc: "Radius dan pembekuan lebih kuat.",
    stats: (lv) => S({ cd: 5.6 - 0.32 * lv, dmg: 14 + 6 * lv, r: 150, slow: 0.55, life: 2.2 + 0.15 * lv }),
  },
  blizzard: {
    id: "blizzard",
    name: "Badai Es",
    maxLevel: 7,
    color: "#BAE6FD",
    desc: "Hujan es menghantam area sekitar musuh.",
    upDesc: "Butir es lebih banyak dan lebih sakit.",
    stats: (lv) => S({ cd: 8.5 - 0.5 * lv, dmg: 9 + 3.6 * lv, count: 7 + 2 * lv, r: 46, life: 1.6 }),
  },
  shock: {
    id: "shock",
    name: "Kejut Listrik",
    maxLevel: 7,
    color: "#FACC15",
    desc: "Sinar listrik acak yang merambat ke musuh lain.",
    upDesc: "Rambatan lebih jauh, sengatan lebih keras.",
    stats: (lv) => S({ cd: 2.9 - 0.17 * lv, dmg: 22 + 9 * lv, count: Math.floor(lv / 2), r: 150, life: 0.26 }),
  },
  ezone: {
    id: "ezone",
    name: "Zona Elektro",
    maxLevel: 7,
    color: "#A3E635",
    desc: "Medan elektromagnetik menyengat musuh tanpa henti.",
    upDesc: "Medan lebih luas dan lebih lama.",
    stats: (lv) => S({ cd: 9.5 - 0.55 * lv, dmg: 14 + 6 * lv, r: 92, life: 3 + 0.3 * lv }),
  },
  thunder: {
    id: "thunder",
    name: "Badai Guntur",
    maxLevel: 7,
    color: "#FDE68A",
    desc: "Guntur turun dari langit menghantam musuh acak.",
    upDesc: "Sambaran tambahan dari langit.",
    stats: (lv) => S({ cd: 6.2 - 0.38 * lv, dmg: 30 + 12 * lv, count: 2 + Math.floor(lv / 2), r: 62, life: 0.38 }),
  },
  armageddon: {
    id: "armageddon",
    name: "Bencana Total",
    maxLevel: 5,
    color: "#F43F5E",
    desc: "Ledakan besar menghancurkan hampir semua monster di layar.",
    upDesc: "Kehancuran makin total.",
    stats: (lv) => S({ cd: 30 - 2 * lv, dmg: 140 + 60 * lv, r: 640 }),
  },
  cloak: {
    id: "cloak",
    name: "Menghilang",
    maxLevel: 5,
    color: "#9CA3AF",
    desc: "Menghilang sejenak — kebal dari segala serangan.",
    upDesc: "Sembunyi lebih lama.",
    stats: (lv) => S({ cd: 19 - 1.6 * lv, life: 2.2 + 0.55 * lv }),
  },
  shield: {
    id: "shield",
    name: "Perisai",
    maxLevel: 5,
    color: "#FCD34D",
    desc: "Perisai menahan dua serangan, lalu mengisi ulang.",
    upDesc: "Isi ulang lebih cepat.",
    stats: (lv) => S({ cd: 15 - 1.2 * lv }),
  },
  circle: {
    id: "circle",
    name: "Lingkar Sihir",
    maxLevel: 5,
    color: "#D8B4FE",
    desc: "Melipatgandakan damage semua mantera untuk beberapa saat.",
    upDesc: "Penguatan lebih besar dan lebih lama.",
    stats: (lv) => S({ cd: 21 - 1.8 * lv, life: 8 + 1.2 * lv, dmg: 1.35 + 0.07 * lv }),
  },
};

export const SPELL_LIST: SpellId[] = Object.keys(SPELL_DEFS) as SpellId[];

// ---------------------------------------------------------------------------
// Passives — 8 generic skills
// ---------------------------------------------------------------------------

export interface PassiveDef {
  id: PassiveId;
  name: string;
  maxLevel: number;
  color: string;
  desc: string;
}

export const PASSIVE_DEFS: Record<PassiveId, PassiveDef> = {
  atk: { id: "atk", name: "Serangan", maxLevel: 7, color: "#F87171", desc: "+12% damage semua mantera" },
  crit: { id: "crit", name: "Kritis", maxLevel: 7, color: "#FBBF24", desc: "+7% peluang kritik (damage 1.75x)" },
  area: { id: "area", name: "Area", maxLevel: 7, color: "#A78BFA", desc: "+10% ukuran area mantera" },
  hp: { id: "hp", name: "Nyawa", maxLevel: 7, color: "#4ADE80", desc: "+22 nyawa maksimum, langsung pulih 22" },
  pickup: { id: "pickup", name: "Jangkauan", maxLevel: 7, color: "#38BDF8", desc: "+28 jangkauan tarik orb mana" },
  speed: { id: "speed", name: "Kecepatan", maxLevel: 7, color: "#34D399", desc: "+12 kecepatan gerak" },
  duration: { id: "duration", name: "Durasi", maxLevel: 7, color: "#F472B6", desc: "+14% durasi efek mantera" },
  cdr: { id: "cdr", name: "Pendinginan", maxLevel: 7, color: "#93C5FD", desc: "-8.5% jeda antar mantera" },
};

export const PASSIVE_LIST: PassiveId[] = Object.keys(PASSIVE_DEFS) as PassiveId[];

// ---------------------------------------------------------------------------
// Runes (field items)
// ---------------------------------------------------------------------------

export const RUNE_DATA: Record<RuneKind, { name: string; color: string }> = {
  invuln: { name: "Rune Kekebalan", color: "#FCD34D" },
  magnet: { name: "Rune Magnet", color: "#38BDF8" },
  frenzy: { name: "Rune Amuk", color: "#F87171" },
  wipe: { name: "Rune Pemusnah", color: "#E879F9" },
  elite: { name: "Rune Elite", color: "#A3E635" },
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
  unlockT: number; // seconds before this kind may spawn
  color: string;
}

export const ENEMY_DEFS: Record<EnemyKind, EnemyDef> = {
  crawler: { kind: "crawler", hp: 12, speed: 55, dmg: 8, r: 12, xp: 1, unlockT: 0, color: "#84CC16" },
  runner: { kind: "runner", hp: 8, speed: 108, dmg: 6, r: 10, xp: 1, unlockT: 90, color: "#F472B6" },
  brute: { kind: "brute", hp: 48, speed: 34, dmg: 16, r: 20, xp: 3, unlockT: 180, color: "#F87171" },
  caster: { kind: "caster", hp: 18, speed: 48, dmg: 10, r: 13, xp: 2, unlockT: 240, color: "#C084FC" },
  exploder: { kind: "exploder", hp: 14, speed: 78, dmg: 24, r: 13, xp: 2, unlockT: 330, color: "#FB923C" },
  splitter: { kind: "splitter", hp: 28, speed: 50, dmg: 10, r: 16, xp: 2, unlockT: 420, color: "#2DD4BF" },
  mini: { kind: "mini", hp: 4, speed: 98, dmg: 4, r: 7, xp: 1, unlockT: 420, color: "#5EEAD4" },
  giant: { kind: "giant", hp: 1400, speed: 30, dmg: 30, r: 46, xp: 60, unlockT: 360, color: "#DC2626" },
};

/** Time-based difficulty multipliers. */
export function enemyHpMult(t: number): number {
  return 1 + (t / 60) * 0.45 + Math.pow(t / 300, 2) * 1.2;
}

export function enemyDmgMult(t: number): number {
  return 1 + t / 700;
}

export function enemySpeedMult(t: number): number {
  return 1 + Math.min(0.5, t / 2400);
}

// ---------------------------------------------------------------------------
// Upgrade flow (level-up choices)
// ---------------------------------------------------------------------------

const SKILL_FIELD: Record<PassiveId, "sAtk" | "sCrit" | "sArea" | "sHp" | "sPickup" | "sSpeed" | "sDuration" | "sCd"> = {
  atk: "sAtk",
  crit: "sCrit",
  area: "sArea",
  hp: "sHp",
  pickup: "sPickup",
  speed: "sSpeed",
  duration: "sDuration",
  cdr: "sCd",
};

const HEAL_FILLER: UpgradeChoice = {
  key: "heal",
  kind: "skill",
  id: "hp",
  level: 0,
  title: "Racun Pemulih",
  desc: "Pulihkan 25 HP sekarang.",
};

export function buildUpgradeChoices(w: World): UpgradeChoice[] {
  const pool: UpgradeChoice[] = [];
  for (const id of SPELL_LIST) {
    const def = SPELL_DEFS[id];
    const owned = w.spells.find((s) => s.id === id);
    if (!owned) {
      pool.push({ key: `spell-new:${id}`, kind: "spell-new", id, level: 1, title: def.name, desc: def.desc });
    } else if (owned.level < def.maxLevel) {
      pool.push({
        key: `spell-up:${id}`,
        kind: "spell-up",
        id,
        level: owned.level + 1,
        title: `${def.name} → Lv.${owned.level + 1}`,
        desc: def.upDesc,
      });
    }
  }
  for (const id of PASSIVE_LIST) {
    const def = PASSIVE_DEFS[id];
    const lv = w.player[SKILL_FIELD[id]];
    if (lv < def.maxLevel) {
      pool.push({
        key: `skill:${id}`,
        kind: "skill",
        id,
        level: lv + 1,
        title: lv > 0 ? `${def.name} → Lv.${lv + 1}` : def.name,
        desc: def.desc,
      });
    }
  }
  const picks = pool.sort(() => Math.random() - 0.5).slice(0, 3);
  while (picks.length < 3) picks.push(HEAL_FILLER);
  return picks;
}

function applyChoice(w: World, c: UpgradeChoice): void {
  const p = w.player;
  if (c.key === "heal") {
    p.hp = Math.min(p.maxHp, p.hp + 25);
    return;
  }
  if (c.kind === "spell-new") {
    if (!w.spells.some((s) => s.id === c.id)) {
      w.spells.push({ id: c.id as SpellId, level: 1, cd: 0.3 });
    }
  } else if (c.kind === "spell-up") {
    const slot = w.spells.find((s) => s.id === c.id);
    if (slot) slot.level += 1;
  } else if (c.kind === "skill") {
    if (c.id === "hp") {
      p.sHp += 1;
      p.maxHp += 22;
      p.hp = Math.min(p.maxHp, p.hp + 22);
    } else {
      p[SKILL_FIELD[c.id as PassiveId]] += 1;
    }
  }
}

/** Applies the picked choice, then chains overflow level-ups. */
export function chooseUpgrade(w: World, index: number): void {
  const c = w.choices[index];
  if (c) applyChoice(w, c);
  w.choices = [];
  if (w.player.xp >= w.player.xpNext) {
    levelUp(w);
    w.status = "levelup";
  } else {
    w.status = "running";
  }
}

/** Consumes one level of overflow XP and rolls a fresh set of choices. */
export function levelUp(w: World): void {
  const p = w.player;
  if (p.xp < p.xpNext) return;
  p.xp -= p.xpNext;
  p.level += 1;
  p.xpNext = xpForLevel(p.level);
  w.choices = buildUpgradeChoices(w);
}
