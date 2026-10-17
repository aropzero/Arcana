// Arcana Survival — Skia renderer: draws the world into a picture each frame.
// All visuals are procedural (no external assets).

import { PaintStyle, Skia } from "@shopify/react-native-skia";
import type { SkCanvas, SkFont, SkPaint, SkPicture } from "@shopify/react-native-skia";

import { ARENA, PLAYER_R, type Enemy, type World } from "./engine";
import { ENEMY_DEFS, RUNE_DATA } from "./content";
import { areaMult } from "./world";

const ORB_COLORS = ["#60A5FA", "#FBBF24", "#F472B6", "#4ADE80"];

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

function glowCircle(c: SkCanvas, x: number, y: number, r: number, color: string, alpha = 0.9): void {
  c.drawCircle(x, y, r * 2.1, paint(color, alpha * 0.16));
  c.drawCircle(x, y, r * 1.45, paint(color, alpha * 0.3));
  c.drawCircle(x, y, r, paint(color, alpha));
}

function strokePaint(color: string, alpha = 1, width = 2): SkPaint {
  const p = paint(color, alpha, PaintStyle.Stroke);
  p.setStrokeWidth(width);
  return p;
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

  // Floor + grid
  c.drawRect({ x: 0, y: 0, width: ARENA, height: ARENA }, paint("#0B0A14"));
  const grid = 130;
  const x0 = Math.max(0, Math.floor(cam.x / grid) * grid);
  const x1 = Math.min(ARENA, cam.x + vw);
  const y0 = Math.max(0, Math.floor(cam.y / grid) * grid);
  const y1 = Math.min(ARENA, cam.y + vh);
  for (let x = x0; x <= x1; x += grid) {
    c.drawLine(x, Math.max(0, cam.y), x, y1, paint("#17142A", 0.75, PaintStyle.Stroke));
  }
  for (let y = y0; y <= y1; y += grid) {
    c.drawLine(Math.max(0, cam.x), y, x1, y, paint("#17142A", 0.75, PaintStyle.Stroke));
  }
  c.drawRect({ x: 0, y: 0, width: ARENA, height: ARENA }, paint("#2A2450", 1, PaintStyle.Stroke));

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
    c.drawRect({ x: 0, y: 0, width: vw, height: vh }, paint("#FFE9F5", w.screenFlash * 0.75));
  }
  const hpFrac = w.player.hp / w.player.maxHp;
  if (hpFrac < 0.35 && w.status === "running") {
    const a = 0.1 + 0.06 * Math.sin(w.realT * 6);
    c.drawRect({ x: 0, y: 0, width: vw, height: vh }, paint("#F43F5E", a));
  }
  if (w.hordeT !== null) {
    c.drawRect({ x: 0, y: 0, width: vw, height: vh }, paint("#DC2626", 0.07 + 0.03 * Math.sin(w.realT * 8)));
  }
}

function drawZones(c: SkCanvas, w: World): void {
  for (const z of w.zones) {
    const col = z.kind === "lava" ? "#EF4444" : z.kind === "ezone" ? "#A3E635" : "#67E8F9";
    const pulse = 1 + 0.05 * Math.sin(w.realT * 7 + z.id);
    c.drawCircle(z.x, z.y, z.r * pulse, paint(col, 0.1));
    c.drawCircle(z.x, z.y, z.r * pulse, paint(col, 0.5, PaintStyle.Stroke));
    if (z.kind === "cyclone") {
      c.drawCircle(z.x, z.y, z.r * 0.6, paint(col, 0.14));
      c.drawCircle(z.x, z.y, z.r * 0.28, paint(col, 0.2));
    }
  }
}

function drawOrbs(c: SkCanvas, w: World): void {
  for (const o of w.orbs) {
    const bob = Math.sin(w.realT * 4 + o.id) * 1.6;
    const r = 4.5 + o.tier * 1.7;
    glowCircle(c, o.x, o.y + bob, r, ORB_COLORS[o.tier], 0.92);
  }
}

