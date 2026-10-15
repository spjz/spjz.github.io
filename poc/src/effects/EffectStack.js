// Ordered effect list + per-frame work buffers (DESIGN.md §5).

const registry = new Map();

export class EffectStack {
  static register(...classes) {
    for (const C of classes) registry.set(C.type, C);
  }

  static get types() {
    return [...registry.keys()];
  }

  constructor(model) {
    this.model = model;
    this.effects = [];
    this.soloId = null;
    this.lastMs = 0;
    const n = model.count;
    this.work = {
      offset: new Float32Array(n * 3),
      scale: new Float32Array(n * 3),
      colour: new Float32Array(n * 3),
      alpha: new Float32Array(n),
    };
  }

  create(json) {
    const C = registry.get(json.type);
    if (!C) throw new Error(`Unknown effect type: ${json.type}`);
    return new C(json);
  }

  add(typeOrJson, opts = {}) {
    const json = typeof typeOrJson === 'string' ? { type: typeOrJson, ...opts } : typeOrJson;
    const e = this.create(json);
    this.effects.push(e);
    return e;
  }

  remove(effect) {
    this.effects = this.effects.filter((e) => e !== effect);
    if (this.soloId === effect.id) this.soloId = null;
  }

  move(effect, dir) {
    const i = this.effects.indexOf(effect);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= this.effects.length) return;
    [this.effects[i], this.effects[j]] = [this.effects[j], this.effects[i]];
  }

  toggleSolo(effect) {
    this.soloId = this.soloId === effect.id ? null : effect.id;
  }

  isActive(e) {
    return this.soloId ? e.id === this.soloId : e.enabled;
  }

  get needsInterior() {
    return this.effects.some((e) => this.isActive(e) && e.needsInterior);
  }

  /** Reset work buffers from base, then run every active effect in order. */
  run(ctx) {
    const t0 = performance.now();
    const { model, work } = this;
    work.offset.fill(0);
    work.scale.fill(1);
    work.colour.set(model.baseColour);
    work.alpha.fill(1);
    for (const e of this.effects) {
      if (!this.isActive(e) || e.strength === 0) continue;
      e.envelope.prepare(ctx, model);
      e.apply(work, model, model.select(e.selector), ctx, e.envelope);
    }
    this.lastMs = performance.now() - t0;
    return work;
  }

  clear() {
    this.effects = [];
    this.soloId = null;
  }

  toJSON() {
    return this.effects.map((e) => e.toJSON());
  }

  load(list) {
    this.clear();
    for (const json of list) this.add(json);
  }
}
