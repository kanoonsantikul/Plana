import { S } from '../model/state.js';
import { layers } from '../core/dom.js';
import { f3, R, C, TX, esc } from '../core/markup.js';
import { roomNum } from '../geometry/rooms.js';

// where a room's tag sits, kept inside the room
function tagPos(r) {
  return {
    lx: r.x + Math.max(.15, Math.min(r.tx, r.w - .25)),
    ly: r.y + Math.max(.16, Math.min(r.ty, r.h - .2)),
  };
}

// room floors, and the numbered tags with name and area
export function renderZones() {
  let z = '', t = '';
  for (const r of S.rooms) {
    z += R(r.x, r.y, r.w, r.h, r.outdoor ? 'zone out' : 'zone');
    if (r.outdoor) z += R(r.x, r.y, r.w, r.h, 'tiles');
    const { lx, ly } = tagPos(r), n = roomNum(r), area = `${(r.w * r.h).toFixed(2)} m²`;
    const tw = Math.max(r.name.length * .085, .55);
    t += `<g class="rtag" data-rid="${r.id}">`;
    if (n) {
      t += R(lx - .14, ly - .17, tw + .38, .4, 'rtaghit') + C(lx, ly, .12, 'rbadge') +
        `<text x="${f3(lx)}" y="${f3(ly)}" font-size="0.13" class="rnum" text-anchor="middle" dominant-baseline="central">${n}</text>` +
        TX(lx + .2, ly - .005, esc(r.name), .14, 'rlabel halo') + TX(lx + .2, ly + .14, area, .095, 'rsub halo');
    } else {
      t += R(lx - .04, ly - .17, tw + .1, .4, 'rtaghit') + TX(lx, ly - .005, esc(r.name), .14, 'rlabel halo') + TX(lx, ly + .14, area, .095, 'rsub halo');
    }
    t += '</g>';
  }
  layers.zones.innerHTML = z;
  layers.roomLabels.innerHTML = t;
}
