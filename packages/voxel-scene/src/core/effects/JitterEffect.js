import { Effect } from './Effect.js';

const TAU = Math.PI * 2;

/** Seeded per-voxel wobble. Each axis is a sine with a per-voxel phase so voxels desync. */
export class JitterEffect extends Effect {
  static type = 'Jitter';
  /** @type {import('./Effect.js').SchemaEntry[]} */
  static schema = [
    { key: 'amplitude', type: 'number', min: 0, max: 3, step: 0.01 },
    { key: 'frequency', type: 'number', min: 0, max: 20, step: 0.1, label: 'frequency (Hz)' },
  ];
  static defaults = { amplitude: 0.25, frequency: 4 };
  static defaultEnvelope = { shape: 'constant' };

  apply(work, model, indices, ctx, env) {
    const { amplitude, frequency } = this.params;
    const ft = frequency * ctx.t;
    const a = amplitude * this.strength;
    const rand = model.rand;
    for (const i of indices) {
      const r = rand[i];
      const k = a * env.value(i);
      this.writeOffset(
        work, i,
        k * Math.sin(TAU * (ft + r * 7.13)),
        k * Math.sin(TAU * (ft * 1.13 + r * 3.71)),
        k * Math.sin(TAU * (ft * 0.87 + r * 5.29)),
      );
    }
  }
}
