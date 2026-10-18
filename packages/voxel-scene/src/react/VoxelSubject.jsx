'use client';
// The instanced voxel mesh + engine (REACT_DESIGN.md §4.4, §8). Usable on its
// own inside any R3F <Canvas>; VoxelScene wraps it with camera, lights etc.

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { DynamicDrawUsage, Plane, Raycaster, Vector2, Vector3 } from 'three';
import { easing } from 'maath';
import { Clock } from '../core/Clock.js';
import { compose } from '../core/Composer.js';
import { PRESETS } from '../core/presets.js';
import { LOOK_DEFAULTS, lookAngles } from '../core/look.js';
import { useVoxelModel } from './hooks/useVoxelModel.js';
import { useEffectStack } from './hooks/useEffectStack.js';
import { useEnvelopeSource } from './hooks/useEnvelopeSource.js';
import { useVoxelBus } from './context.js';
import { useSubjectPointer } from './hooks/useSubjectPointer.js';

const EMPTY = [];
// Scratch objects for pointer tracking (no per-frame allocation).
const _ray = new Raycaster();
const _ndc = new Vector2();
const _plane = new Plane();
const _eye = new Vector3();
const _target = new Vector3();
const _normal = new Vector3();
const _p0 = new Vector3();
let modelSeq = 0;
const modelIds = new WeakMap();
const modelId = (m) => {
  if (!modelIds.has(m)) modelIds.set(m, ++modelSeq);
  return modelIds.get(m);
};

/**
 * @typedef {'time' | 'scroll' | 'pointer' | ((s: { t: number, dt: number, scroll: number, pointer: number }) => number)} Driver
 *
 * @typedef {Object} VoxelSubjectProps
 * @property {import('../subjects/index.js').SubjectInput} [subject]  default 'dragon'
 * @property {import('../core/effects/Effect.js').EffectSpec[]} [effects]  ordered stack, diffed by id
 * @property {string} [preset]  built-in stack name; ignored when `effects` is set
 * @property {Partial<import('../core/Envelope.js').EnvelopeSpec>} [envelope]  defaults for every effect's envelope
 * @property {number} [offsetStrength]  global coordinate offset strength (default 1)
 * @property {number} [voxelSize]  cube size relative to a cell (default 0.96)
 * @property {boolean} [showInterior]
 * @property {'lit'|'flat'} [lighting]
 * @property {number} [period]  global cycle period, seconds (default 2)
 * @property {number} [timeScale]
 * @property {boolean} [paused]
 * @property {Driver} [driver]  what advances envelopes (default 'time')
 * @property {string | Element | null} [scrollTarget]  section for the scroll driver (default: whole page)
 * @property {number} [scale]
 * @property {[number, number, number]} [position]
 * @property {[number, number, number]} [rotation]
 * @property {boolean | import('../core/look.js').LookOptions} [lookAtPointer]
 *   turn the subject to face the cursor (window-level, so it works behind click-through
 *   backgrounds); faces the camera until the pointer first moves (default false)
 * @property {(e: import('./hooks/useSubjectPointer.js').SubjectPointerEvent) => void} [onSubjectClick]
 *   click on the subject's voxels; hit-tested at window level so it works behind
 *   click-through backgrounds, ignoring clicks on links/buttons/inputs, drags and selections
 * @property {string | false} [subjectCursor]  cursor while hovering the subject when clickable (default 'pointer')
 * @property {(model: import('../core/model/VoxelModel.js').VoxelModel) => void} [onModel]
 * @property {(ctx: import('../core/Clock.js').FrameCtx) => void} [onFrame]  per frame; must not set React state
 * @property {() => void} [onFirstFrame]
 */