function drawRunes(c: SkCanvas, w: World): void {
  for (const r of w.runes) {
    const col = RUNE_DATA[r.kind].color;
    const pulse = 1 + 0.08 * Math.sin(r.t * 5);
    const s = 13 * pulse;
    const p = paint(col, 0.95, PaintStyle.Stroke);
    p.setStrokeWidth(2.4);
    c.drawCircle(r.x, r.y, s + 4, paint(col, 0.16));
    // Diamond outline
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
    glowCircle(c, r.x, r.y, 3.2, col, 1);
  }
}

function drawEnemyBullets(c: SkCanvas, w: World): void {
  for (const b of w.ebullets) {
    glowCircle(c, b.x, b.y, b.r, b.color, 0.95);
  }
}

function drawEnemies(c: SkCanvas, w: World): void {
  for (const e of w.enemies) {
    drawEnemy(c, w, e);
  }
}

function drawEnemy(c: SkCanvas, w: World, e: Enemy): void {
  const base = ENEMY_DEFS[e.kind].color;
  const wob = Math.sin(w.realT * 6 + e.seed) * 0.06;
  const r = e.r * (1 + wob);

  if (e.kind === "giant") {
    glowCircle(c, e.x, e.y, r, base, 0.95);
    // Crown spikes
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + w.realT * 0.4;
      const sx = e.x + Math.cos(a) * r * 1.15;
      const sy = e.y + Math.sin(a) * r * 1.15;
      c.drawCircle(sx, sy, 5, paint("#FCA5A5", 0.9));
    }
  } else if (e.kind === "caster") {
    glowCircle(c, e.x, e.y, r, base, 0.9);
    c.drawCircle(e.x, e.y, r + 6, paint(base, 0.35, PaintStyle.Stroke));
  } else if (e.kind === "exploder") {
    const fuse = 1 + 0.25 * Math.sin(w.realT * 14 + e.seed);
    glowCircle(c, e.x, e.y, r * fuse, base, 0.95);
    c.drawCircle(e.x, e.y, r * 0.5, paint("#FED7AA", 0.9));
  } else if (e.kind === "splitter") {
    c.drawCircle(e.x - r * 0.35, e.y, r * 0.75, paint(base, 0.9));
    c.drawCircle(e.x + r * 0.35, e.y, r * 0.75, paint(base, 0.9));
    c.drawCircle(e.x, e.y, r * 1.3, paint(base, 0.15));
  } else if (e.kind === "runner") {
    // Motion streaks
    c.drawCircle(e.x - e.r * 0.9, e.y + 2, r * 0.6, paint(base, 0.25));
    c.drawCircle(e.x - e.r * 1.7, e.y + 4, r * 0.4, paint(base, 0.14));
    glowCircle(c, e.x, e.y, r, base, 0.95);
  } else if (e.kind === "brute") {
    glowCircle(c, e.x, e.y, r, base, 0.95);
    c.drawCircle(e.x, e.y, r * 0.62, paint("#7F1D1D", 0.85));
  } else if (e.kind === "mini") {
    c.drawCircle(e.x, e.y, r, paint(base, 0.95));
  } else {
    glowCircle(c, e.x, e.y, r, base, 0.92);
  }

  // Elite ring
  if (e.elite) {
    c.drawCircle(e.x, e.y, r + 5 + Math.sin(w.realT * 5 + e.seed) * 1.5, paint("#FDE047", 0.85, PaintStyle.Stroke));
  }

  // Eyes toward player
  const dx = w.player.x - e.x;
  const dy = w.player.y - e.y;
  const d = Math.hypot(dx, dy) || 1;
  const fx = e.x + (dx / d) * r * 0.32;
  const fy = e.y + (dy / d) * r * 0.32;
  const perX = -(dy / d);
  const perY = dx / d;
  const eyeR = e.kind === "mini" ? 1.4 : e.kind === "giant" ? 4.5 : 2.4;
  const eyeOff = r * 0.3;
  const eyeCol = e.kind === "giant" ? "#FEE2E2" : "#0B0A14";
  c.drawCircle(fx + perX * eyeOff, fy + perY * eyeOff, eyeR, paint(eyeCol));
  c.drawCircle(fx - perX * eyeOff, fy - perY * eyeOff, eyeR, paint(eyeCol));

  // Status overlays
  if (e.slowT > 0) c.drawCircle(e.x, e.y, r + 2, paint("#93C5FD", 0.4));
  if (e.flashT > 0) c.drawCircle(e.x, e.y, r + 2, paint("#FFFFFF", 0.85));

  // Giant HP bar
  if (e.kind === "giant") {
    const bw = r * 2.2;
    c.drawRect({ x: e.x - bw / 2, y: e.y - r - 18, width: bw, height: 7 }, paint("#000000", 0.55));
    c.drawRect(
      { x: e.x - bw / 2, y: e.y - r - 18, width: bw * Math.max(0, e.hp / e.maxHp), height: 7 },
      paint("#F43F5E"),
    );
  }
}

