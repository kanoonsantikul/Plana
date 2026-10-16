import { S, nameOf } from '../../model/state.js';
import { CAT } from '../../model/catalog.js';
import { toU, fmt } from '../../model/units.js';
import { $ } from '../../core/dom.js';
import { esc } from '../../core/markup.js';
import { roomAt } from '../../geometry/rooms.js';
import { icon } from '../icons.js';
import { numIn, setValue } from './fields.js';

// inspector for a selected piece of furniture
export function itemHTML(it) {
  const dis = it.locked ? 'disabled' : '';
  return `<div class="sec">
      <div class="eyebrow" id="fEyebrow"></div>
      <input class="name-in" id="fName" maxlength="60" aria-label="Item name" value="${esc(nameOf(it))}">
      <div class="status" id="fStatus"></div>
      ${it.locked ? '' : '<p class="help">Drag the border or a handle to resize; <kbd>Shift</kbd> keeps proportions, <kbd>Alt</kbd> resizes from the centre. Drag just outside the box to rotate; <kbd>Shift</kbd> for 15° steps. <kbd>Esc</kbd> mid-drag cancels.</p>'}
    </div>
    <div class="sec">
      <div class="fields">
        ${numIn('fW', 'Width', `min="0" ${dis}`)}${numIn('fD', 'Depth', `min="0" ${dis}`)}
        ${numIn('fX', 'Centre X', dis)}${numIn('fY', 'Centre Y', dis)}
        <div class="field wide"><span>Rotation<i>°</i></span>
          <div class="rotrow">
            <button class="sbtn" data-act="rotL" title="Rotate 90° back (Shift+R)" aria-label="Rotate 90 degrees back" ${dis}>${icon('rotl')}</button>
            <input class="num" id="fR" type="number" step="15" aria-label="Rotation in degrees" ${dis}>
            <button class="sbtn" data-act="rotR" title="Rotate 90° (R)" aria-label="Rotate 90 degrees" ${dis}>${icon('rotr')}</button>
          </div>
        </div>
      </div>
      <p class="meta" id="fMeta"></p>
    </div>
    <div class="sec"><div class="actions">
      <button class="sbtn" data-act="dup" title="Duplicate (Ctrl+D)">${icon('copy')}Copy</button>
      <button class="sbtn" data-act="lock">${icon(it.locked ? 'unlock' : 'lock')}${it.locked ? 'Unlock' : 'Lock'}</button>
      <button class="sbtn danger" data-act="del" title="Delete (Del)" ${dis}>${icon('trash')}Delete</button>
    </div></div>`;
}

export function syncItem(it) {
  setValue('fName', nameOf(it));
  setValue('fW', toU(it.w)); setValue('fD', toU(it.d)); setValue('fX', toU(it.x)); setValue('fY', toU(it.y));
  setValue('fR', Math.round(it.rot * 10) / 10);
  const room = roomAt(it.x, it.y);
  $('fEyebrow').textContent = `${CAT[it.t].n} · ${room ? room.name : 'no room'}`;
  const st = $('fStatus'), list = S.issues.get(it.id);
  if (list) { st.className = 'status bad'; st.textContent = list.join(' · '); }
  else if (it.locked) { st.className = 'status lock'; st.textContent = 'Locked fixture. Unlock it to move or resize.'; }
  else { st.className = 'status ok'; st.textContent = 'Clear of walls, doors and other furniture'; }
  $('fMeta').textContent = `Footprint ${fmt(it.w)} × ${fmt(it.d)} ${S.unit} · ${(it.w * it.d).toFixed(2)} m²`;
}