/** @param {VoxelSubjectProps} props */
export function VoxelSubject({
  subject = 'dragon',
  effects,
  preset,
  envelope,
  offsetStrength = 1,
  voxelSize = 0.96,
  showInterior = false,
  lighting = 'lit',
  period = 2,
  timeScale = 1,
  paused = false,
  driver = 'time',
  scrollTarget = null,
  scale = 1,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  lookAtPointer = false,
  onSubjectClick,
  subjectCursor = 'pointer',
  onModel,
  onFrame,
  onFirstFrame,
}) {
  const model = useVoxelModel(subject);
  const bus = useVoxelBus();
  const invalidate = useThree((s) => s.invalidate);
  const specs = effects ?? (preset ? PRESETS[preset]?.effects : null) ?? EMPTY;

  const stack = useEffectStack(model, specs, envelope, (stats) => {
    if (bus && (stats.created || stats.removed)) bus.version++;
    invalidate();
  });

  // Engine state lives outside React; props are applied only when they change,
  // so debug-panel edits survive until the prop itself changes.
  const clock = useMemo(() => new Clock(), []);
  useLayoutEffect(() => { clock.period = period; }, [clock, period]);
  useLayoutEffect(() => { clock.timeScale = timeScale; }, [clock, timeScale]);
  useLayoutEffect(() => { clock.paused = paused; invalidate(); }, [clock, paused, invalidate]);

  const settings = useRef({ offsetStrength, voxelSize, showInterior }).current;
  useLayoutEffect(() => { settings.offsetStrength = offsetStrength; invalidate(); }, [settings, offsetStrength, invalidate]);
  useLayoutEffect(() => { settings.voxelSize = voxelSize; invalidate(); }, [settings, voxelSize, invalidate]);
  useLayoutEffect(() => { settings.showInterior = showInterior; invalidate(); }, [settings, showInterior, invalidate]);

  useLayoutEffect(() => {
    if (bus) {
      bus.engine = { model, stack, clock, settings };
      bus.version++;
    }
    onModel?.(model);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bus, model, stack, clock, settings]);

  const drivers = useEnvelopeSource({ scrollTarget });
  const colours = useMemo(() => new Float32Array(model.count * 3), [model]);
  const meshRef = useRef(/** @type {import('three').InstancedMesh | null} */ (null));
  useSubjectPointer(meshRef, onSubjectClick, { cursor: subjectCursor });
  const firstFrame = useRef(false);
  useEffect(() => { firstFrame.current = false; }, [model]);

  // Keep the latest callbacks without re-subscribing useFrame.
  const look = lookAtPointer ? { ...LOOK_DEFAULTS, ...(typeof lookAtPointer === 'object' ? lookAtPointer : {}) } : null;
  const latest = useRef({ driver, onFrame, onFirstFrame, look });
  latest.current = { driver, onFrame, onFirstFrame, look };

  // Pointer tracking: rotates an inner group (so it composes with `rotation`)
  // about the subject's footprint origin.
  const lookGroup = useRef(/** @type {import('three').Group | null} */ (null));
  const lookAngle = useRef({ yaw: 0, pitch: 0 });

  /** @param {import('@react-three/fiber').RootState} state @param {number} dt */
  const updateLook = (state, dt, opts) => {
    const g = lookGroup.current;
    if (!g?.parent) return;
    let yaw = 0, pitch = 0;
    if (opts) {
      const { camera, gl } = state;
      const b = model.bounds;
      // Eyes in world space.
      g.parent.localToWorld(_eye.set(0, b.min[1] + (b.max[1] - b.min[1]) * opts.eyeHeight, 0));
      const raw = drivers.current.raw;
      _target.copy(camera.position); // face the viewer until the pointer moves
      // A fixed viewport target (e.g. a panel to "read") wins over the cursor.
      const pt = opts.target ?? (raw.moved ? { x: raw.clientX, y: raw.clientY } : null);
      if (pt) {
        const rect = gl.domElement.getBoundingClientRect();
        _ndc.set(((pt.x - rect.left) / rect.width) * 2 - 1, -((pt.y - rect.top) / rect.height) * 2 + 1);
        _ray.setFromCamera(_ndc, camera);
        // Cut the cursor ray with a camera-facing plane between the eyes and the camera.
        camera.getWorldDirection(_normal).negate();
        _plane.setFromNormalAndCoplanarPoint(_normal, _p0.copy(_eye).lerp(camera.position, opts.depth));
        if (!_ray.ray.intersectPlane(_plane, _target)) _target.copy(camera.position);
      }
      // Direction in the parent's frame (respects position/rotation/scale props).
      g.parent.worldToLocal(_target);
      g.parent.worldToLocal(_eye);
      ({ yaw, pitch } = lookAngles(_target.x - _eye.x, _target.y - _eye.y, _target.z - _eye.z, opts.maxYaw, opts.maxPitch));
    }
    const a = lookAngle.current;
    const smooth = opts?.smoothTime ?? LOOK_DEFAULTS.smoothTime;
    easing.damp(a, 'yaw', yaw, smooth, dt);
    easing.damp(a, 'pitch', pitch, smooth, dt);
    g.rotation.set(a.pitch, a.yaw, 0, 'YXZ');
  };

  useFrame((state, dt) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const { driver: drv, onFrame: frameCb, onFirstFrame: firstCb, look: lookOpts } = latest.current;
    updateLook(state, dt, lookOpts);
    const ctx = clock.advance(dt);
    const d = drivers.current;
    if (typeof drv === 'function') {
      clock.t = drv({ t: clock.t, dt: clock.dt, scroll: d.scroll, pointer: d.pointer });
      clock.sync();
      ctx.defaultDriver = 'time';
    } else {
      ctx.defaultDriver = drv;
    }
    ctx.drivers.scroll = d.scroll;
    ctx.drivers.pointer = d.pointer;

    stack.run(ctx);
    const count = compose(model, stack.work, mesh.instanceMatrix.array, mesh.instanceColor.array, {
      globalOffsetStrength: settings.offsetStrength,
      voxelSize: settings.voxelSize,
      includeInterior: settings.showInterior || stack.needsInterior,
    });
    mesh.count = count;
    mesh.instanceMatrix.clearUpdateRanges();
    mesh.instanceMatrix.addUpdateRange(0, count * 16);
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.clearUpdateRanges();
    mesh.instanceColor.addUpdateRange(0, count * 3);
    mesh.instanceColor.needsUpdate = true;

    frameCb?.(ctx);
    if (!firstFrame.current) {
      firstFrame.current = true;
      firstCb?.();
    }
  });

  return (
    <group scale={scale} position={position} rotation={rotation}>
      <group ref={lookGroup}>
      {/* Instance capacity is fixed at creation, so re-key on model change. */}
      <instancedMesh
        key={modelId(model)}
        ref={(m) => {
          meshRef.current = m;
          m?.instanceMatrix.setUsage(DynamicDrawUsage);
        }}
        args={[undefined, undefined, model.count]}
        frustumCulled={false}
      >
        <boxGeometry />
        {lighting === 'flat' ? <meshBasicMaterial key="flat" /> : <meshLambertMaterial key="lit" />}
        <instancedBufferAttribute attach="instanceColor" args={[colours, 3]} usage={DynamicDrawUsage} />
      </instancedMesh>
      </group>
    </group>
  );
}
