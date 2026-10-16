import { S, selItem, selWall, selRoom, angDisp, wallLen } from '../model/state.js';
import { CAT } from '../model/catalog.js';
import { KINDS } from '../model/wallKinds.js';
import { fmt } from '../model/units.js';
import { layers } from '../core/dom.js';
import { f3, R, C, L, PA, polyD } from '../core/markup.js';
import { dist, boxOf, corners, segPoly } from '../core/math.js';
import { geo, arcOf, arcPoint, arcFor, outline, dimSide } from '../geometry/walls.js';
import { draftEnd, draftRise } from '../view/snapping.js';
import { pxPerM } from '../view/viewport.js';
import { alignedDim, dimPx } from './dimensions.js';
import { transformBoxSVG } from './transformBox.js';

/* The overlay: selection outlines, handles, live dimensions, the wall being drawn,
   the room being drawn and the measuring tape. Sized in screen pixels, so it is
   redrawn on every zoom and pan. */

// distances from a furniture item to the nearest wall or furniture face on each side
function clearanceSVG(it, u) {
  const b = boxOf(corners(it));
  const obs = geo.obstacles.filter(o => o.axis).map(o => o.box);
  S.items.forEach(o => { if (o.id !== it.id && !CAT[o.t].floor) obs.push(boxOf(corners(o))); });
  const best = {};
  const keep = (k, d, at) => { if (d > -0.003 && (!best[k] || d < best[k].d)) best[k] = { d, at }; };
  for (const o of obs) {
    const oy = Math.min(b.y1, o.y1) - Math.max(b.y0, o.y0);
    if (oy > 0.01) {
      const at = (Math.max(b.y0, o.y0) + Math.min(b.y1, o.y1)) / 2;
      if (o.x0 >= b.x1 - 0.003) keep('r', o.x0 - b.x1, at);
      if (o.x1 <= b.x0 + 0.003) keep('l', b.x0 - o.x1, at);
    }
    const ox = Math.min(b.x1, o.x1) - Math.max(b.x0, o.x0);
    if (ox > 0.01) {
      const at = (Math.max(b.x0, o.x0) + Math.min(b.x1, o.x1)) / 2;
      if (o.y0 >= b.y1 - 0.003) keep('d', o.y0 - b.y1, at);
      if (o.y1 <= b.y0 + 0.003) keep('u', b.y0 - o.y1, at);
    }
  }
  const o = { ...dimPx(u), gap: 0, over: 0 };
  let s = '';
  for (const k of Object.keys(best)) {
    const { d, at } = best[k];
    if (d < 0.005 || d > 4) continue;
    if (k === 'r') s += alignedDim(b.x1, at, b.x1 + d, at, 0, o);
    if (k === 'l') s += alignedDim(b.x0 - d, at, b.x0, at, 0, o);
    if (k === 'd') s += alignedDim(at, b.y1, at, b.y1 + d, 0, o);
    if (k === 'u') s += alignedDim(at, b.y0 - d, at, b.y0, 0, o);
  }
  return s;
}
// marks what a wall point snapped to: a square for a wall end, a diamond for a wall line
function snapMarker(h, u) {
  if (!h) return '';
  if (h.kind === 'end') return R(h.x - 6 * u, h.y - 6 * u, 12 * u, 12 * u, 'snapmk');
  if (h.kind === 'line') return PA(`M${f3(h.x)} ${f3(h.y - 7 * u)} L${f3(h.x + 7 * u)} ${f3(h.y)} L${f3(h.x)} ${f3(h.y + 7 * u)} L${f3(h.x - 7 * u)} ${f3(h.y)} Z`, 'snapmk');
  return L(h.x - 6 * u, h.y, h.x + 6 * u, h.y, 'snapmk') + L(h.x, h.y - 6 * u, h.x, h.y + 6 * u, 'snapmk');
}

