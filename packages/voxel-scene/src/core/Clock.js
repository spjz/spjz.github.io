// Animation clock (DESIGN.md §7.1). Time is scaled, pausable and steppable.

/**
 * @typedef {Object} FrameCtx
 * @property {number} t            scaled seconds (or a custom driver's value)
 * @property {number} dt           scaled delta seconds
 * @property {number} frame
 * @property {number} cycle        fract(t / globalPeriod)
 * @property {number} globalPeriod
 * @property {string} [defaultDriver]  driver for envelopes that don't name one
 * @property {Record<string, number>} [drivers]  driver values: time (s), scroll/pointer (0–1)
 */

export class Clock {
  constructor() {
    this.t = 0;
    this.dt = 0;
    this.realDt = 0;
    this.frame = 0;
    this.timeScale = 1;
    this.paused = false;
    this.period = 2; // global cycle period, seconds
    this._last = null;
    this._stepPending = false;
    /** @type {FrameCtx} */
    this.ctx = { t: 0, dt: 0, frame: 0, cycle: 0, globalPeriod: this.period, defaultDriver: 'time', drivers: { time: 0, scroll: 0, pointer: 0 } };
  }

  step() {
    this._stepPending = true;
  }

  /** Advance by a timestamp (requestAnimationFrame style). */
  tick(nowMs) {
    const real = this._last === null ? 0 : (nowMs - this._last) / 1000;
    this._last = nowMs;
    return this.advance(real);
  }

  /** Advance by a real (unscaled) delta in seconds (R3F useFrame style). */
  advance(realDt) {
    const real = Math.min(Math.max(realDt, 0), 0.1);
    this.realDt = real;
    if (this._stepPending) {
      this.dt = (1 / 60) * this.timeScale;
      this._stepPending = false;
    } else {
      this.dt = this.paused ? 0 : real * this.timeScale;
    }
    this.t += this.dt;
    this.frame++;
    return this.sync();
  }

  /** Refresh ctx from the clock fields (also used after overriding t). */
  sync() {
    const c = this.ctx;
    c.t = this.t;
    c.dt = this.dt;
    c.frame = this.frame;
    c.globalPeriod = this.period;
    c.cycle = (((this.t / this.period) % 1) + 1) % 1;
    c.drivers.time = this.t;
    return c;
  }
}
