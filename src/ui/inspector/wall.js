import { S, wallLen, angDisp } from '../../model/state.js';
import { KINDS } from '../../model/wallKinds.js';
import { toU, fmt } from '../../model/units.js';
import { $ } from '../../core/dom.js';
import { esc } from '../../core/markup.js';
import { arcOf } from '../../geometry/walls.js';
import { icon } from '../icons.js';
import { numIn, kindChips, setValue } from './fields.js';

// inspector for a selected wall, window, door or other segment
export function wallHTML(w) {
  const bends = KINDS[w.kind].arc;
  const door = w.kind === 'door' ? `<div class="actions two">
      <button class="sbtn" data-act="flip" title="Swing the leaf to the other side">${icon('flip')}Flip swing</button>
      <button class="sbtn" data-act="swap" title="Move the hinge to the other end">${icon('swap')}Swap hinge</button></div>` : '';
  return `<div class="sec">
      <div class="eyebrow" id="wEyebrow"></div>
      <input class="name-in" id="wName" maxlength="60" aria-label="Wall name" placeholder="${esc(KINDS[w.kind].n)}" value="${esc(w.label || '')}">
      <p class="help">Drag the round handles to stretch or swing either end in any direction${bends ? ', and the diamond in the middle to curve it' : ''}. Joined corners stay joined; hold <kbd>Alt</kbd> to pull a wall free. Click the blue dimension to type an exact length.</p>
    </div>
    <div class="sec">
      <div class="field"><span>Type</span>${kindChips('wkind', w.kind)}</div>
      <div class="fields">
        ${numIn('wL', 'Length', 'min="0"').replace('class="num"', 'class="num key"')}${numIn('wT', 'Thickness', 'min="0"')}
        <label class="field wide"><span>Angle<i>° from east, anticlockwise</i></span><input class="num" id="wA" type="number" step="0.1"></label>
        ${bends ? numIn('wB', 'Rise') + numIn('wR', 'Radius', 'min="0" placeholder="none"') : ''}
        ${numIn('wX1', 'Start X')}${numIn('wY1', 'Start Y')}${numIn('wX2', 'End X')}${numIn('wY2', 'End Y')}
      </div>
      <p class="meta">Length and angle keep the start (filled handle) fixed${bends ? '; on a curve they run straight from end to end' : ''}.</p>
      ${bends ? '<p class="meta">Rise is how far the middle bows out from straight. A negative rise bows to the other side; 0 is straight.</p>' : ''}
      ${door}
    </div>
    <div class="sec"><div class="actions">
      <button class="sbtn" data-act="split" title="Split into two walls at the midpoint" ${w.kind === 'door' ? 'disabled' : ''}>${icon('split')}Split</button>
      <button class="sbtn" data-act="dup" title="Duplicate (Ctrl+D)">${icon('copy')}Copy</button>
      <button class="sbtn danger" data-act="del" title="Delete (Del)">${icon('trash')}Delete</button>
    </div></div>`;
}

export function syncWall(w) {
  const len = wallLen(w), a = arcOf(w);
  setValue('wL', toU(len)); setValue('wT', toU(w.t));
  setValue('wA', angDisp(w.x2 - w.x1, w.y2 - w.y1));
  if (KINDS[w.kind].arc) { setValue('wB', a ? toU(a.rise) : 0); setValue('wR', a ? toU(a.r) : ''); }
  setValue('wX1', toU(w.x1)); setValue('wY1', toU(w.y1)); setValue('wX2', toU(w.x2)); setValue('wY2', toU(w.y2));
  $('wEyebrow').textContent = `${KINDS[w.kind].n} · ${a ? 'curved, ' : ''}${fmt(a ? a.len : len)} ${S.unit} long · ${fmt(w.t)} ${S.unit} thick`;
}
