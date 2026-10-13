#!/usr/bin/env node
// Headless check of model + effect pipeline (no Three.js): node tools/smoke.mjs
import { extrudeDragon } from '../src/model/Extruder.js';
import { EffectStack } from '../src/effects/index.js';
import { compose } from '../src/render/Composer.js';
import { Clock } from '../src/core/Clock.js';
import { PRESETS } from '../src/ui/presets.js';
import { PARTS, SELECTORS } from '../src/model/palette.js';

let failures = 0;
const check = (cond, msg) => {
  if (!cond) { failures++; console.error('FAIL', msg); }
};

const model = extrudeDragon();
console.log(`voxels: ${model.count} total, ${model.surfaceCount} surface, ${model.count - model.surfaceCount} interior`);
console.log('bounds', model.bounds);
for (const p of PARTS) console.log(`  ${p.padEnd(7)} ${String(model.select({ parts: [p] }).length).padStart(5)} voxels  pivot ${model.parts[p].pivot.map((v) => v.toFixed(1)).join(', ')}`);
for (const s of Object.keys(SELECTORS)) check(model.select(s).length > 0, `selector ${s} is empty`);
check(model.bounds.min[1] === 0, 'feet should rest on y = 0');
check(Math.abs(model.bounds.min[0] + model.bounds.max[0]) < 1e-6, 'model should be centred on x');

const matrices = new Float32Array(model.count * 16);
const colours = new Float32Array(model.count * 3);
const stack = new EffectStack(model);

// Identity stack must reproduce the base model exactly (delivery plan step 4).
const clock = new Clock();
let ctx = clock.tick(0);
let work = stack.run(ctx);
compose(model, work, matrices, colours, { includeInterior: true });
let identityOk = true;
for (let i = 0; i < model.count; i++) {
  for (let a = 0; a < 3; a++) {
    if (matrices[i * 16 + 12 + a] !== model.basePos[i * 3 + a]) identityOk = false;
    if (Math.abs(colours[i * 3 + a] - model.baseColour[i * 3 + a]) > 1e-6) identityOk = false;
  }
  if (matrices[i * 16] !== 1) identityOk = false;
}
check(identityOk, 'identity stack should equal base model');

// Every effect type alone, and every preset, over 120 frames: all finite.
const runs = [
  ...EffectStack.types.map((t) => [`effect ${t}`, [{ type: t }]]),
  ...Object.entries(PRESETS).map(([n, p]) => [`preset ${n}`, p.effects]),
];
for (const [label, effects] of runs) {
  stack.load(effects);
  const c = new Clock();
  let worst = 0, moved = false;
  for (let f = 0; f < 120; f++) {
    ctx = c.tick(f * 16.67);
    work = stack.run(ctx);
    worst = Math.max(worst, stack.lastMs);
    compose(model, work, matrices, colours, { includeInterior: stack.needsInterior });
    for (let i = 0; i < matrices.length; i++) if (!Number.isFinite(matrices[i])) { check(false, `${label}: non-finite matrix`); break; }
    for (let i = 0; i < colours.length; i++) if (!Number.isFinite(colours[i])) { check(false, `${label}: non-finite colour`); break; }
    if (!moved) {
      for (let i = 0; i < work.offset.length && !moved; i++) if (work.offset[i] !== 0) moved = true;
      for (let i = 0; i < work.scale.length && !moved; i++) if (work.scale[i] !== 1) moved = true;
      for (let i = 0; i < work.colour.length && !moved; i++) if (work.colour[i] !== model.baseColour[i]) moved = true;
    }
  }
  check(moved, `${label}: had no visible effect`);
  // Round-trip through JSON.
  const json = JSON.stringify(stack.toJSON());
  stack.load(JSON.parse(json));
  check(JSON.stringify(stack.toJSON()) === json, `${label}: JSON round-trip changed state`);
  console.log(`  ${label.padEnd(26)} worst ${worst.toFixed(2)} ms`);
}

console.log(failures ? `\n${failures} failure(s)` : '\nall checks passed');
process.exit(failures ? 1 : 0);
