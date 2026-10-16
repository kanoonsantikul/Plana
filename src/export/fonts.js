/* An SVG drawn as an image can't use the page's web fonts, only fonts written into it.
   This fetches the plan's two faces (latin only) from Google Fonts once and returns them
   as @font-face rules with the font files inlined. Where fetching is blocked it returns
   '' and the image falls back to the font stacks' system fonts. */

const CSS_URL = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=IBM+Plex+Mono:wght@400;500&display=swap';
let pending = null;

async function get(url, as) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 5000);
  try {
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) throw new Error(res.status);
    return as === 'text' ? res.text() : res.arrayBuffer();
  } finally { clearTimeout(t); }
}

function base64(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export function embeddedFonts() {
  if (!pending) {
    pending = (async () => {
      try {
        const css = await get(CSS_URL, 'text');
        // Google labels each @font-face with its subset in a comment, e.g. /* latin */
        const faces = css.split('/*').filter(b => /^\s*latin\s*\*\//.test(b)).map(b => b.replace(/^\s*latin\s*\*\//, ''));
        const out = await Promise.all(faces.map(async face => {
          const m = face.match(/url\((https:[^)]+)\)/);
          if (!m) return '';
          return face.replace(m[1], 'data:font/woff2;base64,' + base64(await get(m[1])));
        }));
        return out.join('\n');
      } catch (e) {
        return '';
      }
    })();
  }
  return pending;
}
