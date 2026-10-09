// The goggles mark on a 28 x 13 pixel grid. Same drawing as docs/mockups and assets/logo/mark-color.svg.
const TOP = [0x7a, 0xa7, 0xfb];
const BOT = [0x9b, 0xfb, 0xa2];
const BASE = '#3b5a3a';
const FRAME = '#8a919c';
const BLACK = '#000000';
const W = 28;
const H = 13;

export type Px = { x: number; y: number; fill: string; lens: boolean };

const grad = (t: number) =>
  '#' + TOP.map((a, i) => Math.round(a + (BOT[i]! - a) * t).toString(16).padStart(2, '0')).join('');

function build(): Px[] {
  const g: (string | null)[][] = Array.from({ length: H }, () => new Array<string | null>(W).fill(null));
  const lensCell = new Set<string>();
  const lens = (x: number, y: number, w: number, h: number) => {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        if ((i === 0 || i === w - 1) && (j === 0 || j === h - 1)) continue;
        const edge = i === 0 || j === 0 || i === w - 1 || j === h - 1;
        g[y + j + 1]![x + i + 1] = edge ? FRAME : j === h - 2 ? BASE : grad((j - 1) / (h - 3));
        if (!edge) lensCell.add(`${x + i + 1},${y + j + 1}`);
      }
    }
  };
  lens(2, 1, 11, 9);
  lens(13, 1, 11, 9);
  for (let j = 4; j <= 6; j++) {
    g[j + 1]![1] = g[j + 1]![2] = g[j + 1]![25] = g[j + 1]![26] = FRAME;
  }
  // Glints stay white; they sit inside the lenses.
  for (const [x, y] of [[4, 3], [5, 3], [4, 4], [15, 3], [16, 3], [15, 4]] as const) g[y + 1]![x + 1] = '#ffffff';

  const out: Px[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let fill = g[y]![x] ?? null;
      if (!fill) {
        let near = false;
        for (let dy = -1; dy <= 1 && !near; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const yy = y + dy, xx = x + dx;
            if (yy >= 0 && yy < H && xx >= 0 && xx < W && g[yy]![xx]) { near = true; break; }
          }
        if (near) fill = BLACK;
      }
      if (fill) out.push({ x, y, fill, lens: lensCell.has(`${x},${y}`) });
    }
  }
  return out;
}

export const GOGGLES = { width: W, height: H, pixels: build() };
