// Subject registry + resolution (REACT_DESIGN.md §7).
// Synchronous kinds ('sprite', 'voxels', a VoxelModel) build immediately;
// 'image' and 'vox' return a Promise (the React layer suspends on it).

import { VoxelModel } from '../core/model/VoxelModel.js';
import { buildFromSprite } from '../core/model/buildFromSprite.js';
import { buildFromVoxels } from '../core/model/buildFromVoxels.js';
import { dragon } from './dragon.js';

/**
 * @typedef {import('../core/model/buildFromSprite.js').SpriteDef & { kind?: 'sprite' }} SpriteSubject
 * @typedef {{ kind: 'voxels', voxels: import('../core/model/buildFromVoxels.js').RawVoxel[], selectors?: Record<string, any>, pivots?: Record<string, number[]> }} VoxelsSubject
 * @typedef {{ kind: 'image', src: string, columns?: number, colours?: number, palette?: { ch: string, rgb: number[] }[], extrude?: { maxHalfDepth?: number } }} ImageSubject
 * @typedef {{ kind: 'vox', src: string, model?: number }} VoxSubject
 * @typedef {string | SpriteSubject | VoxelsSubject | ImageSubject | VoxSubject | VoxelModel} SubjectInput
 */

/** @type {Map<string, Exclude<SubjectInput, string>>} */
const registry = new Map([['dragon', dragon]]);

/** Register a named subject so `subject="name"` works. */
export function registerSubject(name, def) {
  registry.set(name, def);
}

export function subjectNames() {
  return [...registry.keys()];
}

/**
 * @param {SubjectInput} subject
 * @returns {VoxelModel | Promise<VoxelModel>}
 */
export function resolveSubject(subject) {
  if (subject instanceof VoxelModel) return subject;
  const def = typeof subject === 'string' ? registry.get(subject) : subject;
  if (!def) throw new Error(`[voxel-scene] unknown subject "${subject}"; registered: ${subjectNames().join(', ')}`);
  if (def instanceof VoxelModel) return def;
  switch (def.kind ?? 'sprite') {
    case 'sprite':
      return buildFromSprite(/** @type {SpriteSubject} */ (def));
    case 'voxels': {
      const d = /** @type {VoxelsSubject} */ (def);
      return buildFromVoxels(d.voxels, d);
    }
    case 'image':
      return import('./fromImage.js').then((m) => m.buildFromImage(/** @type {ImageSubject} */ (def)));
    case 'vox':
      return import('./fromVox.js').then((m) => m.buildFromVox(/** @type {VoxSubject} */ (def)));
    default:
      throw new Error(`[voxel-scene] unknown subject kind "${def.kind}"`);
  }
}

/** Stable cache key for a subject (used to memoise models across renders). */
export function subjectKey(subject) {
  if (typeof subject === 'string') return `name:${subject}`;
  if (subject instanceof VoxelModel) return subject;
  return JSON.stringify(subject);
}

export { dragon };
