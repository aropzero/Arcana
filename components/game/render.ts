// Arcana Survival — Skia renderer in the hand-drawn ink style: light textured
// field, black ink-splat monsters, vivid splat/web spell effects.
// All visuals are procedural (no external assets).

import { PaintStyle, Skia } from "@shopify/react-native-skia";
import type { SkCanvas, SkFont, SkPaint, SkPicture } from "@shopify/react-native-skia";

import { ARENA, PLAYER_R, type Enemy, type World } from "./engine";
import { ENEMY_DEFS, RUNE_DATA } from "./content";
import { areaMult } from "./world";

const INK = "#181410"; // monster / wizard silhouette
const FIELD_BG = "#A98E6F"; // warm tan paper
const FIELD_MARK = "#8A6F52";
const FIELD_SPECK = "#7A6144";
const ORB_COLORS = ["#4FC3F7", "#FFD54F", "#F06292", "#66BB6A"];

// ---------------------------------------------------------------------------
// Static field texture (deterministic brush marks, generated once)
// ---------------------------------------------------------------------------
interface FieldMark {
  x: number;
  y: number;
  kind: 0 | 1 | 2; // crack / sprig / speck
  a: number;
  len: number;
}
const FIELD_MARKS: FieldMark[] = [];
{
  let seed = 1337;
  const rng = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  for (let i = 0; i < 1500; i++) {
    FIELD_MARKS.push({
      x: rng() * ARENA,
      y: rng() * ARENA,
      kind: (Math.floor(rng() * 3) as 0 | 1 | 2),
      a: rng() * Math.PI * 2,
      len: 4 + rng() * 14,
    });
  }
}

let fontSmall: SkFont | null = null;
let fontBig: SkFont | null = null;
function getFonts(): { small: SkFont; big: SkFont } {
  if (!fontSmall) fontSmall = Skia.Font(undefined, 13);
  if (!fontBig) fontBig = Skia.Font(undefined, 17);
  return { small: fontSmall, big: fontBig };
}

function paint(color: string, alpha = 1, style: PaintStyle = PaintStyle.Fill): SkPaint {
  const p = Skia.Paint();
  p.setColor(Skia.Color(color));
  p.setAlphaf(Math.max(0, Math.min(1, alpha)));
  p.setAntiAlias(true);
  p.setStyle(style);
  return p;
}

function strokePaint(color: string, alpha = 1, width = 2): SkPaint {
  const p = paint(color, alpha, PaintStyle.Stroke);
  p.setStrokeWidth(width);
  return p;
}

// ---------------------------------------------------------------------------
// Ink-style primitives
// ---------------------------------------------------------------------------
/** Irregular black ink-splat blob (monsters). */
function inkBlob(c: SkCanvas, x: number, y: number, r: number, seed: number, color = INK, alpha = 1): void {
  const p = paint(color, alpha);
  const w1 = Math.sin(seed * 12.9) * 0.5 + 0.5;
  const w2 = Math.sin(seed * 7.3) * 0.5 + 0.5;
  c.drawCircle(x - r * 0.35 * w1, y - r * 0.2 * w2, r * 0.78, p);
  c.drawCircle(x + r * 0.38 * w2, y - r * 0.3 * w1, r * 0.62, p);
  c.drawCircle(x + r * 0.1, y + r * 0.42 * w1, r * 0.7, p);
  c.drawCircle(x - r * 0.15, y - r * 0.05, r * 0.5, p);
  // Drips & spikes
  for (let i = 0; i < 4; i++) {
    const a = seed * 3.1 + i * 1.9;
    const rr = r * (1.05 + 0.35 * Math.sin(seed * 5 + i * 2.4));
    const dx = x + Math.cos(a) * rr;
    const dy = y + Math.sin(a) * rr;
    c.drawCircle(dx, dy, r * 0.2, p);
  }
}

/** Vivid splat burst (spell explosions). */
function splat(c: SkCanvas, x: number, y: number, r: number, color: string, alpha = 1): void {
  c.drawCircle(x, y, r * 0.55, paint(color, alpha));
  c.drawCircle(x, y, r * 0.3, paint("#FFF7E8", alpha));
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + r * 0.13;
    const inner = r * 0.5;
    const outer = r * (0.95 + 0.3 * Math.sin(i * 4.7 + r));
    c.drawLine(
      x + Math.cos(a) * inner,
      y + Math.sin(a) * inner,
      x + Math.cos(a) * outer,
      y + Math.sin(a) * outer,
      strokePaint(color, alpha, r * 0.22),
    );
    c.drawCircle(x + Math.cos(a) * outer * 1.1, y + Math.sin(a) * outer * 1.1, r * 0.13, paint(color, alpha));
  }
}

