// Playground: every VoxelScene prop on a leva panel, plus the live effect
// debug panel, presets, JSON save/load and URL-hash persistence.
import { useEffect, useRef, useState } from 'react';
import { Leva, button, useControls } from 'leva';
import { VoxelScene, PRESETS, CAMERA_PRESETS, DRIVERS, subjectNames, registerSubject } from '@dragon/voxel-scene';

// Extra subjects to exercise the other subject kinds.
registerSubject('dragon (from PNG)', { kind: 'image', src: '/iamadragon.png', columns: 32, colours: 7 });
registerSubject('checker cube', {
  kind: 'voxels',
  voxels: Array.from({ length: 10 * 10 * 10 }, (_, i) => {
    const x = i % 10, y = Math.floor(i / 10) % 10, z = Math.floor(i / 100);
    return { x, y, z, colour: (x + y + z) % 2 ? '#ff6a00' : '#3a5bff', part: y >= 5 ? 'TOP' : 'BASE' };
  }),
  selectors: { top: { parts: ['TOP'] }, base: { parts: ['BASE'] } },
});

// URL hash persistence: #s=<base64url JSON>.
const encode = (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const decode = (s) => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))));
function readHash() {
  const m = location.hash.match(/^#s=(.+)$/);
  try {
    return m ? decode(m[1]) : null;
  } catch {
    return null;
  }
}

const initial = readHash() || {};

const BOOM = { id: 'boom', type: 'Explode', envelope: { mode: 'once', shape: 'adsr', period: 2.5, driver: 'time', adsr: { a: 0.25, d: 0.2, s: 0.8, r: 1, hold: 0.3 } } };

/** Play one explode cycle; adds the one-shot effect first if the stack lacks it. Ignored while playing. */
function explodeOnce(handle, setEffects) {
  if (handle.trigger('boom', { restart: false })) return;
  if (handle.bus.engine?.stack.get('boom')) return; // present and still playing
  setEffects([...handle.getState().effects, BOOM]);
  // The new effect only exists once React has committed it; retry each frame
  // (up to ~2 s) instead of guessing a delay, which loses the click under load.
  let tries = 120;
  const fire = () => {
    if (!handle.trigger('boom') && --tries > 0) requestAnimationFrame(fire);
  };
  requestAnimationFrame(fire);
}
// ?visual: no panels or stats, for Playwright screenshot tests.
const VISUAL = new URLSearchParams(location.search).has('visual');

export function App() {
  const api = useRef(null);
  const [effects, setEffects] = useState(initial.effects ?? null); // null → preset
  const [camera, setCamera] = useState(initial.camera ?? null);

  const scene = useControls('Scene', {
    subject: { value: initial.scene?.subject ?? 'dragon', options: subjectNames() },
    preset: {
      value: initial.scene?.preset ?? 'Idle',
      options: Object.keys(PRESETS),
      // Picking a preset discards loaded/edited effects (but not on mount, so a shared link survives).
      onChange: (_v, _path, ctx) => { if (!ctx.initial) setEffects(null); },
      transient: false,
    },
    lighting: { value: initial.scene?.lighting ?? 'lit', options: ['lit', 'flat'] },
    background: initial.scene?.background ?? '#1b1f2a',
    transparent: initial.scene?.transparent ?? false,
    driver: { value: initial.scene?.driver ?? 'time', options: DRIVERS },
    grid: initial.scene?.grid ?? true,
    axes: initial.scene?.axes ?? true,
    shadow: initial.scene?.shadow ?? true,
    controls: initial.scene?.controls ?? true,
    lookAtPointer: initial.scene?.lookAtPointer ?? true,
    pixelate: { value: initial.scene?.pixelate ?? 0, min: 0, max: 16, step: 1 },
    scale: { value: initial.scene?.scale ?? 1, min: 0.25, max: 3, step: 0.05 },
    quality: { value: initial.scene?.quality ?? 'auto', options: ['auto', 'low', 'high'] },
    reducedMotion: { value: initial.scene?.reducedMotion ?? 'respect', options: ['respect', 'ignore', 'static'] },
  });

  const motion = useControls('Camera motion', {
    autoOrbit: { value: initial.motion?.autoOrbit ?? 0, min: -60, max: 60, step: 1, label: 'auto-orbit °/s' },
    drift: initial.motion?.drift ?? false,
    parallax: { value: initial.motion?.parallax ?? 0, min: 0, max: 20, step: 0.5, label: 'parallax °' },
    transition: { value: initial.motion?.transition ?? 0.6, min: 0, max: 3, step: 0.05 },
  });

  useControls('Camera presets', () =>
    Object.fromEntries(Object.entries(CAMERA_PRESETS).map(([name, cam]) => [name, button(() => setCamera({ ...cam, target: cam.target ?? undefined }))])),
  );

  useControls('Actions', {
    'trigger explode (once)': button(() => explodeOnce(api.current, setEffects)),
    'save JSON': button(() => {
      const blob = new Blob([JSON.stringify(api.current.getState(), null, 2)], { type: 'application/json' });
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'voxel-scene.json' });
      a.click();
      URL.revokeObjectURL(a.href);
    }),
    'load JSON': button(() => {
      const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.json,application/json' });
      input.onchange = async () => {
        const state = JSON.parse(await input.files[0].text());
        setEffects(state.effects);
        if (state.camera) setCamera(state.camera);
      };
      input.click();
    }),
    snapshot: button(() => {
      const url = api.current.snapshot();
      if (url) Object.assign(document.createElement('a'), { href: url, download: 'voxel-scene.png' }).click();
    }),
    'copy link': button(() => navigator.clipboard?.writeText(location.href)),
  });

  // Persist on a slow timer (camera and debug edits change outside React).
  useEffect(() => {
    let last = '';
    const id = setInterval(() => {
      const s = api.current?.getState();
      if (!s) return;
      const h = `#s=${encode({ scene, motion, effects: s.effects, camera: s.camera })}`;
      if (h !== last) {
        history.replaceState(null, '', h);
        last = h;
      }
    }, 1000);
    return () => clearInterval(id);
  }, [scene, motion]);

  return (
    <>
    <Leva hidden={VISUAL} />
    <VoxelScene
      ref={api}
      subject={scene.subject}
      preset={scene.preset}
      effects={effects ?? undefined}
      camera={camera ?? undefined}
      onCameraChange={setCamera}
      lighting={scene.lighting}
      background={scene.transparent ? 'transparent' : scene.background}
      driver={scene.driver}
      grid={scene.grid}
      axes={scene.axes}
      shadow={scene.shadow}
      controls={scene.controls}
      lookAtPointer={scene.lookAtPointer}
      onSubjectClick={(_, handle) => explodeOnce(handle, setEffects)}
      pixelate={scene.pixelate || false}
      scale={scene.scale}
      quality={scene.quality}
      reducedMotion={scene.reducedMotion}
      autoOrbit={motion.autoOrbit || false}
      drift={motion.drift ? { azimuth: 10, elevation: 4, period: 7 } : false}
      parallax={motion.parallax || false}
      transition={motion.transition}
      debug={!VISUAL}
      onReady={(handle) => {
        if (VISUAL) window.__voxel = handle;
        document.body.setAttribute('data-scene-ready', '');
      }}
      style={{ height: '100vh' }}
    />
    </>
  );
}
