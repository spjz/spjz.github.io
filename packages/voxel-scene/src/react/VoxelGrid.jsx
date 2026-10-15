'use client';
import { Grid } from '@react-three/drei';

/**
 * Infinite fading ground grid. cellSize 1 lines up with voxel cells (voxel
 * centres sit at +0.5). Sits just below y = 0 so ContactShadows (which looks
 * up from y = 0.01) never renders the grid plane into the shadow map.
 * @param {Partial<import('@react-three/drei').GridProps>} props
 */
export function VoxelGrid(props) {
  return (
    <Grid
      position={[0, -0.02, 0]}
      cellSize={1}
      sectionSize={8}
      cellThickness={0.6}
      sectionThickness={1.1}
      cellColor="#3a4258"
      sectionColor="#5b6788"
      fadeDistance={110}
      fadeStrength={1.5}
      infiniteGrid
      followCamera={false}
      {...props}
    />
  );
}