/** Jagged lightning segment (white web). */
function lightning(c: SkCanvas, x1: number, y1: number, x2: number, y2: number, width: number, alpha = 1): void {
  const segs = 4;
  let px = x1;
  let py = y1;
  for (let i = 1; i <= segs; i++) {
    const t = i / segs;
    const nx = x1 + (x2 - x1) * t + (i < segs ? (Math.sin(x2 * 7 + i * 13) * 12) : 0);
    const ny = y1 + (y2 - y1) * t + (i < segs ? (Math.cos(y2 * 9 + i * 17) * 12) : 0);
    c.drawLine(px, py, nx, ny, strokePaint("#FFFFFF", alpha, width));
    c.drawCircle(nx, ny, width * 0.55, paint("#FFFFFF", alpha));
    px = nx;
    py = ny;
  }
}

/** White starburst splat (electric impact). */
function starburst(c: SkCanvas, x: number, y: number, r: number, alpha = 1): void {
  splat(c, x, y, r, "#F5F2EA", alpha);
}

function glowDot(c: SkCanvas, x: number, y: number, r: number, color: string, alpha = 1): void {
  c.drawCircle(x, y, r * 2, paint(color, alpha * 0.25));
  c.drawCircle(x, y, r * 1.4, paint(color, alpha * 0.55));
  c.drawCircle(x, y, r, paint(color, alpha));
  c.drawCircle(x - r * 0.25, y - r * 0.25, r * 0.35, paint("#FFFFFF", alpha * 0.8));
}

// ---------------------------------------------------------------------------
// World picture
// ---------------------------------------------------------------------------
export function buildGamePicture(w: World, vw: number, vh: number): SkPicture {
  const rec = Skia.PictureRecorder();
  const canvas = rec.beginRecording(Skia.XYWHRect(0, 0, vw, vh));
  drawWorld(canvas, w, vw, vh);
  return rec.finishRecordingAsPicture();
}

function camera(w: World, vw: number, vh: number): { x: number; y: number } {
  const shake = w.shakeT > 0 ? w.shakeMag * w.shakeT * 1.4 : 0;
  const sx = Math.sin(w.realT * 57) * shake;
  const sy = Math.cos(w.realT * 49) * shake;
  const cx = ARENA <= vw ? (ARENA - vw) / 2 : Math.max(0, Math.min(ARENA - vw, w.player.x - vw / 2));
  const cy = ARENA <= vh ? (ARENA - vh) / 2 : Math.max(0, Math.min(ARENA - vh, w.player.y - vh / 2));
  return { x: cx - sx, y: cy - sy };
}

function drawWorld(c: SkCanvas, w: World, vw: number, vh: number): void {
  const cam = camera(w, vw, vh);
  c.save();
  c.translate(-cam.x, -cam.y);

  // Field
  c.drawRect({ x: 0, y: 0, width: ARENA, height: ARENA }, paint(FIELD_BG));
  const inView = (x: number, y: number, pad = 40) =>
    x >= cam.x - pad && x <= cam.x + vw + pad && y >= cam.y - pad && y <= cam.y + vh + pad;
  for (const m of FIELD_MARKS) {
    if (!inView(m.x, m.y)) continue;
    if (m.kind === 0) {
      // crack
      c.drawLine(m.x, m.y, m.x + Math.cos(m.a) * m.len, m.y + Math.sin(m.a) * m.len, strokePaint(FIELD_MARK, 0.6, 1.4));
    } else if (m.kind === 1) {
      // grass sprig: three tiny fanned strokes
      for (const da of [-0.4, 0, 0.4]) {
        c.drawLine(m.x, m.y, m.x + Math.cos(m.a + da) * m.len * 0.6, m.y + Math.sin(m.a + da) * m.len * 0.6, strokePaint(INK, 0.55, 1.2));
      }
    } else {
      c.drawCircle(m.x, m.y, 1.3, paint(FIELD_SPECK, 0.7));
    }
  }

  drawZones(c, w);
  drawOrbs(c, w);
  drawRunes(c, w);
  drawEnemyBullets(c, w);
  drawEnemies(c, w);
  drawSummons(c, w);
  drawSatellites(c, w);
  drawPlayer(c, w);
  drawBullets(c, w);
  drawFx(c, w);
  drawParticles(c, w);
  drawNumbers(c, w);

  c.restore();

  // --- Screen-space overlays ---
  if (w.screenFlash > 0) {
    c.drawRect({ x: 0, y: 0, width: vw, height: vh }, paint("#FFF3E0", w.screenFlash * 0.7));
  }
  const hpFrac = w.player.hp / w.player.maxHp;
  if (hpFrac < 0.35 && w.status === "running") {
    const a = 0.1 + 0.05 * Math.sin(w.realT * 6);
    c.drawRect({ x: 0, y: 0, width: vw, height: vh }, paint("#C0392B", a));
  }
  if (w.hordeT !== null) {
    c.drawRect({ x: 0, y: 0, width: vw, height: vh }, paint("#7A1F14", 0.08 + 0.03 * Math.sin(w.realT * 8)));
  }
}

