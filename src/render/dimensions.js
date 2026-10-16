import { S, wallLen } from '../model/state.js';
import { KINDS, STRUCT } from '../model/wallKinds.js';
import { fmt } from '../model/units.js';
import { layers } from '../core/dom.js';
import { f3, R, L } from '../core/markup.js';
import { r3 } from '../core/math.js';
import { geo, isV, isH, innerBox, fullBox, dimSide, arcPoint } from '../geometry/walls.js';

/* Dimension lines: the strings around the plan, and the aligned dimensions used
   for angled walls and in the overlay. */

// the angle, in degrees, that sets text along the direction (dx, dy) the right way up
function upright(dx, dy) {
  let ang = Math.atan2(dy, dx) * 180 / Math.PI;
  if (ang >= 90 - 1e-6) ang -= 180;
  if (ang < -90 - 1e-6) ang += 180;
  return ang;
}

// aligned dimension between two points, offset sideways by `off` (+ = left of a→b).
// `o` sets sizes and classes (see DIM_M and dimPx); o.edit makes the label a clickable pill.
export function alignedDim(ax, ay, bx, by, off, o) {
  const len = Math.hypot(bx - ax, by - ay);
  if (len < 0.005) return '';
  const ux = (bx - ax) / len, uy = (by - ay) / len, nx = uy, ny = -ux, sg = off < 0 ? -1 : 1;
  const A = [ax + nx * off, ay + ny * off], B = [bx + nx * off, by + ny * off];
  let s = L(ax + nx * o.gap * sg, ay + ny * o.gap * sg, A[0] + nx * o.over * sg, A[1] + ny * o.over * sg, o.line) +
    L(bx + nx * o.gap * sg, by + ny * o.gap * sg, B[0] + nx * o.over * sg, B[1] + ny * o.over * sg, o.line) +
    L(A[0], A[1], B[0], B[1], o.line);
  const tx = (ux + nx) * o.tick * .7071, ty = (uy + ny) * o.tick * .7071;
  s += L(A[0] - tx, A[1] - ty, A[0] + tx, A[1] + ty, o.tickc) + L(B[0] - tx, B[1] - ty, B[0] + tx, B[1] + ty, o.tickc);
  const ang = upright(ux, uy);
  const label = o.label !== undefined ? o.label : fmt(len);
  const mx = (A[0] + B[0]) / 2 + nx * sg * o.fs * .8, my = (A[1] + B[1]) / 2 + ny * sg * o.fs * .8;
  if (o.edit) {
    const pw = label.length * o.fs * .64 + o.fs * 1.1, ph = o.fs * 1.6;
    s += `<g class="dimedit" data-edit="${o.edit}" transform="translate(${f3(mx)} ${f3(my)}) rotate(${f3(ang)})">` +
      R(-pw / 2, -ph / 2, pw, ph, 'pill', ph / 2) +
      `<text font-size="${f3(o.fs)}" class="${o.text}" text-anchor="middle" dominant-baseline="central">${label}</text></g>`;
  } else {
    s += `<text font-size="${f3(o.fs)}" class="${o.text}" text-anchor="middle" dominant-baseline="central" transform="translate(${f3(mx)} ${f3(my)}) rotate(${f3(ang)})">${label}</text>`;
  }
  return s;
}
// drawing-sized dimensions (metres), and screen-sized ones for the overlay (u = metres per pixel)
const DIM_M = { fs: .11, tick: .045, gap: .05, over: .06, line: 'dim', tickc: 'dtick', text: 'dtx halo' };
export const dimPx = (u, edit) => ({ fs: 11 * u, tick: 5 * u, gap: 4 * u, over: 5 * u, line: 'cl', tickc: 'cltick', text: 'cltx', edit });

