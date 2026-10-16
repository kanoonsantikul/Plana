import { S, nameOf, wallName } from '../model/state.js';
import { CAT } from '../model/catalog.js';
import { corners, overlaps } from '../core/math.js';
import { geo } from './walls.js';
import { roomAt } from './rooms.js';

// Clash checks. Fills S.issues (item id → messages) and S.blocked (ids of doors
// whose swing something blocks). Needs buildGeo() to have run.
export function computeIssues() {
  const map = new Map();
  S.blocked = new Set();
  const add = (id, msg) => { if (!map.has(id)) map.set(id, []); const a = map.get(id); if (!a.includes(msg)) a.push(msg); };
  const polys = new Map(S.items.map(it => [it.id, corners(it)]));
  for (const it of S.items) {
    const P = polys.get(it.id);
    if (S.rooms.length && !roomAt(it.x, it.y)) add(it.id, 'Not inside any room');
    if (CAT[it.t].floor) continue;
    if (geo.obstacles.some(o => o.parts.some(q => overlaps(P, q)))) add(it.id, 'Runs into a wall or window');
    geo.doors.forEach(dp => {
      if (overlaps(P, dp.poly)) { add(it.id, `Blocks the ${wallName(dp.w).toLowerCase()} swing`); S.blocked.add(dp.w.id); }
    });
  }
  const solid = S.items.filter(it => !CAT[it.t].floor);
  for (let i = 0; i < solid.length; i++) {
    for (let j = i + 1; j < solid.length; j++) {
      const a = solid[i], b = solid[j];
      if (overlaps(polys.get(a.id), polys.get(b.id))) { add(a.id, `Overlaps ${nameOf(b)}`); add(b.id, `Overlaps ${nameOf(a)}`); }
    }
  }
  S.issues = map;
}
