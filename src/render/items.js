import { S, nameOf } from '../model/state.js';
import { CAT } from '../model/catalog.js';
import { layers } from '../core/dom.js';
import { f3, R, esc } from '../core/markup.js';

function itemSVG(it) {
  const def = CAT[it.t], hw = it.w / 2, hd = it.d / 2;
  const cls = ['item', it.id === S.sel ? 'sel' : '', S.issues.has(it.id) ? 'bad' : '', it.locked ? 'locked' : ''].join(' ');
  return `<g class="${cls}" data-id="${it.id}" transform="translate(${f3(it.x)} ${f3(it.y)}) rotate(${f3(it.rot)})">` +
    def.draw(it.w, it.d, it.rot) +
    (S.issues.has(it.id) ? R(-hw, -hd, it.w, it.d, 'badfill') : '') +
    R(-hw, -hd, it.w, it.d, 'hit') + '</g>';
}

// furniture: floor pieces on their own layer, the selected piece drawn on top, then name labels
export function renderItems() {
  const floor = [], top = [];
  let selMarkup = '';
  for (const it of S.items) {
    const m = itemSVG(it);
    if (CAT[it.t].floor) floor.push(m);
    else if (it.id === S.sel) selMarkup = m;
    else top.push(m);
  }
  layers.floor.innerHTML = floor.join('');
  layers.items.innerHTML = top.join('') + selMarkup;
  layers.itemLabels.innerHTML = S.labels ? S.items.filter(it => it.t !== 'curtain').map(it => {
    const fs = Math.max(.065, Math.min(.1, Math.min(it.w, it.d) * .22));
    return `<text x="${f3(it.x)}" y="${f3(it.y)}" font-size="${f3(fs)}" class="ilabel halo" text-anchor="middle" dominant-baseline="central">${esc(nameOf(it))}</text>`;
  }).join('') : '';
}
