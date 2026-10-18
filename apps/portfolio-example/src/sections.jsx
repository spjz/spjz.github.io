// Page sections (docs/PORTFOLIO_CONTENT.md §2). They render `profile` and nothing else.
import { useEffect, useState } from 'react';
import { assembleEmail } from './content/profile.js';

const monthYear = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' });
/** 'YYYY-MM' → 'May 2025'; null → 'present'. */
const formatMonth = (ym) => (ym ? monthYear.format(new Date(`${ym}-01T00:00:00`)) : 'present');

/** Off-site link, announced as such to screen readers. Opens in the same tab. */
function ExternalLink({ href, children, className }) {
  return (
    <a className={className} href={href} rel="noopener">
      {children}
      <span className="sr-only"> (external site)</span>
    </a>
  );
}

function Tags({ items, label }) {
  return (
    <ul className="tags" aria-label={label}>
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}

export function Hero({ hero }) {
  return (
    <section id="hero" aria-labelledby="hero-name">
      <h1 id="hero-name">
        {hero.name}
        <span className="role">{hero.role}</span>
      </h1>
      <p className="tagline">{hero.tagline}</p>
      <p className="intro">{hero.intro}</p>
      <div className="ctas">
        <a className="button primary" href="#work">See my work</a>
        <a className="button" href="#contact">Get in touch</a>
      </div>
      <p className="hint">{hero.hint}</p>
    </section>
  );
}

/** Profile photo, or a placeholder until `about.photo` is set. */
function ProfilePhoto({ src, name }) {
  if (src) return <img className="photo" src={src} alt={name} width="160" height="160" />;
  const initials = name.split(/\s+/).map((w) => w[0]).join('');
  return (
    <div className="photo placeholder" role="img" aria-label={`${name}: photo coming soon`}>
      <span aria-hidden="true">{initials}</span>
    </div>
  );
}

export function About({ about, name }) {
  return (
    <section id="about" aria-labelledby="about-title">
      <h2 id="about-title">About</h2>
      <div className="about panel">
        <ProfilePhoto src={about.photo} name={name} />
        <div>
          {about.paragraphs.map((p) => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProjectCard({ project }) {
  return (
    <article className="card">
      <h4>
        {project.title}
        {project.org && <span className="org"> · {project.org}</span>}
      </h4>
      <p>{project.body}</p>
      <Tags items={project.tags} label={`${project.title} technologies`} />
      {(project.links.length > 0 || project.note) && (
        <p className="card-links">
          {project.links.map((l, i) => (
            <span key={l.href}>
              {i > 0 && ' · '}
              <ExternalLink href={l.href}>{l.label}</ExternalLink>
            </span>
          ))}
          {project.note && <em>{project.note}</em>}
        </p>
      )}
    </article>
  );
}

export function Work({ work, githubHref }) {
  return (
    <section id="work" aria-labelledby="work-title">
      <h2 id="work-title">Selected work</h2>
      <h3>Professional</h3>
      <div className="cards">
        {work.professional.map((p) => <ProjectCard key={p.id} project={p} />)}
      </div>
      <h3>
        Personal <span className="aside">from <ExternalLink href={githubHref}>github.com/spjz</ExternalLink></span>
      </h3>
      <div className="cards">
        {work.personal.map((p) => <ProjectCard key={p.id} project={p} />)}
      </div>
      {work.elsewhere?.length > 0 && (
        <p className="elsewhere">
          Off the clock:{' '}
          {work.elsewhere.map((l, i) => (
            <span key={l.href}>
              {i > 0 && ' · '}
              <ExternalLink href={l.href}>{l.label}</ExternalLink>
            </span>
          ))}
        </p>
      )}
    </section>
  );
}

export function Experience({ experience, earlier }) {
  return (
    <section id="experience" aria-labelledby="experience-title">
      <h2 id="experience-title">Experience</h2>
      <ol className="timeline">
        {experience.map((r) => (
          <li className="panel" key={`${r.company}-${r.start}`}>
            <h3>
              {r.href ? <ExternalLink href={r.href}>{r.company}</ExternalLink> : r.company}
              <span className="where"> · {r.location}</span>
            </h3>
            <p className="meta">
              <time dateTime={r.start}>{formatMonth(r.start)}</time> – {r.end ? <time dateTime={r.end}>{formatMonth(r.end)}</time> : 'present'}
              {' · '}
              <span className="job">{r.role}</span>
            </p>
            <ul className="bullets">
              {r.bullets.map((b) => <li key={b.slice(0, 24)}>{b}</li>)}
            </ul>
            <Tags items={r.tags} label={`${r.company} technologies`} />
          </li>
        ))}
      </ol>
      <p className="earlier">{earlier}</p>
    </section>
  );
}

export function Skills({ skills }) {
  return (
    <section id="skills" aria-labelledby="skills-title">
      <h2 id="skills-title">Skills</h2>
      <div className="skills">
        {skills.map((g) => (
          <div className="panel" key={g.name}>
            <h3>{g.name}</h3>
            <Tags items={g.items} label={g.name} />
          </div>
        ))}
      </div>
    </section>
  );
}

/** The address is built in the browser after mount; it never exists whole in HTML or the bundle. */
function EmailLink({ parts }) {
  const [email, setEmail] = useState(null);
  useEffect(() => setEmail(assembleEmail(parts)), [parts]);
  if (!email) return <span className="muted">Email address loading…</span>;
  return <a className="button primary" href={`mailto:${email}`}>{email}</a>;
}

export function Contact({ contact }) {
  return (
    <section id="contact" aria-labelledby="contact-title">
      <h2 id="contact-title">{contact.heading}</h2>
      <p>{contact.body}</p>
      <div className="ctas">
        <EmailLink parts={contact.email} />
        {contact.links.map((l) => (
          <ExternalLink className="button" key={l.href} href={l.href}>{l.label}</ExternalLink>
        ))}
      </div>
      <noscript>
        <p className="muted">My email address needs JavaScript to appear. You can also reach me via GitHub.</p>
      </noscript>
    </section>
  );
}

export function Footer({ name, note }) {
  return (
    <footer>
      <p>
        © {new Date().getFullYear()} {name} · Built with React Three Fiber · <em>{note}</em>
      </p>
    </footer>
  );
}
