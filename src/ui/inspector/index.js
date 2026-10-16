import { S, selItem, selWall, selRoom } from '../../model/state.js';
import { side } from '../../core/dom.js';
import { itemHTML, syncItem } from './item.js';
import { wallHTML, syncWall } from './wall.js';
import { roomHTML, syncRoom } from './room.js';
import { wallToolHTML, syncWallTool, roomToolHTML } from './tools.js';
import { summaryHTML } from './summary.js';

// The right-hand panel. It is rebuilt only when what it shows changes, so a field
// keeps focus while the person types; otherwise its values are synced in place.
let sideMode = null;

// force a rebuild on the next render
export const invalidateSide = () => { sideMode = null; };

export function renderSide() {
  const it = selItem(), w = selWall(), r = selRoom();
  const mode = (it ? 'item:' + it.id + ':' + it.locked : w ? 'wall:' + w.id + ':' + w.kind : r ? 'room:' + r.id :
    S.tool === 'wall' ? 'tool:wall:' + S.wallArc : S.tool === 'room' ? 'tool:room' : 'summary') + ':' + S.unit;
  if (mode !== sideMode) {
    sideMode = mode;
    side.innerHTML = it ? itemHTML(it) : w ? wallHTML(w) : r ? roomHTML(r) : S.tool === 'wall' ? wallToolHTML() : S.tool === 'room' ? roomToolHTML() : summaryHTML();
  } else if (!it && !w && !r && S.tool !== 'wall' && S.tool !== 'room') {
    // the summary has no fields, so it is simply redrawn, keeping scroll and the shortcuts' open state
    const open = side.querySelector('details.keys')?.open, scroll = side.scrollTop;
    side.innerHTML = summaryHTML();
    if (open) side.querySelector('details.keys').open = true;
    side.scrollTop = scroll;
  }
  if (it) syncItem(it);
  else if (w) syncWall(w);
  else if (r) syncRoom(r);
  else if (S.tool === 'wall') syncWallTool();
}
