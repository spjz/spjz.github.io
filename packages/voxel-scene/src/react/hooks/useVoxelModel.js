'use client';
import { use } from 'react';
import { resolveSubject, subjectKey } from '../../subjects/index.js';

/** @type {Map<string, { model?: import('../../core/model/VoxelModel.js').VoxelModel, promise?: Promise<any> }>} */
const cache = new Map();
const MAX = 16;

/**
 * subject → memoised VoxelModel. Image and .vox subjects suspend while loading
 * (wrap in <Suspense>); failures throw to the nearest error boundary.
 * @param {import('../../subjects/index.js').SubjectInput} subject
 */
export function useVoxelModel(subject) {
  const key = subjectKey(subject);
  if (typeof key !== 'string') return key; // a prebuilt VoxelModel
  let entry = cache.get(key);
  if (!entry) {
    const r = resolveSubject(subject);
    entry = r instanceof Promise ? { promise: r.then((m) => (entry.model = m)) } : { model: r };
    cache.set(key, entry);
    if (cache.size > MAX) cache.delete(cache.keys().next().value);
  }
  return entry.model ?? use(entry.promise);
}
