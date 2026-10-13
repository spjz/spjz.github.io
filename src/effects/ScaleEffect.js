import { Effect } from './Effect.js';

/** Size transformation: breathe/pulse/squash. factor = 1 + (amount − 1) × env × strength × axisWeight. */
export class ScaleEffect extends Effect {
  static type = 'Scale';
  static schema = [
    { key: 'amount', type: 'number', min: 0, max: 3, step: 0.01 },
    { key: 'axes', type: 'vec3', min: -1, max: 1, step: 0.05, label: 'axis weights' },
  ];
  static defaults = { amount: 1.15, axes: [1, 1, 1] };
  static defaultEnvelope = { shape: 'sine', period: 3 };

  apply(work, model, indices, ctx, env) {
    const { amount, axes } = this.params;
    const d = (amount - 1) * this.strength;
    for (const i of indices) {
      const k = d * env.value(i);
      this.writeScale(work, i, 1 + k * axes[0], 1 + k * axes[1], 1 + k * axes[2]);
    }
  }
}
