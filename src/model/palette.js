// Material key for dragonSprite.js. Colours are sRGB hex sampled from the
// reference art; they are converted to linear RGB when the model is built.

export const MATERIALS = [
  { ch: 'G', name: 'body', hex: 0xa8d400 },
  { ch: 'E', name: 'ear', hex: 0xa8d400 },
  { ch: 'h', name: 'horn', hex: 0x94bc00 },
  { ch: 'e', name: 'eye', hex: 0x111111 },
  { ch: 'm', name: 'mouth', hex: 0x1a1a1a },
  { ch: 'r', name: 'cheek', hex: 0xff2a2a },
  { ch: 'y', name: 'belly', hex: 0xffd95a },
  { ch: 'B', name: 'stripe', hex: 0xd9a83a },
  { ch: 'w', name: 'wing', hex: 0x1f8a1f },
  { ch: 't', name: 'tail', hex: 0x88a800 },
];

// Material id = index + 1 (0 is empty).
export const MATERIAL_ID = Object.fromEntries(MATERIALS.map((m, i) => [m.ch, i + 1]));

export const PARTS = ['BODY', 'HEAD', 'WING_L', 'WING_R', 'TAIL'];
export const PART_ID = Object.fromEntries(PARTS.map((p, i) => [p, i]));

// Named selectors used by effects and the UI (DESIGN.md §4.4).
export const SELECTORS = {
  all: {},
  head: { parts: ['HEAD'] },
  body: { parts: ['BODY'] },
  wings: { parts: ['WING_L', 'WING_R'] },
  wingL: { parts: ['WING_L'] },
  wingR: { parts: ['WING_R'] },
  tail: { parts: ['TAIL'] },
  eyes: { materials: ['e'] },
  face: { materials: ['e', 'm', 'r'] },
  belly: { materials: ['y', 'B'] },
  earsHorns: { materials: ['E', 'h'] },
  green: { materials: ['G', 'E', 'h', 't'] },
};
