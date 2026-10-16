import { S } from '../model/state.js';
import { layers } from '../core/dom.js';
import { f3, L, PA, polyD, lineD } from '../core/markup.js';
import { geo, centrePts } from '../geometry/walls.js';

// a line along a wall, `off` to its left, from fraction t0 to t1 of the way along; it bends with a curved wall
function along(w, off, t0, t1, c) {
  const p = centrePts(w, off, t0, t1);
  return p.length === 2 ? L(p[0][0], p[0][1], p[1][0], p[1][1], c) : PA(lineD(p), c);
}

// walls, openings, door swings, and the invisible hit areas for selecting walls
export function renderWalls() {
  let col = '', open = '', st = '', so = '', ha = '', doors = '', hits = '';
  for (const w of S.walls) {
    const g = geo.byId.get(w.id), d = polyD(g.poly), h = w.t / 2;
    switch (w.kind) {
      case 'column': col += PA(d, 'conc'); break;
      case 'duct': {
        const p = g.poly;
        col += PA(d, 'shaft') + L(p[0][0], p[0][1], p[2][0], p[2][1], 'l') + L(p[1][0], p[1][1], p[3][0], p[3][1], 'l');
        break;
      }
      case 'wall': st += PA(d, 'wstroke'); so += PA(d, 'wfill'); ha += PA(d, 'whatch'); break;
      case 'window': open += PA(d, 'glass') + along(w, h / 3, 0, 1, 'glassline') + along(w, -h / 3, 0, 1, 'glassline'); break;
      case 'slider': {
        // two panes, overlapping a little at the middle
        const o = h * .45, ov = Math.min(.05, g.len * .05) / (g.arc ? g.arc.len : g.len);
        open += PA(d, 'glass') + along(w, o, 0, .5 + ov, 'glassline') + along(w, -o, .5 - ov, 1, 'glassline');
        break;
      }
      case 'screen': open += PA(d, 'glass') + along(w, 0, 0, 1, 'glassline'); break;
      case 'rail': open += PA(d, 'railc'); break;
      case 'door': {
        const dg = geo.doors.find(p => p.w === w);
        const bad = S.blocked.has(w.id) ? ' bad' : '';
        const lt = .04;
        doors += PA(polyD(dg.poly), 'swing' + bad);
        doors += PA(`M${f3(dg.cx)} ${f3(dg.cy)} A${f3(dg.len)} ${f3(dg.len)} 0 0 ${dg.sweep} ${f3(dg.ox)} ${f3(dg.oy)}`, 'arc' + bad);
        doors += PA(polyD([[dg.hx, dg.hy], [dg.ox, dg.oy], [dg.ox + dg.ux * lt, dg.oy + dg.uy * lt], [dg.hx + dg.ux * lt, dg.hy + dg.uy * lt]]), 'leaf');
        break;
      }
    }
    hits += `<g class="whit" data-wid="${w.id}"><path d="${d}"/>${along(w, 0, 0, 1, g.arc ? 'wcl' : '')}</g>`;
  }
  // openings sit under the walls so wall ends cover their tips; three wall passes merge the outline
  layers.walls.innerHTML = col + open + st + so + ha;
  layers.doors.innerHTML = doors;
  layers.wallHits.innerHTML = hits;
}
