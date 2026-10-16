import { S, wallById, wallLen } from '../model/state.js';
import { KINDS, STRUCT } from '../model/wallKinds.js';
import { r3, boxOf, corners } from '../core/math.js';

/* Wall geometry: segment maths, curves, joined corners, wall outlines and plan extents. */

export function dirOf(w) {
  const dx = w.x2 - w.x1, dy = w.y2 - w.y1, len = Math.hypot(dx, dy) || 1e-9;
  const ux = dx / len, uy = dy / len;
  return { ux, uy, nx: uy, ny: -ux, len };
}

/* ---------- curved walls ---------- */
// A curved wall is a circular arc through its two ends. Its `arc` is the signed radius of
// the centreline: + bows out to the left of start → end as seen on the plan (the side
// dirOf's normal points to), − to the right. A radius under half the span makes a half circle.
// Gives null for a straight wall; otherwise the circle, the angle the curve starts at (a0) and
// how far it turns (da), how far its middle bows out from straight (rise, signed) and its length.
export function arcOf(w) {
  if (!w.arc || !KINDS[w.kind].arc) return null;
  const c = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
  if (c < 1e-6) return null;
  const sg = w.arc > 0 ? 1 : -1, r = Math.max(Math.abs(w.arc), c / 2);
  const d = Math.sqrt(Math.max(0, r * r - c * c / 4)); // centre to the middle of the span
  const nx = (w.y2 - w.y1) / c, ny = -(w.x2 - w.x1) / c;
  const cx = (w.x1 + w.x2) / 2 - sg * d * nx, cy = (w.y1 + w.y2) / 2 - sg * d * ny;
  const turn = 2 * Math.asin(Math.min(1, c / (2 * r)));
  return { cx, cy, r, sg, a0: Math.atan2(w.y1 - cy, w.x1 - cx), da: sg * turn, rise: sg * c * c / 4 / (r + d), len: r * turn };
}
// the point a fraction t of the way along a curve, with the normal to its left there
export function arcPoint(a, t) {
  const th = a.a0 + a.da * t, c = Math.cos(th), s = Math.sin(th);
  return { x: a.cx + a.r * c, y: a.cy + a.r * s, nx: a.sg * c, ny: a.sg * s };
}
// how many straight pieces draw a curve, each straying from it by under 0.2 mm
const arcSteps = a => Math.min(256, Math.max(4, Math.ceil(Math.abs(a.da) / (2 * Math.acos(Math.max(0, 1 - 0.0002 / a.r))))));

// the signed radius that bows a wall spanning c out by `rise` at its middle; 0 is straight
export function arcFor(c, rise) {
  const s = Math.min(Math.abs(rise), c / 2);
  return s < 0.0005 ? 0 : r3(Math.sign(rise) * (c * c / 4 + s * s) / (2 * s));
}
// length along the centreline, round the curve of a curved wall
export const centreLen = w => { const a = arcOf(w); return a ? a.len : wallLen(w); };

// points along a wall's centreline, from fraction t0 to t1 of the way along, offset sideways by off (+ = left)
export function centrePts(w, off = 0, t0 = 0, t1 = 1) {
  const a = arcOf(w);
  if (!a) {
    const g = dirOf(w), at = t => [w.x1 + g.ux * g.len * t + g.nx * off, w.y1 + g.uy * g.len * t + g.ny * off];
    return [at(t0), at(t1)];
  }
  const n = Math.max(1, Math.ceil(arcSteps(a) * Math.abs(t1 - t0)));
  return Array.from({ length: n + 1 }, (_, i) => { const p = arcPoint(a, t0 + (t1 - t0) * i / n); return [p.x + p.nx * off, p.y + p.ny * off]; });
}

