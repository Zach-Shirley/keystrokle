import { describe, expect, it } from "vitest";
import { CHARS, KEYS, keyDistance, neighborsOf } from "../src/keyboard";
import { cluesForSlot, keyPossibilities, markFor, possibleChars, score } from "../src/feedback";
import { ANSWERS, ANSWER_GROUPS } from "../src/answers";
import { DAILY_ORDER, dailyAnswer, dateKey, dayIndex, puzzleNumber, seededShuffle } from "../src/daily";

const sorted = (a: string[]) => [...a].sort();

describe("keyboard graph", () => {
  it("has 45 keys and 90 distinct characters", () => {
    expect(KEYS).toHaveLength(45);
    expect(new Set(CHARS).size).toBe(90);
    for (const banned of ["`", "~", "\\", "|", " "]) expect(CHARS).not.toContain(banned);
  });

  it("g borders f h t y v b", () => {
    expect(sorted(neighborsOf("g"))).toEqual(sorted(["f", "h", "t", "y", "v", "b"]));
  });

  it("knows edge neighbours", () => {
    expect(sorted(neighborsOf("1"))).toEqual(["2", "q"]);
    expect(sorted(neighborsOf("="))).toEqual(sorted(["-", "[", "]"]));
    expect(sorted(neighborsOf("q"))).toEqual(sorted(["1", "2", "w", "a"]));
    expect(sorted(neighborsOf("a"))).toEqual(sorted(["q", "w", "s", "z"]));
    expect(sorted(neighborsOf("z"))).toEqual(sorted(["a", "s", "x"]));
    expect(sorted(neighborsOf("/"))).toEqual(sorted([".", ";", "'"]));
    expect(sorted(neighborsOf("'"))).toEqual(sorted([";", "[", "]", "/"]));
    expect(sorted(neighborsOf("]"))).toEqual(sorted(["[", "=", "'"]));
  });

  it("neighbours are symmetric", () => {
    for (const k of KEYS) for (const n of neighborsOf(k.lower)) expect(neighborsOf(n)).toContain(k.lower);
  });

  it("measures known distances", () => {
    expect(keyDistance("g", "g")).toBe(0);
    expect(keyDistance("g", "G")).toBe(0);
    expect(keyDistance("g", "h")).toBe(1);
    expect(keyDistance("g", "j")).toBe(2);
    expect(keyDistance("G", "u")).toBe(2);
    expect(keyDistance("q", "p")).toBe(9);
    expect(keyDistance("1", "/")).toBe(12);
    expect(keyDistance("!", "a")).toBe(2);
    expect(keyDistance("z", "1")).toBe(3);
  });

  it("is a connected graph", () => {
    for (const a of CHARS) for (const b of CHARS) expect(Number.isFinite(keyDistance(a, b))).toBe(true);
  });
});

describe("feedback", () => {
  it("marks each slot by distance and case", () => {
    expect(markFor("a", "a")).toBe("exact");
    expect(markFor("A", "a")).toBe("case");
    expect(markFor("1", "!")).toBe("case");
    expect(markFor("s", "a")).toBe("near1");
    expect(markFor("D", "a")).toBe("near2");
    expect(markFor("p", "a")).toBe("far");
  });

  it("scores a whole guess with no wrong-slot signal", () => {
    expect(score("Paris", "Paris")).toEqual(["exact", "exact", "exact", "exact", "exact"]);
    expect(score("paris", "Paris")).toEqual(["case", "exact", "exact", "exact", "exact"]);
    // 's' is in the answer but in another slot: still only judged by distance to that slot.
    expect(score("siraP", "Paris")).toEqual(["far", "far", "exact", "far", "far"]);
  });

  it("rejects mismatched lengths", () => {
    expect(() => score("abc", "abcd")).toThrow();
  });
});

