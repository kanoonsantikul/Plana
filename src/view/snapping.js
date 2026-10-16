import { S } from '../model/state.js';
import { CAT } from '../model/catalog.js';
import { fromU } from '../model/units.js';
import { r3, dist, boxOf, corners } from '../core/math.js';
import { geo, closestOnSeg, arcOf } from '../geometry/walls.js';
import { pxPerM } from './viewport.js';

/* Snapping. Pointer positions are pulled onto wall ends, wall lines, angles,
   whole centimetres and the grid. Tolerances are in screen pixels, so snapping
   feels the same at any zoom. */

// pull a furniture item's edges onto nearby wall or furniture faces
export function magnet(it) {
  const b = boxOf(corners(it)), tol = 0.07;
  const obs = geo.obstacles.filter(o => o.axis).map(o => o.box);
  S.items.forEach(o => { if (o.id !== it.id && !CAT[o.t].floor && !CAT[it.t].floor) obs.push(boxOf(corners(o))); });
  let dx = null, dy = null;
  for (const o of obs) {
    if (Math.min(b.y1, o.y1) - Math.max(b.y0, o.y0) > 0.01) {
      for (const c of [o.x1 - b.x0, o.x0 - b.x1]) if (Math.abs(c) < tol && (dx === null || Math.abs(c) < Math.abs(dx))) dx = c;
    }
    if (Math.min(b.x1, o.x1) - Math.max(b.x0, o.x0) > 0.01) {
      for (const c of [o.y1 - b.y0, o.y0 - b.y1]) if (Math.abs(c) < tol && (dy === null || Math.abs(c) < Math.abs(dy))) dy = c;
    }
  }
  if (dx !== null) it.x = r3(it.x + dx);
  if (dy !== null) it.y = r3(it.y + dy);
}

/* ---------- walls ---------- */
// where the line through a and b crosses wall w's centreline
function lineHit(a, b, w) {
  const arc = arcOf(w);
  if (arc) return circleHit(a, b, w, arc);
  const rx = b.x - a.x, ry = b.y - a.y, sx = w.x2 - w.x1, sy = w.y2 - w.y1;
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((w.x1 - a.x) * sy - (w.y1 - a.y) * sx) / den;
  const s = ((w.x1 - a.x) * ry - (w.y1 - a.y) * rx) / den;
  if (s < 0 || s > 1) return null;
  return { x: a.x + t * rx, y: a.y + t * ry };
}
// on a curved wall: of the two places the line crosses its circle, the one on the curve nearer b
function circleHit(a, b, w, arc) {
  const rx = b.x - a.x, ry = b.y - a.y, fx = a.x - arc.cx, fy = a.y - arc.cy;
  const A = rx * rx + ry * ry, B = 2 * (fx * rx + fy * ry), D = B * B - 4 * A * (fx * fx + fy * fy - arc.r * arc.r);
  if (A < 1e-12 || D < 0) return null;
  let best = null;
  for (const t of [(-B - Math.sqrt(D)) / (2 * A), (-B + Math.sqrt(D)) / (2 * A)]) {
    const x = a.x + t * rx, y = a.y + t * ry;
    if (closestOnSeg(x, y, w).d > 1e-6) continue;
    if (!best || Math.hypot(x - b.x, y - b.y) < Math.hypot(best.x - b.x, best.y - b.y)) best = { x, y };
  }
  return best;
}
// snap a pointer position for wall drawing: existing ends → angle/length → wall centrelines → grid
export function snapPoint(p, from, exclude, e) {
  if (e && e.altKey) return { x: r3(p.x), y: r3(p.y), kind: null };
  const u = 1 / pxPerM();
  let best = null, bd = 12 * u;
  for (const w of S.walls) {
    if (exclude && exclude.has(w.id)) continue;
    for (const [x, y] of [[w.x1, w.y1], [w.x2, w.y2]]) { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = { x, y }; } }
  }
  if (best) return { x: best.x, y: best.y, kind: 'end' };
  let q = { x: p.x, y: p.y }, kind = null;
  if (from) {
    const dx = q.x - from.x, dy = q.y - from.y;
    let len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx) * 180 / Math.PI;
    if (e && e.shiftKey) { ang = Math.round(ang / 45) * 45; kind = 'angle'; }
    else if (S.snap) { const a = Math.round(ang / 15) * 15; if (Math.abs(ang - a) < 4) { ang = a; kind = 'angle'; } }
    if (S.snap) len = Math.round(len * 100) / 100;
    const ar = ang * Math.PI / 180;
    q = { x: from.x + Math.cos(ar) * len, y: from.y + Math.sin(ar) * len };
  } else if (S.snap) {
    q = { x: Math.round(q.x / .05) * .05, y: Math.round(q.y / .05) * .05 };
  }
  const tl = 9 * u;
  let bw = null, bc = null, bld = tl;
  for (const w of S.walls) {
    if (exclude && exclude.has(w.id)) continue;
    const c = closestOnSeg(p.x, p.y, w);
    if (c.d < bld) { bld = c.d; bc = c; bw = w; }
  }
  if (bw) {
    if (from) {
      const hit = lineHit(from, q, bw);
      if (hit && Math.hypot(hit.x - p.x, hit.y - p.y) < tl * 2) return { x: r3(hit.x), y: r3(hit.y), kind: 'line' };
    }
    return { x: r3(bc.x), y: r3(bc.y), kind: 'line' };
  }
  // keep angle-snapped points exact: round only the far end
  return { x: r3(q.x), y: r3(q.y), kind };
}

