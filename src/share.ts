import { MARK_EMOJI } from "./feedback";
import type { Row } from "./storage";

export function shareText(opts: { label: string; rows: Row[]; won: boolean; maxGuesses: number; url: string }): string {
  const score = opts.won ? `${opts.rows.length}/${opts.maxGuesses}` : `X/${opts.maxGuesses}`;
  const grid = opts.rows.map((r) => r.marks.map((m) => MARK_EMOJI[m]).join("")).join("\n");
  return `Keystrokle ${opts.label} ${score}\n${grid}\n${opts.url}`;
}
