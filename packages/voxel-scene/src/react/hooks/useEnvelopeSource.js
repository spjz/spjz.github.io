'use client';
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { easing } from 'maath';

/**
 * Scroll and pointer progress (0–1) for envelope drivers (REACT_DESIGN.md §6),
 * eased with maath so scrolling feels smooth. Read `.current` inside useFrame.
 *
 * Scroll is whole-page progress by default; with `scrollTarget` (a selector or
 * element) it is progress through that element: 0 as its top enters the bottom
 * of the viewport, 1 as its bottom leaves the top.
 *
 * @param {{ scrollTarget?: string | Element | null, smoothTime?: number }} [opts]
 * `raw.clientX/clientY` are the last window pointer coordinates (CSS px) and
 * `raw.moved` stays false until the first pointermove (e.g. on touch devices).
 *
 * @returns {import('react').RefObject<{ scroll: number, pointer: number, pointerY: number, raw: { scroll: number, pointer: number, pointerY: number, clientX: number, clientY: number, moved: boolean } }>}
 */
export function useEnvelopeSource({ scrollTarget = null, smoothTime = 0.25 } = {}) {
  const state = useRef({ scroll: 0, pointer: 0.5, pointerY: 0.5, raw: { scroll: 0, pointer: 0.5, pointerY: 0.5, clientX: 0, clientY: 0, moved: false } });

  useEffect(() => {
    const raw = state.current.raw;
    const readScroll = () => {
      const el = typeof scrollTarget === 'string' ? document.querySelector(scrollTarget) : scrollTarget;
      const vh = window.innerHeight;
      if (el) {
        const r = el.getBoundingClientRect();
        raw.scroll = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
      } else {
        const max = document.documentElement.scrollHeight - vh;
        raw.scroll = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      }
    };
    const onPointer = (e) => {
      raw.pointer = e.clientX / window.innerWidth;
      raw.pointerY = e.clientY / window.innerHeight;
      raw.clientX = e.clientX;
      raw.clientY = e.clientY;
      raw.moved = true;
    };
    readScroll();
    state.current.scroll = raw.scroll; // no ease-in on first paint
    window.addEventListener('scroll', readScroll, { passive: true });
    window.addEventListener('resize', readScroll);
    window.addEventListener('pointermove', onPointer, { passive: true });
    return () => {
      window.removeEventListener('scroll', readScroll);
      window.removeEventListener('resize', readScroll);
      window.removeEventListener('pointermove', onPointer);
    };
  }, [scrollTarget]);

  useFrame((_, dt) => {
    const s = state.current;
    easing.damp(s, 'scroll', s.raw.scroll, smoothTime, dt);
    easing.damp(s, 'pointer', s.raw.pointer, smoothTime, dt);
    easing.damp(s, 'pointerY', s.raw.pointerY, smoothTime, dt);
  });

  return state;
}
