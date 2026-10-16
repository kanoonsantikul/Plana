import { S, uid, wallById, wallLen, snapV } from '../model/state.js';
import { commit } from '../model/history.js';
import { $, svg } from '../core/dom.js';
import { r3, dist } from '../core/math.js';
import { geo, endOf, setEndRaw, arcFor } from '../geometry/walls.js';
import { snapPoint, draftEnd, riseSnap, roomSnap, edgeMagnet, magnet } from '../view/snapping.js';
import { clientToWorld, zoomAt, panBy } from '../view/viewport.js';
import { render } from '../render/index.js';
import { renderOverlay } from '../render/overlay.js';
import { select, draftTo, finishCurve } from '../actions/edit.js';
import { applyToggles } from '../actions/settings.js';
import { syncWallTool } from '../ui/inspector/tools.js';
import { openDimEdit, applyDimEdit, isDimEditing } from '../ui/dimEditor.js';
import { startHandle, startWallMove, moveWall } from './wallDrag.js';
import { isTransform, moveTransform, lockCursor, unlockCursor } from './transform.js';

/* Pointer input on the plan: the active tool, selection, drags, pan, and two-finger
   pinch zoom. The drag in progress lives in S.drag; its `mode` says what it moves. */
const pointers = new Map();
let pinch = null;

function pinchInfo() {
  const [a, b] = [...pointers.values()];
  return { mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) || 1 };
}

function onPointerDown(e) {
  if (e.button > 1) return;
  const ed = e.target.closest('[data-edit]');
  if (ed && e.button === 0) { e.preventDefault(); openDimEdit(ed.dataset.edit, e.clientX, e.clientY); return; }
  if (isDimEditing()) applyDimEdit();
  try { svg.setPointerCapture(e.pointerId); } catch (_) { /* synthetic pointer */ }
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  $('hint').hidden = true;
  if (pointers.size === 2) {
    if (S.drag && S.drag.changed) commit();
    S.drag = null; pinch = pinchInfo(); return;
  }
  if (pointers.size > 2) return;
  const p = clientToWorld(e.clientX, e.clientY);
  if (e.button === 1) { S.drag = { mode: 'pan', lx: e.clientX, ly: e.clientY }; svg.classList.add('panning'); return; }

  if (S.tool === 'wall') {
    if (S.draft && S.draft.to) {
      // the third click of a curved wall: it bows out to here
      if (!S.typed) bendDraft(p, e);
      finishCurve();
    } else {
      const h = snapPoint(p, S.draft ? S.draft.a : null, null, e);
      S.hover = h;
      if (!S.draft) S.draft = { a: { x: h.x, y: h.y }, b: { x: h.x, y: h.y } };
      else {
        if (!S.typed) S.draft.b = { x: h.x, y: h.y };
        const end = draftEnd();
        if (dist(S.draft.a, end) < 0.005) S.draft = null;
        else draftTo(end);
      }
    }
    S.typed = '';
    S.drag = { mode: 'wdraw', sx: e.clientX, sy: e.clientY };
    render();
    return;
  }
  if (S.tool === 'room') {
    const a = roomSnap(p, e);
    S.rdraft = { a, b: { ...a } }; S.drag = { mode: 'rdraw' }; renderOverlay(); return;
  }
  if (S.tool === 'measure') {
    const q = snapPoint(p, null, null, e);
    S.measure = { a: { x: q.x, y: q.y }, b: { x: q.x, y: q.y } }; S.drag = { mode: 'measure' }; renderOverlay(); return;
  }
  const handle = e.target.closest('[data-handle]');
  if (handle) {
    startHandle(handle.dataset.handle, p, e);
    if (S.drag) { lockCursor(handle.style.cursor); return; }
  }
  const tag = e.target.closest('[data-rid]');
  if (tag) {
    const r = S.rooms.find(o => o.id === tag.dataset.rid);
    if (S.sel !== r.id) select(r.id);
    S.drag = { mode: 'rmove', id: r.id, start: p, x0: r.x, y0: r.y, changed: false, sx: e.clientX, sy: e.clientY };
    return;
  }
  const g = e.target.closest('.item');
  if (g) {
    const target = S.items.find(i => i.id === g.dataset.id);
    if (S.sel !== target.id) select(target.id);
    if (!target.locked) { S.drag = { mode: 'move', id: target.id, ox: p.x - target.x, oy: p.y - target.y, changed: false, sx: e.clientX, sy: e.clientY }; return; }
  } else {
    const wh = e.target.closest('[data-wid]');
    if (wh) {
      const w = wallById(wh.dataset.wid);
      if (S.sel !== w.id) select(w.id);
      startWallMove(w, p, e);
      return;
    }
    if (S.sel) select(null);
  }
  S.drag = { mode: 'pan', lx: e.clientX, ly: e.clientY };
  svg.classList.add('panning');
}

