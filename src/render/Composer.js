// Work buffers → instance matrix + colour arrays (DESIGN.md §5.2).
// Writes the column-major 4×4 matrix directly: scale on the diagonal,
// translation in the last column. No Matrix4 objects, no allocation.

/**
 * @returns {number} instance count to draw
 */
export function compose(model, work, matrixArray, colourArray, { globalOffsetStrength = 1, voxelSize = 1, includeInterior = false } = {}) {
  const n = includeInterior ? model.count : model.surfaceCount;
  const { basePos } = model;
  const { offset, scale, colour, alpha } = work;
  const k = globalOffsetStrength;

  for (let i = 0; i < n; i++) {
    const j = i * 3, m = i * 16;
    const a = alpha[i] > 0 ? alpha[i] * voxelSize : 0;
    matrixArray[m] = Math.max(0, scale[j] * a);
    matrixArray[m + 5] = Math.max(0, scale[j + 1] * a);
    matrixArray[m + 10] = Math.max(0, scale[j + 2] * a);
    matrixArray[m + 12] = basePos[j] + offset[j] * k;
    matrixArray[m + 13] = basePos[j + 1] + offset[j + 1] * k;
    matrixArray[m + 14] = basePos[j + 2] + offset[j + 2] * k;
    matrixArray[m + 15] = 1;
    colourArray[j] = Math.min(1, Math.max(0, colour[j]));
    colourArray[j + 1] = Math.min(1, Math.max(0, colour[j + 1]));
    colourArray[j + 2] = Math.min(1, Math.max(0, colour[j + 2]));
  }
  return n;
}
