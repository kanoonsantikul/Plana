import { S, uid, selItem, selWall, selRoom, snapV, normRot } from '../model/state.js';
import { CAT } from '../model/catalog.js';
import { KINDS } from '../model/wallKinds.js';
import { sampleWalls, sampleRooms, sampleItems } from '../model/samples.js';
import { commit } from '../model/history.js';
import { r3, dist } from '../core/math.js';
import { setEndRaw, arcOf, arcPoint, arcFor } from '../geometry/walls.js';
import { magnet, draftEnd, draftRise } from '../view/snapping.js';
import { fit } from '../view/viewport.js';
import { render } from '../render/index.js';
import { applyToggles, setTool } from './settings.js';

/* Editing operations on the plan. Each one records an undo step and redraws. */

export function select(id) {
  S.sel = id;
  render();
}

export function addItem(t, x, y) {
  const def = CAT[t];
  const it = { id: uid(), t, x: snapV(x), y: snapV(y), w: def.w, d: def.d, rot: 0, label: '', locked: false };
  if (S.snap) magnet(it);
  S.items.push(it);
  if (S.tool !== 'select') { S.tool = 'select'; S.draft = null; applyToggles(); }
  S.sel = it.id;
  commit();
  render();
}

// add a wall of the Wall tool's current type and thickness, curved when `arc` is a radius (the caller redraws)
export function addWall(a, b, arc = 0) {
  if (dist(a, b) < 0.005) return;
  S.walls.push({ id: uid(), kind: S.wallKind, x1: r3(a.x), y1: r3(a.y), x2: r3(b.x), y2: r3(b.y), t: S.wallT, arc, flip: false, label: '' });
  commit();
}

// The wall being drawn reaches `end`. A straight wall is added there, and drawing carries
// on from its end; a curved one waits for a third point, which sets how far it bows out.
export function draftTo(end) {
  if (S.wallArc && KINDS[S.wallKind].arc) { S.draft = { a: S.draft.a, b: { ...end }, to: { ...end }, rise: 0 }; return; }
  addWall(S.draft.a, end);
  S.draft = { a: { ...end }, b: { ...end } };
}
// add the curved wall being bent, and carry on drawing from its end
export function finishCurve() {
  const { a, to } = S.draft;
  addWall(a, to, arcFor(dist(a, to), draftRise()));
  S.draft = { a: { ...to }, b: { ...to } };
}

// finish the draft wall at the typed length, or a curve at the typed rise
export function commitTyped() {
  if (!S.draft) return;
  if (S.draft.to) finishCurve();
  else { const end = draftEnd(); if (dist(S.draft.a, end) >= 0.001) draftTo(end); }
  S.typed = '';
  render();
}

export function duplicate() {
  const it = selItem(), w = selWall(), r = selRoom();
  if (it) { const c = { ...it, id: uid(), x: r3(it.x + .2), y: r3(it.y + .2), locked: false }; S.items.push(c); S.sel = c.id; }
  else if (w) { const c = { ...w, id: uid(), x1: r3(w.x1 + .3), y1: r3(w.y1 + .3), x2: r3(w.x2 + .3), y2: r3(w.y2 + .3) }; S.walls.push(c); S.sel = c.id; }
  else if (r) { const c = { ...r, id: uid(), x: r3(r.x + .3), y: r3(r.y + .3), name: r.name + ' copy' }; S.rooms.push(c); S.sel = c.id; }
  else return;
  commit(); render();
}

export function remove() {
  const it = selItem(), w = selWall(), r = selRoom();
  if (it) { if (it.locked) return; S.items = S.items.filter(i => i !== it); }
  else if (w) S.walls = S.walls.filter(o => o !== w);
  else if (r) S.rooms = S.rooms.filter(o => o !== r);
  else return;
  S.sel = null; commit(); render();
}

// furniture turns to the next quarter turn; a wall turns 90° about its midpoint
export function rotateBy(deg) {
  const it = selItem(), w = selWall();
  if (it && !it.locked) {
    it.rot = normRot(it.rot % 90 === 0 ? it.rot + deg : (deg > 0 ? Math.ceil(it.rot / 90) : Math.floor(it.rot / 90)) * 90);
  } else if (w) {
    const mx = (w.x1 + w.x2) / 2, my = (w.y1 + w.y2) / 2, s = deg > 0 ? 1 : -1;
    const rot = (x, y) => [mx - s * (y - my), my + s * (x - mx)];
    const [a, b] = rot(w.x1, w.y1), [c, d] = rot(w.x2, w.y2);
    setEndRaw(w, 1, a, b); setEndRaw(w, 2, c, d);
  } else return;
  commit(); render();
}

export function nudge(dx, dy) {
  const it = selItem(), w = selWall(), r = selRoom();
  if (it && !it.locked) { it.x = r3(it.x + dx); it.y = r3(it.y + dy); }
  else if (w) { setEndRaw(w, 1, w.x1 + dx, w.y1 + dy); setEndRaw(w, 2, w.x2 + dx, w.y2 + dy); }
  else if (r) { r.x = r3(r.x + dx); r.y = r3(r.y + dy); }
  else return;
  commit(); render();
}

// split at the middle; the halves of a curved wall keep its circle
export function splitWall(w) {
  const a = arcOf(w), m = a ? arcPoint(a, .5) : { x: (w.x1 + w.x2) / 2, y: (w.y1 + w.y2) / 2 };
  const mx = r3(m.x), my = r3(m.y);
  if (a) w.arc = r3(a.sg * a.r);
  const b = { ...w, id: uid(), x1: mx, y1: my, label: '' };
  setEndRaw(w, 2, mx, my);
  S.walls.splice(S.walls.indexOf(w) + 1, 0, b);
  commit(); render();
}

export function toggleLock(it) {
  it.locked = !it.locked;
  commit(); render();
}
export function setWallKind(w, kind) {
  w.kind = kind;
  commit(); render();
}
export function flipDoor(w) {
  w.flip = !w.flip;
  commit(); render();
}
// move a door's hinge to its other end, keeping the leaf on the same side
export function swapHinge(w) {
  [w.x1, w.y1, w.x2, w.y2] = [w.x2, w.y2, w.x1, w.y1];
  w.flip = !w.flip;
  commit(); render();
}

export function newPlan() {
  S.items = []; S.walls = []; S.rooms = []; S.sel = null;
  commit(); setTool('wall'); fit();
}
export function resetPlan() {
  S.items = sampleItems(); S.walls = sampleWalls(); S.rooms = sampleRooms(); S.sel = null;
  commit(); setTool('select'); fit();
}
