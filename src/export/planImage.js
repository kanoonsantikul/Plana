import { S } from '../model/state.js';
import { svg } from '../core/dom.js';
import { buildGeo, fullBox } from '../geometry/walls.js';
import { renderItems } from '../render/items.js';
import { planSummary } from '../render/header.js';
import { embeddedFonts } from './fonts.js';

/* The plan as a PNG or JPG: the whole drawing framed with its dimension strings,
   plus a title block. The live SVG is cloned, editing marks (selection, handles,
   clash hatching) are dropped, and the plan's own style rules are written into the
   copy with the theme colours filled in, since an SVG drawn as an image can't see
   the page's stylesheets.

   opts: { longEdge, format: 'png' | 'jpg', colours: 'theme' | 'print', grid, dims, labels } */

const PX_PER_M = 130;  // screen-like scale the plan's line weights are designed at
const BAND = 0.085;    // title block height, as a share of the image width

// the visible area: the whole plan, with room for the dimension strings when shown
function frame(dims) {
  buildGeo();
  const b = fullBox();
  if (!b) return null;
  const m = dims ? 1.25 : 0.4;
  return { x: b.x0 - m, y: b.y0 - m, w: b.x1 - b.x0 + 2 * m, h: b.y1 - b.y0 + 2 * m };
}

// pixel size of the export, before drawing anything
export function imageSize(opts) {
  const vb = frame(opts.dims);
  if (!vb) return null;
  const r = vb.h / vb.w + BAND;
  const w = Math.round(r <= 1 ? opts.longEdge : opts.longEdge / r);
  return { w, h: Math.round(w * r), vb };
}

// theme tokens, read from the page; 'print' reads the white Original theme instead
function readTokens(colours) {
  const root = document.documentElement, prev = root.getAttribute('data-skin');
  if (colours === 'print') root.setAttribute('data-skin', 'original');
  const cs = getComputedStyle(root);
  const get = name => cs.getPropertyValue(name).trim();
  const tokens = { get, sheet: get('--sheet'), ink: get('--ink'), ink2: get('--ink-2'), rule: get('--rule'), display: get('--f-display'), mono: get('--f-mono') };
  const css = planCSS(get);
  if (colours === 'print') { if (prev === null) root.removeAttribute('data-skin'); else root.setAttribute('data-skin', prev); }
  return { ...tokens, css };
}

// the plan's style rules (plan.css), with every var(--token) replaced by its value
function planCSS(get) {
  const out = [];
  const walk = rules => {
    for (const r of rules) {
      if (r.styleSheet) { try { walk(r.styleSheet.cssRules); } catch (e) { /* cross-origin */ } continue; }
      const sel = r.selectorText;
      if (sel && sel.split(',').every(s => /^(#plan |\.fp )/.test(s.trim()))) out.push(r.cssText);
    }
  };
  for (const sheet of document.styleSheets) { try { walk(sheet.cssRules); } catch (e) { /* cross-origin */ } }
  return out.join('\n').replace(/var\((--[\w-]+)\)/g, (_, n) => get(n));
}

// line weights are screen pixels (non-scaling strokes), so grow them with the image
function scaleStrokes(css, k) {
  const n = v => +(v * k).toFixed(2);
  return css
    .replace(/stroke-width:\s*([\d.]+)px/g, (_, v) => `stroke-width: ${n(+v)}px`)
    .replace(/stroke-dasharray:\s*([\d.,\s]+?)\s*(;|\})/g, (_, v, end) => `stroke-dasharray: ${v.split(/[\s,]+/).filter(Boolean).map(x => n(+x)).join(' ')}${end}`);
}

async function planSVG(opts, size, tokens) {
  const { w, h, vb } = size;
  const hp = Math.round(w * vb.h / vb.w);
  // furniture labels are only drawn while Labels is on; draw them for the copy
  const keep = S.labels;
  S.labels = opts.labels;
  renderItems();
  const clone = svg.cloneNode(true);
  S.labels = keep;
  renderItems();

  const layer = id => clone.querySelector('#' + id);
  const show = (id, on) => { const g = layer(id); if (!g) return; if (on) g.removeAttribute('hidden'); else g.remove(); };
  show('grid', opts.grid);
  show('dims', opts.dims);
  show('roomLabels', opts.labels);
  show('itemLabels', opts.labels);
  ['overlay', 'wallHits'].forEach(id => layer(id)?.remove());
  clone.querySelectorAll('.hit, .rtaghit, .badfill').forEach(n => n.remove());
  clone.querySelectorAll('.sel, .bad').forEach(n => n.classList.remove('sel', 'bad'));

  clone.setAttribute('class', 'fp');
  clone.removeAttribute('style');
  clone.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  clone.setAttribute('width', w);
  clone.setAttribute('height', hp);
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = (await embeddedFonts()) + '\n' + scaleStrokes(tokens.css, (w / vb.w) / PX_PER_M);
  clone.insertBefore(style, clone.firstChild);
  return { text: new XMLSerializer().serializeToString(clone), hp };
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('The plan could not be drawn as an image.'));
    img.src = url;
  });
}

