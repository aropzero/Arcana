// Arcana Survival — Skia renderer. Builds an immutable SkPicture every frame
// from the plain world state; the Canvas only swaps the picture reference.

import { PaintStyle, Skia } from "@shopify/react-native-skia";
import type { SkCanvas, SkPaint, SkPicture } from "@shopify/react-native-skia";
import { ARENA } from "./engine";
import type { InputState, World } from "./engine";
import { ENEMY_DEFS } from "./content";

// --- Paint cache (alpha bucketed to keep the cache bounded) ---

const paints = new Map<string, SkPaint>();

function paint(color: string, alpha = 1, stroke = false, width = 2): SkPaint {
  const bucket = Math.round(alpha * 12) / 12;
  const key = `${color}|${bucket}|${stroke ? "s" : "f"}|${width}`;
  let p = paints.get(key);
  if (!p) {
    p = Skia.Paint();
    p.setColor(Skia.Color(color));
    p.setAlphaf(bucket);
    p.setAntiAlias(true);
    if (stroke) {
      p.setStyle(PaintStyle.Stroke);
      p.setStrokeWidth(width);
    }
    paints.set(key, p);
  }
  return p;
}

function glowCircle(
  c: SkCanvas,
  x: number,
  y: number,
  r: number,
  color: string,
  coreAlpha = 1,
): void {
  c.drawCircle(x, y, r * 2.1, paint(color, 0.07 * coreAlpha));
  c.drawCircle(x, y, r * 1.45, paint(color, 0.16 * coreAlpha));
  c.drawCircle(x, y, r, paint(color, coreAlpha));
}

const GRID = 130;
const MARGIN = 80; // culling margin around the viewport

// ---------------------------------------------------------------------------
// World picture
// ---------------------------------------------------------------------------

export function buildPicture(
  w: World,
  vw: number,
  vh: number,
  input: InputState,
): SkPicture | null {
  if (vw <= 0 || vh <= 0) return null;
  const rec = Skia.PictureRecorder();
  const canvas = rec.beginRecording(Skia.XYWHRect(0, 0, vw, vh));
  drawWorld(canvas, w, vw, vh, input);
  return rec.finishRecordingAsPicture();
}

