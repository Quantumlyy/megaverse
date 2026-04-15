import type { Cell, Grid } from "@megaverse/core";
import { constants } from "@megaverse/core";
import type { ProgressStats, ProgressTracker } from "@megaverse/engine";

const { _ } = constants;

export type CellRenderState = "todo" | "pending" | "placed" | "failed" | "empty";

export enum LogLevel {
  INFO = "info",
  OK = "ok",
  ERR = "error",
}
export interface LogEntry {
  readonly time: Date;
  readonly text: string;
  readonly level: LogLevel;
}

export interface TuiState {
  readonly goal: Grid;
  readonly grid: Grid;
  readonly cellStates: ReadonlyMap<string, CellRenderState>;
  readonly stats: ProgressStats;
  readonly log: ReadonlyArray<LogEntry>;
  readonly complete: boolean;
}

const LOG_LIMIT = 12;

export class TuiProgressTracker implements ProgressTracker {
  private state: TuiState = {
    goal: [],
    grid: [],
    cellStates: new Map(),
    stats: {
      total: 0,
      placed: 0,
      failed: 0,
      skipped: 0,
      pending: 0,
      todo: 0,
      attempts: 0,
      retries: 0,
    },
    log: [],
    complete: false,
  };
  private listeners = new Set<() => void>();

  public onStart(initial: Grid, goal: Grid, ts: number = Date.now()) {
    const cellStates: Map<string, CellRenderState> = new Map();

    goal.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell === _) cellStates.set(`${r},${c}`, "empty");
        else if (cell === initial[r]?.[c]) cellStates.set(`${r},${c}`, "placed");
        else cellStates.set(`${r},${c}`, "todo");
      });
    });

    this.set({
      goal,
      grid: initial.map((row) => [...row]),
      cellStates,
      log: this.appendLog(LogLevel.INFO, "Solver started", ts),
    });
  }

  public onPlan(total: number, skipped: number, ts: number = Date.now()) {
    this.set({
      stats: { ...this.state.stats, total, skipped, todo: total - skipped },
      log: this.appendLog(LogLevel.INFO, `Planned ${total} placements, ${skipped} skipped`, ts),
    });
  }

  public onPlacementStarted(
    row: number,
    col: number,
    _cell: Cell,
    _attempt: number = 1,
    _ts: number = Date.now()
  ) {
    const cellStates = new Map(this.state.cellStates);
    cellStates.set(`${row},${col}`, "pending");
    this.set({
      cellStates,
      stats: { ...this.state.stats, pending: this.state.stats.pending + 1 },
    });
  }

  public onPlacementSucceeded(
    row: number,
    col: number,
    cell: Cell,
    _attempt: number = 1,
    ts: number = Date.now()
  ) {
    // clone
    const grid = this.state.grid.map((r) => [...r]);
    // biome-ignore lint/style/noNonNullAssertion: grid is already present
    grid[row]![col] = cell;

    const cellStates = new Map(this.state.cellStates);
    cellStates.set(`${row},${col}`, "placed");

    this.set({
      grid,
      cellStates,
      stats: {
        ...this.state.stats,
        placed: this.state.stats.placed + 1,
        pending: this.state.stats.pending - 1,
        todo: this.state.stats.todo - 1,
        attempts: this.state.stats.attempts + 1,
      },
      log: this.appendLog(LogLevel.OK, `placed ${cell} at (${row},${col})`, ts),
    });
  }

  public onPlacementFailed(
    row: number,
    col: number,
    reason: string,
    _attempt: number = 1,
    ts: number = Date.now()
  ) {
    const cellStates = new Map(this.state.cellStates);
    cellStates.set(`${row},${col}`, "failed");

    this.set({
      cellStates,
      stats: {
        ...this.state.stats,
        failed: this.state.stats.failed + 1,
        pending: this.state.stats.pending - 1,
      },
      log: this.appendLog(LogLevel.ERR, `failed (${row},${col}): ${reason}`, ts),
    });
  }

  public onComplete(ts: number = Date.now()) {
    this.set({ complete: true, log: this.appendLog(LogLevel.OK, "Solver complete", ts) });
  }

  public getState(): TuiState {
    return this.state;
  }

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private set(patch: Partial<TuiState>) {
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l();
  }

  private appendLog(level: LogLevel, text: string, ts: number = Date.now()): TuiState["log"] {
    const next = [...this.state.log, { time: new Date(ts), text, level }];
    return next.slice(-LOG_LIMIT);
  }
}
