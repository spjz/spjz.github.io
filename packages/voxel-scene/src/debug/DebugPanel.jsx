'use client';
// leva debug panel generated from each effect class's static schema
// (REACT_DESIGN.md §9). Edits write straight into engine objects; they persist
// until the corresponding prop changes. Must render inside a VoxelScene.

import { useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { StatsGl } from '@react-three/drei';
import { useControls, folder, buttonGroup } from 'leva';
import { useVoxelBus } from '../react/context.js';
import { SHAPES, DRIVERS, MODES } from '../core/Envelope.js';

const AXES = ['x', 'y', 'z'];

/** One leva input spec for a schema entry, bound to `obj[key]`. */
function inputFor(s, obj, key, label, onChange) {
  const write = (v) => {
    obj[key] = v;
    onChange?.();
  };
  switch (s.type) {
    case 'number':
      return { value: obj[key], min: s.min, max: s.max, step: s.step, label, onChange: write };
    case 'bool':
      return { value: !!obj[key], label, onChange: write };
    case 'select':
      return { value: obj[key], options: s.options, label, onChange: write };
    case 'colour':
      return { value: obj[key], label, onChange: write };
    case 'vec3':
      return { value: Object.fromEntries(AXES.map((a, i) => [a, obj[key][i]])), step: s.step, label, onChange: (v) => write(AXES.map((a) => v[a])) };
    default:
      return null;
  }
}

function EffectControls({ effect, index, stack, model }) {
  const id = effect.id;
  const k = (name) => `${id}__${name}`;
  const C = effect.constructor;
  const env = effect.envelope.spec;

  const params = {};
  for (const s of C.schema) {
    const input = inputFor(s, effect.params, s.key, s.label || s.key);
    if (input) params[k(`p_${s.key}`)] = input;
  }

  const envelope = {
    [k('shape')]: inputFor({ type: 'select', options: SHAPES }, env, 'shape', 'shape'),
    [k('mode')]: inputFor({ type: 'select', options: MODES }, env, 'mode', 'mode'),
    [k('driver')]: { value: env.driver ?? 'inherit', options: ['inherit', ...DRIVERS], label: 'driver', onChange: (v) => { env.driver = v === 'inherit' ? undefined : v; } },
    [k('period')]: inputFor({ type: 'number', min: 0, max: 10, step: 0.05 }, env, 'period', 'period (0 = global)'),
    [k('phase')]: inputFor({ type: 'number', min: 0, max: 1, step: 0.01 }, env, 'phase', 'phase'),
    [k('min')]: inputFor({ type: 'number', min: -1, max: 2, step: 0.01 }, env, 'min', 'min'),
    [k('max')]: inputFor({ type: 'number', min: -1, max: 2, step: 0.01 }, env, 'max', 'max'),
    [k('duty')]: inputFor({ type: 'number', min: 0.01, max: 1, step: 0.01 }, env, 'duty', 'duty'),
    [k('cycles')]: inputFor({ type: 'number', min: 1, max: 8, step: 1 }, env, 'cycles', 'cycles (progress)'),
    [k('spatial')]: inputFor({ type: 'vec3', step: 0.005 }, env.spatial, 'vector', 'spatial / unit'),
    [k('random')]: inputFor({ type: 'number', min: 0, max: 2, step: 0.01 }, env.spatial, 'random', 'random desync'),
    [k('adsr')]: folder(
      Object.fromEntries(['a', 'd', 's', 'r', 'hold'].map((n) => [k(`adsr_${n}`), inputFor({ type: 'number', min: 0, max: n === 's' ? 1 : 5, step: 0.01 }, env.adsr, n, n)])),
      { collapsed: true },
    ),
  };

  useControls(
    'Effects',
    () => ({
      [`${index + 1}. ${effect.name} · ${C.type}`]: folder(
        {
          [k('actions')]: buttonGroup({
            label: ' ',
            opts: {
              [stack.soloId === id ? '◉ solo' : '○ solo']: () => stack.toggleSolo(effect),
              trigger: () => stack.trigger(id),
            },
          }),
          [k('enabled')]: inputFor({ type: 'bool' }, effect, 'enabled', 'enabled'),
          [k('selector')]: inputFor({ type: 'select', options: model.selectorNames }, effect, 'selector', 'selector'),
          [k('strength')]: inputFor({ type: 'number', min: 0, max: 2, step: 0.01 }, effect, 'strength', 'strength'),
          [k('offsetStrength')]: inputFor({ type: 'number', min: 0, max: 3, step: 0.01 }, effect, 'offsetStrength', 'offset strength'),
          [k('offsetMode')]: inputFor({ type: 'select', options: ['add', 'set'] }, effect, 'offsetMode', 'offset mode'),
          [k('scaleMode')]: inputFor({ type: 'select', options: ['multiply', 'add', 'set'] }, effect, 'scaleMode', 'scale mode'),
          ...params,
          [k('envelope')]: folder(envelope, { collapsed: true }),
        },
        { collapsed: true },
      ),
    }),
    [effect],
  );
  return null;
}

function GlobalControls({ engine }) {
  const { clock, settings } = engine;
  useControls('Global', () => ({
    timeScale: inputFor({ type: 'number', min: 0, max: 3, step: 0.01 }, clock, 'timeScale', 'time scale'),
    paused: inputFor({ type: 'bool' }, clock, 'paused', 'paused'),
    step: buttonGroup({ label: ' ', opts: { 'step one frame': () => clock.step() } }),
    period: inputFor({ type: 'number', min: 0.1, max: 10, step: 0.05 }, clock, 'period', 'cycle period'),
    offsetStrength: inputFor({ type: 'number', min: 0, max: 3, step: 0.01 }, settings, 'offsetStrength', 'offset strength'),
    voxelSize: inputFor({ type: 'number', min: 0.1, max: 1.5, step: 0.01 }, settings, 'voxelSize', 'voxel size'),
    showInterior: inputFor({ type: 'bool' }, settings, 'showInterior', 'show interior'),
  }), [engine]);
  return null;
}

/** Live leva panel + GPU stats for the enclosing VoxelScene. */
export default function DebugPanel({ stats = true }) {
  const bus = useVoxelBus();
  const [sig, setSig] = useState('');
  // The effect list changes outside React; poll a cheap signature each frame.
  useFrame(() => {
    const e = bus?.engine;
    const next = e ? `${bus.version}|${e.stack.soloId}|${e.stack.effects.map((x) => x.id).join(',')}` : '';
    if (next !== sig) setSig(next);
  });
  const engine = bus?.engine;
  if (!engine) return null;
  return (
    <>
      {stats && <StatsGl className="voxel-stats" />}
      <GlobalControls key={`g-${sig.split('|')[0]}`} engine={engine} />
      {engine.stack.effects.map((e, i) => (
        <EffectControls key={`${sig}-${e.id}`} effect={e} index={i} stack={engine.stack} model={engine.model} />
      ))}
    </>
  );
}
