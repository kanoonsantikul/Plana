import { S } from './state.js';
import { UNITS } from './units.js';
import { cleanItems, cleanWalls, cleanRooms } from './sanitize.js';

// The plan and view settings, kept in this browser's localStorage.
const STORE = 'plana.plan.v3';

export function save() {
  try {
    localStorage.setItem(STORE, JSON.stringify({ items: S.items, walls: S.walls, rooms: S.rooms, grid: S.grid, snap: S.snap, dims: S.dims, labels: S.labels, unit: S.unit }));
  } catch (e) { /* storage unavailable: the plan lives for this session only */ }
}

// fills S from storage; false when there is nothing usable saved
export function load() {
  try {
    const raw = localStorage.getItem(STORE);
    if (!raw) return false;
    const data = JSON.parse(raw);
    const walls = cleanWalls(data.walls), rooms = cleanRooms(data.rooms), items = cleanItems(data.items);
    if (!walls || !rooms || !items) return false;
    S.walls = walls; S.rooms = rooms; S.items = items;
    ['grid', 'snap', 'dims', 'labels'].forEach(k => { if (typeof data[k] === 'boolean') S[k] = data[k]; });
    if (UNITS[data.unit]) S.unit = data.unit;
    return true;
  } catch (e) { return false; }
}
