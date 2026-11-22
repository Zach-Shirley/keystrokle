import { ANSWERS } from "./answers";

/** Day #1 of the daily puzzle. */
export const EPOCH = { y: 2026, m: 11, d: 21 };

/** Small deterministic PRNG (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const out = items.slice();
  const rand = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const DAILY_SEED = 0x4b3753; // fixed so every player gets the same order
export const DAILY_ORDER: string[] = seededShuffle(ANSWERS, DAILY_SEED);

/** Whole days between the epoch and the given local calendar date (DST-safe). */
export function dayIndex(date: Date): number {
  const local = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const epoch = Date.UTC(EPOCH.y, EPOCH.m - 1, EPOCH.d);
  return Math.round((local - epoch) / 86400000);
}

/** Puzzle number shown to players (day 1 = epoch). */
export function puzzleNumber(date: Date): number {
  return dayIndex(date) + 1;
}

export function dailyAnswer(date: Date): string {
  const n = DAILY_ORDER.length;
  const i = ((dayIndex(date) % n) + n) % n;
  return DAILY_ORDER[i];
}

/** Local date key like 2026-11-21, used for storage. */
export function dateKey(date: Date): string {
  const p = (v: number) => String(v).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export function randomAnswer(rand: () => number = Math.random, exclude?: string): string {
  let pick = ANSWERS[Math.floor(rand() * ANSWERS.length)];
  if (pick === exclude && ANSWERS.length > 1) pick = ANSWERS[(ANSWERS.indexOf(pick) + 1) % ANSWERS.length];
  return pick;
}
