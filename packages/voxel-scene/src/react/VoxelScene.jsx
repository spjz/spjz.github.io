'use client';
// The generic component (REACT_DESIGN.md §4.1): Canvas + subject + camera +
// grid/shadow/lights + performance and accessibility behaviour.

import { Suspense, lazy, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { ContactShadows, PerformanceMonitor } from '@react-three/drei';
import { VoxelSubject } from './VoxelSubject.jsx';
import { VoxelCamera, DEFAULT_CAMERA } from './VoxelCamera.jsx';
import { VoxelGrid } from './VoxelGrid.jsx';
import { VoxelSceneContext, createBus } from './context.js';
import { useReducedMotion } from './hooks/useReducedMotion.js';
import { useVisibilityPause } from './hooks/useVisibilityPause.js';
import { mergeEnvelope } from '../core/Envelope.js';
import { PRESETS } from '../core/presets.js';

const Pixelate = lazy(() => import('./Pixelate.jsx'));
const DebugPanel = lazy(() => import('../debug/DebugPanel.jsx'));

/**
 * @typedef {Object} VoxelSceneHandle
 * @property {(idOrName: string, opts?: { restart?: boolean }) => boolean} trigger   start a 'once' envelope; restart: false ignores it while one is playing
 * @property {(idOrName: string, patch: Partial<import('../core/effects/Effect.js').EffectSpec>) => boolean} setEffect
 * @property {(cam: Partial<import('./context.js').CameraSpec>, duration?: number) => void} goTo
 * @property {() => void} pause
 * @property {() => void} play
 * @property {(type?: string) => string | null} snapshot  PNG data URL of the current frame
 * @property {() => { effects: any[], camera: any, period: number, timeScale: number, paused: boolean } | null} getState
 * @property {import('./context.js').VoxelBus} bus  engine access for advanced use
 */

/**
 * @typedef {import('./VoxelSubject.jsx').VoxelSubjectProps & import('./VoxelCamera.jsx').VoxelCameraProps & {
 *   grid?: boolean | Record<string, any>,
 *   axes?: boolean,
 *   shadow?: boolean,
 *   debug?: boolean,
 *   background?: 'transparent' | string,
 *   pixelate?: number | false,
 *   onSubjectClick?: (e: import('./hooks/useSubjectPointer.js').SubjectPointerEvent, api: VoxelSceneHandle) => void,
 *   quality?: 'auto' | 'low' | 'high',
 *   pauseWhenHidden?: boolean,
 *   reducedMotion?: 'respect' | 'ignore' | 'static',
 *   fallback?: import('react').ReactNode,
 *   onReady?: (api: VoxelSceneHandle) => void,
 *   onFrame?: (ctx: import('../core/Clock.js').FrameCtx, api: VoxelSceneHandle) => void,
 *   ref?: import('react').Ref<VoxelSceneHandle>,
 *   className?: string,
 *   style?: import('react').CSSProperties,
 *   canvasProps?: Partial<import('@react-three/fiber').CanvasProps>,
 *   children?: import('react').ReactNode,
 * }} VoxelSceneProps
 */

function ThreeBridge({ bus }) {
  bus.three = useThree();
  return null;
}

/** @param {VoxelSceneProps} props */
export function VoxelScene({
  // subject
  subject = 'dragon',
  scale = 1,
  position,
  rotation,
  voxelSize = 0.96,
  showInterior = false,
  // effects
  preset,
  effects,
  offsetStrength = 1,
  // animation cycle
  envelope,
  period = 2,
  timeScale = 1,
  paused = false,
  driver = 'time',
  scrollTarget = null,
  // camera
  camera,
  cameraPreset,
  transition = 0.6,
  autoOrbit,
  drift = false,
  parallax = false,
  lookAtPointer = false,
  onSubjectClick,
  subjectCursor = 'pointer',
  onCameraChange,
  // visibility
  controls = false,
  grid = false,
  axes = false,
  shadow = true,
  debug = false,
  // look
  background = 'transparent',
  lighting = 'lit',
  pixelate = false,
  // performance / accessibility
  quality = 'auto',
  pauseWhenHidden = true,
  reducedMotion = 'respect',
  fallback = null,
  // events
  onReady,
  onFrame,
  ref,
  className,
  style,
  canvasProps,
  children,
}) {
  const bus = useMemo(createBus, []);
  const wrapRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [bounds, setBounds] = useState(/** @type {any} */ (null));
  const [dpr, setDpr] = useState(quality === 'low' ? 1 : 2);

  const visible = useVisibilityPause(wrapRef, pauseWhenHidden);
  const prefersReduced = useReducedMotion();
  const reduce = reducedMotion === 'respect' && prefersReduced;
  const staticFrame = reducedMotion === 'static' || (reducedMotion === 'respect' && prefersReduced && paused);

  const presetDef = preset ? PRESETS[preset] : null;
  const orbit = reduce ? false : (autoOrbit ?? presetDef?.autoOrbit ?? false);
  const motion = !reduce;

  /** @type {VoxelSceneHandle} */
  const api = useMemo(() => {
    const withEffect = (id, fn) => {
      const e = bus.engine?.stack.get(id);
      if (!e) return false;
      fn(e);
      bus.three?.invalidate();
      return true;
    };
    return {
      bus,
      trigger: (id, opts) => {
        const ok = bus.engine?.stack.trigger(id, opts) ?? false;
        bus.three?.invalidate();
        return ok;
      },
      setEffect: (id, patch) =>
        withEffect(id, (e) => {
          const { params, envelope: env, ...rest } = patch;
          Object.assign(e, rest);
          if (params) Object.assign(e.params, params);
          if (env) e.envelope.setSpec(mergeEnvelope(e.envelope.spec, env));
        }),
      goTo: (cam, duration) => bus.camera?.goTo(cam, duration),
      pause: () => { if (bus.engine) bus.engine.clock.paused = true; },
      play: () => {
        if (bus.engine) bus.engine.clock.paused = false;
        bus.three?.invalidate();
      },
      snapshot: (type = 'image/png') => {
        const t = bus.three;
        if (!t) return null;
        t.gl.render(t.scene, t.camera); // same task as toDataURL, so no preserveDrawingBuffer needed
        return t.gl.domElement.toDataURL(type);
      },
      getState: () =>
        bus.engine && {
          effects: bus.engine.stack.toJSON(),
          camera: bus.camera?.getState(),
          period: bus.engine.clock.period,
          timeScale: bus.engine.clock.timeScale,
          paused: bus.engine.clock.paused,
        },
    };
  }, [bus]);
  useImperativeHandle(ref, () => api, [api]);

  // Run continuously unless nothing can change between frames.
  // Pointer tracking is motion too, so reduced motion turns it off (like parallax).
  const tracking = motion && lookAtPointer;
  const idle = (paused || staticFrame) && !controls && !orbit && !drift && !parallax && !tracking && driver === 'time';
  const frameloop = pauseWhenHidden && !visible ? 'never' : idle ? 'demand' : 'always';

  // Camera defaults follow the subject's height and scale, but stay on the
  // world origin in x/z so `position` can shift the subject off-centre
  // (e.g. beside hero text on a portfolio page).
  const posY = position?.[1] ?? 0;
  const cameraDefaults = useMemo(() => {
    const cy = bounds ? ((bounds.min[1] + bounds.max[1]) / 2) * scale : 16 * scale;
    return { target: [0, cy + posY, 0], distance: DEFAULT_CAMERA.distance * scale };
  }, [bounds, scale, posY]);

  const lowQuality = quality === 'low';
  return (
    <div
      ref={wrapRef}
      className={className}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', ...style }}
    >
      <Canvas
        flat // NoToneMapping: R3F's default ACES would shift the palette
        dpr={quality === 'auto' ? [1, dpr] : lowQuality ? 1 : [1, 2]}
        frameloop={frameloop}
        gl={{ antialias: !lowQuality, alpha: true, powerPreference: 'high-performance' }}
        camera={{ fov: camera?.fov ?? DEFAULT_CAMERA.fov, near: 0.1, far: 2000, position: [40, 30, 50] }}
        fallback={fallback}
        style={{ position: 'absolute', inset: 0 }}
        {...canvasProps}
      >
        <VoxelSceneContext.Provider value={bus}>
          <ThreeBridge bus={bus} />
          {background !== 'transparent' && <color attach="background" args={[background]} />}
          <hemisphereLight args={[0xffffff, 0x3a4a30, 1.6]} />
          <directionalLight position={[25, 50, 40]} intensity={2.2} />

          <Suspense fallback={null}>
            <VoxelSubject
              subject={subject}
              effects={effects}
              preset={preset}
              envelope={envelope}
              offsetStrength={offsetStrength}
              voxelSize={voxelSize}
              showInterior={showInterior}
              lighting={lighting}
              period={period}
              timeScale={reduce ? timeScale * 0.25 : timeScale}
              paused={paused || staticFrame}
              driver={driver}
              scrollTarget={scrollTarget}
              scale={scale}
              position={position}
              rotation={rotation}
              lookAtPointer={tracking}
              onSubjectClick={onSubjectClick && ((e) => onSubjectClick(e, api))}
              subjectCursor={subjectCursor}
              onModel={(m) => setBounds(m.bounds)}
              onFrame={onFrame && ((ctx) => onFrame(ctx, api))}
              onFirstFrame={() => {
                setReady(true);
                onReady?.(api);
              }}
            />
          </Suspense>

          <VoxelCamera
            camera={camera}
            cameraPreset={cameraPreset}
            defaults={{ ...cameraDefaults, ...presetDef?.camera }}
            transition={transition}
            autoOrbit={orbit}
            drift={motion && drift}
            parallax={motion && parallax}
            controls={controls}
            onCameraChange={onCameraChange}
          />

          {grid && <VoxelGrid {...(typeof grid === 'object' ? grid : {})} />}
          {axes && <axesHelper args={[4]} position={[0, 0.01, 0]} />}
          {shadow && !lowQuality && (
            <ContactShadows position={[0, 0.01, 0]} scale={90 * scale} far={40 * scale} blur={2.4} opacity={0.45} resolution={512} />
          )}
          {quality === 'auto' && <PerformanceMonitor onIncline={() => setDpr(2)} onDecline={() => setDpr(1)} />}
          {pixelate ? (
            <Suspense fallback={null}>
              <Pixelate size={pixelate} />
            </Suspense>
          ) : null}
          {debug && (
            <Suspense fallback={null}>
              <DebugPanel />
            </Suspense>
          )}
          {children}
        </VoxelSceneContext.Provider>
      </Canvas>
      {!ready && fallback ? <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>{fallback}</div> : null}
    </div>
  );
}
