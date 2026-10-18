// Joe Doherty's portfolio: copy from content/profile.js over the voxel dragon.
// Each section is a level; the dragon is the guide (SECTION_EXPERIENCE_DESIGN.md).
import { useCallback, useEffect, useRef, useState } from 'react';
import { Background } from './Background.jsx';
import { profile } from './content/profile.js';
import { About, Contact, Experience, Footer, GameScreen, Hero, SectionNav, Skills, Work } from './sections/index.js';
import { useActiveSection } from './useActiveSection.js';

const LEVELS = profile.levels;
const LEVEL_IDS = LEVELS.map((l) => l.id);
const levelName = Object.fromEntries(LEVELS.map((l) => [l.id, l.level]));

// Explosions this session: the hero prompt counts them. Storage can be unavailable.
const COUNT_KEY = 'dragon:explosions';
const readCount = () => {
  try {
    return Number(sessionStorage.getItem(COUNT_KEY)) || 0;
  } catch {
    return 0;
  }
};

export function App() {
  const scene = useRef(null);
  const active = useActiveSection(LEVEL_IDS);
  const [seen, setSeen] = useState(() => new Set([LEVEL_IDS[0]]));
  const [explosions, setExplosions] = useState(readCount);
  const [checkpoint, setCheckpoint] = useState(0);
  const [tint, setTint] = useState(/** @type {string | null} */ (null));
  const [waving, setWaving] = useState(false);
  const [game, setGame] = useState(/** @type {any} */ (null));
  const [pending, setPending] = useState(/** @type {'spawn' | 'boom' | null} */ (null));
  const [lookTarget, setLookTarget] = useState(/** @type {{ x: number, y: number } | null} */ (null));

  // A level builds in the first time it is reached, then stays built.
  useEffect(() => {
    setSeen((s) => (s.has(active) ? s : new Set(s).add(active)));
  }, [active]);

  // About: the dragon turns to read the character sheet.
  useEffect(() => {
    if (active !== 'about') return setLookTarget(null);
    const r = document.querySelector('#about .sheet')?.getBoundingClientRect();
    setLookTarget(r ? { x: r.left + r.width / 2, y: r.top + r.height / 3 } : null);
  }, [active]);

  // Links that also do something on arrival at the hero: Work's "▶ Play" (boom)
  // and the credits' "Back to Level 1" (spawn). Plain anchors; the action is a data attribute.
  useEffect(() => {
    const onClick = (e) => {
      const a = e.target instanceof Element ? e.target.closest('a[data-action]') : null;
      if (a) setPending(/** @type {'spawn' | 'boom'} */ (a.getAttribute('data-action')));
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  // Deep links (/#work): the browser looked for the anchor before React rendered it.
  useEffect(() => {
    const target = location.hash ? document.getElementById(location.hash.slice(1)) : null;
    target?.scrollIntoView({ behavior: 'instant' });
  }, []);

  const onExplode = useCallback(() => {
    setExplosions((n) => {
      try {
        sessionStorage.setItem(COUNT_KEY, String(n + 1));
      } catch {}
      return n + 1;
    });
  }, []);
  const onCheckpoint = useCallback((i) => setCheckpoint(i / Math.max(1, profile.experience.length - 1)), []);
  const github = profile.contact.links.find((l) => l.label === 'GitHub')?.href;
  const lv = (id) => ({ level: levelName[id], seen: seen.has(id) });

  return (
    <>
      <Background
        sceneRef={scene}
        active={active}
        checkpoint={checkpoint}
        tint={tint}
        waving={waving}
        paused={!!game}
        lookTarget={lookTarget}
        pending={pending}
        onPendingDone={() => setPending(null)}
        onExplode={onExplode}
      />
      <SectionNav sections={LEVELS} active={active} />
      <main>
        <Hero hero={profile.hero} explosions={explosions} {...lv('hero')} />
        <About about={profile.about} name={profile.hero.name} {...lv('about')} />
        <Work work={profile.work} githubHref={github} onPlayHere={setGame} {...lv('work')} />
        <Experience experience={profile.experience} earlier={profile.earlier} onCheckpoint={onCheckpoint} {...lv('experience')} />
        <Skills skills={profile.skills} onTint={setTint} {...lv('skills')} />
        <Contact contact={profile.contact} onWave={setWaving} {...lv('contact')} />
      </main>
      <Footer name={profile.hero.name} note={profile.footer.note} back={profile.footer.back} />
      <GameScreen project={game} onClose={() => setGame(null)} />
    </>
  );
}
