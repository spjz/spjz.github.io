// Animation cycle envelope (DESIGN.md §7.2, REACT_DESIGN.md §6).
// Maps a driver value (time, scroll or pointer progress) plus an optional
// per-voxel spatial phase to a value in [min, max].

export const SHAPES = ['constant', 'sine', 'triangle', 'saw', 'square', 'pulse', 'adsr', 'easeInOut'];
export const DRIVERS = ['time', 'scroll', 'pointer'];
export const MODES = ['loop', 'once'];

const TAU = Math.PI * 2;

/** @type {Record<string, (p: number, env: Envelope) => number>} */
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

/**
 * @typedef {Object} EnvelopeSpec
 * @property {string} shape         one of SHAPES
 * @property {number} period        seconds; <= 0 follows the clock's global period
 * @property {number} phase         0–1 offset (a delay when clamped: 'once' mode or a single-cycle progress driver)
 * @property {number} min
 * @property {number} max
 * @property {number} duty          square/pulse width
 * @property {{a:number,d:number,s:number,r:number,hold:number}} adsr
 * @property {{vector:number[],random:number}} spatial  per-voxel phase (a per-voxel delay in 'once' mode)
 * @property {'loop'|'once'} mode   'once' plays one cycle per trigger(), then holds the end value
 * @property {string} [driver]      'time' | 'scroll' | 'pointer'; unset inherits the scene driver
 * @property {number} cycles        cycles across a progress driver's 0–1 range
 */

/** @type {EnvelopeSpec} */
export const DEFAULT_ENVELOPE = {
  shape: 'sine',
  period: 2,
  phase: 0,
  min: 0,
  max: 1,
  duty: 0.5,
  adsr: { a: 0.2, d: 0.2, s: 0.7, r: 0.4, hold: 0.4 },
  spatial: { vector: [0, 0, 0], random: 0 },
  mode: 'loop',
  driver: undefined,
  cycles: 1,
};

/** Deep-merge partial envelope specs left to right (adsr and spatial merge per key). */
export function mergeEnvelope(...specs) {
  /** @type {any} */
  const out = {};
  for (const s of specs) {
    if (!s) continue;
    for (const [k, v] of Object.entries(s)) {
      if (v === undefined) continue;
      if (k === 'adsr' || k === 'spatial') out[k] = { ...(out[k] || {}), ...v };
      else out[k] = v;
    }
  }
  return out;
}

/** @returns {EnvelopeSpec} */
export function normaliseEnvelope(spec = {}) {
  const m = mergeEnvelope(DEFAULT_ENVELOPE, spec);
  m.spatial = { vector: [...(m.spatial.vector || [0, 0, 0])], random: m.spatial.random ?? 0 };
  return m;
}

export class Envelope {
  /** @param {Partial<EnvelopeSpec>} [spec] */
  constructor(spec) {
    /** @type {EnvelopeSpec} */
    this.spec = normaliseEnvelope(spec);
    this.period = this.spec.period;
    /** Trigger time for 'once' mode; null = never triggered (holds the end value). */
    this.t0 = null;
    this._tp = 0;
    this._clamp = false;
    this._delay = false;
    this._pos = null;
    this._rand = null;
    this._vx = 0;
    this._vy = 0;
    this._vz = 0;
    this._vr = 0;
    this._fn = SHAPE_FNS.sine;
  }

  /** Replace the spec, keeping trigger state (used when props change). */
  setSpec(spec) {
    this.spec = normaliseEnvelope(spec);
  }

  /** Start a one-shot cycle at time t (ignored by progress drivers, which are positional). */
  trigger(t) {
    this.t0 = t;
  }

  /**
   * Whether a triggered 'once' cycle is still running at time t, including the
   * longest per-voxel delay (spatial phase), so a restart can't cut it short.
   * @param {number} t
   * @param {import('./model/VoxelModel.js').VoxelModel} [model]
   */
  playing(t, model) {
    if (this.spec.mode !== 'once' || this.t0 === null) return false;
    const period = this.spec.period > 0 ? this.spec.period : this.period;
    let maxDelay = this.spec.phase;
    if (model) {
      const [vx, vy, vz] = this.spec.spatial.vector;
      const { min, max } = model.bounds;
      maxDelay += Math.abs(vx) * Math.max(Math.abs(min[0]), Math.abs(max[0]))
        + Math.abs(vy) * Math.max(Math.abs(min[1]), Math.abs(max[1]))
        + Math.abs(vz) * Math.max(Math.abs(min[2]), Math.abs(max[2]))
        + Math.abs(this.spec.spatial.random);
    }
    return (t - this.t0) / period < 1 + maxDelay;
  }

  /**
   * Call once per frame before value(i).
   * @param {import('./Clock.js').FrameCtx} ctx
   * @param {import('./model/VoxelModel.js').VoxelModel | null} model
   */
  prepare(ctx, model) {
    const s = this.spec;
    this.period = s.period > 0 ? s.period : ctx.globalPeriod;
    const driver = s.driver || ctx.defaultDriver || 'time';
    const progress = driver !== 'time';
    const once = s.mode === 'once';

    let base;
    if (progress) {
      base = (ctx.drivers?.[driver] ?? 0) * s.cycles;
    } else if (once) {
      // Never triggered: past the end for every voxel, whatever its delay.
      base = this.t0 === null ? Infinity : (ctx.t - this.t0) / this.period;
    } else {
      base = ctx.t / this.period;
    }
    const clamp = once || (progress && s.cycles <= 1);
    this._tp = base + (clamp ? -s.phase : s.phase);
    // Positional drivers over a single cycle and one-shots clamp instead of wrapping,
    // and their spatial phase becomes a per-voxel delay (a stagger), so progress 0
    // is fully at rest and the start of a one-shot never jumps mid-cycle.
    this._clamp = once || (progress && s.cycles <= 1);
    this._delay = this._clamp;
    this._fn = SHAPE_FNS[s.shape] || SHAPE_FNS.sine;
    this._vx = s.spatial.vector[0];
    this._vy = s.spatial.vector[1];
    this._vz = s.spatial.vector[2];
    this._vr = s.spatial.random;
    this._pos = model ? model.basePos : null;
    this._rand = model ? model.rand : null;
  }

  _shape(p) {
    if (this._clamp) p = p < 0 ? 0 : p > 1 ? 1 : p;
    else p -= Math.floor(p);
    return this.spec.min + (this.spec.max - this.spec.min) * this._fn(p, this);
  }

  /** Envelope value for voxel i. */
  value(i) {
    let p = this._tp;
    if (this._pos) {
      const j = i * 3;
      const sp = this._pos[j] * this._vx + this._pos[j + 1] * this._vy + this._pos[j + 2] * this._vz + this._rand[i] * this._vr;
      p += this._delay ? -sp : sp;
    }
    return this._shape(p);
  }

  /** Value ignoring spatial phase (camera drift, UI previews). */
  valueGlobal() {
    return this._shape(this._tp);
  }
}