function uniqSorted(vals) {
  const s = vals.map(r3).sort((a, b) => a - b), out = [];
  for (const v of s) if (!out.length || v - out[out.length - 1] > 0.0015) out.push(v);
  return out;
}
function chainH(xs, y, skip) {
  let s = L(xs[0] - .1, y, xs[xs.length - 1] + .1, y, 'dim');
  xs.forEach(x => { s += L(x, y - .09, x, y + .09, 'dim') + L(x - .045, y + .045, x + .045, y - .045, 'dtick'); });
  for (let i = 0; i < xs.length - 1; i++) {
    if (skip && skip(xs[i], xs[i + 1])) continue;
    s += `<text x="${f3((xs[i] + xs[i + 1]) / 2)}" y="${f3(y - .06)}" font-size="${DIM_M.fs}" class="dtx halo" text-anchor="middle">${fmt(xs[i + 1] - xs[i])}</text>`;
  }
  return s;
}
function chainV(ys, x, skip) {
  let s = L(x, ys[0] - .1, x, ys[ys.length - 1] + .1, 'dim');
  ys.forEach(y => { s += L(x - .09, y, x + .09, y, 'dim') + L(x - .045, y + .045, x + .045, y - .045, 'dtick'); });
  for (let i = 0; i < ys.length - 1; i++) {
    if (skip && skip(ys[i], ys[i + 1])) continue;
    s += `<text font-size="${DIM_M.fs}" class="dtx halo" text-anchor="middle" transform="translate(${f3(x - .06)} ${f3((ys[i] + ys[i + 1]) / 2)}) rotate(-90)">${fmt(ys[i + 1] - ys[i])}</text>`;
  }
  return s;
}

// Dimension strings are rebuilt from the walls on every change. Like the drawing, they
// measure clear sizes between inside faces: an outer row for openings and thin
// partitions, a row for room partitions, the side's own outside wall, then the overall.
const overlap1 = (a, b) => Math.min(a[1], b[1]) - Math.max(a[0], b[0]);
const OPENINGS = new Set(['window', 'door', 'slider']);
const xSpan = w => [Math.min(w.x1, w.x2), Math.max(w.x1, w.x2)];
const ySpan = w => [Math.min(w.y1, w.y2), Math.max(w.y1, w.y2)];
// ends level, or plumb, whether or not the wall curves between them
const endsH = w => Math.abs(w.y1 - w.y2) < 1e-6;
const endsV = w => Math.abs(w.x1 - w.x2) < 1e-6;

function sideChain(segs, d) {
  const inRange = v => v >= d.lo - 1e-6 && v <= d.hi + 1e-6;
  const perp = segs.filter(d.perp);
  const band = w => [r3(d.pos(w) - w.t / 2), r3(d.pos(w) + w.t / 2)];
  const touching = kinds => perp.filter(w => kinds.includes(w.kind) && d.touch(d.span(w))).map(band);
  const main = touching(['wall', 'slider']), thin = touching(['screen']), duct = touching(['duct']);
  const row2 = uniqSorted([d.lo, d.hi, ...main.flat()].filter(inRange));
  // jambs of the openings seen from this side
  const pts = [];
  for (const o of segs) {
    if (!d.par(o) || !OPENINGS.has(o.kind)) continue;
    const sp = d.parSpan(o);
    if (overlap1(sp, [d.lo, d.hi]) <= 0) continue;
    if (segs.some(e => e !== o && STRUCT.has(e.kind) && d.par(e) && d.ahead(e, o) && overlap1(d.parSpan(e), sp) > .01)) continue;
    const at = d.parPos(o);
    for (const v of sp) {
      const buried = perp.some(w => KINDS[w.kind].solid && w.kind !== 'column' &&
        v > d.pos(w) - w.t / 2 + .001 && v < d.pos(w) + w.t / 2 - .001 && overlap1(d.span(w), [at - .06, at + .06]) > 0);
      if (!buried) pts.push(v);
    }
  }
  const row1 = uniqSorted([...row2, ...thin.flat(), ...duct.flat(), ...pts].filter(inRange));
  // the outside wall on this side, when it runs shorter than the whole plan
  let facade = null;
  const par = segs.filter(w => d.par(w) && STRUCT.has(w.kind));
  if (par.length) {
    const edge = d.outer < 0 ? Math.min(...par.map(d.parPos)) : Math.max(...par.map(d.parPos));
    const line = par.filter(w => Math.abs(d.parPos(w) - edge) < .002);
    const face = (v, dir) => { const w = perp.find(p => p.kind === 'wall' && Math.abs(d.pos(p) - v) < .002); return w ? v + dir * w.t / 2 : v; };
    const a = r3(face(Math.min(...line.map(w => d.parSpan(w)[0])), 1));
    const b = r3(face(Math.max(...line.map(w => d.parSpan(w)[1])), -1));
    if (b - a > .05 && inRange(a) && inRange(b)) facade = [a, b];
  }
  const rows = [];
  const add = r => { if (r.length > 1 && !rows.some(o => o.join() === r.join())) rows.push(r); };
  const isSegment = (a, b) => rows.some(r => r.some((v, i) => i < r.length - 1 && Math.abs(v - a) < .0015 && Math.abs(r[i + 1] - b) < .0015));
  add(row1); add(row2);
  if (facade && !isSegment(facade[0], facade[1])) add(facade);
  add([r3(d.lo), r3(d.hi)]);
  // a partition's own thickness gets ticks but no number, as on the drawing
  const bands = [...main, ...thin];
  const skip = (a, b) => bands.some(([p, q]) => Math.abs(p - a) < .0015 && Math.abs(q - b) < .0015);
  return { rows, skip };
}

