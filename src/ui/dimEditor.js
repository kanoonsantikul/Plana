import { S, selWall, selRoom, wallLen } from '../model/state.js';
import { UNITS, toU, fromU } from '../model/units.js';
import { commit } from '../model/history.js';
import { $, stage } from '../core/dom.js';
import { r3 } from '../core/math.js';
import { dirOf, setEnd } from '../geometry/walls.js';
import { render } from '../render/index.js';

/* Exact-dimension editor: clicking a blue dimension pill opens a number box on top of it.
   kinds: 'wl' wall length, 'rw' room width, 'rd' room depth */
const dimIn = $('dimIn'), dimUnit = $('dimUnit');
let dimKind = null;

export const isDimEditing = () => dimKind !== null;

export function openDimEdit(kind, cx, cy) {
  let v;
  if (kind === 'wl') { const w = selWall(); if (!w) return; v = wallLen(w); }
  else if (kind === 'rw' || kind === 'rd') { const r = selRoom(); if (!r) return; v = kind === 'rw' ? r.w : r.h; }
  else return;
  const st = stage.getBoundingClientRect();
  dimKind = kind;
  dimIn.value = toU(v);
  dimIn.step = UNITS[S.unit].step;
  dimIn.style.left = dimUnit.style.left = (cx - st.left) + 'px';
  dimIn.style.top = dimUnit.style.top = (cy - st.top) + 'px';
  dimUnit.textContent = S.unit;
  dimIn.hidden = false; dimUnit.hidden = false;
  requestAnimationFrame(() => { dimIn.focus(); dimIn.select(); });
}

export function closeDimEdit() { dimKind = null; dimIn.hidden = true; dimUnit.hidden = true; }

// a wall keeps its start point and direction; a room keeps its top-left corner
export function applyDimEdit() {
  const kind = dimKind;
  const v = fromU(parseFloat(dimIn.value));
  closeDimEdit();
  if (!kind || !isFinite(v) || v < 0.001) return;
  if (kind === 'wl') {
    const w = selWall(); if (!w) return;
    const g = dirOf(w);
    setEnd(w, 2, w.x1 + g.ux * v, w.y1 + g.uy * v);
  } else {
    const r = selRoom(); if (!r) return;
    if (kind === 'rw') r.w = r3(v); else r.h = r3(v);
  }
  commit(); render();
}

export function initDimEditor() {
  dimIn.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); applyDimEdit(); }
    else if (e.key === 'Escape') { e.preventDefault(); closeDimEdit(); }
  });
  dimIn.addEventListener('blur', () => { if (dimKind) applyDimEdit(); });
}
