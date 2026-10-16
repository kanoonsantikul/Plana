import { S } from '../model/state.js';
import { undo, redo } from '../model/history.js';
import { zoomCentre, fit } from '../view/viewport.js';
import { render } from '../render/index.js';
import { renderOverlay } from '../render/overlay.js';
import { duplicate, remove, rotateBy, nudge, select, commitTyped } from '../actions/edit.js';
import { setTool, toggle, setDrawArc } from '../actions/settings.js';
import { syncWallTool } from './inspector/tools.js';
import { isModalOpen, closeModal } from './modal.js';
import { isTransform, cancelTransform, refreshTransform } from '../interaction/transform.js';

function onKeyDown(e) {
  if (isModalOpen()) { if (e.key === 'Escape') closeModal(); return; }
  // mid-transform: Esc cancels; Shift and Alt change the transform at once
  if (isTransform(S.drag)) {
    if (e.key === 'Escape') { e.preventDefault(); cancelTransform(); return; }
    if (e.key === 'Shift' || e.key === 'Alt') { e.preventDefault(); refreshTransform(e); return; }
  }
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') { if (e.key === 'Escape') e.target.blur(); return; }
  const mod = e.ctrlKey || e.metaKey, k = e.key;
  if (mod && (k === 'z' || k === 'Z')) { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && (k === 'y' || k === 'Y')) { e.preventDefault(); redo(); return; }
  if (mod && (k === 'd' || k === 'D')) { e.preventDefault(); duplicate(); return; }
  if (mod) return;

  // typing an exact length while a wall is being drawn
  if (S.tool === 'wall' && S.draft) {
    if (/^[0-9]$/.test(k) || ((k === '.' || k === ',') && !S.typed.includes('.'))) {
      e.preventDefault(); S.typed += k === ',' ? '.' : k; renderOverlay(); syncWallTool(); return;
    }
    if (k === 'Backspace' && S.typed) { e.preventDefault(); S.typed = S.typed.slice(0, -1); renderOverlay(); syncWallTool(); return; }
    // Enter places a curve being bent; Esc while bending goes back to placing its end
    if (k === 'Enter') { e.preventDefault(); if (S.typed || S.draft.to) commitTyped(); else { S.draft = null; render(); } return; }
    if (k === 'Escape') {
      e.preventDefault();
      if (S.typed) S.typed = '';
      else if (S.draft.to) S.draft = { a: S.draft.a, b: { ...S.draft.to } };
      else S.draft = null;
      render(); return;
    }
  }

  const step = e.shiftKey ? 0.01 : 0.001;
  switch (k) {
    case 'Delete': case 'Backspace': if (S.sel) { e.preventDefault(); remove(); } break;
    case 'r': case 'R': rotateBy(e.shiftKey ? -90 : 90); break;
    case 'ArrowLeft': if (S.sel) { e.preventDefault(); nudge(-step, 0); } break;
    case 'ArrowRight': if (S.sel) { e.preventDefault(); nudge(step, 0); } break;
    case 'ArrowUp': if (S.sel) { e.preventDefault(); nudge(0, -step); } break;
    case 'ArrowDown': if (S.sel) { e.preventDefault(); nudge(0, step); } break;
    case 'Escape':
      if (S.measure) { S.measure = null; renderOverlay(); }
      else if (S.tool !== 'select') setTool('select');
      else if (S.sel) select(null);
      break;
    case 'v': case 'V': setTool('select'); break;
    case 'w': case 'W': setTool('wall'); break;
    case 'c': case 'C': if (S.tool === 'wall') setDrawArc(!S.wallArc); break;
    case 'a': case 'A': setTool('room'); break;
    case 'm': case 'M': setTool('measure'); break;
    case 'g': case 'G': toggle('grid'); break;
    case 's': case 'S': toggle('snap'); break;
    case 'd': case 'D': toggle('dims'); break;
    case 'l': case 'L': toggle('labels'); break;
    case '+': case '=': zoomCentre(1 / 1.25); break;
    case '-': case '_': zoomCentre(1.25); break;
    case '0': fit(); break;
  }
}

export function initKeyboard() {
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', e => {
    if ((e.key === 'Shift' || e.key === 'Alt') && refreshTransform(e)) e.preventDefault();
  });
}
