import { S } from '../../model/state.js';
import { CAT } from '../../model/catalog.js';
import { toU, fmt } from '../../model/units.js';
import { $ } from '../../core/dom.js';
import { esc } from '../../core/markup.js';
import { roomAt, roomNum } from '../../geometry/rooms.js';
import { icon } from '../icons.js';
import { numIn, setValue } from './fields.js';

// inspector for a selected room area
export function roomHTML(r) {
  return `<div class="sec">
      <div class="eyebrow" id="rEyebrow"></div>
      <input class="name-in" id="rName" maxlength="40" aria-label="Room name" value="${esc(r.name)}">
      <p class="help">Drag the room tag to move it, or a corner handle to resize. Edges lock onto wall faces, so the blue dimensions read the clear inside size.</p>
    </div>
    <div class="sec">
      <div class="fields">
        ${numIn('rW', 'Width', 'min="0"').replace('class="num"', 'class="num key"')}${numIn('rD', 'Depth', 'min="0"').replace('class="num"', 'class="num key"')}
        ${numIn('rX', 'Left edge X')}${numIn('rY', 'Top edge Y')}
      </div>
      <label class="check"><input type="checkbox" id="rOut" ${r.outdoor ? 'checked' : ''}> Outdoor area (balcony, terrace, unnumbered)</label>
      <p class="meta" id="rMeta"></p>
    </div>
    <div class="sec"><div class="actions two">
      <button class="sbtn" data-act="dup">${icon('copy')}Copy</button>
      <button class="sbtn danger" data-act="del">${icon('trash')}Delete</button>
    </div></div>`;
}

export function syncRoom(r) {
  setValue('rName', r.name); setValue('rW', toU(r.w)); setValue('rD', toU(r.h)); setValue('rX', toU(r.x)); setValue('rY', toU(r.y));
  const n = roomNum(r);
  $('rEyebrow').textContent = `${n ? 'Room ' + n : 'Outdoor area'} · ${(r.w * r.h).toFixed(2)} m²`;
  const inRoom = S.items.filter(it => roomAt(it.x, it.y) === r && !CAT[it.t].floor);
  const used = inRoom.reduce((a, it) => a + it.w * it.d, 0);
  $('rMeta').textContent = `Clear size ${fmt(r.w)} × ${fmt(r.h)} ${S.unit} · ${inRoom.length} pieces · ${Math.round(used / (r.w * r.h) * 100)}% furnished`;
}
