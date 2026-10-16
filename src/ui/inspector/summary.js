import { S, nameOf } from '../../model/state.js';
import { CAT } from '../../model/catalog.js';
import { KINDS } from '../../model/wallKinds.js';
import { fmt } from '../../model/units.js';
import { esc } from '../../core/markup.js';
import { roomAt, roomNum } from '../../geometry/rooms.js';
import { centreLen } from '../../geometry/walls.js';
import { icon } from '../icons.js';

// panel shown when nothing is selected: walls, rooms, clashes, placed items, shortcuts
export function summaryHTML() {
  const solid = S.items.filter(it => !CAT[it.t].floor);
  const net = S.rooms.filter(r => !r.outdoor).reduce((a, r) => a + r.w * r.h, 0);
  const rooms = S.rooms.map(r => {
    const inRoom = S.items.filter(it => roomAt(it.x, it.y) === r);
    const used = inRoom.filter(it => !CAT[it.t].floor).reduce((a, it) => a + it.w * it.d, 0);
    const area = r.w * r.h, pct = Math.min(100, Math.round(used / area * 100)), n = roomNum(r);
    return `<li><button class="rrow" data-sel="${r.id}"><span class="dot${n ? '' : ' hollow'}">${n || '·'}</span><span class="rm-name">${esc(r.name)}</span><span class="rm-area">${area.toFixed(2)} m²</span>
      <span class="fillbar" aria-hidden="true"><i style="width:${pct}%"></i></span>
      <span class="rfoot">${fmt(r.w)} × ${fmt(r.h)} ${S.unit} · ${pct}% furnished</span></button></li>`;
  }).join('');
  const counts = {};
  S.walls.forEach(w => { counts[w.kind] = (counts[w.kind] || 0) + 1; });
  const total = S.walls.filter(w => w.kind === 'wall').reduce((a, w) => a + centreLen(w), 0);
  const kindLine = Object.keys(KINDS).filter(k => counts[k]).map(k => `${counts[k]} ${KINDS[k].n.toLowerCase()}${counts[k] > 1 ? 's' : ''}`).join(' · ');
  const issueList = S.items.filter(it => S.issues.has(it.id));
  const issues = issueList.length
    ? `<ul class="issues">${issueList.map(it => `<li><button data-sel="${it.id}"><b>${esc(nameOf(it))}</b><span>${esc(S.issues.get(it.id).join(' · '))}</span></button></li>`).join('')}</ul>`
    : `<p class="okline">No clashes. Every piece clears the walls, the door swings and the other furniture.</p>`;
  const groups = [...S.rooms, null].map(r => {
    const list = S.items.filter(it => roomAt(it.x, it.y) === r);
    if (!list.length) return '';
    const n = r ? roomNum(r) : 0;
    return `<div><h4>${r ? (n ? n + ' · ' : '') + esc(r.name) : 'Not in a room'}</h4><ul>${list.map(it =>
      `<li><button data-sel="${it.id}" class="${S.issues.has(it.id) ? 'bad' : ''}"><span>${esc(nameOf(it))}${it.locked ? ' · fixed' : ''}</span><em>${fmt(it.w)}×${fmt(it.d)}</em></button></li>`).join('')}</ul></div>`;
  }).join('');
  return `<div class="sec"><h3>Walls <span class="n">${S.walls.length} segments · ${fmt(total)} ${S.unit} of wall</span></h3>
      <p class="wstats">${kindLine || 'No walls yet.'}</p>
      <div class="actions two"><button class="sbtn" data-act="toolWall">${icon('wall')}Draw walls</button><button class="sbtn" data-act="toolRoom">${icon('room')}Draw a room</button></div>
    </div>
    <div class="sec"><h3>Rooms <span class="n">${net.toFixed(2)} m² net inside</span></h3>${rooms ? `<ul class="rooms">${rooms}</ul>` : '<p class="meta">No rooms yet. Use the Room tool to mark one.</p>'}</div>
    <div class="sec"><h3>Clashes <span class="n">${issueList.length}</span></h3>${issues}</div>
    <div class="sec"><h3>Placed items <span class="n">${solid.length} pieces</span></h3><div class="plist">${groups || '<p class="meta">Nothing placed yet. Drag a piece from the library.</p>'}</div></div>
    <div class="sec"><details class="keys"><summary>Shortcuts</summary><dl>
      <dt><kbd>W</kbd> <kbd>A</kbd> <kbd>M</kbd> <kbd>V</kbd></dt><dd>Wall, room, measure, select</dd>
      <dt><kbd>C</kbd></dt><dd>Straight or curved walls, with the Wall tool</dd>
      <dt>type + <kbd>Enter</kbd></dt><dd>Exact length while drawing a wall, or rise while bending one</dd>
      <dt><kbd>Esc</kbd></dt><dd>Finish the wall chain, or deselect</dd>
      <dt><kbd>Shift</kbd> / <kbd>Alt</kbd></dt><dd>45° steps / no snapping, pull a wall free</dd>
      <dt>Drag border</dt><dd>Resize furniture; <kbd>Shift</kbd> on a corner keeps proportions, <kbd>Alt</kbd> resizes from the centre</dd>
      <dt>Drag outside</dt><dd>Rotate furniture; <kbd>Shift</kbd> for 15° steps; <kbd>Esc</kbd> cancels</dd>
      <dt><kbd>R</kbd> / <kbd>⇧R</kbd></dt><dd>Rotate selection 90°</dd>
      <dt><kbd>←↑→↓</kbd></dt><dd>Nudge 1 mm, with Shift 10 mm</dd>
      <dt><kbd>Ctrl D</kbd> / <kbd>Del</kbd></dt><dd>Duplicate / delete selection</dd>
      <dt><kbd>Ctrl Z</kbd></dt><dd>Undo, add Shift to redo</dd>
      <dt><kbd>G S D L</kbd></dt><dd>Grid, snap, dimensions, room and furniture labels</dd>
      <dt><kbd>+ − 0</kbd></dt><dd>Zoom in, out, fit</dd>
    </dl></details></div>`;
}
