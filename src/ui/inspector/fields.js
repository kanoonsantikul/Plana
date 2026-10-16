import { S } from '../../model/state.js';
import { UNITS } from '../../model/units.js';
import { KINDS } from '../../model/wallKinds.js';
import { $ } from '../../core/dom.js';

// a number field labelled with the current unit
export const numIn = (id, label, extra = '') => `<label class="field"><span>${label}<i>${S.unit}</i></span><input class="num" id="${id}" type="number" step="${UNITS[S.unit].step}" ${extra}></label>`;

// one chip per wall type; `attr` names the data attribute the click handler reads
export function kindChips(attr, current) {
  return `<div class="chips">${Object.entries(KINDS).map(([k, v]) => `<button class="chip" data-${attr}="${k}" aria-pressed="${current === k}">${v.n}</button>`).join('')}</div>`;
}

// write a field's value, unless the person is typing in it
export function setValue(id, v) {
  const el = $(id);
  if (el && document.activeElement !== el) el.value = v;
}
