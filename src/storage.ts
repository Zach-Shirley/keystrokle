import type { Mark } from "./feedback";

export interface Row {
  guess: string;
  marks: Mark[];
}

export interface Stats {
  played: number;
  wins: number;
  streak: number;
  maxStreak: number;
  /** dist[n] = wins on guess n (1-based). */
  dist: Record<number, number>;
  lastWinDate: string | null;
  lastPlayedDate: string | null;
}

export interface DailySave {
  date: string;
  rows: Row[];
  done: boolean;
}

const STATS_KEY = "keystrokle:stats:v1";
const DAILY_KEY = "keystrokle:daily:v1";
const SEEN_HELP_KEY = "keystrokle:seen-help:v1";

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: play continues without saving */
  }
}

export function emptyStats(): Stats {
  return { played: 0, wins: 0, streak: 0, maxStreak: 0, dist: {}, lastWinDate: null, lastPlayedDate: null };
}

export function loadStats(): Stats {
  return { ...emptyStats(), ...(read<Stats>(STATS_KEY) ?? {}) };
}

export function saveStats(s: Stats): void {
  write(STATS_KEY, s);
}

/** Pure update so it can be unit-tested. `yesterday` is the date key of the previous day. */
export function recordResult(s: Stats, date: string, yesterday: string, won: boolean, guesses: number): Stats {
  if (s.lastPlayedDate === date) return s; // already counted today
  const next: Stats = { ...s, dist: { ...s.dist }, played: s.played + 1, lastPlayedDate: date };
  if (won) {
    next.wins += 1;
    next.streak = s.lastWinDate === yesterday ? s.streak + 1 : 1;
    next.maxStreak = Math.max(next.maxStreak, next.streak);
    next.dist[guesses] = (next.dist[guesses] ?? 0) + 1;
    next.lastWinDate = date;
  } else {
    next.streak = 0;
  }
  return next;
}

/** Current streak as displayed: it lapses if the last win was before yesterday. */
export function liveStreak(s: Stats, today: string, yesterday: string): number {
  return s.lastWinDate === today || s.lastWinDate === yesterday ? s.streak : 0;
}

export function loadDaily(date: string): DailySave | null {
  const d = read<DailySave>(DAILY_KEY);
  return d && d.date === date ? d : null;
}

export function saveDaily(d: DailySave): void {
  write(DAILY_KEY, d);
}

export function hasSeenHelp(): boolean {
  return read<boolean>(SEEN_HELP_KEY) === true;
}

export function markHelpSeen(): void {
  write(SEEN_HELP_KEY, true);
}
