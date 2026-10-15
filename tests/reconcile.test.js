import { describe, expect, it } from 'vitest';
import { buildFromSprite, defineEffect, dragon, EffectStack, reconcileStack, registerEffect, Clock } from '../packages/voxel-scene/src/core/index.js';

const model = buildFromSprite(dragon);

describe('reconcileStack', () => {
  it('keeps instances when an inline array is re-created with the same specs', () => {
    const stack = new EffectStack(model);
    const make = () => [{ id: 'a', type: 'Bob' }, { id: 'b', type: 'Blink' }];
    reconcileStack(stack, make());
    const [a, b] = stack.effects;
    const stats = reconcileStack(stack, make());
    expect(stack.effects[0]).toBe(a);
    expect(stack.effects[1]).toBe(b);
    expect(stats).toEqual({ created: 0, patched: 0, kept: 2, removed: 0 });
  });

  it('patches changed fields in place, preserving the params object', () => {
    const stack = new EffectStack(model);
    reconcileStack(stack, [{ id: 'a', type: 'Bob', params: { height: 1 } }]);
    const e = stack.effects[0];
    const paramsRef = e.params;
    const stats = reconcileStack(stack, [{ id: 'a', type: 'Bob', strength: 0.5, params: { height: 3 } }]);
    expect(stats.patched).toBe(1);
    expect(stack.effects[0]).toBe(e);
    expect(e.params).toBe(paramsRef);
    expect(e.params.height).toBe(3);
    expect(e.strength).toBe(0.5);
  });

  it('does not clobber live (debug panel) edits while the spec is unchanged', () => {
    const stack = new EffectStack(model);
    const specs = () => [{ id: 'a', type: 'Bob', params: { height: 1 } }];
    reconcileStack(stack, specs());
    stack.effects[0].params.height = 9; // edited live
    reconcileStack(stack, specs());
    expect(stack.effects[0].params.height).toBe(9);
  });

  it('creates, removes and reorders by id', () => {
    const stack = new EffectStack(model);
    reconcileStack(stack, [{ id: 'a', type: 'Bob' }, { id: 'b', type: 'Blink' }]);
    const b = stack.effects[1];
    const stats = reconcileStack(stack, [{ id: 'b', type: 'Blink' }, { id: 'c', type: 'Jitter' }]);
    expect(stack.effects.map((e) => e.id)).toEqual(['b', 'c']);
    expect(stack.effects[0]).toBe(b);
    expect(stats).toEqual({ created: 1, patched: 0, kept: 1, removed: 1 });
  });

  it('recreates an effect whose type changed under the same id', () => {
    const stack = new EffectStack(model);
    reconcileStack(stack, [{ id: 'a', type: 'Bob' }]);
    const old = stack.effects[0];
    reconcileStack(stack, [{ id: 'a', type: 'Jitter' }]);
    expect(stack.effects[0]).not.toBe(old);
    expect(stack.effects[0].constructor.type).toBe('Jitter');
  });

  it('derives ids from type + index when none are given', () => {
    const stack = new EffectStack(model);
    reconcileStack(stack, [{ type: 'Bob' }, { type: 'Bob' }]);
    expect(stack.effects.map((e) => e.id)).toEqual(['Bob-0', 'Bob-1']);
  });

  it('layers envelopes: class default < scene default < spec', () => {
    const stack = new EffectStack(model);
    reconcileStack(stack, [{ id: 'b', type: 'Blink' }, { id: 'c', type: 'Blink', envelope: { period: 9 } }], { envelope: { period: 5, phase: 0.3 } });
    const [b, c] = stack.effects;
    expect(b.envelope.spec.shape).toBe('pulse'); // class default survives
    expect(b.envelope.spec.period).toBe(5); // scene default
    expect(c.envelope.spec.period).toBe(9); // spec wins
    expect(c.envelope.spec.phase).toBe(0.3);
  });

  it('trigger(restart: false) ignores a re-trigger while the cycle is still playing', () => {
    const stack = new EffectStack(model);
    reconcileStack(stack, [{ id: 'boom', type: 'Explode', envelope: { mode: 'once', period: 1 } }]);
    const clock = new Clock();
    let ms = 0;
    const advanceTo = (end) => { for (; ms <= end; ms += 16) stack.run(clock.tick(ms)); }; // Clock clamps big jumps
    advanceTo(0);
    expect(stack.trigger('boom', { restart: false })).toBe(true);
    const t0 = stack.effects[0].envelope.t0;
    advanceTo(500);
    expect(stack.trigger('boom', { restart: false })).toBe(false);
    expect(stack.effects[0].envelope.t0).toBe(t0);
    advanceTo(1600);
    expect(stack.trigger('boom', { restart: false })).toBe(true);
    expect(stack.trigger('nope')).toBe(false);
  });

  it('accepts defineEffect classes inline and by registered name', () => {
    const Sink = defineEffect({
      type: 'Sink',
      defaults: { depth: 2 },
      defaultEnvelope: { shape: 'constant' },
      apply(work, _m, idx, _ctx, env) {
        for (const i of idx) this.writeOffset(work, i, 0, -this.params.depth * env.value(i), 0);
      },
    });
    const stack = new EffectStack(model);
    reconcileStack(stack, [{ id: 's', type: Sink }]);
    const work = stack.run(new Clock().tick(0));
    expect(work.offset[1]).toBe(-2);
    registerEffect(Sink);
    reconcileStack(stack, [{ id: 's', type: 'Sink', params: { depth: 4 } }]);
    expect(stack.run(new Clock().tick(0)).offset[1]).toBe(-4);
  });
});
