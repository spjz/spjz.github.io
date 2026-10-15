'use client';
// Full-viewport, non-interactive background preset (REACT_DESIGN.md §4.2).
import { VoxelScene } from './VoxelScene.jsx';

/** @param {import('./VoxelScene.jsx').VoxelSceneProps & { zIndex?: number }} props */
export function VoxelBackground({ zIndex = -1, style, ...props }) {
  return (
    <div
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, zIndex, pointerEvents: 'none', ...style }}
    >
      <VoxelScene
        controls={false}
        grid={false}
        background="transparent"
        pauseWhenHidden
        reducedMotion="respect"
        {...props}
      />
    </div>
  );
}
