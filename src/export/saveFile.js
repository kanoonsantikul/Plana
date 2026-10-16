/* Hand a generated file to the person. Inside the claude.ai viewer a page can't
   download on its own, so this goes through the `downloads` capability, where the
   viewer confirms the save; anywhere else it is an ordinary browser download. */

let cap = null;
function capability() {
  if (!cap) {
    cap = window.claude && typeof window.claude.use === 'function'
      ? window.claude.use('downloads').catch(() => null)
      : Promise.resolve(null);
  }
  return cap;
}
// ask early, so the first Save doesn't wait on the viewer
export const primeSave = () => { capability(); };

function framed() {
  try { return window.self !== window.top; } catch (e) { return true; }
}

// Resolves 'saved' (the viewer accepted) or 'downloaded' (a browser download started).
// Rejects with { code, message }: 'declined' when the person said no, 'unavailable'
// when this view can't save files at all.
export async function saveFile(filename, data) {
  const downloads = await capability();
  if (downloads) {
    await downloads.save({ filename, data });
    return 'saved';
  }
  // a framed page without the capability has its downloads blocked
  if (framed()) throw { code: 'unavailable', message: 'Saving files is not available in this view.' };
  const blob = data instanceof Blob ? data : new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'downloaded';
}