export function renderDims() {
  const ib = innerBox(), fb = fullBox();
  let s = '';
  if (ib && fb) {
    const segs = S.walls.filter(w => wallLen(w) > .005);
    const T = .012;
    // walls along a side go by their ends, so a curved window's jambs count; walls square to it must be straight
    const H = { perp: isV, par: endsH, pos: w => w.x1, span: ySpan, parPos: w => w.y1, parSpan: xSpan, lo: ib.x0, hi: ib.x1 };
    const V = { perp: isH, par: endsV, pos: w => w.y1, span: xSpan, parPos: w => w.x1, parSpan: ySpan, lo: ib.y0, hi: ib.y1 };
    const top = sideChain(segs, { ...H, outer: -1, touch: sp => sp[0] <= ib.y0 + T, ahead: (e, o) => e.y1 < o.y1 - .01 });
    const bottom = sideChain(segs, { ...H, outer: 1, touch: sp => sp[1] >= ib.y1 - T, ahead: (e, o) => e.y1 > o.y1 + .01 });
    const left = sideChain(segs, { ...V, outer: -1, touch: sp => sp[0] <= ib.x0 + T, ahead: (e, o) => e.x1 < o.x1 - .01 });
    const right = sideChain(segs, { ...V, outer: 1, touch: sp => sp[1] >= ib.x1 - T, ahead: (e, o) => e.x1 > o.x1 + .01 });
    const gap = .26, first = .28;
    top.rows.forEach((r, k) => { s += chainH(r, fb.y0 - first - k * gap, top.skip); });
    bottom.rows.forEach((r, k) => { s += chainH(r, fb.y1 + first + .06 + k * gap, bottom.skip); });
    left.rows.forEach((r, k) => { s += chainV(r, fb.x0 - first - k * gap, left.skip); });
    right.rows.forEach((r, k) => { s += chainV(r, fb.x1 + first + .06 + k * gap, right.skip); });
  }
  // walls at an angle get their own aligned dimension; a curved wall is marked with its radius
  S.walls.forEach(w => {
    const g = geo.byId.get(w.id);
    if (g.axis || w.kind === 'column' || w.kind === 'duct') return;
    s += g.arc ? radiusLabel(w, g.arc) : alignedDim(w.x1, w.y1, w.x2, w.y2, dimSide(w, .22), DIM_M);
  });
  layers.dims.innerHTML = s;
}
// just beyond the middle of the bow, clear of the dimension strings
function radiusLabel(w, a) {
  const p = arcPoint(a, .5), o = a.sg * (w.t / 2 + .1);
  return `<text font-size="${DIM_M.fs}" class="${DIM_M.text}" text-anchor="middle" dominant-baseline="central" transform="translate(${f3(p.x + p.nx * o)} ${f3(p.y + p.ny * o)}) rotate(${f3(upright(w.x2 - w.x1, w.y2 - w.y1))})">R ${fmt(a.r)}</text>`;
}
