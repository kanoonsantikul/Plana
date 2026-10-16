// Wall types. A wall is a centreline from (x1,y1) to (x2,y2) with a thickness t.
// Openings sit in the wall line. Kinds marked `arc` can curve: a curved wall's `arc` is
// the signed radius of its centreline (see arcOf in geometry/walls.js); 0 is straight.
export const KINDS = {
  wall:   { n: 'Wall',         t: 0.10, solid: true, arc: true },
  window: { n: 'Window',       t: 0.12, solid: true, open: true, arc: true },
  door:   { n: 'Door',         t: 0.10, solid: false, open: true },
  slider: { n: 'Sliding door', t: 0.06, solid: true, open: true, arc: true },
  screen: { n: 'Glass screen', t: 0.03, solid: true, arc: true },
  rail:   { n: 'Railing',      t: 0.05, solid: true, arc: true },
  column: { n: 'Column',       t: 0.40, solid: true },
  duct:   { n: 'Service duct', t: 0.40, solid: true },
};

// kinds that make up the building shell: they set the plan extents and the dimension strings
export const STRUCT = new Set(['wall', 'door', 'window', 'slider']);
