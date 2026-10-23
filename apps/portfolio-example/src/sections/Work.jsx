import { useRef } from 'react';
import { ExternalLink, Level, Tags } from './shared.jsx';

const canTilt = () =>
  window.matchMedia('(hover: hover) and (pointer: fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A project as a game cartridge: tilts towards the pointer, with a moving sheen. */
function Cartridge({ project, index, onPlayHere }) {
  const ref = useRef(/** @type {HTMLElement | null} */ (null));
  const onMove = (e) => {
    const el = ref.current;
    if (!el || !canTilt()) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--ry', `${(x - 0.5) * 16}deg`);
    el.style.setProperty('--rx', `${(0.5 - y) * 16}deg`);
    el.style.setProperty('--mx', `${x * 100}%`);
    el.style.setProperty('--my', `${y * 100}%`);
  };
  const onLeave = () => {
    for (const v of ['--rx', '--ry', '--mx', '--my']) ref.current?.style.removeProperty(v);
  };
  return (
    <article ref={ref} className="card cartridge build" style={{ '--i': index }} onPointerMove={onMove} onPointerLeave={onLeave}>
      <div className="label-strip">
        <h4>
          {project.title}
          {project.org && <span className="org"> · {project.org}</span>}
        </h4>
      </div>
      <p>{project.body}</p>
      <Tags items={project.tags} label={`${project.title} technologies`} />
      <p className="card-links">
        {project.embed && (
          <button type="button" className="play" onClick={() => onPlayHere(project)}>
            ▶ Play here
          </button>
        )}
        {project.playHere && (
          <a className="play" href="#hero" data-action="boom">
            ▶ Play
          </a>
        )}
        {project.links
          // The in-page buttons above stand in for an external "Play".
          .filter((l) => !((project.embed || project.playHere) && l.label === 'Play'))
          .map((l) => (
            <ExternalLink key={l.href} href={l.href}>
              {l.label}
            </ExternalLink>
          ))}
        {project.note && <em>{project.note}</em>}
      </p>
    </article>
  );
}

/** Level 3, "Level select": two worlds of cartridges, then side quests. */
export function Work({ work, githubHref, level, seen, onPlayHere }) {
  return (
    <Level id="work" n={3} level={level} seen={seen} className="tall">
      <h2 id="work-title">Selected work</h2>
      <h3 className="world">{work.worlds.professional}</h3>
      <div className="cards">
        {work.professional.map((p, i) => (
          <Cartridge key={p.id} project={p} index={i} onPlayHere={onPlayHere} />
        ))}
      </div>
      <h3 className="world">
        {work.worlds.personal} <span className="aside">from <ExternalLink href={githubHref}>github.com/spjz</ExternalLink></span>
      </h3>
      <div className="cards">
        {work.personal.map((p, i) => (
          <Cartridge key={p.id} project={p} index={i} onPlayHere={onPlayHere} />
        ))}
      </div>
      {work.elsewhere?.length > 0 && (
        <div className="elsewhere">
          <h3 className="world">{work.worlds.elsewhere}</h3>
          <ul className="quests">
            {work.elsewhere.map((l) => (
              <li key={l.href}>
                <ExternalLink className="quest" href={l.href}>
                  {l.label}
                </ExternalLink>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Level>
  );
}
