'use client';
// Public React API (`@dragon/voxel-scene`).

import './core/effects/index.js'; // registers the built-in effects

export { VoxelScene } from './react/VoxelScene.jsx';
export { VoxelBackground } from './react/VoxelBackground.jsx';
export { VoxelSubject } from './react/VoxelSubject.jsx';
export { VoxelCamera, DEFAULT_CAMERA } from './react/VoxelCamera.jsx';
export { VoxelGrid } from './react/VoxelGrid.jsx';
export { VoxelSceneContext, useVoxelBus } from './react/context.js';
export { useVoxelModel } from './react/hooks/useVoxelModel.js';
export { useEffectStack } from './react/hooks/useEffectStack.js';
export { useEnvelopeSource } from './react/hooks/useEnvelopeSource.js';
export { useReducedMotion } from './react/hooks/useReducedMotion.js';
export { useVisibilityPause } from './react/hooks/useVisibilityPause.js';

// Engine pieces most apps need alongside the components.
export { defineEffect, registerEffect, effectTypes, Effect } from './core/effects/index.js';
export { PRESETS, CAMERA_PRESETS } from './core/presets.js';
export { registerSubject, subjectNames, dragon } from './subjects/index.js';
export { SHAPES, DRIVERS, MODES } from './core/Envelope.js';
