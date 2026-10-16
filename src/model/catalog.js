import { f3, R, C, E, L, PA, wave } from '../core/markup.js';

/* Furniture drawings. Local frame: centred, w along x, d along y,
   the front of the piece faces +y. */
function sofa(w, d, n) {
  const hw = w / 2, hd = d / 2, arm = Math.min(.18, w * .12), back = Math.min(.2, d * .26);
  let s = R(-hw, -hd, w, d, 'b', .05) + R(-hw, -hd, w, back, 'u', .04) + R(-hw, -hd, arm, d, 'u', .04) + R(hw - arm, -hd, arm, d, 'u', .04);
  const sw = (w - 2 * arm) / n;
  for (let i = 0; i < n; i++) s += R(-hw + arm + i * sw + .01, -hd + back + .01, sw - .02, d - back - .03, 'u', .04);
  return s;
}
function bed(w, d) {
  const hw = w / 2, hd = d / 2, n = w > 1.15 ? 2 : 1, gap = .06, pw = (w - .2 - (n - 1) * gap) / n;
  let s = R(-hw, -hd, w, d, 'b', .03) + R(-hw, -hd, w, .07, 'u');
  for (let i = 0; i < n; i++) s += R(-hw + .1 + i * (pw + gap), -hd + .12, pw, .34, 'u', .07);
  const top = -hd + .56;
  s += R(-hw + .02, top, w - .04, hd - top - .02, 'u', .03);
  s += L(-hw + .02, top + .22, hw - .02, top + .22, 'l');
  const fx = Math.min(.55, w * .4), fy = Math.min(.6, (hd - top) * .5);
  s += PA(`M${f3(hw - .02 - fx)} ${f3(hd - .02)} L${f3(hw - .02)} ${f3(hd - .02 - fy)} L${f3(hw - .02)} ${f3(hd - .02)} Z`, 'b');
  return s;
}
function shelf(w, d) {
  const hw = w / 2, hd = d / 2;
  let s = R(-hw, -hd, w, d, 'b', .01);
  const n = Math.max(1, Math.round(w / .4));
  for (let i = 1; i < n; i++) { const x = -hw + i * w / n; s += L(x, -hd, x, hd, 'l'); }
  return s + L(-hw, hd - .025, hw, hd - .025, 'l');
}

