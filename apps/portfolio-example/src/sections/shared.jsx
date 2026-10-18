// Pieces every level uses (SECTION_EXPERIENCE_DESIGN.md §1).

/** Off-site link, announced as such to screen readers. Opens in the same tab. */
export function ExternalLink({ href, children, className }) {
  return (
    <a className={className} href={href} rel="noopener">
      {children}
      <span className="sr-only"> (external site)</span>
    </a>
  );
}

export function Tags({ items, label, className = 'tags' }) {
  return (
    <ul className={className} aria-label={label}>
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}

const monthYear = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' });
/** 'YYYY-MM' → 'May 2025'; null → 'present'. */
export const formatMonth = (ym) => (ym ? monthYear.format(new Date(`${ym}-01T00:00:00`)) : 'present');

/**
 * A level: the section, its HUD label and the pixel build-in once it has been seen.
 * @param {{ id: string, n: number, level: string, seen: boolean, className?: string, children: any }} props
 */
export function Level({ id, n, level, seen, className, children }) {
  return (
    <section id={id} className={className} aria-labelledby={`${id}-title`} data-seen={seen ? '' : undefined}>
      <p className="hud">
        Level {n} · {level}
      </p>
      {children}
    </section>
  );
}