// a 0–1 m (or 0.5 / 2 m) scale bar and the date, at the right of the title block
function scaleBar(ctx, tokens, ppm, right, top, band) {
  let len = 1;
  if (ppm * len > ctx.canvas.width * .2) len = 0.5;
  if (ppm * len < ctx.canvas.width * .06) len = 2;
  const bw = ppm * len, bh = Math.max(3, band * .07), x = right - bw, y = top + band * .36;
  ctx.fillStyle = tokens.ink;
  ctx.fillRect(x, y, bw / 2, bh);
  ctx.strokeStyle = tokens.ink;
  ctx.lineWidth = Math.max(1, band * .012);
  ctx.strokeRect(x, y, bw, bh);
  ctx.font = `400 ${band * .13}px ${tokens.mono}`;
  ctx.fillStyle = tokens.ink2;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText('0', x, y + bh + band * .06);
  ctx.textAlign = 'right';
  ctx.fillText(`${len} m`, right, y + bh + band * .06);
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }), right, top + band * .86);
}

// draws the export; resolves { blob, width, height }
export async function renderPlanImage(opts) {
  const size = imageSize(opts);
  if (!size) throw new Error('There is nothing on the plan to export yet.');
  const tokens = readTokens(opts.colours);
  const { text, hp } = await planSVG(opts, size, tokens);
  const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }));
  let img;
  try { img = await loadImage(url); } finally { URL.revokeObjectURL(url); }

  const { w, h, vb } = size, band = h - hp;
  const canvas = Object.assign(document.createElement('canvas'), { width: w, height: h });
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = tokens.sheet;
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, hp);

  // title block, after the drawing's own: a rule, the title, the plan summary, a scale bar
  try { await Promise.all([document.fonts.load(`700 20px ${tokens.display}`), document.fonts.load(`400 20px ${tokens.mono}`)]); } catch (e) { /* fall back */ }
  const pad = Math.round(band * .45);
  ctx.strokeStyle = tokens.ink;
  ctx.lineWidth = Math.max(1, band * .02);
  ctx.beginPath(); ctx.moveTo(pad, hp); ctx.lineTo(w - pad, hp); ctx.stroke();
  ctx.fillStyle = tokens.ink;
  ctx.textBaseline = 'alphabetic';
  ctx.font = `700 ${band * .3}px ${tokens.display}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${(band * .025).toFixed(1)}px`;
  ctx.fillText('FURNITURE LAYOUT PLAN', pad, hp + band * .5);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.fillStyle = tokens.ink2;
  ctx.font = `400 ${band * .15}px ${tokens.mono}`;
  ctx.fillText(planSummary(), pad, hp + band * .82);
  scaleBar(ctx, tokens, w / vb.w, w - pad, hp, band);

  const type = opts.format === 'jpg' ? 'image/jpeg' : 'image/png';
  const blob = await new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('The image could not be encoded.')), type, .92));
  return { blob, width: w, height: h };
}
