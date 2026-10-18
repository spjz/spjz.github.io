import { useEffect, useState } from 'react';
import { assembleEmail } from '../content/profile.js';
import { ExternalLink, Level } from './shared.jsx';

/**
 * The save crystal. The address is built in the browser after mount; it never
 * exists whole in HTML or the bundle. Clicking also copies it.
 */
function SaveCrystal({ parts, copiedText, onWave }) {
  const [email, setEmail] = useState(/** @type {string | null} */ (null));
  const [copied, setCopied] = useState(false);
  useEffect(() => setEmail(assembleEmail(parts)), [parts]);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 3000);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = () => {
    // Opening mailto: continues as normal; copying is a bonus for webmail users.
    navigator.clipboard?.writeText(email ?? '').then(() => setCopied(true), () => {});
  };
  const wave = { onPointerEnter: () => onWave?.(true), onPointerLeave: () => onWave?.(false), onFocus: () => onWave?.(true), onBlur: () => onWave?.(false) };

  return (
    <>
      {email ? (
        <a className="button primary crystal" href={`mailto:${email}`} onClick={copy} {...wave}>
          {email}
        </a>
      ) : (
        <span className="muted">Email address loading…</span>
      )}
      <p className="toast" role="status">
        {copied ? copiedText : ''}
      </p>
    </>
  );
}

/** Level 6, "Save point". */
export function Contact({ contact, level, seen, onWave }) {
  return (
    <Level id="contact" n={6} level={level} seen={seen}>
      <h2 id="contact-title">{contact.heading}</h2>
      <p>{contact.body}</p>
      <div className="ctas save build">
        <SaveCrystal parts={contact.email} copiedText={contact.copied} onWave={onWave} />
        {contact.links.map((l) => (
          <ExternalLink className="button slot-button" key={l.href} href={l.href}>
            {l.label}
          </ExternalLink>
        ))}
      </div>
      <noscript>
        <p className="muted">My email address needs JavaScript to appear. You can also reach me via GitHub.</p>
      </noscript>
    </Level>
  );
}

/** End credits. "Back to Level 1" replays the spawn on arrival (data-action, see App). */
export function Footer({ name, note, back }) {
  return (
    <footer className="credits">
      <p className="hud">Credits</p>
      <p>
        © {new Date().getFullYear()} {name} · Built with React Three Fiber · <em>{note}</em>
      </p>
      <p>
        <a href="#hero" data-action="spawn">
          {back}
        </a>
      </p>
    </footer>
  );
}
