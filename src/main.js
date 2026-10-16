// Plana entry point: wires the modules together and loads the plan.
import { S } from './model/state.js';
import { load } from './model/storage.js';
import { sampleWalls, sampleRooms, sampleItems } from './model/samples.js';
import { commit, onHistoryChange } from './model/history.js';
import { stage } from './core/dom.js';
import { applyView, fit, onViewChange } from './view/viewport.js';
import { render } from './render/index.js';
import { renderOverlay } from './render/overlay.js';
import { drawGrid } from './render/grid.js';
import { applyToggles } from './actions/settings.js';
import { decorateIcons } from './ui/icons.js';
import { initToolbar, updateHistoryButtons } from './ui/toolbar.js';
import { initTheme } from './ui/theme.js';
import { buildLibrary, initLibrary } from './ui/library.js';
import { initInspector } from './ui/inspector/events.js';
import { initDimEditor, closeDimEdit } from './ui/dimEditor.js';
import { initModal } from './ui/modal.js';
import { initKeyboard } from './ui/keyboard.js';
import { initPointer } from './interaction/pointer.js';

// redraw after undo and redo; keep the undo buttons current
onHistoryChange(restored => {
  if (restored) render();
  updateHistoryButtons();
});
// the overlay is sized in screen pixels, so it follows every zoom and pan; the
// exact-dimension box is placed in screen pixels too, so it closes when the view moves
onViewChange(navigated => {
  if (navigated) closeDimEdit();
  renderOverlay();
});

decorateIcons();
initToolbar();
initTheme();
initLibrary();
initInspector();
initDimEditor();
initModal();
initKeyboard();
initPointer();

if (!load()) { S.walls = sampleWalls(); S.rooms = sampleRooms(); S.items = sampleItems(); }
drawGrid();
buildLibrary();
applyToggles();
commit();
updateHistoryButtons();
render();
new ResizeObserver(() => applyView()).observe(stage);
requestAnimationFrame(fit);
