// Joe Doherty's portfolio: copy from content/profile.js over the voxel dragon.
import { useEffect, useRef } from 'react';
import { Background } from './Background.jsx';
import { profile } from './content/profile.js';
import { About, Contact, Experience, Footer, Hero, SectionNav, Skills, Work } from './sections.jsx';
import { useActiveSection } from './useActiveSection.js';

const SECTIONS = [
  { id: 'hero', label: 'Introduction' },
  { id: 'about', label: 'About' },
  { id: 'work', label: 'Selected work' },
  { id: 'experience', label: 'Experience' },
  { id: 'skills', label: 'Skills' },
  { id: 'contact', label: 'Contact' },
];
const SECTION_IDS = SECTIONS.map((s) => s.id);

export function App() {
  const scene = useRef(null);
  const active = useActiveSection(SECTION_IDS);
  // Deep links (/#work): the browser looked for the anchor before React rendered it.
  useEffect(() => {
    const target = location.hash ? document.getElementById(location.hash.slice(1)) : null;
    target?.scrollIntoView({ behavior: 'instant' });
  }, []);
  const github = profile.contact.links.find((l) => l.label === 'GitHub')?.href;

  return (
    <>
      <Background sceneRef={scene} />
      <SectionNav sections={SECTIONS} active={active} />
      <main>
        <Hero hero={profile.hero} />
        <About about={profile.about} name={profile.hero.name} />
        <Work work={profile.work} githubHref={github} />
        <Experience experience={profile.experience} earlier={profile.earlier} />
        <Skills skills={profile.skills} />
        <Contact contact={profile.contact} />
      </main>
      <Footer name={profile.hero.name} note={profile.footer.note} />
    </>
  );
}
