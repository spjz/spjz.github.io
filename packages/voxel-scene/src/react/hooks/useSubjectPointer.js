'use client';
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Raycaster, Vector2 } from 'three';

const _ray = new Raycaster();
const _ndc = new Vector2();

// Clicks on real page controls (and text selections, and drags) never reach the subject.
const INTERACTIVE = 'a, button, input, select, textarea, label, summary, [role="button"], [role="link"], [contenteditable=""], [contenteditable="true"]';
const DRAG_PX = 6;

/**
 * @typedef {Object} SubjectPointerEvent
 * @property {number} index        voxel index in the model (instance id)
 * @property {import('three').Vector3} point  world-space hit point
 * @property {MouseEvent} nativeEvent
 */

/**
 * Window-level click/hover hit-testing against the subject's instanced voxels.
 * Works behind click-through backgrounds (pointer-events: none), where the
 * canvas itself never receives events. Hits use the *current* voxel
 * positions, so scattered voxels mid-effect still count.
 *
 * @param {import('react').RefObject<import('three').InstancedMesh | null>} meshRef
 * @param {((e: SubjectPointerEvent) => void) | undefined} onClick  disabled when undefined
 * @param {{ cursor?: string | false }} [opts]  cursor while hovering the subject (default 'pointer')
 */
export function useSubjectPointer(meshRef, onClick, { cursor = 'pointer' } = {}) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const latest = useRef(onClick);
  latest.current = onClick;
  const hover = useRef({ x: 0, y: 0, dirty: false, over: false, target: /** @type {Element | null} */ (null) });
  const enabled = !!onClick;

  /** First hit under client (x, y), or null. */
  const hitTest = (x, y) => {
    const mesh = meshRef.current;
    if (!mesh || mesh.count === 0) return null;
    const rect = gl.domElement.getBoundingClientRect();
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return null;
    _ndc.set(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
    _ray.setFromCamera(_ndc, camera);
    mesh.updateMatrixWorld();
    mesh.computeBoundingSphere(); // voxels move every frame; the cached sphere goes stale
    return _ray.intersectObject(mesh, false)[0] ?? null;
  };

  useEffect(() => {
    if (!enabled) return;
    let down = null;
    const onDown = (e) => { down = { x: e.clientX, y: e.clientY }; };
    const onClickEvent = (e) => {
      const dragged = down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > DRAG_PX;
      down = null;
      if (dragged || e.button !== 0 || e.defaultPrevented) return;
      if (e.target instanceof Element && e.target.closest(INTERACTIVE)) return;
      if (String(window.getSelection?.() ?? '').length > 0) return;
      const hit = hitTest(e.clientX, e.clientY);
      if (hit) latest.current?.({ index: hit.instanceId, point: hit.point, nativeEvent: e });
    };
    const onMove = (e) => {
      const h = hover.current;
      h.x = e.clientX;
      h.y = e.clientY;
      h.target = e.target instanceof Element ? e.target : null;
      h.dirty = true;
    };
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('click', onClickEvent);
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('click', onClickEvent);
      window.removeEventListener('pointermove', onMove);
      if (hover.current.over) document.body.style.cursor = '';
      hover.current.over = false;
    };
  }, [enabled, camera, gl]);

  // Hover cursor: at most one raycast per frame, only after the pointer moved.
  useFrame(() => {
    const h = hover.current;
    if (!enabled || !cursor || !h.dirty) return;
    h.dirty = false;
    const over = !(h.target && h.target.closest(INTERACTIVE)) && !!hitTest(h.x, h.y);
    if (over !== h.over) {
      h.over = over;
      document.body.style.cursor = over ? cursor : '';
    }
  });
}
