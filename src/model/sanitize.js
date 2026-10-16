import { CAT } from './catalog.js';
import { KINDS } from './wallKinds.js';
import { uid, normRot } from './state.js';
import { r3 } from '../core/math.js';

// Rebuild plan data from untrusted JSON (saved state or an import): keep only
// known types and finite numbers, clamp sizes, and make ids unique.
// Each returns null when the input is not a list at all.

const finite = (...v) => v.every(n => typeof n === 'number' && isFinite(n));
function uniqueIds(list) {
  const ids = new Set();
  list.forEach(o => { while (ids.has(o.id)) o.id = uid(); ids.add(o.id); });
  return list;
}

export function cleanItems(arr) {
  if (!Array.isArray(arr)) return null;
  const ok = [];
  for (const o of arr) {
    if (!o || !CAT[o.t]) continue;
    const [x, y, w, d] = ['x', 'y', 'w', 'd'].map(k => Number(o[k]));
    if (!finite(x, y, w, d)) continue;
    ok.push({ id: typeof o.id === 'string' ? o.id : uid(), t: o.t, x: r3(x), y: r3(y), w: r3(Math.max(.02, w)), d: r3(Math.max(.02, d)),
      rot: normRot(Number(o.rot) || 0), label: typeof o.label === 'string' ? o.label.slice(0, 60) : '', locked: !!o.locked });
  }
  return uniqueIds(ok);
}
export function cleanWalls(arr) {
  if (!Array.isArray(arr)) return null;
  const ok = [];
  for (const o of arr) {
    if (!o || !KINDS[o.kind]) continue;
    const [x1, y1, x2, y2, t] = ['x1', 'y1', 'x2', 'y2', 't'].map(k => Number(o[k]));
    if (!finite(x1, y1, x2, y2, t) || Math.hypot(x2 - x1, y2 - y1) < 0.005) continue;
    // a curve's radius; plans saved before curved walls have none, and are straight
    const arc = Number(o.arc) || 0;
    ok.push({ id: typeof o.id === 'string' ? o.id : uid(), kind: o.kind, x1: r3(x1), y1: r3(y1), x2: r3(x2), y2: r3(y2), t: r3(Math.min(2, Math.max(.005, t))),
      arc: finite(arc) && Math.abs(arc) < 1e4 ? r3(arc) : 0, flip: !!o.flip, label: typeof o.label === 'string' ? o.label.slice(0, 60) : '' });
  }
  return uniqueIds(ok);
}
export function cleanRooms(arr) {
  if (!Array.isArray(arr)) return null;
  const ok = [];
  for (const o of arr) {
    if (!o) continue;
    const [x, y, w, h] = ['x', 'y', 'w', 'h'].map(k => Number(o[k]));
    if (!finite(x, y, w, h) || w < .05 || h < .05) continue;
    ok.push({ id: typeof o.id === 'string' ? o.id : uid(), name: typeof o.name === 'string' ? o.name.slice(0, 40) : 'Room',
      x: r3(x), y: r3(y), w: r3(w), h: r3(h), tx: Number(o.tx) || .3, ty: Number(o.ty) || .35, outdoor: !!o.outdoor });
  }
  return uniqueIds(ok);
}