// is point (px,py) on segment o (ends included)?
export function onSeg(px, py, o, tol = 0.002) {
  if (arcOf(o)) return closestOnSeg(px, py, o).d < tol;
  const dx = o.x2 - o.x1, dy = o.y2 - o.y1, L2 = dx * dx + dy * dy;
  if (!L2) return false;
  const t = ((px - o.x1) * dx + (py - o.y1) * dy) / L2;
  if (t < -1e-6 || t > 1 + 1e-6) return false;
  return Math.hypot(px - (o.x1 + t * dx), py - (o.y1 + t * dy)) < tol;
}
export function closestOnSeg(px, py, o) {
  const a = arcOf(o);
  if (a) return closestOnArc(px, py, o, a);
  const dx = o.x2 - o.x1, dy = o.y2 - o.y1, L2 = dx * dx + dy * dy;
  const t = L2 ? Math.max(0, Math.min(1, ((px - o.x1) * dx + (py - o.y1) * dy) / L2)) : 0;
  const x = o.x1 + t * dx, y = o.y1 + t * dy;
  return { x, y, t, d: Math.hypot(px - x, py - y) };
}
// on a curved wall: square to the curve when the point is beside it, or else the nearer end
function closestOnArc(px, py, o, a) {
  const turn = Math.abs(a.da);
  let rel = (Math.atan2(py - a.cy, px - a.cx) - a.a0) * a.sg % (2 * Math.PI);
  if (rel < 0) rel += 2 * Math.PI;
  if (rel <= turn) {
    const t = rel / turn, p = arcPoint(a, t);
    return { x: p.x, y: p.y, t, d: Math.abs(Math.hypot(px - a.cx, py - a.cy) - a.r) };
  }
  const d1 = Math.hypot(px - o.x1, py - o.y1), d2 = Math.hypot(px - o.x2, py - o.y2);
  return d1 <= d2 ? { x: o.x1, y: o.y1, t: 0, d: d1 } : { x: o.x2, y: o.y2, t: 1, d: d2 };
}
export const same = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by) < 0.002;
export const endOf = (w, k) => k === 1 ? { x: w.x1, y: w.y1 } : { x: w.x2, y: w.y2 };
export const isV = w => Math.abs(w.x1 - w.x2) < 1e-6 && !arcOf(w);
export const isH = w => Math.abs(w.y1 - w.y2) < 1e-6 && !arcOf(w);

// direction of travel, start to end, at end k of a wall
function endDir(w, k) {
  const a = arcOf(w);
  if (!a) { const g = dirOf(w); return { x: g.ux, y: g.uy }; }
  const p = arcPoint(a, k === 1 ? 0 : 1);
  return { x: -p.ny, y: p.nx };
}
// where a curved wall and another carry on from each other end to end, without a corner,
// there's no corner to close, and running the ends on would poke past the curved faces
function smoothJoin(w, k, o) {
  if (!arcOf(w) && !arcOf(o)) return false;
  const p = endOf(w, k), ko = same(o.x1, o.y1, p.x, p.y) ? 1 : same(o.x2, o.y2, p.x, p.y) ? 2 : 0;
  if (!ko) return false;
  const u = endDir(w, k), v = endDir(o, ko);
  return Math.abs(u.x * v.y - u.y * v.x) < 0.05;
}

export function setEndRaw(w, k, x, y) {
  if (k === 1) { w.x1 = r3(x); w.y1 = r3(y); } else { w.x2 = r3(x); w.y2 = r3(y); }
}
// other segments whose end coincides with end k of w
export function coincidentEnds(w, k) {
  const p = endOf(w, k), out = [];
  for (const o of S.walls) {
    if (o === w || o.kind === 'column' || w.kind === 'column') continue;
    if (same(o.x1, o.y1, p.x, p.y)) out.push({ id: o.id, k: 1 });
    if (same(o.x2, o.y2, p.x, p.y)) out.push({ id: o.id, k: 2 });
  }
  return out;
}
// move one end of a wall and keep the joined corner together
export function setEnd(w, k, x, y) {
  const fol = coincidentEnds(w, k);
  setEndRaw(w, k, x, y);
  fol.forEach(f => setEndRaw(wallById(f.id), f.k, x, y));
}

