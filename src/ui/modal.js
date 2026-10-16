import { S } from '../model/state.js';
import { cleanItems, cleanWalls, cleanRooms } from '../model/sanitize.js';
import { commit } from '../model/history.js';
import { $ } from '../core/dom.js';
import { render } from '../render/index.js';
import { fit } from '../view/viewport.js';
import { renderPlanImage, imageSize } from '../export/planImage.js';
import { saveFile, primeSave } from '../export/saveFile.js';

/* Export / import dialog.
   Export: a PNG or JPG drawing of the plan, or the plan as JSON (saved or copied).
   Import: paste or choose JSON from an earlier export. */
const modal = $('modal');
const FORMAT_KEY = 'plana.exportFormat';
let mode = 'export', format = 'png';
let previewURL = null, previewTimer = 0, previewRun = 0;

const fileName = ext => `plana-plan-${new Date().toISOString().slice(0, 10)}.${ext}`;
const planJSON = () => JSON.stringify({ app: 'plana', version: 2, units: 'metres', walls: S.walls, rooms: S.rooms, items: S.items }, null, 1);
const imageOpts = () => ({
  format, longEdge: +$('mSize').value, colours: $('mColours').value,
  grid: $('mGrid').checked, dims: $('mDims').checked, labels: $('mLabels').checked,
});

// a status line under the dialog body: kind is 'err', 'ok' or 'info'
function note(text, kind = 'err') {
  const el = $('mErr');
  el.textContent = text;
  el.className = 'merr' + (kind === 'err' ? '' : ' ' + kind);
}

function clearPreview() {
  previewRun++;
  clearTimeout(previewTimer);
  if (previewURL) { URL.revokeObjectURL(previewURL); previewURL = null; }
  $('mPrev').removeAttribute('src');
}
function updateInfo() {
  const s = imageSize(imageOpts());
  $('mInfo').textContent = s ? `${s.w} × ${s.h} px ${format.toUpperCase()}` : 'Nothing on the plan to export yet.';
}
// a small rendering of the same drawing, redrawn when an option changes
function schedulePreview() {
  updateInfo();
  clearTimeout(previewTimer);
  previewTimer = setTimeout(async () => {
    const run = ++previewRun;
    try {
      const { blob } = await renderPlanImage({ ...imageOpts(), format: 'png', longEdge: 1000 });
      if (run !== previewRun || modal.hidden) return;
      if (previewURL) URL.revokeObjectURL(previewURL);
      previewURL = URL.createObjectURL(blob);
      $('mPrev').src = previewURL;
    } catch (e) {
      if (run === previewRun) note(e.message || 'The preview could not be drawn.');
    }
  }, 80);
}

function showFormat(f) {
  format = f;
  try { localStorage.setItem(FORMAT_KEY, f); } catch (e) { /* not remembered this time */ }
  document.querySelectorAll('#mFormats [data-fmt]').forEach(b => b.setAttribute('aria-pressed', b.dataset.fmt === f));
  const image = f !== 'json';
  $('mImage').hidden = !image;
  $('mArea').hidden = image;
  $('mCopy').hidden = image;
  $('mText').textContent = image
    ? 'A drawing of the whole plan with a title block and scale bar, ready to share or print. Selection and clash marks are left out.'
    : 'Every wall, room and piece of furniture, in metres to the millimetre. Keep the file, then use Import to bring the plan back.';
  $('mOk').textContent = `Save ${f.toUpperCase()}`;
  note('');
  if (image) schedulePreview();
  else { clearPreview(); $('mArea').value = planJSON(); }
}

