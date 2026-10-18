import { Level } from './shared.jsx';

/** Level 5, "Crafting table": each group a stack of blocks; hovering one tints the dragon. */
export function Skills({ skills, level, seen, onTint }) {
  return (
    <Level id="skills" n={5} level={level} seen={seen}>
      <h2 id="skills-title">Skills</h2>
      <div className="skills">
        {skills.map((g, i) => (
          // biome-ignore lint/a11y/noStaticElementInteractions: hover/focus only tints the background dragon; nothing is activated
          <div
            className={`panel stack build${g.process ? ' process' : ''}`}
            key={g.name}
            style={{ '--block': g.colour, '--i': i }}
            onPointerEnter={() => onTint?.(g.colour)}
            onPointerLeave={() => onTint?.(null)}
            onFocus={() => onTint?.(g.colour)}
            onBlur={() => onTint?.(null)}
          >
            <h3>{g.name}</h3>
            <ul className="blocks" aria-label={g.name}>
              {g.items.map((t) => (
                <li key={t} className="block">{t}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Level>
  );
}
