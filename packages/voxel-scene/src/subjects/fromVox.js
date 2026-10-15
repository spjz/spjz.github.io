// `vox` subject: MagicaVoxel .vox via three's VOXLoader (REACT_DESIGN.md §10).
// MagicaVoxel is z-up with the model's front facing −y; we map to y-up, front +z.
// Lazy-loaded by resolveSubject so the loader never ships unless used.

import { VOXLoader } from 'three/addons/loaders/VOXLoader.js';
import { buildFromVoxels } from '../core/model/buildFromVoxels.js';

/** @param {import('./index.js').VoxSubject} def */
export async function buildFromVox(def) {
  const buffer = await (await fetch(def.src)).arrayBuffer();
  const result = new VOXLoader().parse(buffer);
  const chunk = result.chunks[def.model ?? 0];
  if (!chunk) throw new Error(`[voxel-scene] ${def.src} has no model #${def.model ?? 0}`);
  const { data, palette } = chunk;
  const voxels = [];
  for (let j = 0; j < data.length; j += 4) {
    const rgba = palette[data[j + 3]];
    voxels.push({
      x: data[j],
      y: data[j + 2],
      z: -data[j + 1],
      colour: ((rgba & 0xff) << 16) | (((rgba >> 8) & 0xff) << 8) | ((rgba >> 16) & 0xff),
    });
  }
  return buildFromVoxels(voxels);
}