function drawSummons(c: SkCanvas, w: World): void {
  for (const s of w.summons) {
    const fade = s.life < 1.5 ? s.life / 1.5 : 1;
    glowCircle(c, s.x, s.y, 8, "#A5F3FC", 0.9 * fade);
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
    const ox = w.player.x + Math.cos(a) * orbitR;
    const oy = w.player.y + Math.sin(a) * orbitR;
    glowCircle(c, ox, oy, 9, "#C4B5FD", 0.95);
  }
}

function drawPlayer(c: SkCanvas, w: World): void {
  const p = w.player;
  const alpha = p.cloakT > 0 ? 0.42 : 1;

  // Lingkar Sihir aura
  if (p.circleT > 0) {
    c.drawCircle(p.x, p.y, 30, paint("#D8B4FE", 0.5, PaintStyle.Stroke));
    c.drawCircle(p.x, p.y, 22, paint("#D8B4FE", 0.18));
  }
  if (p.invulnT > 0) {
    c.drawCircle(p.x, p.y, 22 + Math.sin(w.realT * 8) * 2, paint("#FCD34D", 0.75, PaintStyle.Stroke));
  }
  if (p.frenzyT > 0) {
    c.drawCircle(p.x, p.y, 18, paint("#F87171", 0.3));
  }
  if (p.shield > 0) {
    c.drawCircle(p.x, p.y, 17, paint("#FCD34D", 0.9, PaintStyle.Stroke));
    if (p.shield > 1) c.drawCircle(p.x, p.y, 21, paint("#FCD34D", 0.45, PaintStyle.Stroke));
  }

  // Shadow
  c.drawCircle(p.x, p.y + 4, PLAYER_R * 1.25, paint("#000000", 0.35 * alpha));

  // Body — hooded mage
  glowCircle(c, p.x, p.y, PLAYER_R, "#1E2A3A", alpha);
  c.drawCircle(p.x, p.y, PLAYER_R, paint("#2E3D54", alpha));

  // Eyes + staff orb face the movement direction
  const fl = Math.hypot(p.facingX, p.facingY) || 1;
  const fx = p.facingX / fl;
  const fy = p.facingY / fl;
  const ex = p.x + fx * 4.5;
  const ey = p.y + fy * 4.5;
  const perX = -fy;
  const perY = fx;
  c.drawCircle(ex + perX * 4, ey + perY * 4, 2.4, paint("#5EEAD4", alpha));
  c.drawCircle(ex - perX * 4, ey - perY * 4, 2.4, paint("#5EEAD4", alpha));
  glowCircle(c, p.x + fx * 15, p.y + fy * 15, 4.2, "#A78BFA", alpha);

  if (p.hitFlash > 0) {
    c.drawCircle(p.x, p.y, PLAYER_R + 4, paint("#F43F5E", p.hitFlash * 1.6));
  }
}

function drawBullets(c: SkCanvas, w: World): void {
  for (const b of w.bullets) {
    if (b.kind === "wave") {
      c.drawCircle(b.x, b.y, b.r, paint("#38BDF8", 0.22));
      c.drawCircle(b.x, b.y, b.r * 0.82, paint("#7DD3FC", 0.4));
      c.drawCircle(b.x, b.y, b.r, paint("#BAE6FD", 0.9, PaintStyle.Stroke));
      continue;
    }
    const col =
      b.kind === "fire" ? "#FB923C" : b.kind === "energy" ? "#818CF8" : b.kind === "spirit" ? "#A5F3FC" : "#7DD3FC";
    const sp = Math.hypot(b.vx, b.vy) || 1;
    const tx = b.x - (b.vx / sp) * b.r * 2.4;
    const ty = b.y - (b.vy / sp) * b.r * 2.4;
    c.drawLine(b.x, b.y, tx, ty, strokePaint(col, 0.4, b.r * 1.6));
    glowCircle(c, b.x, b.y, b.r * (b.crit ? 1.25 : 1), col, 0.95);
  }
}

