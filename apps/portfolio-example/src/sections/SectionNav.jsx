/** Pixel-square dot per level; the active one is marked for screen readers too. Plain anchors: the snap does the rest. */
export function SectionNav({ sections, active }) {
  return (
    <nav className="section-nav" aria-label="Sections">
      <ul>
        {sections.map((s, i) => (
          <li key={s.id}>
            <a href={`#${s.id}`} title={`Level ${i + 1} · ${s.level}`} aria-current={s.id === active ? 'true' : undefined}>
              <span className="lvl" aria-hidden="true">{i + 1}</span>
              <span className="sr-only">{s.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
