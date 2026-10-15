// Animation clock (DESIGN.md §7.1). Time is scaled, pausable and steppable.

export class Clock {
  constructor() {
    this.t = 0;
    this.dt = 0;
    this.frame = 0;
    this.timeScale = 1;
    this.paused = false;
    this.period = 2; // global cycle period, seconds
    this._last = null;
    this._stepPending = false;
    this.ctx = { t: 0, dt: 0, frame: 0, cycle: 0, globalPeriod: this.period };
  }

  step() {
    this._stepPending = true;
  }

  tick(nowMs) {
    const real = this._last === null ? 0 : Math.min((nowMs - this._last) / 1000, 0.1);
    this._last = nowMs;
    this.realDt = real; // unscaled, unpaused (camera uses this)
    if (this._stepPending) {
      this.dt = (1 / 60) * this.timeScale;
      this._stepPending = false;
    } else {
      this.dt = this.paused ? 0 : real * this.timeScale;
    }
    this.t += this.dt;
    this.frame++;
    const c = this.ctx;
    c.t = this.t;
    c.dt = this.dt;
    c.frame = this.frame;
    c.globalPeriod = this.period;
    c.cycle = (this.t / this.period) % 1;
    return c;
  }
}
