import "./style.css";
import { KEYS, isPlayable, keyOf } from "./keyboard";
import { MARKS, MARK_LABEL, MARK_SHORT, cluesForSlot, possibleChars, score, type Mark } from "./feedback";
import { dailyAnswer, dateKey, puzzleNumber, randomAnswer } from "./daily";
import {
  hasSeenHelp,
  liveStreak,
  loadDaily,
  loadStats,
  markHelpSeen,
  recordResult,
  saveDaily,
  saveStats,
  type Row,
} from "./storage";
import { shareText } from "./share";

/** Chosen from scripts/simulate.ts — see README "Why 6 guesses". */
export const MAX_GUESSES = 6;
const LEN = 5;

const MARK_TAG: Record<Mark, string> = { exact: "", case: "⇧", near1: "1", near2: "2", far: "3+" };

type Mode = "daily" | "practice";
type Status = "playing" | "won" | "lost";

interface Game {
  mode: Mode;
  answer: string;
  rows: Row[];
  current: string[];
  slot: number;
  status: Status;
}

const state = {
  game: null as unknown as Game,
  shiftToggle: false,
  physShift: false,
  practiceAnswer: "",
  revealRow: -1,
};

// ---------- helpers ----------

function today(): Date {
  return new Date();
}
function yesterdayKey(d: Date): string {
  return dateKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1));
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function shiftOn(): boolean {
  return state.shiftToggle !== state.physShift;
}

/** Fill a fresh input row: carry forward slots already solved exactly. */
function freshRow(rows: Row[]): { current: string[]; slot: number } {
  const current = new Array<string>(LEN).fill("");
  const last = rows[rows.length - 1];
  if (last) last.marks.forEach((m, i) => m === "exact" && (current[i] = [...last.guess][i]));
  const empty = current.findIndex((c) => c === "");
  return { current, slot: empty === -1 ? 0 : empty };
}

function newGame(mode: Mode): Game {
  if (mode === "daily") {
    const d = today();
    const answer = dailyAnswer(d);
    const save = loadDaily(dateKey(d));
    const rows = save?.rows ?? [];
    const won = rows.some((r) => r.marks.every((m) => m === "exact"));
    const status: Status = won ? "won" : rows.length >= MAX_GUESSES ? "lost" : "playing";
    return { mode, answer, rows, status, ...freshRow(rows) };
  }
  const answer = randomAnswer(Math.random, state.practiceAnswer);
  state.practiceAnswer = answer;
  return { mode, answer, rows: [], status: "playing", ...freshRow([]) };
}

// ---------- actions ----------

function typeChar(ch: string): void {
  const g = state.game;
  if (g.status !== "playing" || !isPlayable(ch)) return;
  g.current[g.slot] = ch;
  // Jump to the next empty slot (skipping carried-forward greens); otherwise step right.
  const nextEmpty = g.current.findIndex((c, i) => i > g.slot && c === "");
  g.slot = nextEmpty !== -1 ? nextEmpty : Math.min(g.slot + 1, LEN - 1);
  render();
}

function backspace(): void {
  const g = state.game;
  if (g.status !== "playing") return;
  if (g.current[g.slot] === "" && g.slot > 0) g.slot -= 1;
  g.current[g.slot] = "";
  render();
}

function moveSlot(delta: number): void {
  const g = state.game;
  if (g.status !== "playing") return;
  g.slot = Math.max(0, Math.min(LEN - 1, g.slot + delta));
  render();
}

function selectSlot(i: number): void {
  const g = state.game;
  if (g.status !== "playing") return;
  g.slot = i;
  render();
}

