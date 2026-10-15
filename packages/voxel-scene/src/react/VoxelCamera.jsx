'use client';
// Camera (REACT_DESIGN.md §8): drei CameraControls with a controlled spherical
// `camera` prop. Changes animate via camera-controls' smoothing; auto-orbit,
// drift and pointer parallax are applied as relative rotations so they compose
// with user orbiting instead of fighting it.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import { Vector3 } from 'three';
import { easing } from 'maath';
import { CAMERA_PRESETS } from '../core/presets.js';
import { useVoxelBus } from './context.js';

const DEG = Math.PI / 180;

/** @type {import('./context.js').CameraSpec} */
export const DEFAULT_CAMERA = { azimuth: 25, elevation: 15, distance: 62, target: [0, 15, 0], fov: 40 };

/**
 * @typedef {Object} DriftSpec
 * @property {number} [azimuth]    +/- degrees (default 8)
 * @property {number} [elevation]  +/- degrees (default 4)
 * @property {number} [period]     seconds (default 6)
 *
 * @typedef {Object} VoxelCameraProps
 * @property {Partial<import('./context.js').CameraSpec>} [camera]  controlled; changes animate
 * @property {keyof typeof CAMERA_PRESETS} [cameraPreset]  shorthand merged under `camera`
 * @property {Partial<import('./context.js').CameraSpec>} [defaults]  fallback values (e.g. a subject-derived target)
 * @property {number | false} [transition]  seconds to animate camera changes (default 0.6)
 * @property {number | false} [autoOrbit]  degrees per second
 * @property {false | DriftSpec} [drift]
 * @property {number | false} [parallax]  pointer-follow strength in degrees
 * @property {boolean | Record<string, any>} [controls]  user orbit/zoom; object = CameraControls props
 * @property {(cam: import('./context.js').CameraSpec) => void} [onCameraChange]  fires when the user stops orbiting
 */

/** @param {import('./context.js').CameraSpec} s */
function positionOf(s) {
  const az = s.azimuth * DEG, el = s.elevation * DEG, d = s.distance, t = s.target;
  return [t[0] + d * Math.cos(el) * Math.sin(az), t[1] + d * Math.sin(el), t[2] + d * Math.cos(el) * Math.cos(az)];
}

/** @param {VoxelCameraProps} props */
export function VoxelCamera({
  camera,
  cameraPreset,
  defaults,
  transition = 0.6,
  autoOrbit = false,
  drift = false,
  parallax = false,
  controls = false,
  onCameraChange,
}) {
  /** @type {import('react').RefObject<import('camera-controls').default | null>} */
  const ref = useRef(null);
  const bus = useVoxelBus();
  const threeCamera = /** @type {import('three').PerspectiveCamera} */ (useThree((s) => s.camera));
  const invalidate = useThree((s) => s.invalidate);

  const spec = useMemo(
    () => ({ ...DEFAULT_CAMERA, ...defaults, ...(cameraPreset ? CAMERA_PRESETS[cameraPreset] : {}), ...camera }),
    // Deep compare: inline objects are expected.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify([camera, cameraPreset, defaults])],
  );

  // Applied drift/parallax offsets (degrees), drift clock, eased + raw pointer.
  const offsets = useRef({ az: 0, el: 0, t: 0, px: 0, py: 0, rawX: 0, rawY: 0 });
  const first = useRef(true);

  const goTo = (s, duration = transition) => {
    const c = ref.current;
    if (!c) return;
    const full = { ...spec, ...s };
    c.smoothTime = duration ? duration * 0.25 : 0;
    const p = positionOf(full);
    c.setLookAt(p[0], p[1], p[2], full.target[0], full.target[1], full.target[2], !!duration);
    offsets.current.az = 0;
    offsets.current.el = 0;
    invalidate();
  };

  const getState = () => {
    const c = ref.current;
    const t = c ? c.getTarget(new Vector3()) : new Vector3(...spec.target);
    return {
      azimuth: c ? c.azimuthAngle / DEG : spec.azimuth,
      elevation: c ? 90 - c.polarAngle / DEG : spec.elevation,
      distance: c ? c.distance : spec.distance,
      target: [t.x, t.y, t.z],
      fov: threeCamera.fov,
    };
  };

  // Controlled camera: animate to every new spec (jump on mount).
  useEffect(() => {
    goTo(spec, first.current ? 0 : transition);
    first.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec]);

  useEffect(() => {
    if (threeCamera.fov !== spec.fov) {
      threeCamera.fov = spec.fov;
      threeCamera.updateProjectionMatrix();
      invalidate();
    }
  }, [threeCamera, spec.fov, invalidate]);

  useEffect(() => {
    if (bus) bus.camera = { goTo, getState };
  });

  useEffect(() => {
    const c = ref.current;
    if (!c || !onCameraChange) return;
    const handler = () => onCameraChange(getState());
    c.addEventListener('controlend', handler);
    return () => c.removeEventListener('controlend', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onCameraChange]);

  // Pointer for parallax, normalised to −1…1.
  useEffect(() => {
    if (!parallax) return;
    const raw = offsets.current;
    const onMove = (e) => {
      raw.rawX = (e.clientX / window.innerWidth) * 2 - 1;
      raw.rawY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [parallax]);

  useFrame((_, dt) => {
    const c = ref.current;
    if (!c) return;
    const o = offsets.current;
    if (autoOrbit) c.rotate(autoOrbit * DEG * dt, 0, true);

    // Desired offset = drift + parallax; rotate by the change since last frame.
    let az = 0, el = 0;
    if (drift) {
      o.t += dt;
      const period = drift.period ?? 6;
      az += (drift.azimuth ?? 8) * Math.sin((o.t / period) * Math.PI * 2);
      el += (drift.elevation ?? 4) * Math.cos((o.t / period) * Math.PI * 2);
    }
    if (parallax) {
      easing.damp(o, 'px', o.rawX ?? 0, 0.35, dt);
      easing.damp(o, 'py', o.rawY ?? 0, 0.35, dt);
      az -= parallax * o.px;
      el += parallax * 0.5 * o.py;
    }
    const dAz = (az - o.az) * DEG, dEl = (el - o.el) * DEG;
    if (dAz || dEl) c.rotate(dAz, -dEl, false);
    o.az = az;
    o.el = el;
  });

  const controlProps = typeof controls === 'object' ? controls : {};
  return (
    <CameraControls
      ref={ref}
      makeDefault
      enabled={!!controls}
      minDistance={8}
      maxDistance={300}
      {...controlProps}
    />
  );
}