function drawWorld(
  c: SkCanvas,
  w: World,
  vw: number,
  vh: number,
  input: InputState,
): void {
  const cam = w.cam;

  // Background + arena grid
  c.drawRect(Skia.XYWHRect(0, 0, vw, vh), paint("#0B0A14"));
  const gx0 = Math.floor(cam.x / GRID) * GRID;
  const gy0 = Math.floor(cam.y / GRID) * GRID;
  for (let x = gx0; x <= cam.x + vw + GRID; x += GRID) {
    if (x < 0 || x > ARENA) continue;
    c.drawLine(x - cam.x, 0, x - cam.x, vh, paint("#16142A", 0.6, true, 1));
  }
  for (let y = gy0; y <= cam.y + vh + GRID; y += GRID) {
    if (y < 0 || y > ARENA) continue;
    c.drawLine(0, y - cam.y, vw, y - cam.y, paint("#16142A", 0.6, true, 1));
  }

  // Arena boundary
  c.drawRect(
    Skia.XYWHRect(-cam.x, -cam.y, ARENA, ARENA),
    paint("#3B2F63", 1, true, 3),
  );

  const visible = (x: number, y: number, pad: number): boolean =>
    x - cam.x > -pad && x - cam.x < vw + pad && y - cam.y > -pad && y - cam.y < vh + pad;

  // Gems (XP crystals)
  for (const g of w.gems) {
    if (!visible(g.x, g.y, 30)) continue;
    const x = g.x - cam.x;
    const y = g.y - cam.y;
    const s = 5;
    const path = Skia.Path.Make();
    path.moveTo(x, y - s);
    path.lineTo(x + s * 0.7, y);
    path.lineTo(x, y + s);
    path.lineTo(x - s * 0.7, y);
    path.close();
    c.drawCircle(x, y, 9, paint("#C084FC", 0.12));
    c.drawPath(path, paint("#C084FC", 0.95));
  }

  // Nova rings / explosions
  for (const ring of w.rings) {
    const x = ring.x - cam.x;
    const y = ring.y - cam.y;
    const a = ring.life / ring.maxLife;
    c.drawCircle(x, y, ring.r, paint(ring.color, 0.7 * a, true, 4));
    c.drawCircle(x, y, ring.r * 0.85, paint(ring.color, 0.25 * a, true, 2));
  }

  // Enemies
  for (const e of w.enemies) {
    if (!visible(e.x, e.y, 60)) continue;
    const x = e.x - cam.x;
    const y = e.y - cam.y;
    const color = ENEMY_DEFS[e.kind].color;
    const wob = 1 + 0.06 * Math.sin(w.t * 7 + e.seed);
    const r = e.r * wob;

    glowCircle(c, x, y, r, color, 0.92);

    // Eyes facing the player
    const dx = w.player.x - e.x;
    const dy = w.player.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const ux = dx / d;
    const uy = dy / d;
    const eye = 2.2;
    const fx = x + ux * r * 0.35;
    const fy = y + uy * r * 0.35;
    const perX = -uy;
    const perY = ux;
    c.drawCircle(fx + perX * r * 0.3, fy + perY * r * 0.3, eye, paint("#0B0A14"));
    c.drawCircle(fx - perX * r * 0.3, fy - perY * r * 0.3, eye, paint("#0B0A14"));

    if (e.kind === "brute" || e.elite) {
      // Horns for the big ones
      c.drawCircle(x, y, r + 5, paint(e.elite ? "#FFB4B4" : color, 0.5, true, 2));
      if (e.hp < e.maxHp) {
        const bw = r * 2;
        c.drawRect(Skia.XYWHRect(x - r, y - r - 12, bw, 4), paint("#000000", 0.55));
        c.drawRect(
          Skia.XYWHRect(x - r, y - r - 12, bw * (e.hp / e.maxHp), 4),
          paint("#EF4444"),
        );
      }
    }
    if (e.slowT > 0) {
      c.drawCircle(x, y, r + 3, paint("#93C5FD", 0.3));
    }
  }

  // Bullets
  for (const b of w.bullets) {
    if (!visible(b.x, b.y, 40)) continue;
    const x = b.x - cam.x;
    const y = b.y - cam.y;
    if (b.kind === "fireball") {
      glowCircle(c, x, y, 8, "#FB923C");
      c.drawCircle(x, y, 4, paint("#FDBA74"));
    } else {
      c.drawLine(x - b.vx * 0.028, y - b.vy * 0.028, x, y, paint("#7DD3FC", 0.5, true, 3));
      glowCircle(c, x, y, 5, "#7DD3FC");
    }
  }

  // Chain lightning beams
  for (const beam of w.beams) {
    const a = beam.life / beam.maxLife;
    const path = Skia.Path.Make();
    path.moveTo(beam.pts[0].x - cam.x, beam.pts[0].y - cam.y);
    for (let i = 1; i < beam.pts.length; i++) {
      path.lineTo(beam.pts[i].x - cam.x, beam.pts[i].y - cam.y);
    }
    c.drawPath(path, paint("#FDE047", 0.3 * a, true, 7));
    c.drawPath(path, paint("#FDE047", a, true, 2.5));
  }

  // Particles
  for (const pt of w.particles) {
    const a = pt.life / pt.maxLife;
    c.drawCircle(pt.x - cam.x, pt.y - cam.y, pt.r * (0.4 + a * 0.6), paint(pt.color, a));
  }

  // Player (hooded mage)
  const p = w.player;
  const px = p.x - cam.x;
  const py = p.y - cam.y;
  c.drawCircle(px, py, 34, paint("#5EEAD4", 0.08));
  c.drawCircle(px, py, 22, paint("#5EEAD4", 0.16));
  c.drawCircle(px, py, 14, paint("#1E2A3A"));
  c.drawCircle(
    px - Math.cos(p.aim) * 4,
    py - Math.sin(p.aim) * 4,
    9,
    paint("#2B3B52"),
  );
  // Staff orb in the facing direction
  glowCircle(
    c,
    px + Math.cos(p.aim) * 19,
    py + Math.sin(p.aim) * 19,
    4.5,
    "#A78BFA",
  );
  // Glowing eyes
  const perp = p.aim + Math.PI / 2;
  for (const side of [-1, 1]) {
    c.drawCircle(
      px + Math.cos(p.aim) * 6 + Math.cos(perp) * 4.5 * side,
      py + Math.sin(p.aim) * 6 + Math.sin(perp) * 4.5 * side,
      1.8,
      paint("#5EEAD4"),
    );
  }
  if (p.flash > 0) {
    c.drawCircle(px, py, 17, paint("#FFFFFF", p.flash * 0.5));
  }

  // Virtual joystick
  if (input.active) {
    const knob = Math.min(52, Math.hypot(input.dx, input.dy));
    const a = Math.atan2(input.dy, input.dx);
    const kx = input.baseX + Math.cos(a) * knob;
    const ky = input.baseY + Math.sin(a) * knob;
    c.drawCircle(input.baseX, input.baseY, 52, paint("#A78BFA", 0.22, true, 2));
    c.drawCircle(input.baseX, input.baseY, 8, paint("#A78BFA", 0.3));
    c.drawCircle(kx, ky, 22, paint("#A78BFA", 0.4));
    c.drawCircle(kx, ky, 14, paint("#C4B5FD", 0.7));
  }
}

// ---------------------------------------------------------------------------
// Menu decorative picture
// ---------------------------------------------------------------------------

export function buildMenuPicture(vw: number, vh: number): SkPicture | null {
  if (vw <= 0 || vh <= 0) return null;
  const rec = Skia.PictureRecorder();
  const c = rec.beginRecording(Skia.XYWHRect(0, 0, vw, vh));

  c.drawRect(Skia.XYWHRect(0, 0, vw, vh), paint("#0B0A14"));

  const cx = vw / 2;
  const cy = vh * 0.3;

  // Grand magic orb
  c.drawCircle(cx, cy, 150, paint("#7C3AED", 0.1));
  c.drawCircle(cx, cy, 110, paint("#7C3AED", 0.14));
  c.drawCircle(cx, cy, 70, paint("#A78BFA", 0.2));
  c.drawCircle(cx, cy, 34, paint("#C4B5FD", 0.5));
  c.drawCircle(cx, cy, 18, paint("#EDE9FE", 0.9));

  // Rune rings
  c.drawCircle(cx, cy, 88, paint("#5EEAD4", 0.5, true, 1.5));
  c.drawCircle(cx, cy, 128, paint("#5EEAD4", 0.25, true, 1));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.35;
    c.drawCircle(cx + Math.cos(a) * 88, cy + Math.sin(a) * 88, 3, paint("#5EEAD4", 0.8));
  }

  // Sparkles
  for (let i = 0; i < 26; i++) {
    const x = (i * 137.5) % vw;
    const y = (i * 61.7) % vh;
    c.drawCircle(x, y, ((i % 3) + 1) * 0.9, paint("#C4B5FD", 0.35));
  }

  return rec.finishRecordingAsPicture();
}
