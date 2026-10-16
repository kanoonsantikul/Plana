import { canUndo, canRedo, undo, redo } from '../model/history.js';
import { $ } from '../core/dom.js';
import { zoomCentre, fit } from '../view/viewport.js';
import { setTool, toggle, setUnit } from '../actions/settings.js';
import { newPlan, resetPlan } from '../actions/edit.js';
import { openModal } from './modal.js';

export function updateHistoryButtons() {
  $('undo').disabled = !canUndo();
  $('redo').disabled = !canRedo();
}

// two-step confirm, since the viewer can't show confirm(): the first click arms the
// button for 3 seconds, the second runs the action
function armed(btn, label, action) {
  const t = btn.querySelector('.t');
  if (!btn._title) btn._title = btn.title;
  if (btn.classList.contains('armed')) {
    btn.classList.remove('armed'); clearTimeout(btn._tm);
    if (t) t.textContent = btn._label;
    btn.title = btn._title;
    action(); return;
  }
  btn._label = t ? t.textContent : '';
  btn.classList.add('armed');
  if (t) t.textContent = label;
  btn.title = label;
  btn._tm = setTimeout(() => { btn.classList.remove('armed'); if (t) t.textContent = btn._label; btn.title = btn._title; }, 3000);
}

export function initToolbar() {
  $('toolSelect').onclick = () => setTool('select');
  $('toolWall').onclick = () => setTool('wall');
  $('toolRoom').onclick = () => setTool('room');
  $('toolMeasure').onclick = () => setTool('measure');
  $('undo').onclick = undo;
  $('redo').onclick = redo;
  $('uM').onclick = () => setUnit('m');
  $('uCM').onclick = () => setUnit('cm');
  $('uMM').onclick = () => setUnit('mm');
  $('tGrid').onclick = () => toggle('grid');
  $('tSnap').onclick = () => toggle('snap');
  $('tDims').onclick = () => toggle('dims');
  $('tLabels').onclick = () => toggle('labels');
  $('zIn').onclick = () => zoomCentre(1 / 1.25);
  $('zOut').onclick = () => zoomCentre(1.25);
  $('zFit').onclick = fit;
  $('bExport').onclick = () => openModal('export');
  $('bImport').onclick = () => openModal('import');
  $('bNew').onclick = () => armed($('bNew'), 'Click again for a blank plan', newPlan);
  $('bReset').onclick = () => armed($('bReset'), 'Click again to reset', resetPlan);
}
