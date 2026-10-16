import { $ } from '../core/dom.js';

// The colour theme is a per-browser preference, kept apart from the plan.
const THEME_KEY = 'plana.theme';
const THEMES = ['auto', 'original', 'drafting', 'blueprint', 'dark'];

function applyTheme(k) {
  if (!THEMES.includes(k)) k = 'auto';
  if (k === 'auto') document.documentElement.removeAttribute('data-skin');
  else document.documentElement.setAttribute('data-skin', k);
  $('themeSel').value = k;
}

export function initTheme() {
  $('themeSel').addEventListener('change', e => {
    applyTheme(e.target.value);
    try { localStorage.setItem(THEME_KEY, e.target.value); } catch (err) { /* not remembered this time */ }
  });
  try { applyTheme(localStorage.getItem(THEME_KEY) || 'auto'); } catch (err) { applyTheme('auto'); }
}
