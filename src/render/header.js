import { S } from '../model/state.js';
import { fmt } from '../model/units.js';
import { $ } from '../core/dom.js';
import { innerBox } from '../geometry/walls.js';

// one line describing the plan: inside size, rooms, net area
export function planSummary() {
  const sb = innerBox();
  const net = S.rooms.filter(r => !r.outdoor).reduce((a, r) => a + r.w * r.h, 0);
  return sb
    ? `Plan ${fmt(sb.x1 - sb.x0)} × ${fmt(sb.y1 - sb.y0)} ${S.unit} inside · ${S.rooms.filter(r => !r.outdoor).length} rooms · ${net.toFixed(2)} m² net`
    : 'Blank plan · draw walls with W';
}

// the plan summary beside the logo, and the counts in the title block
export function renderHeader() {
  $('planSub').textContent = planSummary();
  $('tbItems').textContent = S.items.length;
  $('tbWalls').textContent = S.walls.length;
  const n = S.issues.size, tb = $('tbIssues');
  tb.textContent = n; tb.className = n ? 'bad' : '';
}