function drawZones(c: SkCanvas, w: World): void {
  for (const z of w.zones) {
    if (z.kind === "lava") {
      c.drawCircle(z.x, z.y, z.r, paint("#8E2F1C", 0.4));
      c.drawCircle(z.x, z.y, z.r * 0.8, paint("#A6402A", 0.35));
      for (let i = 0; i < 5; i++) {
        const a = z.id + i * 1.3 + w.realT * 1.5;
        glowDot(c, z.x + Math.cos(a) * z.r * 0.6, z.y + Math.sin(a) * z.r * 0.6, 3.4, "#FF8A3C", 0.9);
      }
    } else if (z.kind === "ezone") {
      c.drawCircle(z.x, z.y, z.r, paint("#5B7A3A", 0.3));
      c.drawCircle(z.x, z.y, z.r, paint("#9CCC65", 0.6, PaintStyle.Stroke));
      for (let i = 0; i < 6; i++) {
        const a = z.id * 2 + i * 1.1 + w.realT * 2;
        glowDot(c, z.x + Math.cos(a) * z.r * 0.75, z.y + Math.sin(a) * z.r * 0.75, 2.6, "#C5E1A5", 0.9);
      }
    } else {
      // cyclone: soft translucent gray discs like the source
      c.drawCircle(z.x, z.y, z.r * 1.15, paint("#4A4340", 0.22));
      c.drawCircle(z.x, z.y, z.r * 0.7, paint("#4A4340", 0.26));
      c.drawCircle(z.x, z.y, z.r * 0.3, paint("#4A4340", 0.3));
    }
  }
}

function drawOrbs(c: SkCanvas, w: World): void {
  for (const o of w.orbs) {
    const bob = Math.sin(w.realT * 4 + o.id) * 1.6;
    const r = 4 + o.tier * 1.6;
    glowDot(c, o.x, o.y + bob, r, ORB_COLORS[o.tier], 0.95);
  }
}

function drawRunes(c: SkCanvas, w: World): void {
  for (const r of w.runes) {
    const col = RUNE_DATA[r.kind].color;
    const pulse = 1 + 0.08 * Math.sin(r.t * 5);
    const s = 13 * pulse;
    const p = strokePaint(col, 0.95, 2.4);
    c.drawCircle(r.x, r.y, s + 5, paint("#2B2B2B", 0.25));
    const dia = [
      { x: r.x, y: r.y - s },
      { x: r.x + s, y: r.y },
      { x: r.x, y: r.y + s },
      { x: r.x - s, y: r.y },
      { x: r.x, y: r.y - s },
    ];
    for (let i = 0; i < dia.length - 1; i++) {
      c.drawLine(dia[i].x, dia[i].y, dia[i + 1].x, dia[i + 1].y, p);
    }
    glowDot(c, r.x, r.y, 3, col, 1);
  }
}

function drawEnemyBullets(c: SkCanvas, w: World): void {
  for (const b of w.ebullets) {
    glowDot(c, b.x, b.y, b.r * 0.8, b.color === "#C084FC" ? "#B060E0" : "#E04C3C", 0.95);
  }
}

function drawEnemies(c: SkCanvas, w: World): void {
  for (const e of w.enemies) {
    drawEnemy(c, w, e);
  }
}

