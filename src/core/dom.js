// DOM lookups shared across modules. Module scripts run after the document is parsed.
export const $ = id => document.getElementById(id);

export const svg = $('plan');
export const stage = $('stage');
export const side = $('side');

// SVG layers of the plan, bottom to top (see index.html)
export const layers = {
  zones: $('zones'),
  floor: $('floorItems'),
  grid: $('grid'),
  walls: $('walls'),
  doors: $('doors'),
  wallHits: $('wallHits'),
  items: $('items'),
  roomLabels: $('roomLabels'),
  itemLabels: $('itemLabels'),
  dims: $('dims'),
  overlay: $('overlay'),
};
