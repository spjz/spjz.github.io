// Port of the PoC's tools/smoke.mjs.
import { describe, expect, it } from 'vitest';
import { buildFromSprite, Clock, compose, dragon, EffectStack, effectTypes, PRESETS } from '../packages/voxel-scene/src/core/index.js';

const model = buildFromSprite(dragon);
const matrices = new Float32Array(model.count * 16);
const colours = new Float32Array(model.count * 3);

describe('pipeline', () => {
  it('identity stack reproduces the base model exactly', () => {
    const stack = new EffectStack(model);
    const work = stack.run(new Clock().tick(0));
    compose(model, work, matrices, colours, { includeInterior: true });
    for (let i = 0; i < model.count; i++) {
      for (let a = 0; a < 3; a++) {
        expect(matrices[i * 16 + 12 + a]).toBe(model.basePos[i * 3 + a]);
        expect(colours[i * 3 + a]).toBeCloseTo(model.baseColour[i * 3 + a], 6);
      }
      expect(matrices[i * 16]).toBe(1);
    }
  });

  it('compose draws only the surface unless asked', () => {
    const stack = new EffectStack(model);
    const work = stack.run(new Clock().tick(0));
    expect(compose(model, work, matrices, colours)).toBe(model.surfaceCount);
    expect(compose(model, work, matrices, colours, { includeInterior: true })).toBe(model.count);
  });

  const runs = [
    ...effectTypes().map((t) => [`effect ${t}`, [{ type: t }]]),
    ...Object.entries(PRESETS).map(([n, p]) => [`preset ${n}`, p.effects]),
  ];

  it.each(runs)('%s: finite, visible, JSON round-trips', (_label, effects) => {
    const stack = new EffectStack(model);
    stack.load(effects);
    const clock = new Clock();
    let moved = false;
    for (let f = 0; f < 120; f++) {
      const work = stack.run(clock.tick(f * 16.67));
      compose(model, work, matrices, colours, { includeInterior: stack.needsInterior });
      expect(matrices.every(Number.isFinite)).toBe(true);
      expect(colours.every(Number.isFinite)).toBe(true);
      if (!moved) {
        moved = work.offset.some((v) => v !== 0) || work.scale.some((v) => v !== 1) || work.colour.some((v, i) => v !== model.baseColour[i]);
      }
    }
    expect(moved).toBe(true);
    const json = JSON.stringify(stack.toJSON());
    stack.load(JSON.parse(json));
    expect(JSON.stringify(stack.toJSON())).toBe(json);
  });

  it('runs a full preset well inside the frame budget', () => {
    const stack = new EffectStack(model);
    stack.load(PRESETS.Party.effects);
    const clock = new Clock();
    for (let f = 0; f < 30; f++) stack.run(clock.tick(f * 16.67)); // warm-up JIT
    let total = 0;
    for (let f = 30; f < 130; f++) {
      stack.run(clock.tick(f * 16.67));
      total += stack.lastMs;
    }
    expect(total / 100).toBeLessThan(4);
  });
});
