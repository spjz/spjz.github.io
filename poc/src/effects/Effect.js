// Effect contract (DESIGN.md §6.1).
//
// Subclass, set the static `type`, `schema`, `defaults` and `defaultEnvelope`,
// and implement apply(). The schema drives the UI panel and JSON presets, so a
// new effect needs no other wiring beyond EffectStack.register().
//
// Schema entry: { key, type: 'number'|'colour'|'select'|'bool'|'vec3', min, max, step, options, label }

import { Envelope } from '../core/Envelope.js';

let nextId = 1;

export class Effect {
  static type = 'Effect';
  static schema = [];
  static defaults = {};
  static defaultEnvelope = {};
  static defaultSelector = 'all';
  static needsInterior = false;

  constructor({ id, name, enabled = true, strength = 1, offsetStrength = 1, selector, envelope = {}, params = {}, offsetMode = 'add', scaleMode = 'multiply' } = {}) {
    const C = this.constructor;
    this.id = id || `${C.type}-${nextId++}`;
    this.name = name || C.type;
    this.enabled = enabled;
    this.strength = strength;
    this.offsetStrength = offsetStrength;
    this.selector = selector || C.defaultSelector;
    this.offsetMode = offsetMode; // 'add' | 'set'
    this.scaleMode = scaleMode; // 'multiply' | 'add' | 'set'
    this.params = structuredClone({ ...C.defaults, ...params });
    this.envelope = new Envelope({ ...structuredClone(C.defaultEnvelope), ...envelope });
  }

  get needsInterior() {
    return this.constructor.needsInterior;
  }

  /**
   * @param {object} work   { offset, scale, colour, alpha } typed arrays
   * @param {VoxelModel} model
   * @param {Uint32Array} indices  voxels selected by this.selector
   * @param {object} ctx    { t, dt, frame, cycle, globalPeriod }
   * @param {Envelope} env  call env.value(i) per voxel
   */
  // eslint-disable-next-line no-unused-vars
  apply(work, model, indices, ctx, env) {}

  // Channel writers that honour the blend modes (DESIGN.md §5.2).
  writeOffset(work, i, x, y, z) {
    const o = work.offset, j = i * 3, k = this.offsetStrength;
    if (this.offsetMode === 'set') {
      o[j] = x * k; o[j + 1] = y * k; o[j + 2] = z * k;
    } else {
      o[j] += x * k; o[j + 1] += y * k; o[j + 2] += z * k;
    }
  }

  /** Factors are multiplicative (1 = unchanged). */
  writeScale(work, i, fx, fy, fz) {
    const s = work.scale, j = i * 3;
    if (this.scaleMode === 'set') {
      s[j] = fx; s[j + 1] = fy; s[j + 2] = fz;
    } else if (this.scaleMode === 'add') {
      s[j] += fx - 1; s[j + 1] += fy - 1; s[j + 2] += fz - 1;
    } else {
      s[j] *= fx; s[j + 1] *= fy; s[j + 2] *= fz;
    }
  }

  toJSON() {
    return {
      type: this.constructor.type,
      id: this.id,
      name: this.name,
      enabled: this.enabled,
      strength: this.strength,
      offsetStrength: this.offsetStrength,
      selector: this.selector,
      offsetMode: this.offsetMode,
      scaleMode: this.scaleMode,
      params: structuredClone(this.params),
      envelope: structuredClone(this.envelope.spec),
    };
  }
}
