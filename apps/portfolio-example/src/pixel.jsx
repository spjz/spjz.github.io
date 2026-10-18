// Pixel art from strings: one character per pixel, '.' is empty, other characters
// index a palette. Drawn as SVG rects with crisp edges, so it scales cleanly.

/** Sprite palette (taken from iamadragon.png). */
export const PALETTE = { L: '#b6e000', G: '#2e8b2e', Y: '#e8c25a', R: '#d92b2b', W: '#e8ebf4', K: '#12161f', M: '#a6aec4' };

/**
 * @param {{ art: string[], palette?: Record<string, string>, size?: number, className?: string, label?: string }} props
 */
export function PixelArt({ art, palette = PALETTE, size = 16, className, label }) {
  const h = art.length;
  const w = Math.max(...art.map((r) => r.length));
  const rects = [];
  art.forEach((row, y) => {
    [...row].forEach((c, x) => {
      if (c !== '.' && c !== ' ') rects.push(<rect key={`${x},${y}`} x={x} y={y} width="1.02" height="1.02" fill={palette[c] ?? c} />);
    });
  });
  const box = { className, viewBox: `0 0 ${w} ${h}`, width: size, height: (size * h) / w, shapeRendering: 'crispEdges' };
  if (!label) {
    return (
      <svg {...box} aria-hidden="true">
        {rects}
      </svg>
    );
  }
  return (
    <svg {...box} role="img" aria-label={label}>
      <title>{label}</title>
      {rects}
    </svg>
  );
}

// 3×5 letters for the portrait initials.
const FONT = {
  A: ['.W.', 'W.W', 'WWW', 'W.W', 'W.W'], B: ['WW.', 'W.W', 'WW.', 'W.W', 'WW.'], C: ['.WW', 'W..', 'W..', 'W..', '.WW'],
  D: ['WW.', 'W.W', 'W.W', 'W.W', 'WW.'], E: ['WWW', 'W..', 'WW.', 'W..', 'WWW'], F: ['WWW', 'W..', 'WW.', 'W..', 'W..'],
  G: ['.WW', 'W..', 'W.W', 'W.W', '.WW'], H: ['W.W', 'W.W', 'WWW', 'W.W', 'W.W'], I: ['WWW', '.W.', '.W.', '.W.', 'WWW'],
  J: ['..W', '..W', '..W', 'W.W', '.W.'], K: ['W.W', 'W.W', 'WW.', 'W.W', 'W.W'], L: ['W..', 'W..', 'W..', 'W..', 'WWW'],
  M: ['W.W', 'WWW', 'WWW', 'W.W', 'W.W'], N: ['WW.', 'W.W', 'W.W', 'W.W', 'W.W'], O: ['.W.', 'W.W', 'W.W', 'W.W', '.W.'],
  P: ['WW.', 'W.W', 'WW.', 'W..', 'W..'], R: ['WW.', 'W.W', 'WW.', 'W.W', 'W.W'], S: ['.WW', 'W..', '.W.', '..W', 'WW.'],
  T: ['WWW', '.W.', '.W.', '.W.', '.W.'], U: ['W.W', 'W.W', 'W.W', 'W.W', 'WWW'], V: ['W.W', 'W.W', 'W.W', 'W.W', '.W.'],
  W: ['W.W', 'W.W', 'WWW', 'WWW', 'W.W'], Y: ['W.W', 'W.W', '.W.', '.W.', '.W.'],
};

/**
 * A 20×20 portrait: two initials at double size, centred on a lime-framed tile.
 * @param {string} initials  e.g. 'JD'
 * @returns {string[]}
 */
export function initialsArt(initials) {
  const N = 20;
  const grid = Array.from({ length: N }, (_, y) =>
    Array.from({ length: N }, (_, x) => (x === 0 || y === 0 || x === N - 1 || y === N - 1 ? 'L' : x === 1 || y === 1 || x === N - 2 || y === N - 2 ? 'G' : 'K')),
  );
  const letters = [...initials.toUpperCase()].slice(0, 2).map((c) => FONT[c] ?? FONT.O);
  // Each letter is 3×5, drawn at 2× (6×10), with a 1px gap: 6 + 1 + 6 = 13 wide.
  const width = letters.length * 6 + (letters.length - 1);
  const ox = Math.floor((N - width) / 2);
  const oy = Math.floor((N - 10) / 2);
  letters.forEach((glyph, li) => {
    glyph.forEach((row, gy) => {
      [...row].forEach((c, gx) => {
        if (c === '.') return;
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) grid[oy + gy * 2 + dy][ox + li * 7 + gx * 2 + dx] = li === 0 ? 'L' : 'Y';
        }
      });
    });
  });
  return grid.map((r) => r.join(''));
}

/** 8×8 item icons for the character sheet inventory. */
export const ICONS = {
  science: ['..WWW...', '...W....', '...W....', '..W.W...', '.W...W..', 'W.LLL.W.', 'WLLLLLW.', '.WWWWW..'],
  philosophy: ['.WWWWW..', 'W.....W.', '....WW..', '...W....', '...W....', '........', '...W....', '...W....'],
  linguistics: ['WWWWWWW.', 'W.....W.', 'W.Y.Y.W.', 'W.....W.', 'WWWWWWW.', '.WW.....', '.W......', '........'],
  foss: ['..WWW...', '.W...W..', '.W......', 'LLLLLLL.', 'LLLKLLL.', 'LLLKLLL.', 'LLLLLLL.', '........'],
  music: ['...WWWW.', '...W..W.', '...W..W.', '...W..W.', '.YYW.YYW', 'YYYYYYY.', '.YY..YY.', '........'],
  vfx: ['...L....', '...L....', '.L.L.L..', '..LLL...', 'LLLYLLL.', '..LLL...', '.L.L.L..', '...L....'],
};