function submit(): void {
  const g = state.game;
  if (g.status !== "playing") return;
  const missing = g.current.findIndex((c) => c === "");
  if (missing !== -1) {
    g.slot = missing;
    toast("Fill all 5 slots");
    shakeRow();
    render();
    return;
  }
  const guess = g.current.join("");
  g.rows.push({ guess, marks: score(guess, g.answer) });
  state.revealRow = g.rows.length - 1;
  if (guess === g.answer) g.status = "won";
  else if (g.rows.length >= MAX_GUESSES) g.status = "lost";
  Object.assign(g, freshRow(g.rows));
  if (g.mode === "daily") {
    const d = today();
    saveDaily({ date: dateKey(d), rows: g.rows, done: g.status !== "playing" });
    if (g.status !== "playing") {
      saveStats(recordResult(loadStats(), dateKey(d), yesterdayKey(d), g.status === "won", g.rows.length));
    }
  }
  render();
  if (g.status !== "playing" && g.mode === "daily") setTimeout(() => openDialog("stats"), 900);
}

function setMode(mode: Mode): void {
  state.game = newGame(mode);
  state.shiftToggle = false;
  render();
}

// ---------- rendering ----------

const app = document.getElementById("app")!;

function renderHeader(): HTMLElement {
  const h = el("header", "top");
  const left = el("div", "top-side");
  const help = el("button", "icon-btn", "?");
  help.setAttribute("aria-label", "How to play");
  help.onclick = () => openDialog("help");
  left.append(help);

  const title = el("h1", "title", "Keystrokle");

  const right = el("div", "top-side right");
  const stats = el("button", "icon-btn");
  stats.setAttribute("aria-label", "Statistics");
  stats.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M4 20h4V10H4zm6 0h4V4h-4zm6 0h4v-7h-4z"/></svg>`;
  stats.onclick = () => openDialog("stats");
  right.append(stats);

  h.append(left, title, right);
  return h;
}

function renderModes(): HTMLElement {
  const g = state.game;
  const wrap = el("div", "modes");
  for (const m of ["daily", "practice"] as Mode[]) {
    const b = el("button", "mode-btn" + (g.mode === m ? " active" : ""), m === "daily" ? `Daily #${puzzleNumber(today())}` : "Practice");
    b.onclick = () => g.mode !== m && setMode(m);
    wrap.append(b);
  }
  return wrap;
}

function renderBoard(): HTMLElement {
  const g = state.game;
  const board = el("div", "board");
  board.setAttribute("role", "grid");
  for (let r = 0; r < MAX_GUESSES; r++) {
    const row = el("div", "row");
    const done = g.rows[r];
    const isInput = !done && r === g.rows.length && g.status === "playing";
    if (isInput) row.classList.add("input-row");
    for (let i = 0; i < LEN; i++) {
      const tile = el("div", "tile");
      if (done) {
        const m = done.marks[i];
        tile.classList.add("scored", `m-${m}`);
        if (r === state.revealRow) {
          tile.classList.add("reveal");
          tile.style.animationDelay = `${i * 70}ms`;
        }
        tile.append(el("span", "ch", [...done.guess][i]));
        if (MARK_TAG[m]) tile.append(el("span", "tag", MARK_TAG[m]));
        tile.title = MARK_LABEL[m];
      } else if (isInput) {
        const ch = g.current[i];
        tile.classList.add("input");
        if (ch) tile.classList.add("filled");
        if (i === g.slot) tile.classList.add("active");
        tile.append(el("span", "ch", ch));
        tile.setAttribute("role", "button");
        tile.setAttribute("aria-label", `Slot ${i + 1}${ch ? `: ${ch}` : ""}`);
        tile.onclick = () => selectSlot(i);
      }
      row.append(tile);
    }
    board.append(row);
  }
  return board;
}

function renderLegend(): HTMLElement {
  const legend = el("div", "legend");
  for (const m of MARKS) {
    const item = el("span", "legend-item");
    const sw = el("span", `swatch m-${m}`, MARK_TAG[m]);
    item.append(sw, el("span", "legend-text", MARK_SHORT[m]));
    item.title = MARK_LABEL[m];
    legend.append(item);
  }
  return legend;
}

