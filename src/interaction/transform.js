import { S, normRot } from '../model/state.js';
import { CAT } from '../model/catalog.js';
import { svg } from '../core/dom.js';
import { r3, boxOf, corners } from '../core/math.js';
import { geo } from '../geometry/walls.js';
import { pxPerM } from '../view/viewport.js';
import { render } from '../render/index.js';
import { HANDLES } from '../render/transformBox.js';

/* Free Transform for furniture, after Photoshop:
   side handle or border   resize that side; the opposite side stays put
   corner handle           resize both sides; the opposite corner stays put
     + Shift               keep proportions
     + Alt                 resize from the centre
   outside a corner        rotate about the centre
     + Shift               15° steps
   Esc while dragging      cancel
   With Snap on, sizes land on whole centimetres and a moving side clicks onto
   wall and furniture faces; rotation clicks onto square angles within 2°. */

const MIN = 0.05;

// h: 'rot' or 't-<handle id>'
export function startTransform(it, h, p) {
  const orig = { x: it.x, y: it.y, w: it.w, d: it.d, rot: it.rot };
  if (h === 'rot') return { mode: 'rotate', id: it.id, orig, a0: Math.atan2(p.y - it.y, p.x - it.x), ptr: p, changed: false };
  const [sx, sy] = HANDLES[h.slice(2)];
  return { mode: 'scale', id: it.id, orig, sx, sy, start: p, ptr: p, guides: [], changed: false };
}
export const isTransform = drag => !!drag && (drag.mode === 'scale' || drag.mode === 'rotate');

// faces a side moving along world axis `ax` ('x' or 'y') can snap to: walls and
// square-on furniture that overlap the item across that axis
function facesFor(it, ax, span) {
  const boxes = geo.obstacles.filter(o => o.axis).map(o => o.box);
  S.items.forEach(o => { if (o.id !== it.id && !CAT[o.t].floor && o.rot % 90 === 0) boxes.push(boxOf(corners(o))); });
  const out = [];
  for (const b of boxes) {
    const [lo, hi] = ax === 'x' ? [b.y0, b.y1] : [b.x0, b.x1];
    if (Math.min(hi, span[1]) - Math.max(lo, span[0]) <= 0.005) continue;
    if (ax === 'x') out.push({ f: b.x0, lo, hi }, { f: b.x1, lo, hi });
    else out.push({ f: b.y0, lo, hi }, { f: b.y1, lo, hi });
  }
  return out;
}

// Snap one moving side. `a` is the world unit vector the side moves along (axis-aligned),
// `anchor` the world position of the fixed side; returns the snapped size.
function snapSide(it, dr, a, anchor, size, span) {
  const ax = Math.abs(a.x) > .5 ? 'x' : 'y', dir = ax === 'x' ? a.x : a.y;
  const base = ax === 'x' ? anchor.x : anchor.y, edge = base + dir * size;
  const tol = 8 / pxPerM();
  let best = null;
  for (const c of facesFor(it, ax, span)) {
    const d = Math.abs(c.f - edge);
    const s = (c.f - base) * dir;
    if (d < tol && s >= MIN && (!best || d < best.d)) best = { d, s, c };
  }
  if (!best) return Math.max(MIN, Math.round(size * 100) / 100);
  // show the face it snapped to, Photoshop-style
  const lo = Math.min(best.c.lo, span[0]) - .1, hi = Math.max(best.c.hi, span[1]) + .1;
  dr.guides.push(ax === 'x' ? { x1: best.c.f, y1: lo, x2: best.c.f, y2: hi } : { x1: lo, y1: best.c.f, x2: hi, y2: best.c.f });
  return r3(best.s);
}

export function moveTransform(it, p, mods) {
  const dr = S.drag, o = dr.orig;
  dr.ptr = p;
  if (dr.mode === 'rotate') {
    let a = o.rot + (Math.atan2(p.y - o.y, p.x - o.x) - dr.a0) * 180 / Math.PI;
    if (mods.shiftKey) a = Math.round(a / 15) * 15;
    else if (S.snap) { const q = Math.round(a / 90) * 90; if (Math.abs(a - q) < 2) a = q; }
    it.rot = normRot(a);
    return;
  }
  // local axes of the item: x = (ux, uy), y = (-uy, ux)
  const t = o.rot * Math.PI / 180, ux = Math.cos(t), uy = Math.sin(t);
  const dx = p.x - dr.start.x, dy = p.y - dr.start.y;
  const lx = dx * ux + dy * uy, ly = -dx * uy + dy * ux;
  const centre = mods.altKey, k = centre ? 2 : 1;
  let w = dr.sx ? o.w + dr.sx * lx * k : o.w;
  let d = dr.sy ? o.d + dr.sy * ly * k : o.d;
  const keep = mods.shiftKey && dr.sx && dr.sy;
  if (keep) {
    // the side pulled further, relative to its size, sets the scale
    const fw = w / o.w, fd = d / o.d, f = Math.abs(fw - 1) >= Math.abs(fd - 1) ? fw : fd;
    w = o.w * f; d = o.d * f;
  }
  w = Math.max(MIN, w); d = Math.max(MIN, d);
  dr.guides = [];
  if (S.snap) {
    if (!centre && !keep && o.rot % 90 === 0) {
      const ob = boxOf(corners(o));
      if (dr.sx) {
        const a = { x: dr.sx * ux, y: dr.sx * uy };
        const anchor = { x: o.x - a.x * o.w / 2, y: o.y - a.y * o.w / 2 };
        w = snapSide(it, dr, a, anchor, w, Math.abs(a.x) > .5 ? [ob.y0, ob.y1] : [ob.x0, ob.x1]);
      }
      if (dr.sy) {
        const a = { x: -dr.sy * uy, y: dr.sy * ux };
        const anchor = { x: o.x - a.x * o.d / 2, y: o.y - a.y * o.d / 2 };
        d = snapSide(it, dr, a, anchor, d, Math.abs(a.x) > .5 ? [ob.y0, ob.y1] : [ob.x0, ob.x1]);
      }
    } else {
      w = Math.max(MIN, Math.round(w * 100) / 100);
      d = Math.max(MIN, Math.round(d * 100) / 100);
    }
  }
  // the centre moves by half the growth, unless resizing from the centre
  const cl = centre ? 0 : dr.sx * (w - o.w) / 2, cd = centre ? 0 : dr.sy * (d - o.d) / 2;
  it.w = r3(w); it.d = r3(d);
  it.x = r3(o.x + cl * ux - cd * uy);
  it.y = r3(o.y + cl * uy + cd * ux);
}

// redo the last step with new modifier keys, so pressing Shift or Alt mid-drag applies at once
export function refreshTransform(mods) {
  const dr = S.drag;
  if (!isTransform(dr)) return false;
  const it = S.items.find(i => i.id === dr.id);
  if (!it) return false;
  moveTransform(it, dr.ptr, mods);
  dr.changed = true;
  render();
  return true;
}

// Esc mid-drag puts the item back
export function cancelTransform() {
  const dr = S.drag;
  if (!isTransform(dr)) return false;
  const it = S.items.find(i => i.id === dr.id);
  if (it) Object.assign(it, dr.orig);
  S.drag = null;
  unlockCursor();
  render();
  return true;
}

// keep the handle's cursor for the whole drag, wherever the pointer goes
export function lockCursor(cursor) {
  if (!cursor) return;
  svg.style.setProperty('--tcur', cursor);
  svg.classList.add('transforming');
}
export function unlockCursor() {
  svg.classList.remove('transforming');
  svg.style.removeProperty('--tcur');
}
