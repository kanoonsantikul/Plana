import { f3, R } from '../core/markup.js';

/* The furniture transform box, drawn like Photoshop's Free Transform: a solid outline
   with eight handles, the border itself draggable, and a rotate zone just outside. */

// handle id → which sides it moves, as signs along the item's local x and y
export const HANDLES = { nw: [-1, -1], n: [0, -1], ne: [1, -1], e: [1, 0], se: [1, 1], s: [0, 1], sw: [-1, 1], w: [-1, 0] };

const RESIZE = ['ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize'];
// the resize cursor for pulling in screen direction `deg` (y down)
export const resizeCursor = deg => RESIZE[Math.round((((deg % 180) + 180) % 180) / 45) % 4];

// a curved double arrow that bulges towards `deg`, like Photoshop's rotate cursor;
// black with a white outline so it reads on every theme
export function rotateCursor(deg) {
  const arc = 'M5 15A7.5 7.5 0 0 1 19 15';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g transform="rotate(${Math.round(deg + 90)} 12 12)">` +
    `<path d="${arc}" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>` +
    `<path d="${arc}" fill="none" stroke="#111" stroke-width="1.6"/>` +
    '<path d="M3.7 18.3L2.7 14.1L7.3 15.9zM20.3 18.3L21.3 14.1L16.7 15.9z" fill="#111" stroke="#fff" stroke-width="1" stroke-linejoin="round"/></g></svg>';
  return `url('data:image/svg+xml,${encodeURIComponent(svg)}') 12 12, alias`;
}

const zone = (x, y, w, h, handle, cursor) =>
  `<rect data-handle="${handle}" x="${f3(x)}" y="${f3(y)}" width="${f3(Math.max(w, .001))}" height="${f3(Math.max(h, .001))}" class="handle-hit" style="cursor:${cursor}"/>`;

// u = metres per screen pixel, so handles keep their size at any zoom
export function transformBoxSVG(it, u) {
  const hw = it.w / 2, hd = it.d / 2;
  const t = it.rot * Math.PI / 180, c = Math.cos(t), s = Math.sin(t);
  // screen direction of a local direction, for choosing cursors
  const deg = (lx, ly) => Math.atan2(lx * s + ly * c, lx * c - ly * s) * 180 / Math.PI;
  let out = `<g transform="translate(${f3(it.x)} ${f3(it.y)}) rotate(${f3(it.rot)})">`;
  if (!it.locked) {
    const b = 5 * u, o = 28 * u;
    // rotate zones: a band from just outside the border to 28 px out, split by side and corner
    for (const [sx, sy] of Object.values(HANDLES)) {
      const x = sx < 0 ? -hw - o : sx > 0 ? hw + b : -hw, w = sx ? o - b : it.w;
      const y = sy < 0 ? -hd - o : sy > 0 ? hd + b : -hd, h = sy ? o - b : it.d;
      out += zone(x, y, w, h, 'rot', rotateCursor(deg(sx, sy)));
    }
    // the border: each side can be dragged anywhere along its length, while the item
    // is big enough on screen to leave room inside for moving it
    const wide = it.w / u >= 24, deep = it.d / u >= 24;
    if (deep) {
      out += zone(-hw, -hd - b, it.w, 2 * b, 't-n', resizeCursor(deg(0, -1)));
      out += zone(-hw, hd - b, it.w, 2 * b, 't-s', resizeCursor(deg(0, 1)));
    }
    if (wide) {
      out += zone(-hw - b, -hd, 2 * b, it.d, 't-w', resizeCursor(deg(-1, 0)));
      out += zone(hw - b, -hd, 2 * b, it.d, 't-e', resizeCursor(deg(1, 0)));
    }
  }
  out += R(-hw, -hd, it.w, it.d, 'tfbox');
  if (!it.locked) {
    // handles: side handles only when the side is long enough on screen to fit them
    const hh = Math.min(9 * u, Math.max(3 * u, Math.min(it.w, it.d) / 4)), vh = 4 * u;
    for (const [id, [sx, sy]] of Object.entries(HANDLES)) {
      if (!sx && it.w / u < 36) continue;
      if (!sy && it.d / u < 36) continue;
      const x = sx * hw, y = sy * hd, cur = resizeCursor(deg(sx, sy));
      out += zone(x - hh, y - hh, 2 * hh, 2 * hh, 't-' + id, cur) +
        `<rect data-handle="t-${id}" x="${f3(x - vh)}" y="${f3(y - vh)}" width="${f3(2 * vh)}" height="${f3(2 * vh)}" class="handle" style="cursor:${cur}"/>`;
    }
  }
  return out + '</g>';
}