/* ---------- curves ---------- */
// how far a curve from a to b bows out to reach the pointer p, + to the left of a → b.
// It snaps straight and to a half circle, and to whole centimetres.
export function riseSnap(a, b, p, e) {
  const c = dist(a, b);
  if (c < 1e-6) return 0;
  const s = Math.max(-c / 2, Math.min(c / 2, (p.x - (a.x + b.x) / 2) * (b.y - a.y) / c - (p.y - (a.y + b.y) / 2) * (b.x - a.x) / c));
  if (e && e.altKey) return r3(s);
  const tol = 8 / pxPerM();
  if (Math.abs(s) < tol) return 0;
  if (c / 2 - Math.abs(s) < tol) return r3(Math.sign(s) * c / 2);
  return S.snap ? Math.round(s * 100) / 100 : r3(s);
}

/* ---------- the wall being drawn ----------
   S.draft is { a, b } while choosing where a wall ends: a is its start, b the pointer.
   A curved wall then bends: { a, b, to, rise }, where `to` is its end, b the pointer
   and rise how far the curve bows out to reach the pointer. */
// a length typed while drawing, in metres
function typedLen() {
  const v = parseFloat(S.typed);
  return S.typed && isFinite(v) && v > 0 ? fromU(v) : null;
}
// where the draft wall ends: at the pointer, or at the typed length along its direction
export function draftEnd() {
  const { a, b } = S.draft, len = typedLen();
  if (len === null) return b;
  let dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy);
  if (l < 1e-6) { dx = 1; dy = 0; l = 1; }
  return { x: r3(a.x + dx / l * len), y: r3(a.y + dy / l * len) };
}
// how far the curve being drawn bows out: to the pointer, or by the typed rise on the pointer's side
export function draftRise() {
  const { a, b, to, rise } = S.draft, len = typedLen();
  if (len === null) return rise;
  const left = (b.x - (a.x + to.x) / 2) * (to.y - a.y) - (b.y - (a.y + to.y) / 2) * (to.x - a.x) >= 0;
  return (left ? 1 : -1) * Math.min(len, dist(a, to) / 2);
}

/* ---------- rooms ---------- */
function snapAxis(v, list, e) {
  if (e && e.altKey) return r3(v);
  const tol = 10 / pxPerM();
  let best = null, bd = tol;
  for (const c of list) { const d = Math.abs(c - v); if (d < bd) { bd = d; best = c; } }
  if (best !== null) return r3(best);
  return S.snap ? r3(Math.round(v / .05) * .05) : r3(v);
}
export const roomSnap = (p, e) => ({ x: snapAxis(p.x, geo.faces.xs, e), y: snapAxis(p.y, geo.faces.ys, e) });
// move a room edge pair (lo, lo + size) so either edge lands on a nearby wall face
export function edgeMagnet(lo, size, list, e) {
  if (e && e.altKey) return r3(lo);
  const tol = 10 / pxPerM();
  let best = null;
  for (const c of list) for (const d of [c - lo, c - (lo + size)]) if (Math.abs(d) < tol && (best === null || Math.abs(d) < Math.abs(best))) best = d;
  if (best !== null) return r3(lo + best);
  return S.snap ? r3(Math.round(lo / .05) * .05) : r3(lo);
}
