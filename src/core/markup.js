// String builders for SVG markup. Coordinates are metres; output is rounded to 0.1 mm.
export const f3 = n => Math.round(n * 10000) / 10000;

export const R = (x, y, w, h, c = '', rx = 0) => `<rect x="${f3(x)}" y="${f3(y)}" width="${f3(Math.max(w, .001))}" height="${f3(Math.max(h, .001))}"${rx ? ` rx="${f3(rx)}"` : ''} class="${c}"/>`;
export const C = (x, y, r, c = '') => `<circle cx="${f3(x)}" cy="${f3(y)}" r="${f3(Math.max(r, .001))}" class="${c}"/>`;
export const E = (x, y, rx, ry, c = '') => `<ellipse cx="${f3(x)}" cy="${f3(y)}" rx="${f3(Math.max(rx, .001))}" ry="${f3(Math.max(ry, .001))}" class="${c}"/>`;
export const L = (x1, y1, x2, y2, c = '') => `<line x1="${f3(x1)}" y1="${f3(y1)}" x2="${f3(x2)}" y2="${f3(y2)}" class="${c}"/>`;
export const PA = (d, c = '') => `<path d="${d}" class="${c}"/>`;
export const TX = (x, y, s, size, c = '', extra = '') => `<text x="${f3(x)}" y="${f3(y)}" font-size="${f3(size)}" class="${c}" ${extra}>${s}</text>`;
export const lineD = pts => 'M' + pts.map(p => `${f3(p[0])} ${f3(p[1])}`).join(' L');
export const polyD = poly => lineD(poly) + ' Z';
export const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

// a wavy line, used for curtains
export function wave(x0, x1, y, amp = .03, len = .09) {
  let d = `M${f3(x0)} ${f3(y)}`;
  for (let x = x0; x < x1 - 1e-6; x += len) {
    d += ` Q${f3(x + len / 4)} ${f3(y - amp)} ${f3(x + len / 2)} ${f3(y)} T${f3(Math.min(x + len, x1))} ${f3(y)}`;
  }
  return d;
}
