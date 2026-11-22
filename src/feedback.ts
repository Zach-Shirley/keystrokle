import { CHARS, KEYS, keyDistance } from "./keyboard";

/** Per-slot result. No "right character, wrong slot" signal exists. */
export type Mark = "exact" | "case" | "near1" | "near2" | "far";

export const MARKS: Mark[] = ["exact", "case", "near1", "near2", "far"];

export const MARK_EMOJI: Record<Mark, string> = {
  exact: "🟩",
  case: "🟦",
  near1: "🟨",
  near2: "🟧",
  far: "🟥",
};

export const MARK_LABEL: Record<Mark, string> = {
  exact: "Exact",
  case: "Right key, wrong Shift",
  near1: "1 key away",
  near2: "2 keys away",
  far: "3+ keys away",
};

export function markFor(guess: string, answer: string): Mark {
  if (guess === answer) return "exact";
  const d = keyDistance(guess, answer);
  if (d === 0) return "case";
  if (d === 1) return "near1";
  if (d === 2) return "near2";
  return "far";
}

export function score(guess: string, answer: string): Mark[] {
  const g = [...guess];
  const a = [...answer];
  if (g.length !== a.length) throw new Error("Guess and answer lengths differ");
  return g.map((ch, i) => markFor(ch, a[i]));
}

export interface SlotClue {
  ch: string;
  mark: Mark;
}

/** Characters still consistent with every clue given for one slot. */
export function possibleChars(clues: SlotClue[]): Set<string> {
  const out = new Set<string>();
  for (const c of CHARS) {
    if (clues.every((clue) => markFor(clue.ch, c) === clue.mark)) out.add(c);
  }
  return out;
}

/** Clues for slot `slot` collected from all scored rows. */
export function cluesForSlot(rows: { guess: string; marks: Mark[] }[], slot: number): SlotClue[] {
  return rows.map((r) => ({ ch: [...r.guess][slot], mark: r.marks[slot] }));
}

export interface KeyPossibility {
  lower: boolean;
  upper: boolean;
}

/** For each physical key id, whether its unshifted / shifted character is still possible. */
export function keyPossibilities(possible: Set<string>): KeyPossibility[] {
  return KEYS.map((k) => ({ lower: possible.has(k.lower), upper: possible.has(k.upper) }));
}


/** Compact labels for the always-visible legend. */
export const MARK_SHORT: Record<Mark, string> = {
  exact: "Exact",
  case: "Wrong Shift",
  near1: "1 away",
  near2: "2 away",
  far: "3+ away",
};
