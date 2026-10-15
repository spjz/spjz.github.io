import { describe, expect, it } from 'vitest';
import { lookAngles } from '../packages/voxel-scene/src/core/look.js';

const DEG = Math.PI / 180;

describe('lookAngles', () => {
  it('faces straight ahead for a target in front', () => {
    expect(lookAngles(0, 0, 10)).toEqual({ yaw: 0, pitch: -0 });
  });

  it('turns towards +x with positive yaw', () => {
    expect(lookAngles(10, 0, 10).yaw).toBeCloseTo(45 * DEG);
    expect(lookAngles(-10, 0, 10).yaw).toBeCloseTo(-45 * DEG);
  });

  it('looks up with negative pitch (Three.js right-handed X rotation)', () => {
    const { pitch } = lookAngles(0, 2, 10);
    expect(pitch).toBeLessThan(0);
    // Rx(pitch) applied to the facing vector (0,0,1) must point upwards.
    expect(-Math.sin(pitch)).toBeGreaterThan(0);
  });

  it('clamps to the configured limits', () => {
    const { yaw, pitch } = lookAngles(100, -100, 1, 60, 20);
    expect(yaw).toBeCloseTo(60 * DEG);
    expect(pitch).toBeCloseTo(20 * DEG);
  });

  it('does not flip for targets behind (clamped to the nearer side)', () => {
    expect(lookAngles(1, 0, -10, 60).yaw).toBeCloseTo(60 * DEG);
    expect(lookAngles(-1, 0, -10, 60).yaw).toBeCloseTo(-60 * DEG);
  });

  it('is neutral for a zero direction', () => {
    expect(lookAngles(0, 0, 0)).toEqual({ yaw: 0, pitch: 0 });
  });
});
