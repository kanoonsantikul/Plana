import { S } from '../model/state.js';
import { $, svg } from '../core/dom.js';
import { f3 } from '../core/markup.js';
import { buildGeo, fullBox } from '../geometry/walls.js';

/* The visible part of the plan (the SVG viewBox, in metres), zoom and pan. */

// listeners run after every view change; `navigated` is true for zoom and pan
const listeners = [];
export const onViewChange = fn => { listeners.push(fn); };

export function pxPerM() {
  const m = svg.getScreenCTM();
  return m && m.a ? m.a : 100;
}
export function clientToWorld(cx, cy) {
  const pt = svg.createSVGPoint(); pt.x = cx; pt.y = cy;
  const m = svg.getScreenCTM();
  if (!m) return { x: 0, y: 0 };
  const p = pt.matrixTransform(m.inverse());
  return { x: p.x, y: p.y };
}
export function viewCentre() {
  const r = svg.getBoundingClientRect();
  return clientToWorld(r.left + r.width / 2, r.top + r.height / 2);
}

export function applyView(navigated = false) {
  const v = S.vb;
  svg.setAttribute('viewBox', `${f3(v.x)} ${f3(v.y)} ${f3(v.w)} ${f3(v.h)}`);
  updateScale();
  listeners.forEach(fn => fn(navigated));
}
function updateScale() {
  const ppm = pxPerM();
  let len = 1;
  if (ppm * len > 180) len = 0.5;
  if (ppm * len < 50) len = 2;
  $('sbBar').style.width = Math.round(ppm * len) + 'px';
  $('sbTxt').textContent = `${len} m`;
  // 1 m at 96 dpi CSS pixels is 3779.5 px at 1:1
  $('tbScale').textContent = '1:' + Math.max(1, Math.round(3779.5 / ppm));
}

export function zoomAt(cx, cy, f) {
  const v = S.vb;
  const nw = Math.min(60, Math.max(0.4, v.w * f));
  f = nw / v.w;
  const p = clientToWorld(cx, cy);
  v.x = p.x - (p.x - v.x) * f; v.y = p.y - (p.y - v.y) * f; v.w *= f; v.h *= f;
  applyView(true);
}
export function panBy(dx, dy) {
  const s = pxPerM();
  S.vb.x -= dx / s; S.vb.y -= dy / s;
  applyView(true);
}
export function zoomCentre(f) {
  const r = svg.getBoundingClientRect();
  zoomAt(r.left + r.width / 2, r.top + r.height / 2, f);
}
// frame the whole plan, leaving room for the dimension strings when they're shown
export function fit() {
  buildGeo();
  const b = fullBox();
  if (!b) { S.vb = { x: -1, y: -1, w: 8, h: 8 }; applyView(); return; }
  const m = S.dims ? 1.15 : 0.45;
  S.vb = { x: b.x0 - m, y: b.y0 - m - .3, w: b.x1 - b.x0 + 2 * m, h: b.y1 - b.y0 + 2 * m + .3 };
  applyView();
}
