import { layers } from '../core/dom.js';
import { L } from '../core/markup.js';

// 10 cm grid with a heavier line every 50 cm. Drawn once; the toolbar toggles it.
export function drawGrid() {
  let g = '';
  const x0 = -4, x1 = 11, y0 = -4, y1 = 11;
  for (let i = x0 * 10; i <= x1 * 10; i++) g += L(i / 10, y0, i / 10, y1, i % 5 ? 'gmin' : 'gmaj');
  for (let i = y0 * 10; i <= y1 * 10; i++) g += L(x0, i / 10, x1, i / 10, i % 5 ? 'gmin' : 'gmaj');
  layers.grid.innerHTML = g;
}