// t: type id, n: name, c: library category, w/d: default size in metres,
// floor: lies on the floor (rugs, curtains), so it never clashes with anything
export const CATALOG = [
  { t: 'sofa3', n: '3-seat sofa', c: 'Living', w: 2.1, d: 0.9, draw: (w, d) => sofa(w, d, 3) },
  { t: 'sofa2', n: '2-seat sofa', c: 'Living', w: 1.6, d: 0.85, draw: (w, d) => sofa(w, d, 2) },
  { t: 'armchair', n: 'Armchair', c: 'Living', w: 0.8, d: 0.8, draw: (w, d) => sofa(w, d, 1) },
  { t: 'daybed', n: 'Daybed', c: 'Living', w: 1.9, d: 0.8, draw(w, d) {
      const hw = w / 2, hd = d / 2;
      return R(-hw, -hd, w, d, 'b', .03) + R(-hw + .04, -hd + .04, w - .08, d - .08, 'u', .04) + R(-hw + .08, -hd + .1, .3, d - .2, 'b', .07);
    } },
  { t: 'bench', n: 'Bench seat', c: 'Living', w: 1.2, d: 0.45, draw(w, d) {
      const hw = w / 2, hd = d / 2;
      return R(-hw, -hd, w, d, 'b', .02) + R(-hw + .03, -hd + .03, w - .06, d - .06, 'u', .04) + L(-hw + .03, -hd + .1, hw - .03, -hd + .1, 'd');
    } },
  { t: 'coffee', n: 'Coffee table', c: 'Living', w: 1.1, d: 0.55, draw(w, d) {
      return R(-w / 2, -d / 2, w, d, 'b', .03) + R(-w / 2 + .05, -d / 2 + .05, w - .1, d - .1, 'l', .02);
    } },
  { t: 'side', n: 'Side table', c: 'Living', w: 0.5, d: 0.5, draw(w, d) {
      const r = Math.min(w, d) / 2; return C(0, 0, r, 'b') + C(0, 0, r - .05, 'l');
    } },
  { t: 'tv', n: 'TV console', c: 'Living', w: 1.8, d: 0.4, draw(w, d) {
      const hw = w / 2, hd = d / 2;
      return R(-hw, -hd, w, d, 'b', .01) + L(-hw + w / 3, -hd, -hw + w / 3, hd, 'l') + L(hw - w / 3, -hd, hw - w / 3, hd, 'l') + R(-w * .36, -hd + .05, w * .72, .045, 'k');
    } },
  { t: 'shelf', n: 'Bookshelf', c: 'Living', w: 0.9, d: 0.35, draw: shelf },
  { t: 'rug', n: 'Rug', c: 'Living', w: 2.0, d: 1.4, floor: true, draw(w, d) {
      const hw = w / 2, hd = d / 2;
      let s = R(-hw, -hd, w, d, 'rug') + R(-hw + .08, -hd + .08, w - .16, d - .16, 'd');
      for (let y = -hd + .05; y < hd - .02; y += .07) s += L(-hw - .04, y, -hw, y, 'l') + L(hw, y, hw + .04, y, 'l');
      return s;
    } },
  { t: 'curtain', n: 'Curtain', c: 'Living', w: 2.0, d: 0.08, floor: true, draw(w, d) {
      const hw = w / 2;
      return PA(wave(-hw, hw, -d * .22, Math.min(.03, d * .3)), 'curtain') + PA(wave(-hw, hw, d * .22, Math.min(.03, d * .3)), 'curtain');
    } },
  { t: 'lamp', n: 'Floor lamp', c: 'Living', w: 0.4, d: 0.4, draw(w, d) {
      const r = Math.min(w, d) / 2; return C(0, 0, r, 'b') + C(0, 0, r * .45, 'l') + L(-r, 0, r, 0, 'l') + L(0, -r, 0, r, 'l');
    } },
  { t: 'plant', n: 'Plant', c: 'Living', w: 0.45, d: 0.45, draw(w, d) {
      const r = Math.min(w, d) / 2; let s = '';
      for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; s += C(Math.cos(a) * r * .55, Math.sin(a) * r * .55, r * .42, 'u'); }
      return s + C(0, 0, r * .3, 'b');
    } },
  { t: 'dining', n: 'Dining table', c: 'Dining & work', w: 1.2, d: 0.8, draw(w, d) {
      return R(-w / 2, -d / 2, w, d, 'b', .02) + R(-w / 2 + .04, -d / 2 + .04, w - .08, d - .08, 'l', .01);
    } },
  { t: 'roundtable', n: 'Round table', c: 'Dining & work', w: 0.9, d: 0.9, draw(w, d) {
      const r = Math.min(w, d) / 2; return C(0, 0, r, 'b') + C(0, 0, r - .04, 'l') + C(0, 0, r * .18, 'd');
    } },
  { t: 'chair', n: 'Chair', c: 'Dining & work', w: 0.45, d: 0.5, draw(w, d) {
      const hw = w / 2, hd = d / 2;
      return R(-hw, -hd + .07, w, d - .07, 'b', .05) + R(-hw + .02, -hd, w - .04, .08, 'u', .03);
    } },
  { t: 'desk', n: 'Desk', c: 'Dining & work', w: 1.2, d: 0.6, draw(w, d) {
      const hw = w / 2, hd = d / 2;
      return R(-hw, -hd, w, d, 'b', .01) + R(-w * .22, -hd + .06, w * .44, .035, 'k') + R(-w * .16, hd * .05, w * .32, Math.min(.13, d * .22), 'l', .01);
    } },
  { t: 'ochair', n: 'Office chair', c: 'Dining & work', w: 0.62, d: 0.62, draw(w, d) {
      const r = Math.min(w, d) / 2; let s = '';
      for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k / 5 * Math.PI * 2; s += L(0, 0, Math.cos(a) * r, Math.sin(a) * r, 'l') + C(Math.cos(a) * r * .92, Math.sin(a) * r * .92, .025, 'u'); }
      return s + C(0, r * .06, r * .7, 'b') + R(-r * .66, -r * .98, r * 1.32, r * .28, 'u', .08);
    } },
  { t: 'bedq', n: 'Queen bed', c: 'Bedroom', w: 1.6, d: 2.0, draw: bed },
  { t: 'bedk', n: 'King bed', c: 'Bedroom', w: 1.8, d: 2.0, draw: bed },
  { t: 'beds', n: 'Single bed', c: 'Bedroom', w: 0.9, d: 2.0, draw: bed },
  { t: 'night', n: 'Nightstand', c: 'Bedroom', w: 0.45, d: 0.4, draw(w, d) {
      const m = Math.min(w, d); return R(-w / 2, -d / 2, w, d, 'b', .02) + C(0, 0, m * .24, 'l') + C(0, 0, m * .07, 'k');
    } },
  { t: 'wardrobe', n: 'Wardrobe', c: 'Bedroom', w: 1.2, d: 0.6, draw(w, d) {
      const hw = w / 2, hd = d / 2;
      let s = R(-hw, -hd, w, d, 'b', .01) + L(-hw + .03, 0, hw - .03, 0, 'l');
      for (let x = -hw + .08; x < hw - .05; x += .09) s += L(x - .03, -hd * .7, x + .03, hd * .7, 'l');
      return s + L(-hw, hd - .025, hw, hd - .025, 'l');
    } },
  { t: 'dresser', n: 'Dresser', c: 'Bedroom', w: 1.0, d: 0.45, draw(w, d) {
      const hw = w / 2, hd = d / 2; let s = R(-hw, -hd, w, d, 'b', .01);
      const n = Math.max(2, Math.round(w / .4));
      for (let i = 0; i < n; i++) { const x = -hw + (i + .5) * w / n; if (i) s += L(-hw + i * w / n, -hd, -hw + i * w / n, hd, 'l'); s += C(x, hd - .05, .015, 'k'); }
      return s;
    } },
  { t: 'fridge', n: 'Refrigerator', c: 'Kitchen & utility', w: 0.65, d: 0.65, draw(w, d, rot = 0) {
      const hw = w / 2, hd = d / 2, fs = Math.min(w, d) * .2;
      return R(-hw, -hd, w, d, 'b', .01) + R(-hw + .04, -hd + .04, w - .08, d - .08, 'd') +
        `<text x="0" y="0" font-size="${f3(fs)}" class="tx" text-anchor="middle" dominant-baseline="central" transform="rotate(${f3(-rot)})">REF.</text>`;
    } },
  { t: 'kitchenette', n: 'Kitchenette', c: 'Kitchen & utility', w: 1.45, d: 0.56, draw(w, d) {
      const hw = w / 2, hd = d / 2;
      let s = R(-hw, -hd, w, d, 'b', .01) + L(-hw, hd - .03, hw, hd - .03, 'l');
      const hx = -hw + .3;
      s += R(hx - .22, -hd + .06, .44, d - .14, 'l', .02) + C(hx, -.11, .085, 'l') + C(hx, .11, .085, 'l') + C(hx, -.11, .03, 'l') + C(hx, .11, .03, 'l');
      const sx = hw - .42;
      s += R(sx - .2, -hd + .1, .4, d - .2, 'l', .05) + C(sx, 0, .022, 'l') + C(sx, -hd + .055, .02, 'k') + L(sx, -hd + .055, sx + .08, -hd + .055, 'l');
      return s;
    } },
  { t: 'counter', n: 'Base cabinet', c: 'Kitchen & utility', w: 0.8, d: 0.6, draw(w, d) {
      const hw = w / 2, hd = d / 2; let s = R(-hw, -hd, w, d, 'b', .01) + L(-hw, hd - .03, hw, hd - .03, 'l');
      const n = Math.max(1, Math.round(w / .45));
      for (let i = 1; i < n; i++) s += L(-hw + i * w / n, hd - .03, -hw + i * w / n, hd, 'l');
      return s;
    } },
  { t: 'washer', n: 'Washing machine', c: 'Kitchen & utility', w: 0.6, d: 0.6, draw(w, d) {
      const hw = w / 2, hd = d / 2, m = Math.min(w, d);
      return R(-hw, -hd, w, d, 'b', .03) + L(-hw, -hd + .09, hw, -hd + .09, 'l') + C(0, .04, m * .32, 'l') + C(0, .04, m * .22, 'l') + C(hw - .08, -hd + .045, .018, 'k');
    } },
  { t: 'cabinet', n: 'Storage cabinet', c: 'Kitchen & utility', w: 0.6, d: 0.6, draw(w, d) {
      const hw = w / 2, hd = d / 2;
      return R(-hw, -hd, w, d, 'b', .01) + L(-hw, hd - .03, hw, hd - .03, 'l') + L(-hw + .04, -hd + .04, hw - .04, hd - .07, 'd') + C(-.04, hd - .06, .013, 'k') + C(.04, hd - .06, .013, 'k');
    } },
  { t: 'shaft', n: 'Service duct', c: 'Kitchen & utility', w: 0.4, d: 0.4, draw(w, d) {
      const hw = w / 2, hd = d / 2;
      return R(-hw, -hd, w, d, 'b') + L(-hw, -hd, hw, hd, 'l') + L(hw, -hd, -hw, hd, 'l');
    } },
  { t: 'toilet', n: 'Toilet', c: 'Bath', w: 0.4, d: 0.68, draw(w, d) {
      const hw = w / 2, hd = d / 2, tank = Math.min(.18, d * .27), by = -hd + tank + (d - tank) / 2;
      return R(-hw, -hd, w, tank, 'b', .03) + E(0, by, w * .42, (d - tank) / 2 - .005, 'b') + E(0, by + .02, w * .28, (d - tank) / 2 - .07, 'l');
    } },
  { t: 'basin', n: 'Vanity basin', c: 'Bath', w: 0.6, d: 0.45, draw(w, d) {
      const hw = w / 2, hd = d / 2;
      return R(-hw, -hd, w, d, 'b', .02) + E(0, .03, w * .32, d * .3, 'l') + C(0, .03, .018, 'l') + R(-.012, -hd + .03, .024, .1, 'k');
    } },
  { t: 'tub', n: 'Bathtub', c: 'Bath', w: 1.5, d: 0.7, draw(w, d) {
      const hw = w / 2, hd = d / 2;
      return R(-hw, -hd, w, d, 'b', .03) + R(-hw + .06, -hd + .06, w - .12, d - .12, 'l', Math.min(.2, d * .3)) + C(-hw + .2, 0, .03, 'l');
    } },
  { t: 'showertray', n: 'Shower tray', c: 'Bath', w: 0.9, d: 0.9, draw(w, d) {
      const hw = w / 2, hd = d / 2;
      return R(-hw, -hd, w, d, 'u', .01) + L(-hw, -hd, hw, hd, 'd') + L(hw, -hd, -hw, hd, 'd') + R(-.05, -.05, .1, .1, 'l') + L(-.05, 0, .05, 0, 'l') + L(0, -.05, 0, .05, 'l');
    } },
];

// catalog entries by type id
export const CAT = {};
CATALOG.forEach(c => { CAT[c.t] = c; });
