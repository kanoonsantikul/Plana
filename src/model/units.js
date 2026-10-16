import { S } from './state.js';

/* Units. Geometry is stored in metres to the micrometre, so a typed
   length stays exact on a wall at any angle; snapped and typed
   positions land on whole millimetres, so dimension chains add up. */
export const UNITS = { m: { f: 1, dp: 3, step: '0.001' }, cm: { f: 100, dp: 1, step: '0.1' }, mm: { f: 1000, dp: 0, step: '1' } };

// a length in metres, written in the chosen unit for dimensions and labels
export function fmt(v) {
  if (S.unit === 'mm') return String(Math.round(v * 1000));
  if (S.unit === 'cm') return String(+(Math.round(v * 1000) / 10).toFixed(1));
  let s = (Math.round(v * 1000) / 1000).toFixed(3);
  if (s.endsWith('0')) s = s.slice(0, -1);
  return s;
}
// metres → chosen unit, for form fields; and back
export const toU = v => +(v * UNITS[S.unit].f).toFixed(UNITS[S.unit].dp);
export const fromU = v => v / UNITS[S.unit].f;
