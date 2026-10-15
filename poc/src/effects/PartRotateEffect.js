import { Effect } from './Effect.js';
import { PARTS } from '../model/palette.js';

/**
 * Rigid part rotation as cell translation (DESIGN.md §6.2): each voxel moves to
 * its rotated position about the part pivot but the cube stays axis-aligned.
 * offset = rotate(base − pivot) − (base − pivot)
 */
export class PartRotateEffect extends Effect {
  static type = 'PartRotate';
  static defaultSelector = 'wings';
  static schema = [
    { key: 'axis', type: 'vec3', min: -1, max: 1, step: 0.05 },
    { key: 'angle', type: 'number', min: 0, max: 180, step: 1, label: 'angle (°)' },
    { key: 'bipolar', type: 'bool', label: 'bipolar (−1…1)' },
    { key: 'mirrorX', type: 'bool', label: 'mirror by side' },
  ];
  static defaults = { axis: [0, 1, 0], angle: 35, bipolar: true, mirrorX: true };
  static defaultEnvelope = { shape: 'sine', period: 1.2 };

  apply(work, model, indices, ctx, env) {
    const { axis, angle, bipolar, mirrorX } = this.params;
    const len = Math.hypot(axis[0], axis[1], axis[2]) || 1;
    const kx = axis[0] / len, ky = axis[1] / len, kz = axis[2] / len;
    const maxRad = (angle * Math.PI * this.strength) / 180;
    const pos = model.basePos, partId = model.partId;
    const pivots = PARTS.map((p) => model.parts[p].pivot); // indexed by part id

    for (const i of indices) {
      const pv = pivots[partId[i]];
      const sign = mirrorX && pv[0] < 0 ? -1 : 1;
      const v = env.value(i);
      const th = sign * maxRad * (bipolar ? v * 2 - 1 : v);
      const c = Math.cos(th), s = Math.sin(th);
      const j = i * 3;
      const rx = pos[j] - pv[0], ry = pos[j + 1] - pv[1], rz = pos[j + 2] - pv[2];
      // Rodrigues: v' = v cosθ + (k × v) sinθ + k (k·v)(1 − cosθ)
      const dot = (kx * rx + ky * ry + kz * rz) * (1 - c);
      const nx = rx * c + (ky * rz - kz * ry) * s + kx * dot;
      const ny = ry * c + (kz * rx - kx * rz) * s + ky * dot;
      const nz = rz * c + (kx * ry - ky * rx) * s + kz * dot;
      this.writeOffset(work, i, nx - rx, ny - ry, nz - rz);
    }
  }
}
