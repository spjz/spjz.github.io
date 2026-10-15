// Colour helpers in plain JS so effects stay free of Three.js (and run in Node).
// Working space is linear RGB, matching Three.js colour management.

export function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function linearToSrgb(c) {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
}

/** 0xrrggbb or '#rrggbb' → [r, g, b] linear. */
export function hexToLinear(hex, out = [0, 0, 0]) {
  const n = typeof hex === 'string' ? parseInt(hex.replace('#', ''), 16) : hex;
  out[0] = srgbToLinear(((n >> 16) & 255) / 255);
  out[1] = srgbToLinear(((n >> 8) & 255) / 255);
  out[2] = srgbToLinear((n & 255) / 255);
  return out;
}

/** h, s, l in 0–1 → [r, g, b] linear. */
export function hslToLinear(h, s, l, out = [0, 0, 0]) {
  const k = (n) => (n + h * 12) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  out[0] = srgbToLinear(f(0));
  out[1] = srgbToLinear(f(8));
  out[2] = srgbToLinear(f(4));
  return out;
}
