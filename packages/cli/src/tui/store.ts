import { type Cell, constants, type Grid } from "@megaverse/core";
import type { Plan, Progress } from "@megaverse/engine";
import { Effect, SubscriptionRef } from "effect";

const { _ } = constants;

/**
 * Per-cell visual state rendered by the grid panel.
 */
export type CellRenderState = "todo" | "pending" | "placed" | "failed" | "empty";

/**
 * Severity used to colour log entries in the TUI.
 */
export enum LogLevel {
  INFO = "info",
  OK = "ok",
  ERR = "error",
}

/**
 * A single line rendered in the log panel.
 */
export interface LogEntry {
  readonly time: Date;
  readonly text: string;
  readonly level: LogLevel;
}

/**
 * Aggregate progress counters derived from the solver event stream.
 */
export interface ProgressStats {
  readonly total: number;
  readonly placed: number;
  readonly failed: number;
  readonly skipped: number;
  readonly pending: number;
  readonly todo: number;
  readonly attempts: number;
  readonly retries: number;
}

/**
 * The full UI state. This is what every panel reads from and what every
 * {@link Progress} event reduces into.
 */
export interface TuiState {
  readonly goal: Grid;
  readonly grid: Grid;
  readonly cellStates: ReadonlyMap<string, CellRenderState>;
  readonly stats: ProgressStats;
  readonly log: ReadonlyArray<LogEntry>;
  readonly complete: boolean;
}

const LOG_LIMIT = 12;

const ZERO_STATS: ProgressStats = {
  total: 0,
  placed: 0,
  failed: 0,
  skipped: 0,
  pending: 0,
  todo: 0,
  attempts: 0,
  retries: 0,
};

/**
 * The starting {@link TuiState} — empty grids, zeroed stats, no log.
 */
export const emptyState: TuiState = {
  goal: [],
  grid: [],
  cellStates: new Map(),
  stats: ZERO_STATS,
  log: [],
  complete: false,
};

const appendLog = (
  state: TuiState,
  level: LogLevel,
  text: string,
  ts: number = Date.now()
): TuiState["log"] => {
  const next = [...state.log, { time: new Date(ts), text, level }];
  return next.slice(-LOG_LIMIT);
};

const key = (row: number, col: number) => `${row},${col}`;

/**
 * Seed a {@link TuiState} from a {@link Plan}.
 *
 * @remarks
 * Populates the goal, mirrors the current grid, and marks every non-SPACE
 * cell as either `placed` (already matches the goal) or `todo`.
 */
export const seedFromPlan = (plan: Plan, ts: number = Date.now()): TuiState => {
  const cellStates = new Map<string, CellRenderState>();
  plan.goal.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell === _) {
        cellStates.set(key(r, c), "empty");
      } else if (cell === plan.current[r]?.[c]) {
        cellStates.set(key(r, c), "placed");
      } else {
        cellStates.set(key(r, c), "todo");
      }
    });
  });

  return {
    goal: plan.goal,
    grid: plan.current.map((row) => [...row]),
    cellStates,
    stats: {
      ...ZERO_STATS,
      total: plan.todo.length,
      skipped: plan.skipped,
      todo: plan.todo.length,
    },
    log: [
      {
        time: new Date(ts),
        text: `Planned ${plan.todo.length} placements, ${plan.skipped} skipped`,
        level: LogLevel.INFO,
      },
    ],
    complete: false,
  };
};

const setCellState = (
  state: TuiState,
  row: number,
  col: number,
  next: CellRenderState
): ReadonlyMap<string, CellRenderState> => {
  const copy = new Map(state.cellStates);
  copy.set(key(row, col), next);
  return copy;
};

const setGrid = (state: TuiState, row: number, col: number, cell: Cell): Grid => {
  const rows = state.grid.map((r) => [...r]);
  const target = rows[row];
  if (target) target[col] = cell;
  return rows;
};

/**
 * Pure reducer that folds a {@link Progress} event into the previous
 * {@link TuiState}.
 *
 * @remarks
 * Safe to call synchronously from any context — no I/O, no mutation of the
 * input. Designed to pair with `Stream.scan` or `SubscriptionRef.update`.
 */
export const reduce = (state: TuiState, event: Progress, ts: number = Date.now()): TuiState => {
  switch (event._tag) {
    case "Planned":
      return {
        ...state,
        stats: {
          ...state.stats,
          total: event.total,
          skipped: event.skipped,
          todo: event.total,
        },
        log: appendLog(state, LogLevel.INFO, "Execution started", ts),
      };

    case "Started":
      return {
        ...state,
        cellStates: setCellState(state, event.row, event.col, "pending"),
        stats: {
          ...state.stats,
          pending: state.stats.pending + 1,
          retries: event.attempt > 1 ? state.stats.retries + 1 : state.stats.retries,
        },
      };

    case "Placed":
      return {
        ...state,
        grid: setGrid(state, event.row, event.col, event.cell),
        cellStates: setCellState(state, event.row, event.col, "placed"),
        stats: {
          ...state.stats,
          placed: state.stats.placed + 1,
          pending: state.stats.pending - 1,
          todo: state.stats.todo - 1,
          attempts: state.stats.attempts + 1,
        },
        log: appendLog(
          state,
          LogLevel.OK,
          `placed ${event.cell} at (${event.row},${event.col})`,
          ts
        ),
      };

    case "Failed":
      return {
        ...state,
        cellStates: setCellState(state, event.row, event.col, "failed"),
        stats: {
          ...state.stats,
          failed: state.stats.failed + 1,
          pending: state.stats.pending - 1,
          attempts: state.stats.attempts + 1,
        },
        log: appendLog(
          state,
          LogLevel.ERR,
          `failed (${event.row},${event.col}): ${event.reason}`,
          ts
        ),
      };

    case "Complete":
      return {
        ...state,
        complete: true,
        log: appendLog(state, LogLevel.OK, "Solver complete", ts),
      };
  }
};

/**
 * A {@link SubscriptionRef} backed store for the TUI, plus a helper for
 * reducing a {@link Progress} event into it.
 */
export interface TuiStore {
  readonly ref: SubscriptionRef.SubscriptionRef<TuiState>;
  readonly applyEvent: (event: Progress) => Effect.Effect<void>;
  readonly seed: (plan: Plan) => Effect.Effect<void>;
}

/**
 * Create a fresh {@link TuiStore}.
 *
 * @remarks
 * The ref starts at {@link emptyState}. Use {@link TuiStore.seed} after
 * planning to hydrate grids, then {@link TuiStore.applyEvent} for each
 * Progress event emitted by the solver stream.
 */
export const makeStore: Effect.Effect<TuiStore> = Effect.gen(function* () {
  const ref = yield* SubscriptionRef.make(emptyState);
  const applyEvent = (event: Progress) => SubscriptionRef.update(ref, (s) => reduce(s, event));
  const seed = (plan: Plan) => SubscriptionRef.set(ref, seedFromPlan(plan));
  return { ref, applyEvent, seed };
});
