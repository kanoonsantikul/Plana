import { S, selItem, selWall, selRoom, wallById, wallLen } from '../model/state.js';
import { KINDS } from '../model/wallKinds.js';
import { r3 } from '../core/math.js';
import { dirOf, arcOf, endOf, setEndRaw, coincidentEnds, linked, collinearChain, attachedEnds } from '../geometry/walls.js';
import { pxPerM } from '../view/viewport.js';
import { render } from '../render/index.js';
import { startTransform } from './transform.js';

const copyWalls = ids => { const m = {}; ids.forEach(id => { const w = wallById(id); if (w) m[id] = { x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 }; }); return m; };
const resetWalls = orig => { for (const id in orig) { const w = wallById(id); if (w) Object.assign(w, orig[id]); } };
const moveEnd = (f, dx, dy) => { const o = wallById(f.id), p = endOf(o, f.k); setEndRaw(o, f.k, p.x + dx, p.y + dy); };

/* Dragging a wall's body:
   free   a wall joined to nothing (or held with Alt) moves anywhere, its ends snapping to wall ends
   push   a joined wall moves square to itself, with its straight continuations; walls joined to it stretch
   slide  an opening moves along its wall, or round the circle of a curved one; the wall pieces either side resize
   A curved wall pushes square to the line between its ends. */
export function startWallMove(w, p, e) {
  let kind = (!linked(w) || e.altKey) ? 'free' : (KINDS[w.kind].open ? 'slide' : 'push');
  let chain = [w.id], fol = [];
  if (kind === 'push') { chain = collinearChain(w); fol = attachedEnds(chain); }
  else if (kind === 'slide') fol = [...coincidentEnds(w, 1), ...coincidentEnds(w, 2)];
  const d = dirOf(w);
  S.drag = { mode: 'wmove', id: w.id, kind, start: p, chain, fol, orig: copyWalls([...chain, ...fol.map(f => f.id)]),
    u: { x: d.ux, y: d.uy }, n: { x: d.nx, y: d.ny }, arc: kind === 'slide' ? arcOf(w) : null, changed: false, sx: e.clientX, sy: e.clientY };
}

export function moveWall(p, e) {
  const drag = S.drag;
  const w = wallById(drag.id); if (!w) return;
  resetWalls(drag.orig);
  const dx = p.x - drag.start.x, dy = p.y - drag.start.y;
  const q = v => (e.altKey || !S.snap) ? r3(v) : Math.round(v * 100) / 100;
  if (drag.kind === 'free') {
    let mx = q(dx), my = q(dy);
    if (!e.altKey) {
      const tol = 12 / pxPerM();
      let best = null;
      for (const [ex, ey] of [[w.x1 + mx, w.y1 + my], [w.x2 + mx, w.y2 + my]]) {
        for (const o of S.walls) {
          if (o === w) continue;
          for (const [ox, oy] of [[o.x1, o.y1], [o.x2, o.y2]]) {
            const d = Math.hypot(ox - ex, oy - ey);
            if (d < tol && (!best || d < best.d)) best = { d, ax: ox - ex, ay: oy - ey };
          }
        }
      }
      if (best) { mx += best.ax; my += best.ay; }
    }
    setEndRaw(w, 1, w.x1 + mx, w.y1 + my); setEndRaw(w, 2, w.x2 + mx, w.y2 + my);
  } else if (drag.kind === 'push') {
    // the whole wall line moves square to itself; walls joined to it stretch
    const s = q(dx * drag.n.x + dy * drag.n.y), mx = drag.n.x * s, my = drag.n.y * s;
    drag.chain.forEach(id => { const c = wallById(id); setEndRaw(c, 1, c.x1 + mx, c.y1 + my); setEndRaw(c, 2, c.x2 + mx, c.y2 + my); });
    drag.fol.forEach(f => moveEnd(f, mx, my));
  } else if (drag.arc) {
    // a curved opening turns round its circle; curved pieces either side keep their radius, so they stay on it
    const a = drag.arc, ang = pt => Math.atan2(pt.y - a.cy, pt.x - a.cx), da = ang(p) - ang(drag.start);
    const turn = q(Math.atan2(Math.sin(da), Math.cos(da)) * a.r) / a.r, c = Math.cos(turn), s = Math.sin(turn);
    const spin = (o, k) => { const pt = endOf(o, k), x = pt.x - a.cx, y = pt.y - a.cy; setEndRaw(o, k, a.cx + x * c - y * s, a.cy + x * s + y * c); };
    spin(w, 1); spin(w, 2);
    drag.fol.forEach(f => spin(wallById(f.id), f.k));
    if (drag.fol.some(f => wallLen(wallById(f.id)) < 0.02)) { resetWalls(drag.last || drag.orig); return; }
  } else {
    // an opening slides along its wall; the wall pieces either side resize
    const s = q(dx * drag.u.x + dy * drag.u.y), mx = drag.u.x * s, my = drag.u.y * s;
    setEndRaw(w, 1, w.x1 + mx, w.y1 + my); setEndRaw(w, 2, w.x2 + mx, w.y2 + my);
    drag.fol.forEach(f => moveEnd(f, mx, my));
    if (drag.fol.some(f => wallLen(wallById(f.id)) < 0.02)) { resetWalls(drag.last || drag.orig); return; }
  }
  drag.last = copyWalls(Object.keys(drag.orig));
  drag.changed = true;
  render();
}

// pointer down on a selection handle: transform furniture, move a wall end, bend a wall, resize a room
export function startHandle(h, p, e) {
  const it = selItem(), w = selWall(), r = selRoom();
  if (it && !it.locked && (h === 'rot' || h.startsWith('t-'))) {
    S.drag = startTransform(it, h, p);
  } else if (w && (h === 'p1' || h === 'p2')) {
    const k = h === 'p1' ? 1 : 2, fol = e.altKey ? [] : coincidentEnds(w, k);
    S.drag = { mode: 'wend', id: w.id, k, fol, changed: false };
  } else if (w && h === 'bend') {
    S.drag = { mode: 'wbend', id: w.id, changed: false };
  } else if (r && h.startsWith('side-')) {
    S.drag = { mode: 'rside', id: r.id, side: h.slice(5), x0: r.x, y0: r.y, x1: r.x + r.w, y1: r.y + r.h, changed: false };
  } else if (r && h[0] === 'c') {
    const k = +h[1], cs = [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]];
    S.drag = { mode: 'rcorner', id: r.id, fixed: { x: cs[(k + 2) % 4][0], y: cs[(k + 2) % 4][1] }, changed: false };
  }
}
