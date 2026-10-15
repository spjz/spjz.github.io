import { Effect } from './Effect.js';

/** Pushes voxels radially from the model centre and reassembles them over the envelope. Shows the interior. */
export class ExplodeEffect extends Effect {
  static type = 'Explode';
  static needsInterior = true;
  static schema = [
    { key: 'radius', type: 'number', min: 0, max: 60, step: 0.5 },
    { key: 'spread', type: 'number', min: 0, max: 2, step: 0.05, label: 'random spread' },
    { key: 'lift', type: 'number', min: -1, max: 1, step: 0.05 },
    { key: 'shrink', type: 'number', min: 0, max: 1, step: 0.05 },
  ];
  static defaults = { radius: 18, spread: 0.8, lift: 0.3, shrink: 0.4 };
  static defaultEnvelope = { shape: 'adsr', period: 4, adsr: { a: 0.35, d: 0.3, s: 0.8, r: 0.9, hold: 0.6 } };

  apply(work, model, indices, ctx, env) {
    const { radius, spread, lift, shrink } = this.params;
    const [cx, cy, cz] = model.bounds.centre;
    const pos = model.basePos, rand = model.rand;
    for (const i of indices) {
      const j = i * 3;
      let dx = pos[j] - cx, dy = pos[j + 1] - cy + lift * 8, dz = pos[j + 2] - cz;
      const len = Math.hypot(dx, dy, dz) || 1;
      const k = env.value(i) * this.strength;
      const dist = radius * k * (1 - spread / 2 + spread * rand[i]);
      dx /= len; dy /= len; dz /= len;
      this.writeOffset(work, i, dx * dist, dy * dist, dz * dist);
      const f = 1 - shrink * k;
      this.writeScale(work, i, f, f, f);
    }
  }
}
