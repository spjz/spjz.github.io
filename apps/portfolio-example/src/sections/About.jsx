import { ICONS, PixelArt, initialsArt } from '../pixel.jsx';
import { Level } from './shared.jsx';

/** Pixel portrait: initials until a photo is set, then the photo pixelated until hovered. */
function Portrait({ src, name }) {
  const initials = name.split(/\s+/).map((w) => w[0]).join('');
  if (!src) return <PixelArt className="portrait" art={initialsArt(initials)} size={160} label={`${name}: photo coming soon`} />;
  return (
    <span className="portrait photo-frame">
      <img className="photo pixelated" src={src} alt={name} width="16" height="16" />
      <img className="photo full" src={src} alt="" width="160" height="160" />
    </span>
  );
}

/** Level 2, "Character sheet". */
export function About({ about, name, level, seen }) {
  return (
    <Level id="about" n={2} level={level} seen={seen}>
      <h2 id="about-title">About</h2>
      <div className="sheet panel build">
        <div className="sheet-head">
          <Portrait src={about.photo} name={name} />
          <div>
            <p className="sheet-name">{name}</p>
            <dl className="stats">
              {about.stats.map((s) => (
                <div key={s.label}>
                  <dt>{s.label}</dt>
                  <dd>{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
        <h3 className="sheet-label">Backstory</h3>
        {about.paragraphs.map((p) => (
          <p key={p.slice(0, 24)}>{p}</p>
        ))}
        <h3 className="sheet-label">Inventory</h3>
        <ul className="slots">
          {about.inventory.map((item) => (
            <li key={item.id} className="slot">
              <PixelArt art={ICONS[item.id]} size={32} />
              <span className="slot-name">{item.label}</span>
              <span className="slot-desc">{item.description}</span>
            </li>
          ))}
        </ul>
      </div>
    </Level>
  );
}
