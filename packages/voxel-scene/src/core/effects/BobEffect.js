import { Effect } from './Effect.js';

/** Whole-model idle bob along y. */
export class BobEffect extends Effect {
  static type = 'Bob';
  /** @type {import('./Effect.js').SchemaEntry[]} */
  static schema = [{ key: 'height', type: 'number', min: 0, max: 10, step: 0.1 }];
  static defaults = { height: 0.8 };
  static defaultEnvelope = { shape: 'sine', period: 1.2 };

  apply(work, model, indices, ctx, env) {
    const h = this.params.height * this.strength;
    for (const i of indices) this.writeOffset(work, i, 0, h * env.value(i), 0);
  }
}