function drawFx(c: SkCanvas, w: World): void {
  for (const fx of w.fx) {
    const frac = Math.max(0, fx.t / fx.maxT);
    if (fx.kind === "beam") {
      const a = frac;
      c.drawLine(fx.x1, fx.y1, fx.x2, fx.y2, strokePaint(fx.color, a * 0.35, fx.w * 2.6));
      c.drawLine(fx.x1, fx.y1, fx.x2, fx.y2, strokePaint(fx.color, a, fx.w));
      c.drawLine(fx.x1, fx.y1, fx.x2, fx.y2, strokePaint("#FFFFFF", a * 0.8, fx.w * 0.4));
    } else {
      // Falling body + target telegraph
      const fallY = fx.y2 - (fx.y2 - fx.y1) * frac;
      c.drawCircle(fx.x2, fx.y2, fx.aoe, paint(fx.color, 0.12));
      c.drawCircle(fx.x2, fx.y2, fx.aoe, paint(fx.color, 0.55, PaintStyle.Stroke));
      if (fx.kind === "thunder") {
        c.drawLine(fx.x2, fx.y1, fx.x2, fallY, strokePaint(fx.color, 0.5, 3));
        glowCircle(c, fx.x2, fallY, 5, fx.color, 0.9);
      } else {
        glowCircle(c, fx.x2, fallY, 8, fx.color, 0.95);
      }
    }
  }
}

function drawParticles(c: SkCanvas, w: World): void {
  for (const q of w.particles) {
    const a = Math.max(0, q.life / q.maxLife);
    c.drawCircle(q.x, q.y, q.r * (0.5 + a * 0.7), paint(q.color, a));
  }
}

function drawNumbers(c: SkCanvas, w: World): void {
  const { small, big } = getFonts();
  for (const n of w.numbers) {
    const a = Math.max(0, Math.min(1, n.life / 0.62));
    const font = n.crit ? big : small;
    const size = n.crit ? 1 : 0.8;
    c.drawText(n.text, n.x - 4 * size, n.y + 1, paint("#000000", a * 0.7), font);
    c.drawText(n.text, n.x - 4 * size, n.y, paint(n.crit ? "#FDE047" : "#E5E0F5", a), font);
  }
}

// ---------------------------------------------------------------------------
// Menu decorative picture
// ---------------------------------------------------------------------------
export function buildMenuPicture(vw: number, vh: number): SkPicture {
  const rec = Skia.PictureRecorder();
  const canvas = rec.beginRecording(Skia.XYWHRect(0, 0, vw, vh));

  const cx = vw / 2;
  const cy = vh * 0.36;
  const R = Math.min(vw, vh) * 0.22;

  canvas.drawCircle(cx, cy, R * 1.75, paint("#17132E", 1));
  canvas.drawCircle(cx, cy, R * 1.45, paint("#1E1745", 1));
  canvas.drawCircle(cx, cy, R, paint("#2A1E5C", 1));
  canvas.drawCircle(cx, cy, R * 0.55, paint("#4C3D9B", 1));
  canvas.drawCircle(cx - R * 0.1, cy - R * 0.1, R * 0.24, paint("#EDE9FE", 1));

  canvas.drawCircle(cx, cy, R * 1.16, paint("#5EEAD4", 0.7, PaintStyle.Stroke));
  canvas.drawCircle(cx, cy, R * 1.32, paint("#7C3AED", 0.5, PaintStyle.Stroke));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.3;
    glowCircle(canvas, cx + Math.cos(a) * R * 1.32, cy + Math.sin(a) * R * 1.32, 3.2, "#5EEAD4", 0.9);
  }
  for (let i = 0; i < 26; i++) {
    const x = (i * 137.5) % vw;
    const y = (i * 61.7) % vh;
    canvas.drawCircle(x, y, ((i % 3) + 1) * 0.9, paint("#C4B5FD", 0.35));
  }

  return rec.finishRecordingAsPicture();
}
