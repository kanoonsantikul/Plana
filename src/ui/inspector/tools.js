import { S, angDisp } from '../../model/state.js';
import { KINDS } from '../../model/wallKinds.js';
import { toU, fmt } from '../../model/units.js';
import { $ } from '../../core/dom.js';
import { esc } from '../../core/markup.js';
import { dist } from '../../core/math.js';
import { draftEnd, draftRise } from '../../view/snapping.js';
import { numIn, kindChips } from './fields.js';

// panel shown while the Wall tool is active
export function wallToolHTML() {
  const bends = KINDS[S.wallKind].arc, curve = bends && S.wallArc;
  const shape = bends ? `<div class="field"><span>Shape</span><div class="chips">
        <button class="chip" data-shape="line" aria-pressed="${!S.wallArc}" title="Straight walls (C)">Straight</button>
        <button class="chip" data-shape="arc" aria-pressed="${S.wallArc}" title="Curved walls (C)">Curved</button></div></div>` : '';
  return `<div class="sec">
      <div class="eyebrow">Wall tool · W</div>
      <h2 class="ptitle">Draw ${curve ? 'curved ' : ''}walls</h2>
      <p class="help">${curve
        ? 'Click to start, then where the wall ends, then a third time where it bows out to. Or drag out from the end to bend it in one go; <kbd>Esc</kbd> while bending goes back to placing the end.'
        : 'Click to start, then click at every corner. Drag instead to draw one wall.'} Click the last point again, right-click or press <kbd>Esc</kbd> to finish.</p>
    </div>
    <div class="sec">
      <div class="field"><span>Type</span>${kindChips('kind', S.wallKind)}</div>
      ${shape}
      ${numIn('tT', 'Thickness', `min="0" value="${toU(S.wallT)}"`)}
    </div>
    <div class="sec">
      <div class="readout">
        <div><span class="flabel">Length</span><b id="dLen">—</b></div>
        <div><span class="flabel">Angle</span><b id="dAng">—</b></div>
        ${curve ? '<div><span class="flabel">Rise</span><b id="dRise">—</b></div>' : ''}
      </div>
      <p class="help"><b>Exact length:</b> aim the wall, type a number (in ${S.unit}) and press <kbd>Enter</kbd>.${curve ? ' While it bends, type its rise the same way.' : ''}</p>
    </div>
    <div class="sec"><p class="help">Ends lock onto existing wall ends and centrelines. With Snap on, angles lock to 15° steps and lengths to whole centimetres. Hold <kbd>Shift</kbd> for 45° steps, <kbd>Alt</kbd> to turn snapping off.${curve ? ' A curve snaps straight, to a half circle, and to whole centimetres of rise.' : ''}</p></div>`;
}

// live length, angle and rise of the wall being drawn; a curve's length runs straight from end to end
export function syncWallTool() {
  const lb = $('dLen'), ab = $('dAng'), rb = $('dRise'), d = S.draft;
  if (!lb) return;
  if (d) {
    const b = d.to || draftEnd(), a = d.a, len = dist(a, b);
    lb.innerHTML = `${S.typed && !d.to ? esc(S.typed) + '▏' : fmt(len)}<small>${S.unit}</small>`;
    ab.innerHTML = len > 0.003 ? `${angDisp(b.x - a.x, b.y - a.y)}<small>°</small>` : '—';
    if (rb) rb.innerHTML = d.to ? `${S.typed ? esc(S.typed) + '▏' : fmt(Math.abs(draftRise()))}<small>${S.unit}</small>` : '—';
  } else { lb.textContent = '—'; ab.textContent = '—'; if (rb) rb.textContent = '—'; }
}

// panel shown while the Room tool is active
export function roomToolHTML() {
  return `<div class="sec">
      <div class="eyebrow">Room tool · A</div>
      <h2 class="ptitle">Draw a room</h2>
      <p class="help">Drag a rectangle across the floor. Its edges lock onto wall faces, so the area and dimensions are the clear inside size. Name it in the inspector afterwards.</p>
    </div>`;
}
