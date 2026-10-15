'use client';
// Optional lo-fi finish (REACT_DESIGN.md §10). Lazy-loaded by VoxelScene, so
// @react-three/postprocessing only ships when `pixelate` is used.
import { EffectComposer, Pixelation } from '@react-three/postprocessing';

/** @param {{ size: number }} props */
export default function Pixelate({ size }) {
  return (
    <EffectComposer multisampling={0}>
      <Pixelation granularity={size} />
    </EffectComposer>
  );
}
