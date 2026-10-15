'use client';
import { createContext, useContext } from 'react';

/**
 * Mutable bus shared by a VoxelScene's children: engine objects, camera API and
 * R3F state register here so the imperative handle and debug panel can reach
 * them without React state (nothing on it triggers re-renders).
 *
 * @typedef {Object} VoxelBus
 * @property {{ model: import('../core/model/VoxelModel.js').VoxelModel, stack: import('../core/effects/EffectStack.js').EffectStack, clock: import('../core/Clock.js').Clock, settings: VoxelSettings } | null} engine
 * @property {{ goTo: (cam: Partial<CameraSpec>, duration?: number) => void, getState: () => CameraSpec } | null} camera
 * @property {import('@react-three/fiber').RootState | null} three
 * @property {number} version  bumped when the effect list changes structurally
 *
 * @typedef {{ offsetStrength: number, voxelSize: number, showInterior: boolean }} VoxelSettings
 * @typedef {{ azimuth: number, elevation: number, distance: number, target: number[], fov: number }} CameraSpec
 */

/** @type {import('react').Context<VoxelBus | null>} */
export const VoxelSceneContext = createContext(null);

/** @returns {VoxelBus} */
export function createBus() {
  return { engine: null, camera: null, three: null, version: 0 };
}

export function useVoxelBus() {
  return useContext(VoxelSceneContext);
}