// a curved wall being drawn bows out toward the pointer
function bendDraft(p, e) {
  const d = S.draft;
  d.b = { x: p.x, y: p.y };
  d.rise = riseSnap(d.a, d.to, p, e);
}

// with the Wall tool, the pointer previews the next wall even with no button down
function wallHover(e) {
  const p = clientToWorld(e.clientX, e.clientY);
  if (S.draft && S.draft.to) { bendDraft(p, e); S.hover = null; }
  else {
    S.hover = snapPoint(p, S.draft ? S.draft.a : null, null, e);
    if (S.draft) S.draft.b = { x: S.hover.x, y: S.hover.y };
  }
  renderOverlay();
  syncWallTool();
}

function onPointerMove(e) {
  if (!pointers.has(e.pointerId)) { if (S.tool === 'wall') wallHover(e); return; }
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && pointers.size === 2) {
    const cur = pinchInfo();
    zoomAt(cur.mx, cur.my, pinch.d / cur.d);
    panBy(cur.mx - pinch.mx, cur.my - pinch.my);
    pinch = cur; return;
  }
  const drag = S.drag;
  if (!drag) return;
  const p = clientToWorld(e.clientX, e.clientY);
  const moved = () => drag.changed || Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) >= 3;
  switch (drag.mode) {
    case 'pan': panBy(e.clientX - drag.lx, e.clientY - drag.ly); drag.lx = e.clientX; drag.ly = e.clientY; return;
    case 'wdraw': wallHover(e); return;
    case 'measure': {
      const a = S.measure.a;
      let b = snapPoint(p, a, null, e);
      S.measure.b = { x: b.x, y: b.y }; renderOverlay(); return;
    }
    case 'rdraw': S.rdraft.b = roomSnap(p, e); renderOverlay(); return;
    case 'wmove': if (moved()) moveWall(p, e); return;
    case 'wend': {
      const w = wallById(drag.id); if (!w) return;
      const ex = new Set([w.id, ...drag.fol.map(f => f.id)]);
      const h = snapPoint(p, endOf(w, 3 - drag.k), ex, e);
      S.hover = h;
      setEndRaw(w, drag.k, h.x, h.y);
      drag.fol.forEach(f => setEndRaw(wallById(f.id), f.k, h.x, h.y));
      drag.changed = true; render(); return;
    }
    case 'wbend': {
      // the middle of the wall follows the pointer, square to the line between its ends
      const w = wallById(drag.id); if (!w) return;
      w.arc = arcFor(wallLen(w), riseSnap(endOf(w, 1), endOf(w, 2), p, e));
      drag.ptr = p; drag.changed = true; render(); return;
    }
    case 'rmove': {
      if (!moved()) return;
      const r = S.rooms.find(o => o.id === drag.id);
      r.x = edgeMagnet(drag.x0 + p.x - drag.start.x, r.w, geo.faces.xs, e);
      r.y = edgeMagnet(drag.y0 + p.y - drag.start.y, r.h, geo.faces.ys, e);
      drag.changed = true; render(); return;
    }
    case 'rcorner': {
      const r = S.rooms.find(o => o.id === drag.id), q = roomSnap(p, e), f = drag.fixed;
      r.x = r3(Math.min(f.x, q.x)); r.y = r3(Math.min(f.y, q.y));
      r.w = r3(Math.max(.1, Math.abs(f.x - q.x))); r.h = r3(Math.max(.1, Math.abs(f.y - q.y)));
      drag.changed = true; render(); return;
    }
    case 'rside': {
      // one edge of a room follows the pointer; the opposite edge stays put
      const r = S.rooms.find(o => o.id === drag.id), q = roomSnap(p, e);
      let { x0, y0, x1, y1 } = drag;
      if (drag.side === 'n') y0 = Math.min(q.y, y1 - .1);
      if (drag.side === 's') y1 = Math.max(q.y, y0 + .1);
      if (drag.side === 'w') x0 = Math.min(q.x, x1 - .1);
      if (drag.side === 'e') x1 = Math.max(q.x, x0 + .1);
      r.x = r3(x0); r.y = r3(y0); r.w = r3(x1 - x0); r.h = r3(y1 - y0);
      drag.changed = true; render(); return;
    }
  }
  // furniture: move, or Free Transform from a handle
  const it = S.items.find(i => i.id === drag.id); if (!it) return;
  if (drag.mode === 'move') {
    if (!moved()) return;
    it.x = snapV(p.x - drag.ox); it.y = snapV(p.y - drag.oy);
    if (S.snap && !e.altKey) magnet(it);
  } else if (isTransform(drag)) {
    moveTransform(it, p, e);
  }
  drag.changed = true;
  render();
}

