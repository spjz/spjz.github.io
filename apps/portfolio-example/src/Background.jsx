// The voxel dragon behind the page, and its director (SECTION_EXPERIENCE_DESIGN.md §3):
// each level gives the dragon a pose (camera + effect changes). Lazy, click-through,
// time-driven idle life, scroll-driven party mode over #work, cursor tracking and
// click-to-explode.
import { Suspense, lazy, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';

// Ambient life, on the clock. Fades out while the party is on.
const AMBIENT = [
  { id: 'wings', type: 'PartRotate', selector: 'wings', params: { angle: 30 }, envelope: { period: 1.4, driver: 'time' } },
  { id: 'tail', type: 'PartRotate', selector: 'tail', params: { angle: 22, mirrorX: false }, envelope: { period: 2, phase: 0.25, driver: 'time' } },
  { id: 'blink', type: 'Blink', envelope: { driver: 'time' } },
  { id: 'bob', type: 'Bob', params: { height: 0.6 }, envelope: { period: 1.4, phase: 0.25, driver: 'time' } },
  { id: 'breathe', type: 'Scale', selector: 'body', params: { amount: 1.06, axes: [1, 0, 1] }, envelope: { period: 3, driver: 'time' } },
];
const AMBIENT_IDS = new Set(AMBIENT.map((e) => e.id));
const WINGS_IDLE = { params: { angle: 30 }, envelope: { period: 1.4 } };
const WINGS_WAVE = { params: { angle: 55 }, envelope: { period: 0.4 } };

// Click-to-boom: a one-shot that rests at zero until triggered, plays one
// cycle, then hands back to whatever was running.
const BOOM = { id: 'boom', type: 'Explode', params: { radius: 14, spread: 1.2, shrink: 0.2 }, envelope: { mode: 'once', driver: 'time', shape: 'adsr', period: 1.6, spatial: { vector: [0, 0.02, 0], random: 0.2 }, adsr: { a: 0.12, d: 0.15, s: 0.7, r: 0.8, hold: 0.1 } } };

// Spawn: starts fully exploded (no attack) and releases into the dragon.
const SPAWN = { id: 'spawn', type: 'Explode', params: { radius: 34, spread: 1.4, lift: 0.3, shrink: 0.5 }, envelope: { mode: 'once', driver: 'time', shape: 'adsr', period: 1.5, adsr: { a: 0, d: 0, s: 1, hold: 0.2, r: 1.2 } } };

// Skills: hovering a group tints the dragon (eased in onFrame) and pulses it once.
const SKILL_TINT = { id: 'skill-tint', type: 'Colour', strength: 0, params: { mode: 'tint', colour: '#b6e000' }, envelope: { shape: 'constant', driver: 'time' } };
const SKILL_PULSE = { id: 'skill-pulse', type: 'Scale', params: { amount: 1.18, axes: [1, 1, 1] }, envelope: { mode: 'once', driver: 'time', shape: 'adsr', period: 0.6, adsr: { a: 0.1, d: 0.1, s: 0.6, hold: 0.05, r: 0.3 } } };

// Scrolling through #work fades in the built-in Party preset. Its effects loop
// on the clock; scroll progress only sets how strongly they apply (see onFrame).
const partyStrength = new Map(); // id → the preset's own strength

// Keep Three.js out of the critical path: the page renders first. The party
// specs come from the same lazy import, and the full effect list is built in
// the wrapper because the parent's JSX props are evaluated before the import resolves.
const VoxelBackground = lazy(() =>
  import('@dragon/voxel-scene').then((m) => {
    const party = m.PRESETS.Party.effects.map((e) => {
      const id = `party-${e.id}`;
      partyStrength.set(id, e.strength ?? 1);
      return { ...e, id, strength: 0, envelope: { ...e.envelope, driver: 'time' } };
    });
    const effects = [...AMBIENT, ...party, SKILL_TINT, SKILL_PULSE, SPAWN, BOOM];
    return { default: (props) => <m.VoxelBackground {...props} effects={effects} /> };
  }),
);

// Section progress (0 = #work entering from below, 1 = leaving at the top) →
// party weight: ease in over the first quarter, full through the middle, ease out.
const smooth = (x) => x * x * (3 - 2 * x);
const partyWeight = (p) => smooth(Math.min(1, Math.max(0, Math.min(p / 0.25, (1 - p) / 0.25))));

/**
 * Camera per level (wide screens). Experience orbits from -30° to +30° by checkpoint.
 * @param {string} level @param {number} checkpoint 0–1 along the road
 */
export function poseFor(level, checkpoint = 0) {
  switch (level) {
    case 'about':
      return { azimuth: -32, elevation: 4, distance: 76 };
    case 'experience':
      return { azimuth: -30 + 60 * checkpoint, elevation: 10, distance: 84 };
    case 'skills':
      return { azimuth: 0, elevation: -4, distance: 80 };
    case 'contact':
      return { azimuth: -8, elevation: 6, distance: 80 };
    default: // hero, work
      return { azimuth: -18, elevation: 8, distance: 78 };
  }
}

// Levels where text covers the dragon on phones, so it steps back.
const CONTENT_HEAVY = new Set(['about', 'work', 'experience', 'skills']);

const NARROW = '(max-width: 760px)';
const REDUCED = '(prefers-reduced-motion: reduce)';
const subscribe = (query) => (cb) => {
  const mq = window.matchMedia(query);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};
const subscribeNarrow = subscribe(NARROW);
const subscribeReduced = subscribe(REDUCED);

/**
 * @param {{
 *   sceneRef: import('react').MutableRefObject<any>,
 *   active: string, checkpoint: number, tint: string | null, waving: boolean, paused: boolean,
 *   lookTarget: { x: number, y: number } | null,
 *   pending: 'spawn' | 'boom' | null, onPendingDone: () => void, onExplode: () => void,
 * }} props
 */
export function Background({ sceneRef, active, checkpoint, tint, waving, paused, lookTarget, pending, onPendingDone, onExplode }) {
  const narrow = useSyncExternalStore(subscribeNarrow, () => window.matchMedia(NARROW).matches);
  const reduced = useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED).matches);

  const pose = poseFor(active, checkpoint);
  const camera = useMemo(
    () => ({ ...pose, distance: narrow ? pose.distance * 1.22 : pose.distance }),
    [pose.azimuth, pose.elevation, pose.distance, narrow],
  );

  // Read by onFrame without re-creating it.
  const live = useRef({ tint: 0 });
  live.current.tintTarget = tint ? 0.6 : 0;

  const onFrame = (ctx, api) => {
    const w = partyWeight(ctx.drivers.scroll);
    const l = live.current;
    l.tint += (l.tintTarget - l.tint) * Math.min(1, ctx.dt * 6);
    for (const e of api.bus.engine.stack.effects) {
      if (partyStrength.has(e.id)) e.strength = w * partyStrength.get(e.id);
      else if (AMBIENT_IDS.has(e.id)) e.strength = 1 - w;
      else if (e.id === 'skill-tint') e.strength = l.tint;
    }
  };

  // Effect changes from the director.
  const api = () => sceneRef.current;
  useEffect(() => {
    if (!tint || !api()) return;
    api().setEffect('skill-tint', { params: { colour: tint } });
    api().trigger('skill-pulse', { restart: false });
  }, [tint]);
  useEffect(() => {
    api()?.setEffect('wings', waving ? WINGS_WAVE : WINGS_IDLE);
  }, [waving]);
  useEffect(() => {
    api()?.setEffect('breathe', { envelope: { period: active === 'about' ? 4.5 : 3 } });
  }, [active]);
  useEffect(() => {
    if (!api()) return;
    if (paused) api().pause();
    else api().play();
  }, [paused]);
  // Deferred actions (from Work's "Play" and the credits' "Back to Level 1") run on arrival at the hero.
  useEffect(() => {
    if (!pending || active !== 'hero' || !api()) return;
    if (pending === 'boom' && api().trigger('boom', { restart: false })) onExplode();
    if (pending === 'spawn' && !reduced) api().trigger('spawn');
    onPendingDone();
  }, [pending, active]);

  return (
    <Suspense fallback={null}>
      <VoxelBackground
        ref={sceneRef}
        subject="dragon"
        onFrame={onFrame}
        driver="time"
        scrollTarget="#work"
        // Beside the hero text on wide screens; centred and further back on phones.
        position={narrow ? [0, 0, 0] : [20, 0, 0]}
        camera={camera}
        transition={reduced ? 0 : 1.1}
        parallax={3}
        lookAtPointer={{ target: lookTarget }}
        // Clicks are hit-tested against the voxels at window level (the background
        // is click-through); a click mid-explosion is ignored rather than restarting it.
        onSubjectClick={(_, a) => {
          if (a.trigger('boom', { restart: false })) onExplode();
        }}
        onReady={(a) => {
          if (import.meta.env.DEV) window.__voxel = a; // for the Playwright specs
          if (!reduced) a.trigger('spawn');
          document.body.setAttribute('data-scene-ready', '');
        }}
        style={{ opacity: narrow && CONTENT_HEAVY.has(active) ? 0.35 : 1, transition: 'opacity 0.6s' }}
        shadow
      />
    </Suspense>
  );
}
