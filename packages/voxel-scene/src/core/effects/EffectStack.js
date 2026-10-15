// Ordered effect list + per-frame work buffers (DESIGN.md §5).

import { Effect } from './Effect.js';

/** @type {Map<string, typeof Effect>} */
const registry = new Map();

/** Make effect classes addressable by their `type` name (JSON presets need this). */
export function registerEffect(...classes) {
  for (const C of classes) registry.set(C.type, C);
}

/** @returns {string[]} */
export function effectTypes() {
  return [...registry.keys()];
}

/** @param {string | typeof Effect} type */
export function getEffectClass(type) {
  if (typeof type === 'function') return type;
  const C = registry.get(type);
  if (!C) throw new Error(`[voxel-scene] unknown effect type "${type}"; registered: ${effectTypes().join(', ')}`);
  return C;
}

export class EffectStack {
  /** @param {import('../model/VoxelModel.js').VoxelModel} model */
  constructor(model) {
    this.model = model;
    /** @type {Effect[]} */
    this.effects = [];
    /** @type {string|null} */
    this.soloId = null;
    this.lastMs = 0;
    this.lastT = 0;
    const n = model.count;
    /** @type {import('./Effect.js').WorkBuffers} */
    this.work = {
      offset: new Float32Array(n * 3),
      scale: new Float32Array(n * 3),
      colour: new Float32Array(n * 3),
      alpha: new Float32Array(n),
    };
  }

  /** @param {import('./Effect.js').EffectSpec} spec */
  create(spec) {
    const C = getEffectClass(spec.type);
    return new C(spec);
  }

  /**
   * @param {string | import('./Effect.js').EffectSpec} typeOrSpec
   * @param {Partial<import('./Effect.js').EffectSpec>} [opts]
   */
  add(typeOrSpec, opts = {}) {
    const spec = typeof typeOrSpec === 'string' ? { type: typeOrSpec, ...opts } : typeOrSpec;
    const e = this.create(spec);
    this.effects.push(e);
    return e;
  }

  /** @param {string} idOrName */
  get(idOrName) {
    return this.effects.find((e) => e.id === idOrName) || this.effects.find((e) => e.name === idOrName);
  }

  /** @param {Effect} effect */
  remove(effect) {
    this.effects = this.effects.filter((e) => e !== effect);
    if (this.soloId === effect.id) this.soloId = null;
  }

  /** @param {Effect} effect @param {number} dir */
  move(effect, dir) {
    const i = this.effects.indexOf(effect);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= this.effects.length) return;
    [this.effects[i], this.effects[j]] = [this.effects[j], this.effects[i]];
  }

  /** @param {Effect} effect */
  toggleSolo(effect) {
    this.soloId = this.soloId === effect.id ? null : effect.id;
  }

  /** @param {Effect} e */
  isActive(e) {
    return this.soloId ? e.id === this.soloId : e.enabled;
  }

  get needsInterior() {
    return this.effects.some((e) => this.isActive(e) && e.needsInterior);
  }

  /**
   * Start a one-shot ('once' mode) cycle. Returns false if there is no such
   * effect, or if `restart` is false and a cycle is still playing.
   * @param {string} idOrName
   * @param {{ restart?: boolean }} [opts]  restart (default true) cuts a running cycle short
   */
  trigger(idOrName, { restart = true } = {}) {
    const e = this.get(idOrName);
    if (!e) return false;
    if (!restart && e.envelope.playing(this.lastT, this.model)) return false;
    e.envelope.trigger(this.lastT);
    return true;
  }

  /**
   * Reset work buffers from base, then run every active effect in order.
   * @param {import('../Clock.js').FrameCtx} ctx
   */
  run(ctx) {
    const t0 = performance.now();
    const { model, work } = this;
    this.lastT = ctx.t;
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

  /** @param {import('./Effect.js').EffectSpec[]} list */
  load(list) {
    this.clear();
    for (const spec of list) this.add(spec);
  }
}