function drawEnemy(c: SkCanvas, w: World, e: Enemy): void {
  const wob = Math.sin(w.realT * 6 + e.seed) * 0.06;
  const r = e.r * (1 + wob);

  if (e.kind === "giant") {
    // Huge black splat mass with a red core.
    inkBlob(c, e.x, e.y, r, e.seed, INK, 1);
    inkBlob(c, e.x + r * 0.5, e.y - r * 0.3, r * 0.6, e.seed + 3, INK, 1);
    c.drawCircle(e.x, e.y, r * 0.3, paint("#C0392B", 0.95));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + w.realT * 0.4;
      c.drawCircle(e.x + Math.cos(a) * r * 1.2, e.y + Math.sin(a) * r * 1.2, r * 0.12, paint(INK, 0.9));
    }
  } else if (e.kind === "splitter") {
    inkBlob(c, e.x - r * 0.5, e.y, r * 0.7, e.seed);
    inkBlob(c, e.x + r * 0.5, e.y + 2, r * 0.7, e.seed + 5);
  } else if (e.kind === "runner") {
    // Lean blob with trailing droplets.
    inkBlob(c, e.x, e.y, r * 0.8, e.seed);
    inkBlob(c, e.x - r * 1.2, e.y + 2, r * 0.35, e.seed + 2, INK, 0.75);
    inkBlob(c, e.x - r * 2.1, e.y + 4, r * 0.22, e.seed + 4, INK, 0.5);
  } else if (e.kind === "exploder") {
    const fuse = 1 + 0.2 * Math.sin(w.realT * 14 + e.seed);
    inkBlob(c, e.x, e.y, r * fuse, e.seed);
    c.drawCircle(e.x, e.y, r * 0.3, paint("#E04C3C", 0.95));
  } else if (e.kind === "caster") {
    inkBlob(c, e.x, e.y, r * 0.9, e.seed);
    // Violet staff glint
    c.drawCircle(e.x + r * 1.1, e.y - r * 0.6, 2.6, paint("#B060E0", 0.95));
  } else if (e.kind === "brute") {
    inkBlob(c, e.x, e.y, r * 1.05, e.seed);
    c.drawCircle(e.x - r * 0.3, e.y - r * 0.2, r * 0.22, paint("#2B2B2B", 0.8));
  } else if (e.kind === "mini") {
    inkBlob(c, e.x, e.y, r * 0.9, e.seed);
  } else {
    inkBlob(c, e.x, e.y, r, e.seed);
  }

  // Elite marker: red ring on the ground.
  if (e.elite) {
    c.drawCircle(e.x, e.y, r + 6, strokePaint("#C0392B", 0.85, 2.6));
    c.drawCircle(e.x, e.y, r * 0.25, paint("#C0392B", 0.9));
  }

  // Status overlays
  if (e.slowT > 0) c.drawCircle(e.x, e.y, r + 2, paint("#BFE8F5", 0.5));
  if (e.flashT > 0) c.drawCircle(e.x, e.y, r + 2, paint("#FFFFFF", 0.85));

  // Giant HP bar
  if (e.kind === "giant") {
    const bw = r * 2.2;
    c.drawRect({ x: e.x - bw / 2, y: e.y - r - 20, width: bw, height: 8 }, paint("#2B2B2B", 0.75));
    c.drawRect(
      { x: e.x - bw / 2, y: e.y - r - 20, width: bw * Math.max(0, e.hp / e.maxHp), height: 8 },
      paint("#C0392B"),
    );
  }
}

function drawSummons(c: SkCanvas, w: World): void {
  for (const s of w.summons) {
    const fade = s.life < 1.5 ? s.life / 1.5 : 1;
    glowDot(c, s.x, s.y, 6, "#E8F4FF", 0.95 * fade);
  }
}

function drawSatellites(c: SkCanvas, w: World): void {
  const slot = w.spells.find((s) => s.id === "satellite");
  if (!slot) return;
  const st = slot.level;
  const count = 1 + Math.floor(st / 2);
  const orbitR = (72 + 9 * st) * areaMult(w.player);
  for (let i = 0; i < count; i++) {
    const a = w.orbitAngle + (i / count) * Math.PI * 2;
    glowDot(c, w.player.x + Math.cos(a) * orbitR, w.player.y + Math.sin(a) * orbitR, 7, "#F5F2EA", 0.95);
  }
}

