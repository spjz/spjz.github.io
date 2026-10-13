import { Effect } from './Effect.js';

/** Cell translation along a direction; use the envelope's spatial vector for travelling waves. */
export class WaveTranslateEffect extends Effect {
  static type = 'WaveTranslate';
  static schema = [
    { key: 'direction', type: 'vec3', min: -1, max: 1, step: 0.05 },
    { key: 'amplitude', type: 'number', min: 0, max: 10, step: 0.1 },
    { key: 'bipolar', type: 'bool', label: 'bipolar (−1…1)' },
  ];
  static defaults = { direction: [0, 0, 1], amplitude: 2, bipolar: true };
  static defaultEnvelope = { shape: 'sine', period: 2, spatial: { vector: [0, 0.06, 0], random: 0 } };

  apply(work, model, indices, ctx, env) {
    const { direction: [dx, dy, dz], amplitude, bipolar } = this.params;
    const a = amplitude * this.strength;
    for (const i of indices) {
      const v = env.value(i);
      const k = a * (bipolar ? v * 2 - 1 : v);
      this.writeOffset(work, i, dx * k, dy * k, dz * k);
    }
  }
}
