import { Effect } from './Effect.js';

/** Squashes the eye voxels on y on a sparse pulse envelope. */
export class BlinkEffect extends Effect {
  static type = 'Blink';
  static defaultSelector = 'eyes';
  /** @type {import('./Effect.js').SchemaEntry[]} */
  static schema = [{ key: 'minScale', type: 'number', min: 0, max: 1, step: 0.01, label: 'closed scale' }];
  static defaults = { minScale: 0.1 };
  static defaultEnvelope = { shape: 'pulse', period: 3.2, duty: 0.06 };

  apply(work, model, indices, ctx, env) {
    const drop = (1 - this.params.minScale) * this.strength;
    for (const i of indices) this.writeScale(work, i, 1, 1 - drop * env.value(i), 1);
  }
}
