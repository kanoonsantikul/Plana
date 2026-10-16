// Line icons on a 24-unit grid, stroked with currentColor by the button styles.
const ICONS = {
  select: '<path d="M5 3l14 8-6.2 1.6L10 19z"/>',
  wall: '<path d="M3 6h18v12H3zM3 12h18M9 6v6M15 12v6"/>',
  room: '<path d="M4 4h16v16H4z" stroke-dasharray="3 2.4"/><path d="M8 15l3-3 2 2 3-3"/>',
  ruler: '<path d="M3 16L16 3l5 5L8 21z"/><path d="M7 12l2 2M10 9l2 2M13 6l2 2"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 010 11H11"/>',
  redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 000 11H13"/>',
  grid: '<path d="M4 4h16v16H4zM4 9.3h16M4 14.7h16M9.3 4v16M14.7 4v16"/>',
  magnet: '<path d="M6 3v8a6 6 0 0012 0V3h-4v8a2 2 0 01-4 0V3z"/><path d="M6 7h4M14 7h4"/>',
  dims: '<path d="M3 7v10M21 7v10M3 12h18M7 9l-3 3 3 3M17 9l3 3-3 3"/>',
  tag: '<path d="M3 12V3h9l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.4"/>',
  zoomout: '<circle cx="11" cy="11" r="7"/><path d="M8 11h6M16.5 16.5L21 21"/>',
  zoomin: '<circle cx="11" cy="11" r="7"/><path d="M8 11h6M11 8v6M16.5 16.5L21 21"/>',
  fit: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
  export: '<path d="M12 15V3M7 8l5-5 5 5M4 14v6h16v-6"/>',
  import: '<path d="M12 3v12M7 10l5 5 5-5M4 14v6h16v-6"/>',
  newplan: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/>',
  reset: '<path d="M4 4v6h6"/><path d="M5.5 15a8 8 0 101.4-8.3L4 10"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  rotl: '<path d="M4 4v6h6"/><path d="M5.5 15a8 8 0 101.4-8.3L4 10"/>',
  rotr: '<path d="M20 4v6h-6"/><path d="M18.5 15a8 8 0 11-1.4-8.3L20 10"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="1"/><path d="M4 16V4h12"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="1"/><path d="M8 11V7a4 4 0 018 0v4"/>',
  unlock: '<rect x="5" y="11" width="14" height="10" rx="1"/><path d="M8 11V7a4 4 0 017.5-2"/>',
  split: '<path d="M3 12h7M14 12h7M12 4v16"/>',
  flip: '<path d="M4 20V11a7 7 0 017-7h9"/><path d="M16 1l4 3-4 3"/>',
  swap: '<path d="M4 8h14l-3-3M20 16H6l3 3"/>',
};

export const icon = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>`;

// put the named icon at the start of every element with a data-icon attribute
export function decorateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(b => { b.insertAdjacentHTML('afterbegin', icon(b.dataset.icon)); });
}
