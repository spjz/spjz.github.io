import { useEffect, useRef, useState } from 'react';
import { inventoryAt } from '../inventory.js';
import { ExternalLink, Level, Tags, formatMonth } from './shared.jsx';

/**
 * Level 4, "The road so far": a path back through time. A pixel dragon walks
 * down it as you scroll, each role is a checkpoint, and the inventory unpacks.
 */
export function Experience({ experience, earlier, level, seen, onCheckpoint }) {
  const [checkpoint, setCheckpoint] = useState(0);
  const road = useRef(/** @type {HTMLOListElement | null} */ (null));
  const walker = useRef(/** @type {HTMLImageElement | null} */ (null));

  useEffect(() => onCheckpoint?.(checkpoint), [checkpoint, onCheckpoint]);

  // The checkpoint is the last role whose top has passed the middle of the
  // viewport, or the last role once the end of the road is in view (the middle
  // never reaches it there). The walker follows the same line. Written straight
  // to a CSS variable: no React render per scroll event.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = road.current;
      if (!el || !walker.current) return;
      const mid = window.innerHeight / 2;
      const r = el.getBoundingClientRect();
      const items = [...el.children];
      const atEnd = r.bottom <= window.innerHeight;
      let i = 0;
      items.forEach((li, k) => {
        if (li.getBoundingClientRect().top < mid) i = k;
      });
      setCheckpoint(atEnd ? items.length - 1 : i);
      const y = atEnd ? r.height - 40 : Math.min(r.height - 40, Math.max(0, mid - r.top));
      walker.current.style.setProperty('--walk', `${y}px`);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const inventory = inventoryAt(experience, checkpoint);
  const here = experience[checkpoint];

  return (
    <Level id="experience" n={4} level={level} seen={seen} className="tall">
      <h2 id="experience-title">Experience</h2>
      <div className="backpack" aria-live="off">
        <p className="backpack-title">
          <span className="where-now">Inventory · {here.company}</span> <span>{inventory.length} items</span>
        </p>
        <ul className="backpack-items" aria-label={`Tools held at ${here.company}`}>
          {inventory.map(({ tag, count }) => (
            <li key={tag}>
              {tag}
              {count > 1 && <span className="count">×{count}</span>}
            </li>
          ))}
        </ul>
      </div>
      <div className="road-wrap">
      <img ref={walker} className="walker" src={`${import.meta.env.BASE_URL}dragon-sprite.png`} alt="" width="40" height="40" aria-hidden="true" />
      <ol className="timeline road" ref={road}>
        {experience.map((r, i) => (
          <li className={`panel build${i <= checkpoint ? ' reached' : ''}`} key={`${r.company}-${r.start}`} style={{ '--i': i }}>
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
      </div>
      <p className="earlier">{earlier}</p>
    </Level>
  );
}