function endPointer(e) {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinch = null;
  if (pointers.size) return;
  const drag = S.drag;
  if (drag) {
    if (drag.mode === 'wdraw' && S.draft) {
      // a drag (rather than a click) draws one wall from press to release; at a curve's end, it bends the curve
      const moved = Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6;
      if (moved && S.draft.to) { finishCurve(); render(); }
      else if (moved && dist(S.draft.a, S.draft.b) >= 0.005) { draftTo(S.draft.b); render(); }
    } else if (drag.mode === 'rdraw' && S.rdraft) {
      const { a, b } = S.rdraft, w = Math.abs(a.x - b.x), h = Math.abs(a.y - b.y);
      S.rdraft = null;
      if (w >= .3 && h >= .3) {
        const r = { id: uid(), name: 'Room ' + (S.rooms.filter(o => !o.outdoor).length + 1), x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: r3(w), h: r3(h), tx: Math.min(.3, w / 2), ty: Math.min(.35, h / 2), outdoor: false };
        S.rooms.push(r);
        S.tool = 'select'; applyToggles();
        S.sel = r.id;
        commit();
      }
      render();
    } else if (drag.mode === 'wend') {
      // a wall dragged down to nothing is deleted
      const w = wallById(drag.id);
      if (w && wallLen(w) < 0.005) { S.walls = S.walls.filter(o => o !== w); S.sel = null; }
      S.hover = null;
      commit(); render();
    } else if (drag.changed) {
      commit();
      render();
    }
  }
  S.drag = null;
  svg.classList.remove('panning');
  unlockCursor();
}

export function initPointer() {
  svg.addEventListener('pointerdown', onPointerDown);
  svg.addEventListener('pointermove', onPointerMove);
  svg.addEventListener('pointerup', endPointer);
  svg.addEventListener('pointercancel', endPointer);
  svg.addEventListener('pointerleave', () => { if (S.tool === 'wall' && !S.drag) { S.hover = null; renderOverlay(); } });
  svg.addEventListener('contextmenu', e => {
    if (S.tool === 'wall' || S.tool === 'room') { e.preventDefault(); S.draft = null; S.typed = ''; S.rdraft = null; render(); }
  });
  svg.addEventListener('wheel', e => {
    e.preventDefault();
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    zoomAt(e.clientX, e.clientY, Math.exp(dy * 0.0015));
  }, { passive: false });
}
