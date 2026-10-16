import { S, selItem, selWall, selRoom, normRot } from '../../model/state.js';
import { fromU } from '../../model/units.js';
import { commit } from '../../model/history.js';
import { side } from '../../core/dom.js';
import { r3 } from '../../core/math.js';
import { dirOf, setEnd, arcOf, arcFor } from '../../geometry/walls.js';
import { render } from '../../render/index.js';
import { renderOverlay } from '../../render/overlay.js';
import { select, duplicate, remove, rotateBy, splitWall, toggleLock, setWallKind, flipDoor, swapHinge } from '../../actions/edit.js';
import { applyToggles, setTool, setDrawKind, setDrawArc } from '../../actions/settings.js';
import { invalidateSide } from './index.js';

// Typing in a field updates the plan live; the undo step is recorded on change (blur or Enter).
function onInput(e) {
  const t = e.target, v = parseFloat(t.value), m = isFinite(v) ? fromU(v) : NaN;
  const it = selItem(), w = selWall(), r = selRoom();
  if (t.id === 'tT') { if (m > 0) S.wallT = r3(m); renderOverlay(); return; }
  if (it) {
    switch (t.id) {
      case 'fName': it.label = t.value.slice(0, 60); break;
      case 'fW': if (m >= .02) it.w = r3(m); else return; break;
      case 'fD': if (m >= .02) it.d = r3(m); else return; break;
      case 'fX': if (isFinite(m)) it.x = r3(m); else return; break;
      case 'fY': if (isFinite(m)) it.y = r3(m); else return; break;
      case 'fR': if (isFinite(v)) it.rot = normRot(v); else return; break;
      default: return;
    }
  } else if (w) {
    const g = dirOf(w);
    switch (t.id) {
      case 'wName': w.label = t.value.slice(0, 60); break;
      case 'wL': if (m >= .005) setEnd(w, 2, w.x1 + g.ux * m, w.y1 + g.uy * m); else return; break;
      case 'wT': if (m >= .005) w.t = r3(m); else return; break;
      case 'wA': if (isFinite(v)) { const a = -v * Math.PI / 180; setEnd(w, 2, w.x1 + Math.cos(a) * g.len, w.y1 + Math.sin(a) * g.len); } else return; break;
      // a curve's rise, or its radius: that keeps the side it bows to, or bows a straight wall to its left
      case 'wB': if (isFinite(m)) w.arc = arcFor(g.len, m); else return; break;
      case 'wR': if (m > 0) { const a = arcOf(w); w.arc = r3((a ? a.sg : 1) * Math.max(m, g.len / 2)); } else return; break;
      case 'wX1': if (isFinite(m)) setEnd(w, 1, m, w.y1); else return; break;
      case 'wY1': if (isFinite(m)) setEnd(w, 1, w.x1, m); else return; break;
      case 'wX2': if (isFinite(m)) setEnd(w, 2, m, w.y2); else return; break;
      case 'wY2': if (isFinite(m)) setEnd(w, 2, w.x2, m); else return; break;
      default: return;
    }
  } else if (r) {
    switch (t.id) {
      case 'rName': r.name = t.value.slice(0, 40) || 'Room'; break;
      case 'rW': if (m >= .05) r.w = r3(m); else return; break;
      case 'rD': if (m >= .05) r.h = r3(m); else return; break;
      case 'rX': if (isFinite(m)) r.x = r3(m); else return; break;
      case 'rY': if (isFinite(m)) r.y = r3(m); else return; break;
      default: return;
    }
  } else return;
  render();
}

function onChange(e) {
  const t = e.target, r = selRoom();
  if (t.id === 'rOut' && r) { r.outdoor = t.checked; commit(); render(); return; }
  if (t.id === 'tT') return;
  if (/^(f|w|r)[A-Z]/.test(t.id)) commit();
  render();
}

function onClick(e) {
  const sel = e.target.closest('[data-sel]');
  if (sel) { if (S.tool !== 'select') { S.tool = 'select'; applyToggles(); } select(sel.dataset.sel); return; }
  const chip = e.target.closest('[data-kind]');
  if (chip) { invalidateSide(); setDrawKind(chip.dataset.kind); return; }
  const shape = e.target.closest('[data-shape]');
  if (shape) { setDrawArc(shape.dataset.shape === 'arc'); return; }
  const wchip = e.target.closest('[data-wkind]');
  if (wchip) { const w = selWall(); if (w) setWallKind(w, wchip.dataset.wkind); return; }
  const btn = e.target.closest('[data-act]'); if (!btn) return;
  const it = selItem(), w = selWall();
  switch (btn.dataset.act) {
    case 'rotL': rotateBy(-90); break;
    case 'rotR': rotateBy(90); break;
    case 'dup': duplicate(); break;
    case 'del': remove(); break;
    case 'lock': if (it) toggleLock(it); break;
    case 'split': if (w) splitWall(w); break;
    case 'flip': if (w) flipDoor(w); break;
    case 'swap': if (w) swapHinge(w); break;
    case 'toolWall': setTool('wall'); break;
    case 'toolRoom': setTool('room'); break;
  }
}

export function initInspector() {
  side.addEventListener('input', onInput);
  side.addEventListener('change', onChange);
  side.addEventListener('click', onClick);
}
