// Joe Doherty's portfolio: copy from content/profile.js over the voxel dragon.
import { useRef } from 'react';
import { Background } from './Background.jsx';
import { profile } from './content/profile.js';
import { About, Contact, Experience, Footer, Hero, Skills, Work } from './sections.jsx';

export function App() {
  const scene = useRef(null);
  const github = profile.contact.links.find((l) => l.label === 'GitHub')?.href;

  return (
    <>
      <Background sceneRef={scene} />
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
