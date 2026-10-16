import { S } from '../model/state.js';

// the room whose rectangle contains the point, if any
export const roomAt = (x, y) => S.rooms.find(r => x >= r.x - 1e-6 && x <= r.x + r.w + 1e-6 && y >= r.y - 1e-6 && y <= r.y + r.h + 1e-6) || null;

// the number on a room's tag; outdoor areas are unnumbered (0)
export const roomNum = r => r.outdoor ? 0 : S.rooms.filter(o => !o.outdoor).indexOf(r) + 1;
