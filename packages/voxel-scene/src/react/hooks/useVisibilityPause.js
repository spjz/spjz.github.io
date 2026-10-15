'use client';
import { useEffect, useState } from 'react';

/**
 * True while `ref` is on screen and the tab is visible (REACT_DESIGN.md §8).
 * @param {import('react').RefObject<Element|null>} ref
 * @param {boolean} enabled  when false, always reports visible
 */
export function useVisibilityPause(ref, enabled = true) {
  const [onScreen, setOnScreen] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);

  useEffect(() => {
    if (!enabled || !ref.current || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: 0 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [ref, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const onChange = () => setTabVisible(document.visibilityState !== 'hidden');
    onChange();
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, [enabled]);

  return !enabled || (onScreen && tabVisible);
}
