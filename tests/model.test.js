import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { buildFromSprite, buildFromVoxels, resolveSubject, spriteFromPixels, dragon, VoxelModel } from '../packages/voxel-scene/src/core/index.js';
import { FRONT } from '../poc/src/model/dragonSprite.js';

// Fingerprint of the vanilla PoC's extrudeDragon() (poc/src/model/Extruder.js),
// recorded 15/10/2026 before the port.
const POC_HASH = '1ce082a48e758db8d0085907dc5646f0cac5da24adb3e248f0cdd1e674a1ea25';

function fingerprint(m) {
  const rows = [];
  for (let i = 0; i < m.count; i++) {
    rows.push([m.basePos[i * 3], m.basePos[i * 3 + 1], m.basePos[i * 3 + 2], m.materials[m.material[i] - 1].ch, m.partNames[m.partId[i]], m.flags[i]].join(','));
  }
  return createHash('sha256').update(rows.sort().join('\n')).digest('hex');
}

describe('dragon subject', () => {
  const m = buildFromSprite(dragon);

  it('is voxel-for-voxel identical to the PoC', () => {
    expect(m.count).toBe(3906);
    expect(m.surfaceCount).toBe(1352);
    expect(fingerprint(m)).toBe(POC_HASH);
  });

  it('keeps the PoC pivots', () => {
    expect(m.parts.HEAD.pivot).toEqual([0, 15, 0]);
    expect(m.parts.BODY.pivot).toEqual([0, 0, 0]);
    expect(m.parts.TAIL.pivot).toEqual([0, 4, -3]);
    expect(m.parts.WING_L.pivot[0]).toBe(8);
    expect(m.parts.WING_R.pivot[0]).toBe(-8);
  });

  it('stands on y = 0, centred on x', () => {
    expect(m.bounds.min[1]).toBe(0);
    expect(m.bounds.min[0] + m.bounds.max[0]).toBe(0);
  });

  it('has a non-empty selection for every named selector', () => {
    for (const s of Object.keys(m.selectors)) expect(m.select(s).length, s).toBeGreaterThan(0);
    expect(m.select('part:TAIL').length).toBe(64);
    expect(m.select('material:e').length).toBe(8);
  });

  it('selects nothing (not everything) for unknown selector names', () => {
    const warn = console.warn;
    console.warn = () => {};
    expect(m.select('nope').length).toBe(0);
    console.warn = warn;
  });

  it('resolves by name and keeps sprite rows in sync with the PoC sprite', () => {
    expect(resolveSubject('dragon')).toBeInstanceOf(VoxelModel);
    expect(dragon.front).toEqual(FRONT);
  });
});

describe('voxels subject', () => {
  it('centres the footprint and rests on y = 0', () => {
    const m = buildFromVoxels([
      { x: 10, y: 5, z: 10, colour: '#ff0000' },
      { x: 11, y: 5, z: 10, colour: '#ff0000' },
      { x: 10, y: 6, z: 10, colour: 0x00ff00, part: 'TOP' },
    ]);
    expect(m.count).toBe(3);
    expect(m.bounds.min[1]).toBe(0);
    expect(m.bounds.min[0] + m.bounds.max[0]).toBe(0);
    expect(m.partNames).toEqual(['BODY', 'TOP']);
    expect(m.materials.map((x) => x.ch)).toEqual(['#ff0000', '#00ff00']);
  });
});

describe('spriteFromPixels', () => {
  // Minimal PNG decoder (8-bit RGBA, non-interlaced) for the reference image.
  function decode(file) {
    const buf = readFileSync(file);
    let p = 8, w, h;
    const idat = [];
    while (p < buf.length) {
      const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8);
      const data = buf.subarray(p + 8, p + 8 + len);
      if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); }
      if (type === 'IDAT') idat.push(data);
      p += 12 + len;
    }
    const raw = inflateSync(Buffer.concat(idat));
    const stride = w * 4, px = new Uint8Array(w * h * 4);
    let prev = new Uint8Array(stride);
    for (let y = 0; y < h; y++) {
      const f = raw[y * (stride + 1)];
      const line = Uint8Array.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
      for (let i = 0; i < stride; i++) {
        const a = i >= 4 ? line[i - 4] : 0, b = prev[i], c = i >= 4 ? prev[i - 4] : 0;
        const pr = f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : f === 4 ? (() => { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; })() : 0;
        line[i] = (line[i] + pr) & 255;
      }
      px.set(line, y * stride);
      prev = line;
    }
    return { w, h, px };
  }

  it('reproduces the PoC tool draft with the reference palette', () => {
    const { w, h, px } = decode(new URL('../iamadragon.png', import.meta.url));
    const palette = [
      { ch: 'G', rgb: [168, 212, 0] }, { ch: 'w', rgb: [0, 128, 0] }, { ch: 'y', rgb: [255, 217, 90] },
      { ch: 't', rgb: [136, 168, 0] }, { ch: 'r', rgb: [255, 0, 0] }, { ch: '#', rgb: [0, 0, 0] },
    ];
    const { rows } = spriteFromPixels(px, w, h, { columns: 32, palette });
    expect(rows).toHaveLength(32);
    expect(rows[0]).toBe('..........................GGG...');
    expect(rows[24]).toBe('#w.wwwwwwwwGGGGyyyGGGGG..w......');
  });

  it('auto-quantises without a palette', () => {
    const { w, h, px } = decode(new URL('../iamadragon.png', import.meta.url));
    const { rows, palette } = spriteFromPixels(px, w, h, { columns: 16, colours: 6 });
    expect(rows).toHaveLength(16);
    expect(palette.length).toBeGreaterThan(2);
    expect(palette.some((p) => p.ch === '#')).toBe(true);
    const m = buildFromSprite({ front: rows, palette: palette.map((p) => ({ ch: p.ch, hex: (p.rgb[0] << 16) | (p.rgb[1] << 8) | p.rgb[2] })) });
    expect(m.count).toBeGreaterThan(100);
  });
});
