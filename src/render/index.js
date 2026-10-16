import { buildGeo } from '../geometry/walls.js';
import { computeIssues } from '../geometry/issues.js';
import { renderZones } from './zones.js';
import { renderWalls } from './walls.js';
import { renderItems } from './items.js';
import { renderDims } from './dimensions.js';
import { renderOverlay } from './overlay.js';
import { renderHeader } from './header.js';
import { renderSide } from '../ui/inspector/index.js';

// Redraw everything that depends on the plan. Cheap enough to run on every pointer move.
export function render() {
  buildGeo();
  computeIssues();
  renderZones();
  renderWalls();
  renderItems();
  renderDims();
  renderOverlay();
  renderSide();
  renderHeader();
}
