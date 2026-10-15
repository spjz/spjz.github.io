// Look-at angles for orienting a subject towards a target (REACT_DESIGN.md §4.1
// `lookAtPointer`). Pure maths so it can be unit-tested without Three.js.

const DEG = Math.PI / 180;

/**
 * @typedef {Object} LookOptions
 * @property {number} [maxYaw]      degrees either side of facing +z (default 60)
 * @property {number} [maxPitch]    degrees up/down (default 20)
 * @property {number} [smoothTime]  seconds to catch up (default 0.25)
 * @property {number} [eyeHeight]   0–1 of the subject's height that "looks" (default 0.65)
 * @property {number} [depth]       0–1: where the cursor ray is cut, from the eyes (0) to the camera (1) (default 0.5)
 */

/** @type {Required<LookOptions>} */
export const LOOK_DEFAULTS = { maxYaw: 60, maxPitch: 20, smoothTime: 0.25, eyeHeight: 0.65, depth: 0.5 };

const clamp = (v, lim) => Math.max(-lim, Math.min(lim, v));

/**
 * Yaw (about +y) and pitch (about +x, rotation order YXZ) that turn a subject
 * facing +z towards the direction (dx, dy, dz), clamped. Radians.
 * Positive pitch tips the face down, matching Three.js's right-handed rotation.
 * @returns {{ yaw: number, pitch: number }}
 */
export function lookAngles(dx, dy, dz, maxYawDeg = LOOK_DEFAULTS.maxYaw, maxPitchDeg = LOOK_DEFAULTS.maxPitch) {
  const horizontal = Math.hypot(dx, dz);
  if (horizontal === 0 && dy === 0) return { yaw: 0, pitch: 0 };
  return {
    yaw: clamp(Math.atan2(dx, dz), maxYawDeg * DEG),
    pitch: clamp(Math.atan2(-dy, horizontal), maxPitchDeg * DEG),
  };
}
