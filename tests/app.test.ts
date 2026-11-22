import { describe, expect, it } from "vitest";
import { emptyStats, liveStreak, recordResult } from "../src/storage";
import { shareText } from "../src/share";
import { score } from "../src/feedback";

describe("stats", () => {
  it("builds and breaks streaks", () => {
    let s = emptyStats();
    s = recordResult(s, "2026-11-21", "2026-11-20", true, 4);
    s = recordResult(s, "2026-11-22", "2026-11-21", true, 5);
    expect(s.streak).toBe(2);
    expect(s.maxStreak).toBe(2);
    expect(s.dist).toEqual({ 4: 1, 5: 1 });
    s = recordResult(s, "2026-11-24", "2026-11-23", true, 3); // skipped a day
    expect(s.streak).toBe(1);
    s = recordResult(s, "2026-11-25", "2026-11-24", false, 6);
    expect(s).toMatchObject({ played: 4, wins: 3, streak: 0, maxStreak: 2 });
  });

  it("counts a day only once", () => {
    const s = recordResult(emptyStats(), "2026-11-21", "2026-11-20", true, 4);
    expect(recordResult(s, "2026-11-21", "2026-11-20", true, 2)).toBe(s);
  });

  it("shows a lapsed streak as zero", () => {
    const s = recordResult(emptyStats(), "2026-11-21", "2026-11-20", true, 4);
    expect(liveStreak(s, "2026-11-22", "2026-11-21")).toBe(1);
    expect(liveStreak(s, "2026-11-23", "2026-11-22")).toBe(0);
  });
});

describe("share", () => {
  it("prints an emoji grid without the answer", () => {
    const rows = ["ggggg", "Paris"].map((g) => ({ guess: g, marks: score(g, "Paris") }));
    const text = shareText({ label: "#1", rows, won: true, maxGuesses: 6, url: "https://example.test" });
    expect(text).toBe("Keystrokle #1 2/6\n🟥🟥🟧🟥🟥\n🟩🟩🟩🟩🟩\nhttps://example.test");
    expect(text).not.toMatch(/Paris|g/);
  });

  it("marks a loss with X", () => {
    const rows = [{ guess: "aaaaa", marks: score("aaaaa", "Paris") }];
    expect(shareText({ label: "practice", rows, won: false, maxGuesses: 6, url: "u" })).toMatch(/^Keystrokle practice X\/6/);
  });
});