// A wall's outline, as one polygon and as the convex pieces it is made of (just the one
// for a straight wall), which the clash checks need. e1 and e2 run the ends on, so a corner closes.
export function outline(w, e1 = 0, e2 = 0) {
  const a = arcOf(w), h = w.t / 2;
  if (!a) {
    const g = dirOf(w);
    const ax = w.x1 - g.ux * e1, ay = w.y1 - g.uy * e1, bx = w.x2 + g.ux * e2, by = w.y2 + g.uy * e2;
    const poly = [[ax + g.nx * h, ay + g.ny * h], [bx + g.nx * h, by + g.ny * h], [bx - g.nx * h, by - g.ny * h], [ax - g.nx * h, ay - g.ny * h]];
    return { poly, parts: [poly] };
  }
  // both faces of a curve, point by point; the ends run on along its tangents
  const lf = [], rt = [];
  const add = (x, y, nx, ny) => { lf.push([x + nx * h, y + ny * h]); rt.push([x - nx * h, y - ny * h]); };
  const n = arcSteps(a), p0 = arcPoint(a, 0), p1 = arcPoint(a, 1);
  if (e1) add(p0.x + p0.ny * e1, p0.y - p0.nx * e1, p0.nx, p0.ny);
  for (let i = 0; i <= n; i++) { const p = arcPoint(a, i / n); add(p.x, p.y, p.nx, p.ny); }
  if (e2) add(p1.x - p1.ny * e2, p1.y + p1.nx * e2, p1.nx, p1.ny);
  const parts = lf.slice(1).map((q, i) => [lf[i], q, rt[i + 1], rt[i]]);
  return { poly: [...lf, ...rt.reverse()], parts };
}

/* Derived geometry, rebuilt from S.walls by buildGeo() at the start of every render:
   byId       outline (polygon and convex parts), box, direction and curve of each wall
   obstacles  the walls furniture can't overlap
   doors      door swing shapes
   faces      x and y positions of axis-aligned wall faces, for snapping rooms */
export const geo = { byId: new Map(), obstacles: [], doors: [], faces: { xs: [], ys: [] } };

export function buildGeo() {
  geo.byId = new Map();
  const solid = S.walls.filter(w => w.kind === 'wall');
  for (const w of S.walls) {
    let e1 = 0, e2 = 0;
    // a wall ending on another wall runs on to that wall's far face, so the corner closes
    if (w.kind === 'wall') {
      for (const o of solid) {
        if (o === w) continue;
        if (onSeg(w.x1, w.y1, o) && !smoothJoin(w, 1, o)) e1 = Math.max(e1, o.t / 2);
        if (onSeg(w.x2, w.y2, o) && !smoothJoin(w, 2, o)) e2 = Math.max(e2, o.t / 2);
      }
    }
    const g = dirOf(w), arc = arcOf(w), { poly, parts } = outline(w, e1, e2);
    const axis = !arc && (Math.abs(g.ux) < 1e-6 || Math.abs(g.uy) < 1e-6);
    geo.byId.set(w.id, { ...g, poly, parts, box: boxOf(poly), axis, arc, kind: w.kind, id: w.id });
  }
  geo.obstacles = S.walls.filter(w => KINDS[w.kind].solid).map(w => geo.byId.get(w.id));
  geo.faces = { xs: [], ys: [] };
  geo.obstacles.forEach(o => { if (o.axis) { geo.faces.xs.push(o.box.x0, o.box.x1); geo.faces.ys.push(o.box.y0, o.box.y1); } });
  geo.doors = S.walls.filter(w => w.kind === 'door').map(w => ({ w, ...doorGeom(w) }));
}
function doorGeom(w) {
  const g = dirOf(w), s = w.flip ? -1 : 1, nx = g.nx * s, ny = g.ny * s, len = g.len;
  const hx = w.x1 + nx * w.t / 2, hy = w.y1 + ny * w.t / 2;
  const a0 = Math.atan2(g.uy, g.ux);
  let da = Math.atan2(ny, nx) - a0;
  while (da > Math.PI) da -= 2 * Math.PI;
  while (da < -Math.PI) da += 2 * Math.PI;
  const poly = [[hx, hy]];
  for (let k = 0; k <= 10; k++) { const a = a0 + da * k / 10; poly.push([hx + Math.cos(a) * len, hy + Math.sin(a) * len]); }
  return { hx, hy, ox: hx + nx * len, oy: hy + ny * len, cx: hx + g.ux * len, cy: hy + g.uy * len, sweep: da > 0 ? 1 : 0, len, ux: g.ux, uy: g.uy, poly };
}

