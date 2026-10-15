// Portfolio usage example (REACT_DESIGN.md §11): the voxel scene as a lazy,
// non-interactive background with time-, scroll- and click-driven effects.
import { Suspense, lazy, useRef, useSyncExternalStore } from 'react';

// Ambient life, on the clock. Fades out while the party is on.
const AMBIENT = [
  { id: 'wings', type: 'PartRotate', selector: 'wings', params: { angle: 30 }, envelope: { period: 1.4, driver: 'time' } },
  { id: 'tail', type: 'PartRotate', selector: 'tail', params: { angle: 22, mirrorX: false }, envelope: { period: 2, phase: 0.25, driver: 'time' } },
  { id: 'blink', type: 'Blink', envelope: { driver: 'time' } },
  { id: 'bob', type: 'Bob', params: { height: 0.6 }, envelope: { period: 1.4, phase: 0.25, driver: 'time' } },
];
const AMBIENT_IDS = new Set(AMBIENT.map((e) => e.id));

// Click-to-boom (the dragon itself or the button): a one-shot that rests at zero
// until triggered, plays one cycle, then hands back to whatever was running.
const BOOM = { id: 'boom', type: 'Explode', params: { radius: 14, spread: 1.2, shrink: 0.2 }, envelope: { mode: 'once', driver: 'time', shape: 'adsr', period: 1.6, spatial: { vector: [0, 0.02, 0], random: 0.2 }, adsr: { a: 0.12, d: 0.15, s: 0.7, r: 0.8, hold: 0.1 } } };

// Scrolling through #work fades in the built-in Party preset. Its effects loop
// on the clock; scroll progress only sets how strongly they apply (see onFrame).
const partyStrength = new Map(); // id → the preset's own strength

// Keep Three.js out of the critical path: the page renders first. The party
// specs come from the same lazy import, and the full effect list is built in
// the wrapper because App's JSX props are evaluated before the import resolves.
const VoxelBackground = lazy(() =>
  import('@dragon/voxel-scene').then((m) => {
    const party = m.PRESETS.Party.effects.map((e) => {
      const id = `party-${e.id}`;
      partyStrength.set(id, e.strength ?? 1);
      return { ...e, id, strength: 0, envelope: { ...e.envelope, driver: 'time' } };
    });
    const effects = [...AMBIENT, ...party, BOOM];
    return { default: (props) => <m.VoxelBackground {...props} effects={effects} /> };
  }),
);

// Section progress (0 = #work entering from below, 1 = leaving at the top) →
// party weight: ease in over the first quarter, full through the middle, ease out.
const smooth = (x) => x * x * (3 - 2 * x);
const partyWeight = (p) => smooth(Math.min(1, Math.max(0, Math.min(p / 0.25, (1 - p) / 0.25))));

function blendParty(ctx, api) {
  const w = partyWeight(ctx.drivers.scroll);
  for (const e of api.bus.engine.stack.effects) {
    if (partyStrength.has(e.id)) e.strength = w * partyStrength.get(e.id);
    else if (AMBIENT_IDS.has(e.id)) e.strength = 1 - w;
  }
}

const NARROW = '(max-width: 760px)';
const subscribeNarrow = (cb) => {
  const mq = window.matchMedia(NARROW);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};

export function App() {
  const scene = useRef(null);
  const narrow = useSyncExternalStore(subscribeNarrow, () => window.matchMedia(NARROW).matches);

  return (
    <>
      <Suspense fallback={null}>
        <VoxelBackground
          ref={scene}
          subject="dragon"
          onFrame={blendParty}
          driver="time"
          scrollTarget="#work"
          // Beside the hero text on wide screens; centred and further back on phones.
          position={narrow ? [0, 0, 0] : [20, 0, 0]}
          camera={{ azimuth: -18, elevation: 8, distance: narrow ? 95 : 78 }}
          parallax={3}
          lookAtPointer
          // Clicks are hit-tested against the voxels at window level (the background
          // is click-through); a click mid-explosion is ignored rather than restarting it.
          onSubjectClick={(_, api) => api.trigger('boom', { restart: false })}
          shadow
        />
      </Suspense>

      <main>
        <section id="hero">
          <h1>
            Hi, I&rsquo;m Alex.
            <br />
            I build <span className="accent">playful</span> interfaces.
          </h1>
          <p>Front-end engineer working with React, WebGL and motion design. This dragon is a live voxel scene rendered behind the page.</p>
          <button className="boom" type="button" onClick={() => scene.current?.trigger('boom', { restart: false })}>
            Startle the dragon
          </button>
          <p className="hint">Click the dragon, or scroll down — it throws a party in the Selected work section.</p>
        </section>

        <section id="about">
          <h2>About</h2>
          <p>
            Ten years of shipping web products, the last few focused on interactive graphics. I like small, sharp tools and
            interfaces that feel alive without getting in the way.
          </p>
        </section>

        <section id="work">
          <h2>Selected work</h2>
          <div className="cards">
            {['Realtime dashboards', 'Design systems', 'WebGL product configurator', 'Motion guidelines'].map((t) => (
              <article className="card" key={t}>
                <h3>{t}</h3>
                <p>A short description of the project, the problem it solved and the stack it used.</p>
              </article>
            ))}
          </div>
        </section>

        <section id="contact">
          <h2>Contact</h2>
          <p>
            Say hello at <a className="accent" href="mailto:hello@example.com">hello@example.com</a>.
          </p>
        </section>
      </main>
    </>
  );
}