function drawPlayer(c: SkCanvas, w: World): void {
  const p = w.player;
  const alpha = p.cloakT > 0 ? 0.45 : 1;

  // Auras (subtle on the light field)
  if (p.circleT > 0) {
    c.drawCircle(p.x, p.y, 32, paint("#5B5B5B", 0.3, PaintStyle.Stroke));
    c.drawCircle(p.x, p.y, 30, paint("#4A4340", 0.14));
  }
  if (p.invulnT > 0) {
    c.drawCircle(p.x, p.y, 24 + Math.sin(w.realT * 8) * 2, strokePaint("#E8B23C", 0.8, 2.4));
  }
  if (p.frenzyT > 0) {
    c.drawCircle(p.x, p.y, 20, paint("#C0392B", 0.22));
  }
  if (p.shield > 0) {
    c.drawCircle(p.x, p.y, 18, strokePaint("#E8B23C", 0.9, 2.2));
    if (p.shield > 1) c.drawCircle(p.x, p.y, 22, strokePaint("#E8B23C", 0.5, 1.8));
  }

  const fx = p.facingX;
  const fy = p.facingY;
  const fl = Math.hypot(fx, fy) || 1;
  const dx = fx / fl;
  const dy = fy / fl;

  // Staff (behind the body, toward facing)
  const stx = p.x + dx * 15;
  const sty = p.y + dy * 15;
  c.drawLine(p.x - dx * 4, p.y - dy * 4 + 3, stx, sty, strokePaint("#3A2E20", alpha, 2.6));
  glowDot(c, stx, sty, 3.6, p.circleT > 0 ? "#C0392B" : "#E8B23C", alpha);

  // Robe silhouette
  const p2 = paint(INK, alpha);
  c.drawCircle(p.x, p.y - 2, PLAYER_R * 0.95, p2); // head/torso blob
  c.drawCircle(p.x, p.y + 4, PLAYER_R * 0.75, p2); // robe base
  // Pointed hat
  c.drawCircle(p.x, p.y - 6, PLAYER_R * 0.6, p2);
  c.drawLine(p.x - 6, p.y - 5, p.x + dx * 4, p.y - 13, strokePaint(INK, alpha, 3.2));
  c.drawLine(p.x + 6, p.y - 5, p.x + dx * 4, p.y - 13, strokePaint(INK, alpha, 3.2));
  c.drawCircle(p.x + dx * 4, p.y - 12, 3.4, p2);

  // Green HP bar above head (only when damaged)
  if (p.hp < p.maxHp) {
    const frac = Math.max(0, p.hp / p.maxHp);
    c.drawRect({ x: p.x - 15, y: p.y - 24, width: 30, height: 4 }, paint("#2B2B2B", 0.6));
    c.drawRect({ x: p.x - 15, y: p.y - 24, width: 30 * frac, height: 4 }, paint("#6FCF3F", 0.95));
  }

  if (p.hitFlash > 0) {
    c.drawCircle(p.x, p.y, PLAYER_R + 4, paint("#C0392B", p.hitFlash * 1.4));
  }
}

function drawBullets(c: SkCanvas, w: World): void {
  for (const b of w.bullets) {
    if (b.kind === "wave") {
      c.drawCircle(b.x, b.y, b.r, paint("#4FC3F7", 0.25));
      c.drawCircle(b.x, b.y, b.r * 0.8, paint("#81D4FA", 0.4));
      c.drawCircle(b.x, b.y, b.r, strokePaint("#B3E5FC", 0.85, 3));
      continue;
    }
    const col =
      b.kind === "fire" ? "#FF7A1C" : b.kind === "energy" ? "#7C6FF0" : b.kind === "spirit" ? "#E8F4FF" : "#8ED0F5";
    const sp = Math.hypot(b.vx, b.vy) || 1;
    const tx = b.x - (b.vx / sp) * b.r * 2.6;
    const ty = b.y - (b.vy / sp) * b.r * 2.6;
    c.drawLine(b.x, b.y, tx, ty, strokePaint(col, 0.45, b.r * 1.5));
    glowDot(c, b.x, b.y, b.r * (b.crit ? 1.25 : 0.95), col, 0.98);
  }
}

function drawFx(c: SkCanvas, w: World): void {
  for (const fx of w.fx) {
    const frac = Math.max(0, fx.t / fx.maxT);
    if (fx.kind === "beam") {
      const a = frac;
      lightning(c, fx.x1, fx.y1, fx.x2, fx.y2, Math.max(2, fx.w * 0.5), a);
    } else {
      const fallY = fx.y2 - (fx.y2 - fx.y1) * frac;
      // Target telegraph on the ground
      c.drawCircle(fx.x2, fx.y2, fx.aoe, paint("#5B5B5B", 0.15));
      c.drawCircle(fx.x2, fx.y2, fx.aoe, strokePaint("#5B5B5B", 0.4, 2));
      if (fx.kind === "thunder") {
        c.drawLine(fx.x2, fx.y1, fx.x2, fallY, strokePaint("#FFFFFF", 0.6, 3));
        glowDot(c, fx.x2, fallY, 5, "#F5F2EA", 0.95);
      } else {
        // Meteor body with hot trail
        c.drawLine(fx.x2, fallY - 40, fx.x2, fallY, strokePaint("#FF7A1C", 0.7, 6));
        glowDot(c, fx.x2, fallY, 7, "#FF7A1C", 0.95);
      }
    }
  }
}

