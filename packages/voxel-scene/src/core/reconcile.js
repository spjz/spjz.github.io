// Effects-prop → EffectStack diffing (REACT_DESIGN.md §5.2).
//
// Inline `effects={[...]}` arrays get a new identity on every render. Rather
// than rebuild, we match by id and patch only the instances whose spec actually
// changed. Instances survive (envelope trigger state, debug-panel edits) until
// their own spec changes.

import { getEffectClass } from './effects/EffectStack.js';
import { mergeEnvelope } from './Envelope.js';

/** @param {import('./effects/Effect.js').EffectSpec} spec @param {number} index */
export function specId(spec, index) {
  if (spec.id) return spec.id;
  const t = typeof spec.type === 'function' ? spec.type.type : spec.type;
  return `${t}-${index}`;
}

/** JSON hash of a spec (the type class is replaced by its name before hashing). */
function keyOf(spec) {
  return JSON.stringify(spec);
}

/**
 * @param {import('./effects/Effect.js').Effect} e
 * @param {import('./effects/Effect.js').EffectSpec} spec
 */
export function patchEffect(e, spec) {
  const C = /** @type {typeof import('./effects/Effect.js').Effect} */ (e.constructor);
  e.name = spec.name ?? C.type;
  e.enabled = spec.enabled ?? true;
  e.strength = spec.strength ?? 1;
  e.offsetStrength = spec.offsetStrength ?? 1;
  e.selector = spec.selector ?? C.defaultSelector;
  e.offsetMode = spec.offsetMode ?? 'add';
  e.scaleMode = spec.scaleMode ?? 'multiply';
  // Mutate params in place so UI bindings to the object stay valid.
  for (const k of Object.keys(e.params)) delete e.params[k];
  Object.assign(e.params, structuredClone({ ...C.defaults, ...(spec.params || {}) }));
  e.envelope.setSpec(mergeEnvelope(C.defaultEnvelope, spec.envelope));
}

/**
 * @param {import('./effects/EffectStack.js').EffectStack} stack
 * @param {import('./effects/Effect.js').EffectSpec[]} specs
 * @param {{ envelope?: Partial<import('./Envelope.js').EnvelopeSpec> }} [defaults]
 *   envelope: scene-wide defaults, layered between the class default and the spec's own envelope
 * @returns {{ created: number, patched: number, kept: number, removed: number }}
 */
export function reconcileStack(stack, specs, defaults = {}) {
  const prev = new Map(stack.effects.map((e) => [e.id, e]));
  const next = [];
  const stats = { created: 0, patched: 0, kept: 0, removed: 0 };
  specs.forEach((raw, index) => {
    const id = specId(raw, index);
    const C = getEffectClass(raw.type);
    const spec = { ...raw, id, type: C, envelope: mergeEnvelope(defaults.envelope, raw.envelope) };
    const key = keyOf({ ...spec, type: C.type });
    let e = prev.get(id);
    if (e && e.constructor === C) {
      prev.delete(id);
      if (e.specKey !== key) {
        // Class defaults sit under scene defaults, which sit under the spec.
        patchEffect(e, spec);
        stats.patched++;
      } else stats.kept++;
    } else {
      e = stack.create(spec);
      stats.created++;
    }
    e.specKey = key;
    next.push(e);
  });
  stats.removed = prev.size;
  stack.effects = next;
  if (stack.soloId && !next.some((e) => e.id === stack.soloId)) stack.soloId = null;
  return stats;
}
