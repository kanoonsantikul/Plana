import { uid } from './state.js';

// From the drawing's dimensions, which are clear sizes between inside faces.
// Inside faces: x 0 … 5.34, y 0 … 5.46. Partitions 0.10 at x 2.45–2.55 and y 3.85–3.95;
// the living room's balcony-side face is at y 0.98 (4.48 = 2.87 + 0.10 + 1.51).
// Walls are stored on their centrelines, so a 0.10 wall sits 0.05 beyond each face.
// Not dimensioned on the drawing, scaled at 1:50: outside walls 0.10, kitchen slider
// end 1.90, bathroom door 0.70 from 2.70, duct top 5.00, columns.
const SAMPLE_WALLS = [
  ['wall', -0.05, 0.93, -0.05, 5.51, 0.10],
  ['wall', -0.05, 5.51, 0.67, 5.51, 0.10],
  ['door', 0.67, 5.51, 1.67, 5.51, 0.10, { label: 'Entry door' }],          // 0.67 · 1.00
  ['wall', 1.67, 5.51, 5.39, 5.51, 0.10],
  ['wall', 5.39, 5.51, 5.39, -0.05, 0.10],
  ['wall', 5.39, -0.05, 4.69, -0.05, 0.10],                                 // 0.65
  ['window', 4.69, -0.05, 3.09, -0.05, 0.10],                               // 1.60
  ['wall', 3.09, -0.05, 2.50, -0.05, 0.10],                                 // 0.54 from 2.55
  ['wall', 2.50, -0.05, 2.50, 3.05, 0.10],                                  // ends 0.80 short of 3.85
  ['wall', -0.05, 0.93, 0.45, 0.93, 0.10],                                  // 0.45
  ['slider', 0.45, 0.93, 2.50, 0.93, 0.10],                                 // 2.00 to 2.45
  ['slider', -0.05, 3.90, 1.90, 3.90, 0.10],
  ['wall', 1.90, 3.90, 2.50, 3.90, 0.10],
  ['wall', 2.50, 3.90, 2.50, 5.51, 0.10],
  ['wall', 2.50, 3.90, 2.70, 3.90, 0.10],
  ['door', 2.70, 3.90, 3.40, 3.90, 0.10, { label: 'Bathroom door', flip: true }],
  ['wall', 3.40, 3.90, 5.39, 3.90, 0.10],
  ['screen', 4.33, 3.95, 4.33, 5.46, 0.10],                                 // 1.73 from 2.55, 0.10 thick
  ['duct', 5.12, 5.00, 5.12, 5.46, 0.44],                                   // 0.52 · 0.44
  ['rail', 0.13, -0.05, 2.50, -0.05, 0.05],
  ['column', -0.065, -0.50, -0.065, 0.88, 0.39],
  ['column', 5.605, -0.10, 5.605, 1.61, 0.33],
];
// name, x, y, w, h (clear inside size), tag offset x, y, outdoor
const SAMPLE_ROOMS = [
  ['Kitchen', 0, 3.95, 2.45, 1.51, 1.15, 0.23],
  ['Living', 0, 0.98, 2.45, 2.87, 0.95, 0.47],
  ['Master bedroom', 2.55, 0, 2.79, 3.85, 0.45, 2.5],
  ['Bathroom', 2.55, 3.95, 2.79, 1.51, 0.9, 0.45],
  ['Balcony', 0.13, -0.025, 2.32, 0.905, 1.07, 0.47, true],
];
// [type, x, y, w, d, rot, label, locked]
// positions scaled from the drawing, fitted to the inside faces above
const SAMPLE_ITEMS = [
  ['washer', 0.62, 0.45, 0.6, 0.6, 0],
  ['curtain', 1.22, 1.06, 2.36, 0.08, 0],
  ['curtain', 3.95, 0.10, 2.70, 0.08, 0],
  ['bench', 0.25, 1.80, 1.2, 0.5, 270],
  ['desk', 0.25, 3.12, 1.4, 0.5, 270],
  ['chair', 0.74, 2.82, 0.45, 0.48, 90],
  ['chair', 0.74, 3.38, 0.45, 0.48, 90],
  ['shelf', 2.27, 2.055, 1.77, 0.36, 90, 'Shelving unit'],
  ['bedq', 4.05, 1.02, 1.6, 2.0, 90],
  ['wardrobe', 2.71, 1.205, 1.97, 0.32, 270, 'Tall cabinet'],
  ['wardrobe', 5.215, 1.205, 1.97, 0.25, 90, 'Tall cabinet'],
  ['wardrobe', 4.185, 3.54, 0.77, 0.62, 180],
  ['wardrobe', 4.955, 3.54, 0.77, 0.62, 180],
  ['fridge', 0.31, 4.51, 0.62, 0.62, 270],
  ['cabinet', 0.30, 5.17, 0.58, 0.6, 270],
  ['kitchenette', 2.16, 4.705, 1.51, 0.58, 90, '', true],
  ['toilet', 3.78, 5.11, 0.42, 0.70, 180, '', true],
  ['basin', 3.045, 5.24, 0.55, 0.44, 180, '', true],
  ['showertray', 4.86, 4.475, 0.96, 1.05, 0, 'Shower', true],
];

export function sampleWalls() {
  return SAMPLE_WALLS.map(([kind, x1, y1, x2, y2, t, extra]) => ({ id: uid(), kind, x1, y1, x2, y2, t, arc: 0, flip: !!(extra && extra.flip), label: (extra && extra.label) || '' }));
}
export function sampleRooms() {
  return SAMPLE_ROOMS.map(([name, x, y, w, h, tx, ty, outdoor]) => ({ id: uid(), name, x, y, w, h, tx, ty, outdoor: !!outdoor }));
}
export function sampleItems() {
  return SAMPLE_ITEMS.map(([t, x, y, w, d, rot, label, locked]) => ({ id: uid(), t, x, y, w, d, rot, label: label || '', locked: !!locked }));
}
