import { CATALOG, CAT } from '../model/catalog.js';
import { $, stage } from '../core/dom.js';
import { f3, esc } from '../core/markup.js';
import { clientToWorld, viewCentre } from '../view/viewport.js';
import { addItem } from '../actions/edit.js';

// The furniture library: cards grouped by category, dragged onto the plan or tapped to add.
export function buildLibrary() {
  const cats = [...new Set(CATALOG.map(c => c.c))];
  $('lib').innerHTML = cats.map(cat => `<section class="cat" data-cat="${esc(cat)}"><h3>${esc(cat)}</h3><div class="cards">${
    CATALOG.filter(c => c.c === cat).map(c => {
      const m = Math.max(c.w, c.d) * .1, vh = Math.max(c.d, c.w * .25);
      return `<button class="card" draggable="true" data-type="${c.t}" title="Add ${esc(c.n)}">
        <svg class="fp thumb" viewBox="${f3(-c.w / 2 - m)} ${f3(-vh / 2 - m)} ${f3(c.w + 2 * m)} ${f3(vh + 2 * m)}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${c.draw(c.w, c.d, 0)}</svg>
        <span class="cn">${esc(c.n)}</span><span class="cd">${Math.round(c.w * 100)} × ${Math.round(c.d * 100)} cm</span></button>`;
    }).join('')}</div></section>`).join('') + '<p class="empty-search" id="libEmpty" hidden>No furniture matches that search.</p>';
  $('libCount').textContent = CATALOG.length + ' pieces';
}

function filterLibrary(e) {
  const q = e.target.value.trim().toLowerCase();
  let any = false;
  document.querySelectorAll('#lib .cat').forEach(sec => {
    let shown = 0;
    sec.querySelectorAll('.card').forEach(card => {
      const hit = !q || CAT[card.dataset.type].n.toLowerCase().includes(q) || sec.dataset.cat.toLowerCase().includes(q);
      card.hidden = !hit; if (hit) shown++;
    });
    sec.hidden = !shown; if (shown) any = true;
  });
  $('libEmpty').hidden = any;
}

export function initLibrary() {
  $('lib').addEventListener('dragstart', e => {
    const card = e.target.closest('.card'); if (!card) return;
    e.dataTransfer.setData('text/plain', 'plana:' + card.dataset.type);
    e.dataTransfer.effectAllowed = 'copy';
  });
  $('lib').addEventListener('click', e => {
    const card = e.target.closest('.card'); if (!card) return;
    const c = viewCentre();
    addItem(card.dataset.type, c.x, c.y);
  });
  $('libSearch').addEventListener('input', filterLibrary);

  // dropping a card on the plan
  stage.addEventListener('dragover', e => { if ([...e.dataTransfer.types].includes('text/plain')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; stage.classList.add('drop'); } });
  stage.addEventListener('dragleave', e => { if (!stage.contains(e.relatedTarget)) stage.classList.remove('drop'); });
  stage.addEventListener('drop', e => {
    e.preventDefault(); stage.classList.remove('drop');
    const t = (e.dataTransfer.getData('text/plain') || '').replace(/^plana:/, '');
    if (!CAT[t]) return;
    const p = clientToWorld(e.clientX, e.clientY);
    addItem(t, p.x, p.y);
  });
}
