import { S, selItem, selWall, selRoom } from './state.js';
import { save } from './storage.js';

// Undo history: snapshots of the plan (items, walls, rooms), newest last.
let hist = [], hIdx = -1;

// listeners are told after every change; `restored` is true for undo and redo,
// when the plan itself was swapped out and needs redrawing
const listeners = [];
export const onHistoryChange = fn => { listeners.push(fn); };
const notify = restored => listeners.forEach(fn => fn(restored));

const snapshot = () => JSON.stringify({ items: S.items, walls: S.walls, rooms: S.rooms });

// record the current plan as a step, and save it
export function commit() {
  const s = snapshot();
  if (hist[hIdx] === s) return;
  hist = hist.slice(0, hIdx + 1);
  hist.push(s);
  if (hist.length > 150) hist.shift();
  hIdx = hist.length - 1;
  save();
  notify(false);
}
function restore(i) {
  hIdx = i;
  const d = JSON.parse(hist[hIdx]);
  S.items = d.items; S.walls = d.walls; S.rooms = d.rooms;
  if (!selItem() && !selWall() && !selRoom()) S.sel = null;
  save();
  notify(true);
}
export const canUndo = () => hIdx > 0;
export const canRedo = () => hIdx < hist.length - 1;
export const undo = () => { if (canUndo()) restore(hIdx - 1); };
export const redo = () => { if (canRedo()) restore(hIdx + 1); };
