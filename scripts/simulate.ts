// Guess-count simulation. Run: npm run simulate
// Feedback is per slot only, so each slot is an independent search over the 90
// characters. A game is won on the turn the slowest slot first hits exact.
import { ANSWERS } from "../src/answers";
import { CHARS } from "../src/keyboard";
import { markFor, type Mark } from "../src/feedback";
import { mulberry32 } from "../src/daily";

// Prior a player could reasonably hold: answers are mostly lowercase words.
// Use character frequency across the answer list, smoothed so nothing is zero.
const freq = new Map<string, number>(CHARS.map((c) => [c, 0.5]));
for (const a of ANSWERS) for (const c of a) freq.set(c, (freq.get(c) ?? 0) + 1);

type Player = (cands: string[], rand: () => number) => string;

function weightedPick(cands: string[], rand: () => number): string {
  const total = cands.reduce((s, c) => s + freq.get(c)!, 0);
  let r = rand() * total;
  for (const c of cands) {
    r -= freq.get(c)!;
    if (r <= 0) return c;
  }
  return cands[cands.length - 1];
}

const players: Record<string, Player> = {
  // Picks any still-possible character, all equally likely: knows nothing about words.
  naive: (cands, rand) => cands[Math.floor(rand() * cands.length)],
  // Picks a still-possible character, favouring common ones (a person who knows answers are mostly words).
  sensible: (cands, rand) => weightedPick(cands, rand),
  // Picks the probe (any of 90) that minimises expected remaining weight. Upper bound on skill.
  greedy: (cands) => {
    if (cands.length <= 2) return cands.reduce((a, b) => (freq.get(a)! >= freq.get(b)! ? a : b));
    let best = cands[0];
    let bestScore = Infinity;
    for (const probe of CHARS) {
      const buckets = new Map<Mark, number>();
      for (const c of cands) {
        if (c === probe) continue; // a hit ends the search
        const m = markFor(probe, c);
        buckets.set(m, (buckets.get(m) ?? 0) + freq.get(c)!);
      }
      let s = 0;
      for (const w of buckets.values()) s += w * w;
      if (s < bestScore || (s === bestScore && cands.includes(probe) && !cands.includes(best))) {
        bestScore = s;
        best = probe;
      }
    }
    return best;
  },
};

function solveSlot(target: string, player: Player, rand: () => number): number {
  let cands = CHARS.slice();
  for (let turn = 1; turn <= 50; turn++) {
    const probe = player(cands, rand);
    if (probe === target) return turn;
    const m = markFor(probe, target);
    cands = cands.filter((c) => c !== probe && markFor(probe, c) === m);
  }
  throw new Error("did not converge");
}

function playGame(answer: string, player: Player, rand: () => number): number {
  return Math.max(...[...answer].map((ch) => solveSlot(ch, player, rand)));
}

const RUNS = 20;
const rand = mulberry32(12345);
const summary: Record<string, { mean: number; median: number; dist: Record<number, number>; winRate: Record<number, number> }> = {};

for (const [name, player] of Object.entries(players)) {
  const results: number[] = [];
  for (let r = 0; r < RUNS; r++) for (const a of ANSWERS) results.push(playGame(a, player, rand));
  results.sort((a, b) => a - b);
  const dist: Record<number, number> = {};
  for (const t of results) dist[t] = (dist[t] ?? 0) + 1;
  const winRate: Record<number, number> = {};
  for (let n = 4; n <= 10; n++) winRate[n] = results.filter((t) => t <= n).length / results.length;
  summary[name] = {
    mean: results.reduce((s, t) => s + t, 0) / results.length,
    median: results[Math.floor(results.length / 2)],
    dist,
    winRate,
  };
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
console.log(`Games per player: ${ANSWERS.length * RUNS} (${ANSWERS.length} answers x ${RUNS} runs)\n`);
for (const [name, s] of Object.entries(summary)) {
  const total = Object.values(s.dist).reduce((a, b) => a + b, 0);
  console.log(`${name}: mean ${s.mean.toFixed(2)}, median ${s.median}`);
  console.log("  solved on turn: " + Object.entries(s.dist).map(([t, c]) => `${t}:${pct(c / total)}`).join("  "));
  console.log("  win rate with N guesses: " + Object.entries(s.winRate).map(([n, w]) => `N=${n} ${pct(w)}`).join("  "));
}
