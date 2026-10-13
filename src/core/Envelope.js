// Animation cycle envelope (DESIGN.md §7.2).
// Maps time (plus an optional per-voxel spatial phase) to a value in [min, max].

export const SHAPES = ['constant', 'sine', 'triangle', 'saw', 'square', 'pulse', 'adsr', 'easeInOut'];

const TAU = Math.PI * 2;

// Each shape maps phase p ∈ [0, 1) to 0–1. `env` is passed for duty/ADSR parameters.
const SHAPE_FNS = {
  constant: () => 1,
  sine: (p) => 0.5 + 0.5 * Math.sin(TAU * p),
  triangle: (p) => (p < 0.5 ? 2 * p : 2 - 2 * p),
  saw: (p) => p,
  square: (p, env) => (p < env.spec.duty ? 1 : 0),
  pulse: (p, env) => (p < env.spec.duty ? Math.sin((Math.PI * p) / env.spec.duty) : 0),
  easeInOut: (p) => {
    const x = p < 0.5 ? 2 * p : 2 - 2 * p;
    return x * x * (3 - 2 * x);
  },
  adsr: (p, env) => {
    const { a, d, s, r, hold } = env.spec.adsr;
    const tau = p * env.period;
    if (tau < a) return tau / a;
    if (tau < a + d) return 1 - ((1 - s) * (tau - a)) / d;
    if (tau < a + d + hold) return s;
    if (tau < a + d + hold + r) return s * (1 - (tau - a - d - hold) / r);
    return 0;
  },
};

export const DEFAULT_ENVELOPE = {
  shape: 'sine',
  period: 2, // seconds; <= 0 uses the clock's global period
  phase: 0,
  min: 0,
  max: 1,
  duty: 0.5,
  adsr: { a: 0.2, d: 0.2, s: 0.7, r: 0.4, hold: 0.4 },
  spatial: { vector: [0, 0, 0], random: 0 },
};

export function normaliseEnvelope(spec = {}) {
  return {
    ...DEFAULT_ENVELOPE,
    ...spec,
    adsr: { ...DEFAULT_ENVELOPE.adsr, ...(spec.adsr || {}) },
    spatial: {
      vector: [...(spec.spatial?.vector || DEFAULT_ENVELOPE.spatial.vector)],
      random: spec.spatial?.random ?? DEFAULT_ENVELOPE.spatial.random,
    },
  };
}

export class Envelope {
  constructor(spec) {
    this.spec = normaliseEnvelope(spec);
    this.period = this.spec.period;
    this._tp = 0;
    this._pos = null;
    this._rand = null;
    this._fn = SHAPE_FNS.sine;
  }

  /** Call once per frame before value(i). */
  prepare(ctx, model) {
    const s = this.spec;
    this.period = s.period > 0 ? s.period : ctx.globalPeriod;
    this._tp = ctx.t / this.period + s.phase;
    this._fn = SHAPE_FNS[s.shape] || SHAPE_FNS.sine;
    this._vx = s.spatial.vector[0];
    this._vy = s.spatial.vector[1];
    this._vz = s.spatial.vector[2];
    this._vr = s.spatial.random;
    this._pos = model ? model.basePos : null;
    this._rand = model ? model.rand : null;
  }

  /** Envelope value for voxel i (DESIGN.md §7.2 formula). */
  value(i) {
    let p = this._tp;
    if (this._pos) {
      const j = i * 3;
      p += this._pos[j] * this._vx + this._pos[j + 1] * this._vy + this._pos[j + 2] * this._vz + this._rand[i] * this._vr;
    }
    p -= Math.floor(p);
    return this.spec.min + (this.spec.max - this.spec.min) * this._fn(p, this);
  }

  /** Value ignoring spatial phase (for camera drift and UI previews). */
  valueGlobal() {
    let p = this._tp;
    p -= Math.floor(p);
    return this.spec.min + (this.spec.max - this.spec.min) * this._fn(p, this);
  }
}
