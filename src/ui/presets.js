// Built-in presets (DESIGN.md §10). Same shape as Save JSON output:
// { global, camera, effects: [effect.toJSON()] }. Missing fields use defaults.

const idleEffects = [
  { type: 'PartRotate', name: 'Wing flap', selector: 'wings', params: { axis: [0, 1, 0], angle: 35 }, envelope: { shape: 'sine', period: 1.2 } },
  { type: 'PartRotate', name: 'Tail swish', selector: 'tail', params: { axis: [0, 1, 0], angle: 25, mirrorX: false }, envelope: { shape: 'sine', period: 1.8, phase: 0.25 } },
  // Off by default: small rigid rotations of axis-aligned cubes shear the face into steps.
  { type: 'PartRotate', name: 'Head tilt', enabled: false, selector: 'head', params: { axis: [0, 0, 1], angle: 4, mirrorX: false }, envelope: { shape: 'sine', period: 3.6 } },
  { type: 'Scale', name: 'Breathe', selector: 'body', params: { amount: 1.08, axes: [1, 0, 1] }, envelope: { shape: 'sine', period: 3 } },
  { type: 'Blink', name: 'Blink', selector: 'eyes' },
  { type: 'Bob', name: 'Bob', params: { height: 0.6 }, envelope: { shape: 'sine', period: 1.2, phase: 0.25 } },
  { type: 'Colour', name: 'Hue cycle', enabled: false, params: { mode: 'hueRotate', degrees: 360 }, envelope: { shape: 'saw', period: 6 } },
];

export const PRESETS = {
  Idle: {
    global: { globalOffsetStrength: 1, timeScale: 1 },
    camera: { azimuth: 25, elevation: 15, distance: 62, autoOrbit: false },
    effects: idleEffects,
  },

  Party: {
    global: { globalOffsetStrength: 1, timeScale: 1 },
    camera: { azimuth: 25, elevation: 12, distance: 64, autoOrbit: true, autoOrbitSpeed: 20 },
    effects: [
      { type: 'PartRotate', name: 'Wing flap', selector: 'wings', params: { angle: 50 }, envelope: { shape: 'sine', period: 0.45 } },
      { type: 'PartRotate', name: 'Tail swish', selector: 'tail', params: { angle: 35, mirrorX: false }, envelope: { shape: 'sine', period: 0.9 } },
      { type: 'Colour', name: 'Rainbow', selector: 'green', strength: 0.85, params: { mode: 'rainbow', lightness: 0.55 }, envelope: { shape: 'saw', period: 2, spatial: { vector: [0, 0.03, 0.02], random: 0 } } },
      { type: 'Scale', name: 'Pulse', params: { amount: 1.35, axes: [1, 1, 1] }, envelope: { shape: 'pulse', period: 0.45, duty: 0.4, spatial: { vector: [0, 0.04, 0], random: 0 } } },
      { type: 'Jitter', name: 'Jitter', params: { amplitude: 0.15, frequency: 6 } },
      { type: 'Bob', name: 'Bounce', params: { height: 2.5 }, envelope: { shape: 'triangle', period: 0.45 } },
      { type: 'Blink', name: 'Blink', selector: 'eyes', envelope: { shape: 'pulse', period: 0.9, duty: 0.2 } },
    ],
  },

  'Explode loop': {
    global: { globalOffsetStrength: 1, timeScale: 1 },
    camera: { azimuth: 35, elevation: 18, distance: 90, autoOrbit: true, autoOrbitSpeed: 8 },
    effects: [
      { type: 'Explode', name: 'Explode', params: { radius: 22, spread: 0.9, lift: 0.2, shrink: 0.5 }, envelope: { shape: 'adsr', period: 4, adsr: { a: 0.35, d: 0.3, s: 0.8, r: 0.9, hold: 0.6 } } },
      { type: 'Colour', name: 'Heat', params: { mode: 'tint', colour: '#ff5a00' }, envelope: { shape: 'adsr', period: 4, max: 0.7, adsr: { a: 0.35, d: 0.3, s: 0.8, r: 0.9, hold: 0.6 } } },
      { type: 'Jitter', name: 'Tumble', params: { amplitude: 0.8, frequency: 1.5 }, envelope: { shape: 'adsr', period: 4, adsr: { a: 0.35, d: 0.3, s: 0.8, r: 0.9, hold: 0.6 } } },
    ],
  },

  Wave: {
    global: { globalOffsetStrength: 1, timeScale: 1 },
    camera: { azimuth: 60, elevation: 10, distance: 66, autoOrbit: false },
    effects: [
      { type: 'WaveTranslate', name: 'Z wave', params: { direction: [0, 0, 1], amplitude: 2.5 }, envelope: { shape: 'sine', period: 2, spatial: { vector: [0, 0.05, 0], random: 0 } } },
      { type: 'WaveTranslate', name: 'X ripple', params: { direction: [1, 0, 0], amplitude: 0.8 }, envelope: { shape: 'sine', period: 1.5, spatial: { vector: [0, 0.08, 0.04], random: 0 } } },
      { type: 'Scale', name: 'Swell', params: { amount: 0.4, axes: [1, 1, 1] }, envelope: { shape: 'sine', period: 2, spatial: { vector: [0, 0.05, 0], random: 0 } } },
      { type: 'Colour', name: 'Gradient', params: { mode: 'gradient', colour: '#00e0ff', colourB: '#ff00c8', axis: [0, 1, 0] }, envelope: { shape: 'sine', period: 2, max: 0.6, spatial: { vector: [0, 0.05, 0], random: 0 } } },
    ],
  },
};
