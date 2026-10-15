// Hand-cleaned from `node tools/png-to-sprite.mjs iamadragon.png 32` (DESIGN.md §4.2).
// One character per cell; see palette.js for the material key. '.' is empty.
// Row 0 is the top; the bottom row stands on y = 0. Mirrored left/right.

export const FRONT = [
  '...E........................E...',
  '...EE......................EE...',
  '...EEE......h......h......EEE...',
  '....EEE.....h......h.....EEE....',
  '....EEEE...hh......hh...EEEE....',
  '.....EEEGGGGGGGGGGGGGGGGEEE.....',
  '......EGGGGGGGGGGGGGGGGGGE......',
  '......GGGGGGGGGGGGGGGGGGGG......',
  '.....GGGGGGGGGGGGGGGGGGGGGG.....',
  '.....GGGGGGGGGGGGGGGGGGGGGG.....',
  '.....GGGGGGGGGGGGGGGGGGGGGG.....',
  '.....GGGGeeGGGGGGGGGGeeGGGG.....',
  '.....GGGGeeGGGGGGGGGGeeGGGG.....',
  '.....GGrrGGGGmGmmGmGGGGrrGG.....',
  '......GGGGGGGGmGGmGGGGGGGG......',
  '......GGGGGGGGGGGGGGGGGGGG......',
  '.......GGGGGGGGGGGGGGGGGG.......',
  'ww.......GGGGGGGGGGGGGG.......ww',
  'www......GGGGGGGGGGGGGG......www',
  'wwwww...GGGGGGGGGGGGGGGG...wwwww',
  '.wwwwwwwGGGGGGGGGGGGGGGGwwwwwww.',
  '..wwwwwwGGGGGyyyyyyGGGGGwwwwww..',
  '.w.w.wwGGGGGyyyyyyyyGGGGGww.w.w.',
  '......GGGGGGBBBBBBBBGGGGGG......',
  '.......GGGGGyyyyyyyyGGGGG.......',
  '........GGGGyyyyyyyyGGGG........',
  '........GGGGBBBBBBBBGGGG........',
  '........GGGGyyyyyyyyGGGG........',
  '.........GGGGyyyyyyGGGG.........',
  '.........GGGGGGGGGGGGGG.........',
  '.........GGG........GGG.........',
  '........GGGG........GGGG........',
];

// Last head row (inclusive); rows below belong to the BODY part.
export const HEAD_LAST_ROW = 16;

// Side view of the tail (DESIGN.md §4.3). Columns run backwards from the
// body's back surface, rows run top → bottom, and the bottom row sits at TAIL_BASE_Y.
export const TAIL_SIDE = [
  '.........tt',
  '........ttt',
  '.......tt..',
  '......tt...',
  '..tttttt...',
  'ttttt......',
  'ttt........',
];
export const TAIL_BASE_Y = 3;
