import { Effect } from './Effect.js';
import { hexToLinear, hslToLinear } from '../colour.js';

const SQRT3 = Math.sqrt(3);

/**
 * Colour transformation.
 *  tint      – lerp toward `colour` by env × strength
 *  multiply  – colour *= lerp(1, `colour`, k)
 *  add       – colour += `colour` × k
 *  hueRotate – rotate hue by `degrees` × k
 *  gradient  – lerp toward a colourA→colourB gradient along `axis`
 *  rainbow   – envelope value is the hue; lerp toward it by strength
 */
export class ColourEffect extends Effect {
  static type = 'Colour';
  /** @type {import('./Effect.js').SchemaEntry[]} */
  static schema = [
    { key: 'mode', type: 'select', options: ['tint', 'multiply', 'add', 'hueRotate', 'gradient', 'rainbow'] },
    { key: 'colour', type: 'colour' },
    { key: 'colourB', type: 'colour', label: 'gradient end' },
    { key: 'degrees', type: 'number', min: -360, max: 360, step: 1 },
    { key: 'axis', type: 'vec3', min: -1, max: 1, step: 0.05, label: 'gradient axis' },
    { key: 'lightness', type: 'number', min: 0, max: 1, step: 0.01, label: 'rainbow lightness' },
  ];
  static defaults = { mode: 'hueRotate', colour: '#ff6a00', colourB: '#3a5bff', degrees: 360, axis: [0, 1, 0], lightness: 0.55 };
  static defaultEnvelope = { shape: 'saw', period: 4 };

  apply(work, model, indices, ctx, env) {
    const p = this.params;
    const col = work.colour;
    const target = hexToLinear(p.colour);
    const s = this.strength;

    if (p.mode === 'hueRotate') {
      for (const i of indices) {
        const th = (p.degrees * env.value(i) * s * Math.PI) / 180;
        const c = Math.cos(th), sn = Math.sin(th), t = (1 - c) / 3, q = sn / SQRT3;
        const j = i * 3, r = col[j], g = col[j + 1], b = col[j + 2];
        col[j] = (c + t) * r + (t - q) * g + (t + q) * b;
        col[j + 1] = (t + q) * r + (c + t) * g + (t - q) * b;
        col[j + 2] = (t - q) * r + (t + q) * g + (c + t) * b;
      }
      return;
    }

    if (p.mode === 'gradient') {
      const b = hexToLinear(p.colourB);
      const [ax, ay, az] = p.axis;
      const len = Math.hypot(ax, ay, az) || 1;
      // Project the bounds onto the axis to normalise 0–1.
      let lo = Infinity, hi = -Infinity;
      const { min, max } = model.bounds;
      for (let c = 0; c < 8; c++) {
        const x = c & 1 ? max[0] : min[0], y = c & 2 ? max[1] : min[1], z = c & 4 ? max[2] : min[2];
        const d = (x * ax + y * ay + z * az) / len;
        lo = Math.min(lo, d); hi = Math.max(hi, d);
      }
      const span = hi - lo || 1;
      for (const i of indices) {
        const j = i * 3, pos = model.basePos;
        const u = Math.min(1, Math.max(0, ((pos[j] * ax + pos[j + 1] * ay + pos[j + 2] * az) / len - lo) / span));
        const k = env.value(i) * s;
        for (let c = 0; c < 3; c++) {
          const g = target[c] + (b[c] - target[c]) * u;
          col[j + c] += (g - col[j + c]) * k;
        }
      }
      return;
    }

    if (p.mode === 'rainbow') {
      const rgb = [0, 0, 0];
      for (const i of indices) {
        hslToLinear(env.value(i) % 1, 1, p.lightness, rgb);
        const j = i * 3;
        for (let c = 0; c < 3; c++) col[j + c] += (rgb[c] - col[j + c]) * s;
      }
      return;
    }

    for (const i of indices) {
      const k = env.value(i) * s;
      const j = i * 3;
      for (let c = 0; c < 3; c++) {
        if (p.mode === 'tint') col[j + c] += (target[c] - col[j + c]) * k;
        else if (p.mode === 'multiply') col[j + c] *= 1 + (target[c] - 1) * k;
        else col[j + c] += target[c] * k;
      }
    }
  }
}