function renderResult(): HTMLElement | null {
  const g = state.game;
  if (g.status === "playing") return null;
  const box = el("div", "result");
  const line = el("p", "result-line");
  line.append(
    document.createTextNode(g.status === "won" ? `Solved in ${g.rows.length}/${MAX_GUESSES}. The answer: ` : "Out of guesses. The answer: "),
    el("strong", "answer", g.answer),
  );
  const actions = el("div", "result-actions");
  const share = el("button", "btn primary", "Share");
  share.onclick = doShare;
  actions.append(share);
  if (g.mode === "practice") {
    const next = el("button", "btn", "New puzzle");
    next.onclick = () => setMode("practice");
    actions.append(next);
  } else {
    const practice = el("button", "btn", "Play practice");
    practice.onclick = () => setMode("practice");
    actions.append(practice);
  }
  box.append(line, actions);
  return box;
}

function renderKeyboard(): HTMLElement {
  const g = state.game;
  const kb = el("div", "keyboard");
  kb.setAttribute("aria-label", "On-screen keyboard");
  const shifted = shiftOn();
  const playing = g.status === "playing";
  const possible = playing ? possibleChars(cluesForSlot(g.rows, g.slot)) : null;
  const hint = el("div", "kb-hint");
  if (playing) {
    const n = possible!.size;
    const layer = KEYS.filter((k) => possible!.has(shifted ? k.upper : k.lower)).length;
    const otherLayer = n - layer;
    let text = g.rows.length === 0 ? `Slot ${g.slot + 1}: anything goes. Probe the keyboard.` : `Slot ${g.slot + 1}: ${n} character${n === 1 ? "" : "s"} still possible`;
    if (g.rows.length > 0 && layer === 0 && otherLayer > 0) text += shifted ? " (turn Shift off)" : " (needs Shift)";
    hint.textContent = text;
  }
  kb.append(hint);

  const keys = el("div", "keys");
  for (const k of KEYS) {
    const main = shifted ? k.upper : k.lower;
    const alt = shifted ? k.lower : k.upper;
    const b = el("button", "key");
    b.style.setProperty("--x", String(k.x));
    b.style.setProperty("--r", String(k.row));
    b.append(el("span", "key-main", main));
    const mainOk = !possible || possible.has(main);
    const altOk = !possible || possible.has(alt);
    // Symbols always show their other character; letters show it only when it is the live option.
    if (alt.toLowerCase() !== main.toLowerCase() || (!mainOk && altOk)) b.append(el("span", "key-alt", alt));
    if (possible) {
      if (!mainOk && altOk) b.classList.add("alt-possible");
      else if (!mainOk) b.classList.add("ruled-out");
      if (mainOk && possible.size <= 12) b.classList.add("hot");
    }
    b.setAttribute("aria-label", `${main}${possible && !possible.has(main) ? ", ruled out" : ""}`);
    b.onclick = () => typeChar(main);
    keys.append(b);
  }
  const shift = el("button", "key wide shift" + (shifted ? " on" : ""), "⇧ Shift");
  shift.style.setProperty("--x", "0");
  shift.style.setProperty("--r", "3");
  shift.style.setProperty("--w", "1.25");
  shift.setAttribute("aria-pressed", String(shifted));
  shift.onclick = () => {
    state.shiftToggle = !state.shiftToggle;
    render();
  };
  const back = el("button", "key wide", "⌫");
  back.style.setProperty("--x", "11.25");
  back.style.setProperty("--r", "3");
  back.style.setProperty("--w", "1.25");
  back.setAttribute("aria-label", "Backspace");
  back.onclick = backspace;
  const enter = el("button", "key wide enter", "Enter");
  enter.style.setProperty("--x", "3.25");
  enter.style.setProperty("--r", "4");
  enter.style.setProperty("--w", "6");
  enter.onclick = submit;
  keys.append(shift, back, enter);
  kb.append(keys);
  return kb;
}

