// Stored geometry is rounded to the micrometre, so a typed length stays exact on a wall at any angle.
export const r3 = n => Math.round(n * 1e6) / 1e6;

export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export const boxOf = poly => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of poly) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return { x0, y0, x1, y1 };
};

// a band of thickness t along the segment a→b
export function segPoly(a, b, t) {
  const len = dist(a, b) || 1e-9, ux = (b.x - a.x) / len, uy = (b.y - a.y) / len, nx = uy * t / 2, ny = -ux * t / 2;
  return [[a.x + nx, a.y + ny], [b.x + nx, b.y + ny], [b.x - nx, b.y - ny], [a.x - nx, a.y - ny]];
}

// footprint corners of a furniture item, rotated about its centre
export function corners(it) {
  const a = it.rot * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), hw = it.w / 2, hd = it.d / 2;
  return [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([px, py]) => [it.x + px * c - py * s, it.y + px * s + py * c]);
}

function project(poly, ax, ay) {
  let mn = Infinity, mx = -Infinity;
  for (const [x, y] of poly) { const p = x * ax + y * ay; if (p < mn) mn = p; if (p > mx) mx = p; }
  return [mn, mx];
}
// separating-axis test for two convex polygons; shapes that only touch (within eps) don't count
export function overlaps(A, B, eps = 0.004) {
  for (const poly of [A, B]) {
    for (let i = 0; i < poly.length; i++) {
      const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length];
      let ax = -(y2 - y1), ay = x2 - x1; const len = Math.hypot(ax, ay);
      if (len < 1e-9) continue; ax /= len; ay /= len;
      const [a0, a1] = project(A, ax, ay), [b0, b1] = project(B, ax, ay);
      if (a1 - b0 <= eps || b1 - a0 <= eps) return false;
    }
  }
  return true;
}
