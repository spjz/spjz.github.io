// Built-in effect stacks (DESIGN.md §10). Same EffectSpec shape as JSON presets.
// Every entry has a stable id so switching presets diffs cleanly.

/** @typedef {import('./effects/Effect.js').EffectSpec} EffectSpec */

/** @type {Record<string, { effects: EffectSpec[], camera?: Record<string, any>, autoOrbit?: number|false }>} */
export const PRESETS = {
  Idle: {
    camera: { azimuth: 25, elevation: 15, distance: 62 },
    effects: [
      { id: 'wing-flap', type: 'PartRotate', name: 'Wing flap', selector: 'wings', params: { axis: [0, 1, 0], angle: 35 }, envelope: { shape: 'sine', period: 1.2 } },
      { id: 'tail-swish', type: 'PartRotate', name: 'Tail swish', selector: 'tail', params: { axis: [0, 1, 0], angle: 25, mirrorX: false }, envelope: { shape: 'sine', period: 1.8, phase: 0.25 } },
      // Off by default: small rigid rotations of axis-aligned cubes shear the face into steps.
      { id: 'head-tilt', type: 'PartRotate', name: 'Head tilt', enabled: false, selector: 'head', params: { axis: [0, 0, 1], angle: 4, mirrorX: false }, envelope: { shape: 'sine', period: 3.6 } },
      { id: 'breathe', type: 'Scale', name: 'Breathe', selector: 'body', params: { amount: 1.08, axes: [1, 0, 1] }, envelope: { shape: 'sine', period: 3 } },
      { id: 'blink', type: 'Blink', name: 'Blink', selector: 'eyes' },
      { id: 'bob', type: 'Bob', name: 'Bob', params: { height: 0.6 }, envelope: { shape: 'sine', period: 1.2, phase: 0.25 } },
      { id: 'hue', type: 'Colour', name: 'Hue cycle', enabled: false, params: { mode: 'hueRotate', degrees: 360 }, envelope: { shape: 'saw', period: 6 } },
    ],
  },

  Party: {
    camera: { azimuth: 25, elevation: 12, distance: 64 },
    autoOrbit: 20,
    effects: [
      { id: 'wing-flap', type: 'PartRotate', name: 'Wing flap', selector: 'wings', params: { angle: 50 }, envelope: { shape: 'sine', period: 0.45 } },
      { id: 'tail-swish', type: 'PartRotate', name: 'Tail swish', selector: 'tail', params: { angle: 35, mirrorX: false }, envelope: { shape: 'sine', period: 0.9 } },
      { id: 'rainbow', type: 'Colour', name: 'Rainbow', selector: 'green', strength: 0.85, params: { mode: 'rainbow', lightness: 0.55 }, envelope: { shape: 'saw', period: 2, spatial: { vector: [0, 0.03, 0.02], random: 0 } } },
      { id: 'pulse', type: 'Scale', name: 'Pulse', params: { amount: 1.35, axes: [1, 1, 1] }, envelope: { shape: 'pulse', period: 0.45, duty: 0.4, spatial: { vector: [0, 0.04, 0], random: 0 } } },
      { id: 'jitter', type: 'Jitter', name: 'Jitter', params: { amplitude: 0.15, frequency: 6 } },
      { id: 'bob', type: 'Bob', name: 'Bounce', params: { height: 2.5 }, envelope: { shape: 'triangle', period: 0.45 } },
      { id: 'blink', type: 'Blink', name: 'Blink', selector: 'eyes', envelope: { shape: 'pulse', period: 0.9, duty: 0.2 } },
    ],
  },

  'Explode loop': {
    camera: { azimuth: 35, elevation: 18, distance: 90 },
    autoOrbit: 8,
    effects: [
      { id: 'explode', type: 'Explode', name: 'Explode', params: { radius: 22, spread: 0.9, lift: 0.2, shrink: 0.5 }, envelope: { shape: 'adsr', period: 4, adsr: { a: 0.35, d: 0.3, s: 0.8, r: 0.9, hold: 0.6 } } },
      { id: 'heat', type: 'Colour', name: 'Heat', params: { mode: 'tint', colour: '#ff5a00' }, envelope: { shape: 'adsr', period: 4, max: 0.7, adsr: { a: 0.35, d: 0.3, s: 0.8, r: 0.9, hold: 0.6 } } },
      { id: 'tumble', type: 'Jitter', name: 'Tumble', params: { amplitude: 0.8, frequency: 1.5 }, envelope: { shape: 'adsr', period: 4, adsr: { a: 0.35, d: 0.3, s: 0.8, r: 0.9, hold: 0.6 } } },
    ],
  },

  Wave: {
    camera: { azimuth: 60, elevation: 10, distance: 66 },
    effects: [
      { id: 'z-wave', type: 'WaveTranslate', name: 'Z wave', params: { direction: [0, 0, 1], amplitude: 2.5 }, envelope: { shape: 'sine', period: 2, spatial: { vector: [0, 0.05, 0], random: 0 } } },
      { id: 'x-ripple', type: 'WaveTranslate', name: 'X ripple', params: { direction: [1, 0, 0], amplitude: 0.8 }, envelope: { shape: 'sine', period: 1.5, spatial: { vector: [0, 0.08, 0.04], random: 0 } } },
      { id: 'swell', type: 'Scale', name: 'Swell', params: { amount: 0.4, axes: [1, 1, 1] }, envelope: { shape: 'sine', period: 2, spatial: { vector: [0, 0.05, 0], random: 0 } } },
      { id: 'gradient', type: 'Colour', name: 'Gradient', params: { mode: 'gradient', colour: '#00e0ff', colourB: '#ff00c8', axis: [0, 1, 0] }, envelope: { shape: 'sine', period: 2, max: 0.6, spatial: { vector: [0, 0.05, 0], random: 0 } } },
    ],
  },
};

/** @type {Record<string, { azimuth: number, elevation: number, distance: number, target?: number[] }>} */
export const CAMERA_PRESETS = {
  front: { azimuth: 0, elevation: 5, distance: 62 },
  '¾': { azimuth: 35, elevation: 18, distance: 62 },
  side: { azimuth: 90, elevation: 5, distance: 62 },
  top: { azimuth: 0, elevation: 85, distance: 70 },
  face: { azimuth: 10, elevation: 8, distance: 28, target: [0, 20, 0] },
};