export function openModal(m) {
  mode = m;
  note('');
  $('mFile').value = '';
  const exporting = m === 'export';
  $('mFormats').hidden = !exporting;
  $('mFileRow').hidden = exporting;
  $('mArea').readOnly = exporting;
  if (exporting) {
    $('mTitle').textContent = 'Export plan';
    // start from what's on screen, minus the grid, which drawings rarely want
    $('mDims').checked = S.dims;
    $('mLabels').checked = S.labels;
    $('mGrid').checked = false;
    let f = 'png';
    try { f = localStorage.getItem(FORMAT_KEY) || 'png'; } catch (e) { /* default */ }
    showFormat(['png', 'jpg', 'json'].includes(f) ? f : 'png');
    primeSave();
  } else {
    $('mTitle').textContent = 'Import plan';
    $('mText').textContent = 'Paste JSON from Export, or choose the saved file. It replaces the current plan; you can undo afterwards.';
    $('mImage').hidden = true;
    $('mCopy').hidden = true;
    $('mArea').hidden = false;
    $('mArea').value = '';
    $('mOk').textContent = 'Load plan';
  }
  modal.hidden = false;
  setTimeout(() => (exporting ? $('mOk') : $('mArea')).focus(), 0);
}
export const closeModal = () => { modal.hidden = true; clearPreview(); };
export const isModalOpen = () => !modal.hidden;

async function saveExport() {
  const btn = $('mOk');
  btn.disabled = true;
  const name = fileName(format);
  try {
    let data;
    if (format === 'json') data = planJSON();
    else {
      note('Drawing the image…', 'info');
      data = (await renderPlanImage(imageOpts())).blob;
    }
    const how = await saveFile(name, data);
    note(how === 'saved' ? `Saved ${name}.` : `Downloading ${name}.`, 'ok');
  } catch (e) {
    const code = e && e.code;
    if (code === 'declined') note('Not saved.', 'info');
    else if (code === 'rate_limited') note('A save is already waiting for an answer. Finish that one, then try again.');
    else if (code === 'too_large') note('That file is too large to save here. Choose a smaller size.');
    else if (code && code !== 'bad_request') {
      note(format === 'json'
        ? 'Saving files isn’t available here. Use Copy JSON instead.'
        : 'Saving files isn’t available here. Right-click the preview and choose Save image.');
    } else note((e && e.message) || 'The file couldn’t be saved.');
  } finally {
    btn.disabled = false;
  }
}

function copyJSON() {
  const area = $('mArea');
  const done = () => { note('Copied to the clipboard.', 'ok'); };
  const fallback = () => { area.focus(); area.select(); note('Copying is blocked here. The text is selected, so press Ctrl+C.'); };
  try { navigator.clipboard.writeText(area.value).then(done, fallback); } catch (err) { fallback(); }
}

function importPlan() {
  let data;
  try { data = JSON.parse($('mArea').value); } catch (err) { note('That text isn’t valid JSON. Paste the full text from Export, including the braces.'); return; }
  const items = cleanItems(data && data.items), walls = cleanWalls(data && data.walls), rooms = cleanRooms(data && data.rooms);
  if (!items && !walls) { note('No walls or furniture found in that JSON. It needs the "walls" and "items" lists from a Plana export.'); return; }
  if (items) S.items = items;
  if (walls) S.walls = walls;
  if (rooms) S.rooms = rooms;
  S.sel = null; commit(); render(); fit(); closeModal();
}

export function initModal() {
  $('mCancel').onclick = closeModal;
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  $('mFormats').addEventListener('click', e => {
    const b = e.target.closest('[data-fmt]');
    if (b && b.dataset.fmt !== format) showFormat(b.dataset.fmt);
  });
  $('mSize').addEventListener('change', updateInfo);
  ['mColours', 'mGrid', 'mDims', 'mLabels'].forEach(id => $(id).addEventListener('change', schedulePreview));
  $('mFile').addEventListener('change', e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => { $('mArea').value = String(rd.result || ''); };
    rd.readAsText(f);
  });
  $('mCopy').onclick = copyJSON;
  $('mOk').onclick = () => { if (mode === 'import') importPlan(); else saveExport(); };
}
