// The section crossing the middle of the viewport (docs/SCROLL_DESIGN.md §4.2).
// A thin band rather than a visibility ratio, so sections taller than the
// screen still register. Re-renders only when the active id changes.
import { useEffect, useState } from 'react';

/** @param {string[]} ids @returns {string} */
export function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0]);
  const key = ids.join(',');
  useEffect(() => {
    const els = key.split(',').map((id) => document.getElementById(id)).filter(Boolean);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    for (const el of els) io.observe(el);
    return () => io.disconnect();
  }, [key]);
  return active;
}
