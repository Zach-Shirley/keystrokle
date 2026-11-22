// Physical US QWERTY geometry for the 45 playable keys.
// Each row lists [unshifted, shifted] pairs. Row offsets are in key widths and
// follow a standard staggered keyboard (number row starts at 0, then the Tab,
// Caps Lock and Shift keys push each lower row further right).

export interface Key {
  id: number;
  row: number;
  col: number;
  /** Left edge in key widths. */
  x: number;
  lower: string;
  upper: string;
}

const ROWS: { offset: number; lower: string; upper: string }[] = [
  { offset: 0, lower: "1234567890-=", upper: "!@#$%^&*()_+" },
  { offset: 0.5, lower: "qwertyuiop[]", upper: "QWERTYUIOP{}" },
  { offset: 0.75, lower: "asdfghjkl;'", upper: 'ASDFGHJKL:"' },
  { offset: 1.25, lower: "zxcvbnm,./", upper: "ZXCVBNM<>?" },
];

export const KEYS: Key[] = [];
ROWS.forEach((r, row) => {
  [...r.lower].forEach((lower, col) => {
    KEYS.push({ id: KEYS.length, row, col, x: r.offset + col, lower, upper: r.upper[col] });
  });
});

export const ROW_COUNT = ROWS.length;
export const KEY_ROWS: Key[][] = ROWS.map((_, i) => KEYS.filter((k) => k.row === i));

/** All 90 playable characters. */
export const CHARS: string[] = KEYS.flatMap((k) => [k.lower, k.upper]);

const keyByChar = new Map<string, Key>();
for (const k of KEYS) {
  keyByChar.set(k.lower, k);
  keyByChar.set(k.upper, k);
}

export function isPlayable(ch: string): boolean {
  return keyByChar.has(ch);
}

export function keyOf(ch: string): Key {
  const k = keyByChar.get(ch);
  if (!k) throw new Error(`Not a playable character: ${JSON.stringify(ch)}`);
  return k;
}

export function isShifted(ch: string): boolean {
  return keyOf(ch).upper === ch;
}

/** Keys touch if they are side by side in a row, or overlap horizontally in adjacent rows. */
function touching(a: Key, b: Key): boolean {
  if (a.id === b.id) return false;
  if (a.row === b.row) return Math.abs(a.col - b.col) === 1;
  if (Math.abs(a.row - b.row) !== 1) return false;
  const overlap = Math.min(a.x + 1, b.x + 1) - Math.max(a.x, b.x);
  return overlap > 1e-9;
}

export const NEIGHBORS: number[][] = KEYS.map((a) => KEYS.filter((b) => touching(a, b)).map((b) => b.id));

function bfs(start: number): number[] {
  const dist = new Array<number>(KEYS.length).fill(Infinity);
  dist[start] = 0;
  const queue = [start];
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i];
    for (const n of NEIGHBORS[cur]) {
      if (dist[n] === Infinity) {
        dist[n] = dist[cur] + 1;
        queue.push(n);
      }
    }
  }
  return dist;
}

/** KEY_DIST[a][b] = steps between key ids a and b. */
export const KEY_DIST: number[][] = KEYS.map((k) => bfs(k.id));

export function keyDistance(a: string, b: string): number {
  return KEY_DIST[keyOf(a).id][keyOf(b).id];
}

export function neighborsOf(ch: string): string[] {
  return NEIGHBORS[keyOf(ch).id].map((id) => KEYS[id].lower);
}