// the diamond at the middle of a selected wall, dragged to bend it
function bendHandle(p, u) {
  const k = 7.5 * u;
  return `<g data-handle="bend"><title>Drag to curve the wall</title>${C(p.x, p.y, 12 * u, 'handle-hit')}` +
    PA(`M${f3(p.x)} ${f3(p.y - k)} L${f3(p.x + k)} ${f3(p.y)} L${f3(p.x)} ${f3(p.y + k)} L${f3(p.x - k)} ${f3(p.y)} Z`, 'handle') + '</g>';
}
const curveLabel = a => a ? `rise ${fmt(Math.abs(a.rise))} · R ${fmt(a.r)} ${S.unit}` : 'straight';

// a readout by the pointer while dragging
function tip(label, p, u) {
  const fs = 11 * u, pw = label.length * fs * .62 + 14 * u, ph = 20 * u, x = p.x + 16 * u, y = p.y + 18 * u;
  return R(x, y, pw, ph, 'tftip', 3 * u) +
    `<text x="${f3(x + pw / 2)}" y="${f3(y + ph / 2)}" font-size="${f3(fs)}" class="tftiptx" text-anchor="middle" dominant-baseline="central">${label}</text>`;
}

export function renderOverlay() {
  const u = 1 / pxPerM();
  let s = '';
  const it = selItem(), w = selWall(), r = selRoom();
  if (it) {
    s += clearanceSVG(it, u);
    s += transformBoxSVG(it, u);
  }
  if (w) {
    const g = geo.byId.get(w.id);
    s += PA(polyD(g.poly), 'selwall');
    s += alignedDim(w.x1, w.y1, w.x2, w.y2, dimSide(w, 26 * u), dimPx(u, 'wl'));
    s += `<circle data-handle="p1" cx="${f3(w.x1)}" cy="${f3(w.y1)}" r="${f3(14 * u)}" class="handle-hit"/><circle data-handle="p1" cx="${f3(w.x1)}" cy="${f3(w.y1)}" r="${f3(6.5 * u)}" class="handle start"/>`;
    s += `<circle data-handle="p2" cx="${f3(w.x2)}" cy="${f3(w.y2)}" r="${f3(14 * u)}" class="handle-hit"/><circle data-handle="p2" cx="${f3(w.x2)}" cy="${f3(w.y2)}" r="${f3(6.5 * u)}" class="handle"/>`;
    // the diamond at the middle bends the wall, when the wall is long enough on screen to keep it clear of the ends
    if (KINDS[w.kind].arc && wallLen(w) / u >= 56) s += bendHandle(g.arc ? arcPoint(g.arc, .5) : { x: (w.x1 + w.x2) / 2, y: (w.y1 + w.y2) / 2 }, u);
  }
  if (r) {
    s += R(r.x, r.y, r.w, r.h, 'selroom');
    // along the bottom and right inner edges, clear of the room tag
    s += alignedDim(r.x + r.w, r.y + r.h, r.x, r.y + r.h, -22 * u, dimPx(u, 'rw'));
    s += alignedDim(r.x + r.w, r.y, r.x + r.w, r.y + r.h, -22 * u, dimPx(u, 'rd'));
    const handle = (id, x, y, cur) => `<rect data-handle="${id}" x="${f3(x - 12 * u)}" y="${f3(y - 12 * u)}" width="${f3(24 * u)}" height="${f3(24 * u)}" class="handle-hit" style="cursor:${cur}"/>` +
      `<rect data-handle="${id}" x="${f3(x - 5 * u)}" y="${f3(y - 5 * u)}" width="${f3(10 * u)}" height="${f3(10 * u)}" class="handle" style="cursor:${cur}"/>`;
    // side handles drag one edge, when the side is long enough on screen to fit them
    if (r.w / u >= 40) s += handle('side-n', r.x + r.w / 2, r.y, 'ns-resize') + handle('side-s', r.x + r.w / 2, r.y + r.h, 'ns-resize');
    if (r.h / u >= 40) s += handle('side-w', r.x, r.y + r.h / 2, 'ew-resize') + handle('side-e', r.x + r.w, r.y + r.h / 2, 'ew-resize');
    [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]].forEach(([x, y], k) => {
      s += handle('c' + k, x, y, k % 2 ? 'nesw-resize' : 'nwse-resize');
    });
  }
  // while transforming furniture: snap guides, and a size or angle readout by the pointer
  const dr = S.drag;
  if (it && dr && (dr.mode === 'scale' || dr.mode === 'rotate') && dr.id === it.id) {
    (dr.guides || []).forEach(g => { s += L(g.x1, g.y1, g.x2, g.y2, 'tfguide'); });
    s += tip(dr.mode === 'rotate' ? `${Math.round(it.rot * 10) / 10}°` : `W ${fmt(it.w)} × D ${fmt(it.d)} ${S.unit}`, dr.ptr, u);
  }
  // while bending a wall: its rise and radius
  if (w && dr && dr.mode === 'wbend' && dr.ptr) s += tip(curveLabel(arcOf(w)), dr.ptr, u);
  if (S.tool === 'wall' || (S.drag && S.drag.mode === 'wend')) s += snapMarker(S.hover, u);
  if (S.tool === 'wall' && S.draft && S.draft.to) {
    // a curved wall being bent: its outline, the span between its ends, and how far it bows out
    const { a, to, b } = S.draft;
    const cw = { kind: S.wallKind, x1: a.x, y1: a.y, x2: to.x, y2: to.y, t: S.wallT, arc: arcFor(dist(a, to), draftRise()) };
    s += C(a.x, a.y, 4 * u, 'snapmk') + C(to.x, to.y, 4 * u, 'snapmk');
    s += PA(polyD(outline(cw).poly), 'draftw');
    s += alignedDim(a.x, a.y, to.x, to.y, dimSide(cw, 24 * u), dimPx(u));
    const label = S.typed ? `rise ${S.typed}▏ ${S.unit}` : curveLabel(arcOf(cw));
    s += `<text x="${f3(b.x + 12 * u)}" y="${f3(b.y - 14 * u)}" font-size="${f3(12 * u)}" class="drafttx halo">${label}</text>`;
  } else if (S.tool === 'wall' && S.draft) {
    const a = S.draft.a, b = draftEnd(), len = dist(a, b);
    s += C(a.x, a.y, 4 * u, 'snapmk');
    if (len > 0.003) {
      s += PA(polyD(segPoly(a, b, S.wallT)), 'draftw');
      s += alignedDim(a.x, a.y, b.x, b.y, S.wallT / 2 + 24 * u, dimPx(u));
      const label = `${S.typed ? S.typed + '▏' : fmt(len)} ${S.unit} · ${angDisp(b.x - a.x, b.y - a.y)}°`;
      s += `<text x="${f3(b.x + 12 * u)}" y="${f3(b.y - 14 * u)}" font-size="${f3(12 * u)}" class="drafttx halo">${label}</text>`;
    } else if (S.typed) {
      s += `<text x="${f3(a.x + 12 * u)}" y="${f3(a.y - 14 * u)}" font-size="${f3(12 * u)}" class="drafttx halo">${S.typed}▏ ${S.unit}</text>`;
    }
  }
  if (S.rdraft) {
    const x = Math.min(S.rdraft.a.x, S.rdraft.b.x), y = Math.min(S.rdraft.a.y, S.rdraft.b.y);
    const rw = Math.abs(S.rdraft.a.x - S.rdraft.b.x), rh = Math.abs(S.rdraft.a.y - S.rdraft.b.y);
    s += R(x, y, rw, rh, 'selroom');
    s += alignedDim(x, y, x + rw, y, -22 * u, dimPx(u)) + alignedDim(x, y + rh, x, y, -22 * u, dimPx(u));
  }
  if (S.measure) {
    const { a, b } = S.measure, len = dist(a, b), tk = 6 * u;
    if (len > 0.003) {
      const nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len;
      s += L(a.x, a.y, b.x, b.y, 'meas') + L(a.x - nx * tk, a.y - ny * tk, a.x + nx * tk, a.y + ny * tk, 'meas') + L(b.x - nx * tk, b.y - ny * tk, b.x + nx * tk, b.y + ny * tk, 'meas');
      s += `<text x="${f3((a.x + b.x) / 2 + nx * 14 * u)}" y="${f3((a.y + b.y) / 2 + ny * 14 * u)}" font-size="${f3(12 * u)}" class="meastx halo" text-anchor="middle" dominant-baseline="central">${fmt(len)} ${S.unit}</text>`;
    }
  }
  layers.overlay.innerHTML = s;
}