describe("possible-key shading", () => {
  it("starts with every character possible", () => {
    expect(possibleChars([]).size).toBe(90);
  });

  it("narrows to the ring around a probe", () => {
    const p = possibleChars([{ ch: "g", mark: "near1" }]);
    expect(sorted([...p])).toEqual(sorted(["f", "h", "t", "y", "v", "b", "F", "H", "T", "Y", "V", "B"]));
  });

  it("case clue leaves only the other layer", () => {
    expect([...possibleChars([{ ch: "g", mark: "case" }])]).toEqual(["G"]);
  });

  it("intersects clues across rows", () => {
    const rows = [
      { guess: "ggggg", marks: score("ggggg", "hello") },
      { guess: "jjjjj", marks: score("jjjjj", "hello") },
    ];
    const slot0 = possibleChars(cluesForSlot(rows, 0));
    expect(slot0.has("h")).toBe(true);
    expect(slot0.has("H")).toBe(true);
    expect(slot0.size).toBe(2);
    const keys = keyPossibilities(slot0);
    const hKey = KEYS.find((k) => k.lower === "h")!;
    expect(keys[hKey.id]).toEqual({ lower: true, upper: true });
    expect(keys.filter((k) => k.lower || k.upper)).toHaveLength(1);
  });

  it("always keeps the true answer possible", () => {
    for (const answer of ANSWERS.slice(0, 60)) {
      const rows = ["ggggg", "qqqqq", "/////", "55555"].map((g) => ({ guess: g, marks: score(g, answer) }));
      [...answer].forEach((ch, i) => expect(possibleChars(cluesForSlot(rows, i)).has(ch)).toBe(true));
    }
  });
});

describe("answers", () => {
  it("are unique, five playable characters each", () => {
    for (const a of ANSWERS) {
      expect([...a], a).toHaveLength(5);
      for (const ch of a) expect(CHARS, `${a} has ${ch}`).toContain(ch);
    }
    expect(new Set(ANSWERS).size).toBe(ANSWERS.length);
  });

  it("cover more than a year and mix in capitals and symbols", () => {
    expect(ANSWERS.length).toBeGreaterThanOrEqual(366);
    expect(ANSWER_GROUPS.capitals.length).toBeGreaterThan(40);
    expect(ANSWER_GROUPS.symbols.length).toBeGreaterThan(40);
  });
});

describe("daily seeding", () => {
  it("numbers days from the epoch in local time", () => {
    expect(dayIndex(new Date(2026, 10, 21, 0, 1))).toBe(0);
    expect(dayIndex(new Date(2026, 10, 21, 23, 59))).toBe(0);
    expect(dayIndex(new Date(2026, 10, 22, 0, 0))).toBe(1);
    expect(puzzleNumber(new Date(2026, 10, 21))).toBe(1);
    // Across a DST change (US: 2027-03-14)
    expect(dayIndex(new Date(2027, 2, 15)) - dayIndex(new Date(2027, 2, 13))).toBe(2);
  });

  it("is stable within a day and changes between days", () => {
    const a = dailyAnswer(new Date(2026, 11, 5, 1));
    expect(dailyAnswer(new Date(2026, 11, 5, 22))).toBe(a);
    expect(dailyAnswer(new Date(2026, 11, 6, 1))).not.toBe(a);
  });

  it("does not repeat for a full cycle", () => {
    const seen = new Set<string>();
    for (let i = 0; i < DAILY_ORDER.length; i++) seen.add(dailyAnswer(new Date(2026, 10, 21 + i)));
    expect(seen.size).toBe(DAILY_ORDER.length);
    expect(dailyAnswer(new Date(2026, 10, 21 + DAILY_ORDER.length))).toBe(dailyAnswer(new Date(2026, 10, 21)));
  });

  it("handles dates before the epoch", () => {
    expect(ANSWERS).toContain(dailyAnswer(new Date(2020, 0, 1)));
  });

  it("shuffle is deterministic and a permutation", () => {
    expect(seededShuffle([1, 2, 3, 4, 5], 7)).toEqual(seededShuffle([1, 2, 3, 4, 5], 7));
    expect(sorted(DAILY_ORDER)).toEqual(sorted(ANSWERS));
  });

  it("formats storage keys", () => {
    expect(dateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