function render(): void {
  const main = el("main", "game");
  main.append(renderModes(), renderBoard());
  const result = renderResult();
  if (result) main.append(result);
  main.append(renderLegend());
  const parts: HTMLElement[] = [renderHeader(), main];
  if (state.game.status === "playing") parts.push(renderKeyboard());
  app.replaceChildren(...parts);
  state.revealRow = -1;
}

// ---------- dialogs ----------

function openDialog(kind: "help" | "stats"): void {
  closeDialog();
  const overlay = el("div", "overlay");
  overlay.onclick = (e) => e.target === overlay && closeDialog();
  const dlg = el("div", "dialog");
  dlg.setAttribute("role", "dialog");
  dlg.setAttribute("aria-modal", "true");
  const close = el("button", "icon-btn close", "×");
  close.setAttribute("aria-label", "Close");
  close.onclick = closeDialog;
  dlg.append(close);
  if (kind === "help") dlg.append(...helpContent());
  else dlg.append(...statsContent());
  overlay.append(dlg);
  document.body.append(overlay);
  close.focus();
}

function closeDialog(): void {
  document.querySelector(".overlay")?.remove();
  if (!hasSeenHelp()) markHelpSeen();
}

function dialogOpen(): boolean {
  return !!document.querySelector(".overlay");
}

function exampleRow(guess: string, answer: string): HTMLElement {
  const row = el("div", "row example");
  score(guess, answer).forEach((m, i) => {
    const t = el("div", `tile scored m-${m}`);
    t.append(el("span", "ch", [...guess][i]));
    if (MARK_TAG[m]) t.append(el("span", "tag", MARK_TAG[m]));
    row.append(t);
  });
  return row;
}

function helpContent(): HTMLElement[] {
  const h = el("h2", "", "How to play");
  const p1 = el("p", "", `Guess the hidden 5-character string in ${MAX_GUESSES} tries. Any keys count as a guess: letters, digits and symbols, upper or lower case. There is no dictionary.`);
  const p2 = el("p", "", "Each slot is coloured by how far your key is from the right key on a QWERTY keyboard:");
  const list = el("ul", "help-legend");
  for (const m of MARKS) {
    const li = el("li");
    li.append(el("span", `swatch m-${m}`, MARK_TAG[m]), el("span", "", MARK_LABEL[m]));
    list.append(li);
  }
  const p3 = el("p", "");
  p3.innerHTML =
    "<strong>Blue</strong> means you pressed the right key but with the wrong Shift: <code>a</code> for <code>A</code>, or <code>1</code> for <code>!</code>. Distance ignores Shift, so <code>s</code> and <code>S</code> are both 1 away from <code>a</code>.";
  const p4 = el("p", "");
  p4.innerHTML =
    "<strong>Slots never talk to each other.</strong> There is no “right character, wrong place” colour. Each slot only tells you about its own answer.";
  const p5 = el("p", "", "Example: the answer is Paris.");
  const ex = exampleRow("iArug", "Paris");
  const p6 = el("p", "small", "i is 2 keys from P · A is the right key with the wrong Shift · r is exact · u is 1 key from i · g is 3+ keys from s.");
  const p7 = el("p", "");
  p7.innerHTML =
    "Select a slot and the on-screen keyboard dims every key that can no longer be its answer. Use <strong>⇧ Shift</strong> (or hold Shift on your keyboard) for capitals and symbols. Answers are mostly everyday words, some places with capitals, and a few with digits or symbols like <code>e=mc2</code>. A new daily puzzle starts at local midnight.";
  return [h, p1, p2, list, p3, p4, p5, ex, p6, p7];
}