/* ---------- plan extents ---------- */
// structural extents (wall centrelines)
export function structBox() {
  const st = S.walls.filter(w => STRUCT.has(w.kind));
  if (!st.length) return null;
  const pts = st.flatMap(w => [[w.x1, w.y1], [w.x2, w.y2]]);
  return boxOf(pts);
}
// everything drawn, walls and furniture
export function fullBox() {
  const polys = [...geo.byId.values()].map(g => g.poly).flat();
  S.items.forEach(it => polys.push(...corners(it)));
  return polys.length ? boxOf(polys) : null;
}
const minBy = (l, f) => l.reduce((a, b) => f(b) < f(a) ? b : a);
// inside faces of the outermost walls
export function innerBox() {
  const sb = structBox();
  if (!sb) return null;
  const segs = S.walls.filter(w => w.kind === 'wall' && wallLen(w) > .005);
  const vW = segs.filter(isV), hW = segs.filter(isH);
  let { x0, x1, y0, y1 } = sb;
  if (vW.length > 1) {
    const a = minBy(vW, w => w.x1), b = minBy(vW, w => -w.x1);
    if (b.x1 - a.x1 > .3) { x0 = r3(a.x1 + a.t / 2); x1 = r3(b.x1 - b.t / 2); }
  }
  if (hW.length > 1) {
    const a = minBy(hW, w => w.y1), b = minBy(hW, w => -w.y1);
    if (b.y1 - a.y1 > .3) { y0 = r3(a.y1 + a.t / 2); y1 = r3(b.y1 - b.t / 2); }
  }
  return { x0, x1, y0, y1 };
}
export function planCentre() {
  const sb = structBox();
  return sb ? { x: (sb.x0 + sb.x1) / 2, y: (sb.y0 + sb.y1) / 2 } : { x: 0, y: 0 };
}
// how far to the side (+ = left) a wall's own dimension runs, `gap` clear of the wall:
// away from the middle of the plan, or for a curved wall, beyond the side it bows out to
export function dimSide(w, gap) {
  const a = arcOf(w);
  if (a) return a.rise + a.sg * (w.t / 2 + gap);
  const g = dirOf(w), c = planCentre();
  return ((g.nx * ((w.x1 + w.x2) / 2 - c.x) + g.ny * ((w.y1 + w.y2) / 2 - c.y)) >= 0 ? 1 : -1) * (w.t / 2 + gap);
}

/* ---------- connections, for moving walls ---------- */
// does any other wall end on this one, or this one on another?
export function linked(w) {
  if (w.kind === 'column') return false;
  return S.walls.some(o => o !== w && o.kind !== 'column' &&
    (onSeg(o.x1, o.y1, w) || onSeg(o.x2, o.y2, w) || onSeg(w.x1, w.y1, o) || onSeg(w.x2, w.y2, o)));
}
// walls that continue this one in a straight line, joined end to end; curved walls have none
export function collinearChain(w) {
  if (arcOf(w)) return [w.id];
  const g0 = dirOf(w), set = new Set([w.id]), queue = [w];
  const offLine = (x, y) => Math.abs((x - w.x1) * g0.nx + (y - w.y1) * g0.ny);
  while (queue.length) {
    const c = queue.pop();
    for (const o of S.walls) {
      if (set.has(o.id) || o.kind === 'column' || arcOf(o)) continue;
      const g = dirOf(o);
      if (Math.abs(g0.ux * g.uy - g0.uy * g.ux) > 0.002) continue;
      if (offLine(o.x1, o.y1) > .002 || offLine(o.x2, o.y2) > .002) continue;
      if (same(o.x1, o.y1, c.x1, c.y1) || same(o.x1, o.y1, c.x2, c.y2) || same(o.x2, o.y2, c.x1, c.y1) || same(o.x2, o.y2, c.x2, c.y2)) { set.add(o.id); queue.push(o); }
    }
  }
  return [...set];
}
// ends of other walls that sit on any wall of the chain
export function attachedEnds(chainIds) {
  const chain = chainIds.map(wallById), out = [];
  for (const o of S.walls) {
    if (chainIds.includes(o.id) || o.kind === 'column') continue;
    for (const k of [1, 2]) {
      const p = endOf(o, k);
      if (chain.some(c => onSeg(p.x, p.y, c))) out.push({ id: o.id, k });
    }
  }
  return out;
}
