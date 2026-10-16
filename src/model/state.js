import { CAT } from './catalog.js';
import { KINDS } from './wallKinds.js';
import { r3 } from '../core/math.js';

// The whole app state. items, walls and rooms are the plan (saved and undoable);
// the rest is view settings and transient interaction state.
export const S = {
  items: [], walls: [], rooms: [], sel: null, tool: 'select',
  grid: true, snap: true, dims: true, labels: true, unit: 'm',
  wallKind: 'wall', wallT: 0.10, wallArc: false,
  vb: { x: -1, y: -1, w: 8, h: 8 },
  measure: null, draft: null, hover: null, typed: '', rdraft: null,
  drag: null, // the pointer drag in progress, if any
  issues: new Map(), blocked: new Set(),
};

export const uid = () => 'i' + Math.random().toString(36).slice(2, 9);

export const selItem = () => S.items.find(i => i.id === S.sel) || null;
export const selWall = () => S.walls.find(w => w.id === S.sel) || null;
export const selRoom = () => S.rooms.find(r => r.id === S.sel) || null;
export const wallById = id => S.walls.find(w => w.id === id);

export const nameOf = it => (it.label && it.label.trim()) || CAT[it.t].n;
export const wallName = w => (w.label && w.label.trim()) || KINDS[w.kind].n;
export const wallLen = w => Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
export const normRot = r => r3(((r % 360) + 360) % 360);
export const snapV = v => S.snap ? r3(Math.round(v / 0.05) * 0.05) : r3(v);

// angle shown to people: counter-clockwise from east, like a protractor
export const angDisp = (dx, dy) => { const a = (-Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360; return Math.round(a * 10) / 10 % 360; };
