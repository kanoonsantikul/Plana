import { S } from '../model/state.js';
import { KINDS } from '../model/wallKinds.js';
import { save } from '../model/storage.js';
import { $, svg, layers } from '../core/dom.js';
import { render } from '../render/index.js';
import { renderItems } from '../render/items.js';
import { fit } from '../view/viewport.js';
import { closeDimEdit } from '../ui/dimEditor.js';

// show the current tool, toggles and unit in the toolbar, and show or hide the plan layers
export function applyToggles() {
  layers.grid.toggleAttribute('hidden', !S.grid);
  layers.dims.toggleAttribute('hidden', !S.dims);
  layers.roomLabels.toggleAttribute('hidden', !S.labels);
  layers.itemLabels.toggleAttribute('hidden', !S.labels);
  $('tGrid').setAttribute('aria-pressed', S.grid);
  $('tSnap').setAttribute('aria-pressed', S.snap);
  $('tDims').setAttribute('aria-pressed', S.dims);
  $('tLabels').setAttribute('aria-pressed', S.labels);
  ['select', 'wall', 'room', 'measure'].forEach(t => $('tool' + t[0].toUpperCase() + t.slice(1)).setAttribute('aria-pressed', S.tool === t));
  $('uM').setAttribute('aria-pressed', S.unit === 'm');
  $('uCM').setAttribute('aria-pressed', S.unit === 'cm');
  $('uMM').setAttribute('aria-pressed', S.unit === 'mm');
  svg.classList.toggle('drawing', S.tool !== 'select');
}

// flip one of the view settings: grid, snap, dims or labels
export function toggle(k) {
  S[k] = !S[k];
  applyToggles();
  if (k === 'labels') renderItems();
  if (k === 'dims') fit();
  save();
}

export function setTool(t) {
  S.tool = t;
  S.draft = null; S.typed = ''; S.hover = null; S.rdraft = null;
  if (t !== 'measure') S.measure = null;
  if (t !== 'select') S.sel = null;
  applyToggles();
  render();
}

// The Wall tool's wall type, and whether it draws curves. When it can no longer draw
// a curve, one being bent goes back to choosing where it ends.
export function setDrawKind(kind) {
  S.wallKind = kind; S.wallT = KINDS[kind].t;
  settleCurve();
  render();
}
export function setDrawArc(on) {
  S.wallArc = on;
  settleCurve();
  render();
}
function settleCurve() {
  const d = S.draft;
  if (d && d.to && !(S.wallArc && KINDS[S.wallKind].arc)) { S.draft = { a: d.a, b: { ...d.to } }; S.typed = ''; }
}

export function setUnit(u) {
  S.unit = u;
  applyToggles();
  closeDimEdit();
  render();
  save();
}