function statsContent(): HTMLElement[] {
  const s = loadStats();
  const d = today();
  const streak = liveStreak(s, dateKey(d), yesterdayKey(d));
  const h = el("h2", "", "Daily statistics");
  const grid = el("div", "stat-grid");
  const cells: [string, string][] = [
    [String(s.played), "Played"],
    [s.played ? `${Math.round((s.wins / s.played) * 100)}` : "0", "Win %"],
    [String(streak), "Streak"],
    [String(s.maxStreak), "Best streak"],
  ];
  for (const [v, label] of cells) {
    const c = el("div", "stat");
    c.append(el("div", "stat-v", v), el("div", "stat-l", label));
    grid.append(c);
  }
  const h3 = el("h3", "", "Guess distribution");
  const dist = el("div", "dist");
  const maxN = Math.max(1, ...Object.values(s.dist));
  const g = state.game;
  const todayWin = g.mode === "daily" && g.status === "won" ? g.rows.length : -1;
  for (let n = 1; n <= MAX_GUESSES; n++) {
    const count = s.dist[n] ?? 0;
    const row = el("div", "dist-row");
    const bar = el("div", "dist-bar" + (n === todayWin ? " today" : ""), String(count));
    bar.style.width = `${Math.max(8, (count / maxN) * 100)}%`;
    row.append(el("span", "dist-n", String(n)), bar);
    dist.append(row);
  }
  const out: HTMLElement[] = [h, grid, h3, dist];
  if (g.mode === "daily" && g.status !== "playing") {
    const share = el("button", "btn primary block", "Share today's result");
    share.onclick = doShare;
    out.push(share);
  }
  return out;
}

// ---------- share / toast ----------

async function doShare(): Promise<void> {
  const g = state.game;
  const text = shareText({
    label: g.mode === "daily" ? `#${puzzleNumber(today())}` : "practice",
    rows: g.rows,
    won: g.status === "won",
    maxGuesses: MAX_GUESSES,
    url: location.origin,
  });
  try {
    await navigator.clipboard.writeText(text);
    toast("Copied result to clipboard");
  } catch {
    const ta = el("textarea");
    ta.value = text;
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    toast(ok ? "Copied result to clipboard" : "Could not copy");
  }
}

let toastTimer = 0;
function toast(msg: string): void {
  let t = document.querySelector<HTMLElement>(".toast");
  if (!t) {
    t = el("div", "toast");
    t.setAttribute("role", "status");
    document.body.append(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t!.classList.remove("show"), 1600);
}

function shakeRow(): void {
  requestAnimationFrame(() => {
    const row = document.querySelector(".input-row");
    row?.classList.add("shake");
  });
}

// ---------- physical keyboard ----------

/** e.key normally already carries Shift. Some synthetic or remapped events report
 * shiftKey with the unshifted character, so honour Shift there (but not with Caps Lock). */
function physicalChar(e: KeyboardEvent): string {
  const k = keyOf(e.key);
  if (e.shiftKey && e.key === k.lower && !e.getModifierState("CapsLock")) return k.upper;
  return e.key;
}

window.addEventListener("keydown", (e) => {
  if (e.key === "Shift") {
    if (!state.physShift) {
      state.physShift = true;
      render();
    }
    return;
  }
  if (dialogOpen()) {
    if (e.key === "Escape") closeDialog();
    return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === "Enter") {
    e.preventDefault();
    submit();
  } else if (e.key === "Backspace") {
    e.preventDefault();
    backspace();
  } else if (e.key === "ArrowLeft") {
    moveSlot(-1);
  } else if (e.key === "ArrowRight") {
    moveSlot(1);
  } else if (e.key.length === 1 && isPlayable(e.key)) {
    e.preventDefault();
    typeChar(physicalChar(e));
  }
});

window.addEventListener("keyup", (e) => {
  if (e.key === "Shift" && state.physShift) {
    state.physShift = false;
    render();
  }
});

window.addEventListener("blur", () => {
  if (state.physShift) {
    state.physShift = false;
    render();
  }
});

// Roll the daily puzzle over if the tab stays open past midnight.
let shownDay = dateKey(today());
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && dateKey(today()) !== shownDay) {
    shownDay = dateKey(today());
    if (state.game.mode === "daily") setMode("daily");
  }
});

// ---------- boot ----------

state.game = newGame("daily");
render();
if (!hasSeenHelp()) openDialog("help");
