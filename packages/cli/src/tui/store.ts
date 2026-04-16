import { type Cell, constants, type Grid } from "@megaverse/core";
import type { Plan, Progress } from "@megaverse/engine";
import { type Effect, SubscriptionRef } from "effect";

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

export interface TuiState {
  readonly goal: Grid;
  readonly grid: Grid;
  readonly cellStates: ReadonlyMap<string, CellRenderState>;
  readonly stats: ProgressStats;
  readonly log: ReadonlyArray<LogEntry>;
  readonly complete: boolean;
}

const LOG_LIMIT = 12;

/**
 * Empty starting state. Used both as the `SubscriptionRef` seed and as a
 * rendering fallback while the Planned event has not yet arrived.
 */
export const emptyState: TuiState = {
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

const log = (s: TuiState, level: LogLevel, text: string, ts: number): TuiState["log"] =>
  [...s.log, { time: new Date(ts), text, level }].slice(-LOG_LIMIT);

const withCell = (s: TuiState, row: number, col: number, next: CellRenderState) => {
  const m = new Map(s.cellStates);
  m.set(`${row},${col}`, next);
  return m;
};

const withGridCell = (s: TuiState, row: number, col: number, cell: Cell): Grid => {
  const rows = s.grid.map((r) => [...r]);
  const target = rows[row];
  if (target) target[col] = cell;
  return rows;
};

const seedCellStates = (plan: Plan): Map<string, CellRenderState> => {
  const m = new Map<string, CellRenderState>();
  plan.goal.forEach((row, r) => {
    row.forEach((cell, c) => {
      const existing = plan.current[r]?.[c];
      m.set(`${r},${c}`, cell === _ ? "empty" : cell === existing ? "placed" : "todo");
    });
  });
  return m;
};

/**
 * Pure reducer: folds a {@link Progress} event into the previous
 * {@link TuiState}. The `Planned` case doubles as the initial seed — it
 * hydrates goal/current grids and per-cell states from the plan.
 */
export const reduce = (s: TuiState, event: Progress, ts: number = Date.now()): TuiState => {
  switch (event._tag) {
    case "Planned": {
      const { plan } = event;
      return {
        goal: plan.goal,
        grid: plan.current.map((row) => [...row]),
        cellStates: seedCellStates(plan),
        stats: {
          ...emptyState.stats,
          total: plan.todo.length,
          skipped: plan.skipped,
          todo: plan.todo.length,
        },
        log: log(
          emptyState,
          LogLevel.INFO,
          `Planned ${plan.todo.length} placements, ${plan.skipped} skipped`,
          ts
        ),
        complete: false,
      };
    }
    case "Started":
      return {
        ...s,
        cellStates: withCell(s, event.row, event.col, "pending"),
        stats: {
          ...s.stats,
          pending: s.stats.pending + 1,
          retries: event.attempt > 1 ? s.stats.retries + 1 : s.stats.retries,
        },
      };
    case "Placed":
      return {
        ...s,
        grid: withGridCell(s, event.row, event.col, event.cell),
        cellStates: withCell(s, event.row, event.col, "placed"),
        stats: {
          ...s.stats,
          placed: s.stats.placed + 1,
          pending: s.stats.pending - 1,
          todo: s.stats.todo - 1,
          attempts: s.stats.attempts + 1,
        },
        log: log(s, LogLevel.OK, `placed ${event.cell} at (${event.row},${event.col})`, ts),
      };
    case "Failed":
      return {
        ...s,
        cellStates: withCell(s, event.row, event.col, "failed"),
        stats: {
          ...s.stats,
          failed: s.stats.failed + 1,
          pending: s.stats.pending - 1,
          attempts: s.stats.attempts + 1,
        },
        log: log(s, LogLevel.ERR, `failed (${event.row},${event.col}): ${event.reason}`, ts),
      };
    case "Complete":
      return { ...s, complete: true, log: log(s, LogLevel.OK, "Solver complete", ts) };
  }
};

/**
 * Create a fresh {@link SubscriptionRef} seeded with {@link emptyState}.
 * The caller drives it by piping the solver stream through `Stream.runForEach`
 * of {@link updateWith}.
 */
export const makeStore: Effect.Effect<SubscriptionRef.SubscriptionRef<TuiState>> =
  SubscriptionRef.make(emptyState);

/**
 * Fold a single {@link Progress} event into the store.
 */
export const updateWith =
  (ref: SubscriptionRef.SubscriptionRef<TuiState>) =>
  (event: Progress): Effect.Effect<void> =>
    SubscriptionRef.update(ref, (s) => reduce(s, event));
