import { describe, expect, it } from 'vitest';
import { Envelope } from '../packages/voxel-scene/src/core/index.js';

const ctx = (t, extra = {}) => ({ t, dt: 0, frame: 0, cycle: 0, globalPeriod: 2, defaultDriver: 'time', drivers: { time: t, scroll: 0, pointer: 0 }, ...extra });

describe('Envelope', () => {
  it('loops shapes over the period', () => {
    const e = new Envelope({ shape: 'triangle', period: 2 });
    const at = (t) => (e.prepare(ctx(t), null), e.valueGlobal());
    expect(at(0)).toBe(0);
    expect(at(1)).toBe(1);
    expect(at(0.5)).toBe(0.5);
    expect(at(2.5)).toBe(0.5); // wrapped
  });

  it('follows the global period when period <= 0', () => {
    const e = new Envelope({ shape: 'saw', period: 0 });
    e.prepare(ctx(1, { globalPeriod: 4 }), null);
    expect(e.valueGlobal()).toBe(0.25);
  });

  it('remaps to [min, max]', () => {
    const e = new Envelope({ shape: 'saw', period: 1, min: 2, max: 4 });
    e.prepare(ctx(0.5), null);
    expect(e.valueGlobal()).toBe(3);
  });

  it("'once' holds the end value until triggered, plays one cycle, then holds again", () => {
    const e = new Envelope({ shape: 'triangle', period: 1, mode: 'once' });
    const at = (t) => (e.prepare(ctx(t), null), e.valueGlobal());
    expect(at(5)).toBe(0); // never triggered: end value
    e.trigger(10);
    expect(at(10)).toBe(0);
    expect(at(10.5)).toBe(1);
    expect(at(10.75)).toBe(0.5);
    expect(at(12)).toBe(0); // held, not wrapped
  });

  it('progress drivers clamp across a single cycle and wrap across several', () => {
    const e = new Envelope({ shape: 'saw', driver: 'scroll' });
    const at = (scroll) => (e.prepare(ctx(0, { drivers: { time: 0, scroll, pointer: 0 } }), null), e.valueGlobal());
    expect(at(0)).toBe(0);
    expect(at(0.5)).toBe(0.5);
    expect(at(1)).toBe(1); // clamped, not wrapped to 0
    e.setSpec({ shape: 'saw', driver: 'scroll', cycles: 2 });
    expect(at(0.75)).toBe(0.5);
  });

  it('inherits the scene default driver', () => {
    const e = new Envelope({ shape: 'saw' });
    e.prepare(ctx(0, { defaultDriver: 'pointer', drivers: { time: 0, scroll: 0, pointer: 0.25 } }), null);
    expect(e.valueGlobal()).toBe(0.25);
  });

  it('staggers (never pre-advances) voxels on a single-cycle progress driver', () => {
    const model = { basePos: new Float32Array([0, 0, 0, 0, 10, 0]), rand: new Float32Array([0, 1]) };
    const e = new Envelope({ shape: 'saw', driver: 'scroll', spatial: { vector: [0, 0, 0], random: 0.2 } });
    const at = (scroll, i) => (e.prepare(ctx(0, { drivers: { time: 0, scroll, pointer: 0 } }), model), e.value(i));
    expect(at(0, 0)).toBe(0);
    expect(at(0, 1)).toBe(0); // random phase must not scatter voxels at rest
    expect(at(0.5, 1)).toBeCloseTo(0.3);
  });

  it('turns spatial phase into a per-voxel delay in once mode', () => {
    const model = { basePos: new Float32Array([0, 0, 0, 0, 10, 0]), rand: new Float32Array([0, 0]) };
    const e = new Envelope({ shape: 'saw', period: 1, mode: 'once', spatial: { vector: [0, 0.05, 0], random: 0 } });
    e.trigger(0);
    e.prepare(ctx(0.5), model);
    expect(e.value(0)).toBe(0.5);
    expect(e.value(1)).toBe(0); // 0.5 cycles of delay → not started yet
  });

  it('reports a once cycle as playing until its last (most delayed) voxel finishes', () => {
    const model = { bounds: { min: [-1, 0, -1], max: [1, 10, 1] } };
    const e = new Envelope({ shape: 'saw', period: 2, mode: 'once', spatial: { vector: [0, 0.05, 0], random: 0 } });
    expect(e.playing(0, model)).toBe(false); // never triggered
    e.trigger(10);
    expect(e.playing(11, model)).toBe(true);
    expect(e.playing(12.5, model)).toBe(true); // top voxel delayed by 0.5 cycles = 1 s
    expect(e.playing(13.01, model)).toBe(false);
    expect(new Envelope({ shape: 'saw', mode: 'loop' }).playing(0)).toBe(false);
  });

  it('holds every voxel at the end value before the first trigger, regardless of delay', () => {
    const model = { basePos: new Float32Array([0, 0, 0, 0, 10, 0]), rand: new Float32Array([0, 1]) };
    const e = new Envelope({ shape: 'triangle', period: 1, mode: 'once', spatial: { vector: [0, 0.05, 0], random: 0.3 } });
    e.prepare(ctx(3), model);
    expect(e.value(0)).toBe(0);
    expect(e.value(1)).toBe(0);
  });
});