function drawParticles(c: SkCanvas, w: World): void {
  for (const q of w.particles) {
    const a = Math.max(0, q.life / q.maxLife);
    c.drawCircle(q.x, q.y, q.r * (0.5 + a * 0.7), paint(q.color, a * 0.9));
  }
}

function drawNumbers(c: SkCanvas, w: World): void {
  const { small, big } = getFonts();
  for (const n of w.numbers) {
    const a = Math.max(0, Math.min(1, n.life / 0.62));
    const font = n.crit ? big : small;
    const size = n.crit ? 1 : 0.8;
    c.drawText(n.text, n.x - 4 * size + 1, n.y + 1, paint("#EFE6D6", a * 0.7), font);
    c.drawText(n.text, n.x - 4 * size, n.y, paint(n.crit ? "#C0392B" : "#2B241C", a), font);
  }
}

// ---------------------------------------------------------------------------
// Menu decorative picture: mint field, tree line, wizard silhouette
// ---------------------------------------------------------------------------
export function buildMenuPicture(vw: number, vh: number): SkPicture {
  const rec = Skia.PictureRecorder();
  const canvas = rec.beginRecording(Skia.XYWHRect(0, 0, vw, vh));

  const MINT = "#63D1C1";
  const MINT_DARK = "#3FAE9E";
  canvas.drawRect({ x: 0, y: 0, width: vw, height: vh }, paint(MINT));

  // Tree trunks (dark teal silhouettes)
  let seed = 21;
  const rng = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  for (let i = 0; i < 9; i++) {
    const x = (i + 0.5) * (vw / 9) + (rng() - 0.5) * 18;
    const wTop = 4 + rng() * 5;
    const topY = vh * (0.1 + rng() * 0.22);
    canvas.drawLine(x, topY, x - 2, vh, strokePaint(MINT_DARK, 0.8, wTop));
    // Branch strokes
    for (let b = 0; b < 3; b++) {
      const by = topY + (vh - topY) * (0.15 + rng() * 0.5);
      const bl = 12 + rng() * 22;
      canvas.drawLine(x, by, x - bl, by - bl * 0.5, strokePaint(MINT_DARK, 0.7, 2.2));
      canvas.drawLine(x, by, x + bl, by - bl * 0.5, strokePaint(MINT_DARK, 0.7, 2.2));
    }
  }

  // Wizard silhouette bottom-left
  const bx = vw * 0.14;
  const by = vh * 0.9;
  const S = Math.min(vw, vh) * 0.12;
  const ink = paint("#101820", 1);
  canvas.drawCircle(bx, by - S * 0.7, S * 0.34, ink); // head
  canvas.drawCircle(bx, by + S * 0.25, S * 0.55, ink); // robe
  canvas.drawCircle(bx, by + S * 0.75, S * 0.42, ink); // robe base
  // Wide-brim pointed hat
  canvas.drawLine(bx - S * 0.6, by - S * 0.82, bx + S * 0.6, by - S * 0.82, strokePaint("#101820", 1, 5));
  canvas.drawCircle(bx + S * 0.12, by - S * 1.05, S * 0.3, ink);
  canvas.drawLine(bx + S * 0.2, by - S * 1.0, bx + S * 0.75, by - S * 1.75, strokePaint("#101820", 1, 6)); // hat tip
  // Staff
  canvas.drawLine(bx + S * 0.7, by + S * 0.4, bx + S * 1.05, by - S * 1.2, strokePaint("#101820", 1, 4));
  glowDot(canvas, bx + S * 1.08, by - S * 1.3, 5, "#FFF7E8", 0.95);

  // Floating ink specks
  for (let i = 0; i < 30; i++) {
    const x = rng() * vw;
    const y = rng() * vh;
    canvas.drawCircle(x, y, 1 + rng() * 2, paint("#101820", 0.25 + rng() * 0.4));
  }

  return rec.finishRecordingAsPicture();
}
