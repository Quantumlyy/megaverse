import { constants, type Grid, type PlacedCell, type Placement } from "@megaverse/core";
import { Duration, Effect, Ref, Schedule, Stream } from "effect";
import { MegaverseApi } from "./api/service";
import type { ApiError, DecodeError, RateLimited, SolverError } from "./errors";

const { _ } = constants;

/**
 * Grid diff result produced by {@link plan}. Carries the fetched grids so the
 * CLI and trackers do not need to re-fetch them before executing.
 */
export interface Plan {
  /**
   * Target grid as fetched from `/map/[candidateId]/goal`.
   */
  readonly goal: Grid;
  /**
   * Current grid as fetched from `/map/[candidateId]` at plan time.
   */
  readonly current: Grid;
  /**
   * Placements that still need to be sent to the API.
   */
  readonly todo: ReadonlyArray<Placement>;
  /**
   * Count of non-empty goal cells that already matched the current map.
   */
  readonly skipped: number;
}

/**
 * Retry and backoff configuration used by {@link execute}.
 */
export interface RetryOptions {
  /**
   * Maximum number of attempts per placement, including the first try.
   */
  readonly maxAttempts: number;
  /**
   * Initial exponential backoff window in milliseconds.
   */
  readonly baseDelayMs: number;
  /**
   * Upper bound for the per-attempt backoff window in milliseconds.
   */
  readonly maxDelayMs: number;
  /**
   * Predicate deciding whether an error should trigger another attempt.
   * Defaults to retrying every {@link SolverError}.
   */
  readonly shouldRetry?: (err: SolverError) => boolean;
}

/**
 * Runtime options consumed by {@link execute}.
 */
export interface ExecuteOptions {
  /**
   * Retry policy applied to each placement. Defaults to {@link DEFAULT_RETRY}.
   */
  readonly retry?: RetryOptions;
  /**
   * Number of placements processed concurrently. Defaults to 4.
   */
  readonly concurrency?: number;
}

/**
 * Event emitted by the execute stream.
 *
 * @remarks
 * One `Planned` and one `Complete` bookend the stream. `Started`, `Placed`,
 * and `Failed` are emitted at attempt granularity so the tracker can render
 * intermediate retries.
 */
export type Progress =
  | { readonly _tag: "Planned"; readonly plan: Plan }
  | {
      readonly _tag: "Started";
      readonly row: number;
      readonly col: number;
      readonly cell: PlacedCell;
      readonly attempt: number;
    }
  | {
      readonly _tag: "Placed";
      readonly row: number;
      readonly col: number;
      readonly cell: PlacedCell;
      readonly attempt: number;
    }
  | {
      readonly _tag: "Failed";
      readonly row: number;
      readonly col: number;
      readonly reason: string;
      readonly attempt: number;
    }
  | { readonly _tag: "Complete" };

/**
 * Default retry policy: up to 5 attempts, 500ms base, 8s cap, retry on any error.
 */
export const DEFAULT_RETRY: RetryOptions = {
  maxAttempts: 5,
  baseDelayMs: 500,
  maxDelayMs: 8_000,
  shouldRetry: () => true,
};

/**
 * Compute the placement diff between a goal and current grid.
 *
 * @remarks
 * Pure helper — exposed for tests and CLI status displays. Mirrors the
 * original class-based `Solver.computePlan` semantics exactly.
 */
export const computePlan = (
  goal: Grid,
  current: Grid
): { todo: ReadonlyArray<Placement>; skipped: number } => {
  const todo: Placement[] = [];
  let skipped = 0;

  goal.forEach((row, r) => {
    row.forEach((want, c) => {
      if (want === _) return;
      const have = current[r]?.[c] ?? _;
      if (want === have) {
        skipped++;
        return;
      }
      todo.push({ row: r, col: c, cell: want });
    });
  });

  return { todo, skipped };
};

/**
 * Fetch the goal and current grids in parallel and compute the placement diff.
 *
 * @remarks
 * This is phase one of the two-phase solver. The CLI awaits the plan before
 * prompting the user, then feeds it into {@link execute} on confirmation.
 */
export const plan: Effect.Effect<Plan, ApiError | DecodeError, MegaverseApi> = Effect.gen(
  function* () {
    const api = yield* MegaverseApi;
    const [goal, current] = yield* Effect.all([api.fetchGoal, api.fetchCurrent], {
      concurrency: 2,
    });
    const { todo, skipped } = computePlan(goal, current);
    return { goal, current, todo, skipped };
  }
);

/**
 * Build a Schedule that delays retries with jittered exponential backoff
 * capped at `maxDelayMs`, limits total attempts to `maxAttempts`, and stops
 * early when `shouldRetry` returns false for the observed error.
 */
const buildRetrySchedule = (options: RetryOptions) => {
  const maxDelay = Duration.millis(options.maxDelayMs);
  const shouldRetry = options.shouldRetry ?? (() => true);
  return Schedule.exponential(Duration.millis(options.baseDelayMs), 2).pipe(
    Schedule.modifyDelay((d) => (Duration.greaterThan(d, maxDelay) ? maxDelay : d)),
    Schedule.jittered,
    Schedule.whileInput((err: SolverError) => shouldRetry(err)),
    Schedule.intersect(Schedule.recurs(Math.max(0, options.maxAttempts - 1)))
  );
};

/**
 * Execute a previously-computed {@link Plan} as a `Stream` of {@link Progress}
 * events.
 *
 * @remarks
 * Placements run with bounded concurrency via `Stream.mapEffect`. Each
 * placement wraps the underlying `MegaverseApi.place` call in a retry loop
 * that emits `Started` and `Failed`/`Placed` events at attempt granularity,
 * then retries according to the supplied {@link Schedule}.
 */
export const execute = (
  p: Plan,
  options: ExecuteOptions = {}
): Stream.Stream<Progress, never, MegaverseApi> => {
  const retry = options.retry ?? DEFAULT_RETRY;
  const concurrency = options.concurrency ?? 4;
  const schedule = buildRetrySchedule(retry);

  /**
   * Run a single placement, collecting attempt-level events (`Started` per
   * attempt, and either `Placed` on success or `Failed` per failed attempt)
   * into a chunk. Errors are swallowed so the caller can continue.
   */
  const runPlacement = (
    placement: Placement
  ): Effect.Effect<ReadonlyArray<Progress>, never, MegaverseApi> =>
    Effect.gen(function* () {
      const api = yield* MegaverseApi;
      const events: Progress[] = [];
      const attemptRef = yield* Ref.make(0);

      const tryOnce = Effect.gen(function* () {
        const attempt = yield* Ref.updateAndGet(attemptRef, (n) => n + 1);
        events.push({
          _tag: "Started",
          row: placement.row,
          col: placement.col,
          cell: placement.cell,
          attempt,
        });
        return yield* api.place(placement).pipe(
          Effect.tapError((err) =>
            Effect.sync(() =>
              events.push({
                _tag: "Failed",
                row: placement.row,
                col: placement.col,
                reason: describeError(err),
                attempt,
              })
            )
          ),
          Effect.tap(() =>
            Effect.sync(() =>
              events.push({
                _tag: "Placed",
                row: placement.row,
                col: placement.col,
                cell: placement.cell,
                attempt,
              })
            )
          )
        );
      });

      yield* tryOnce.pipe(
        Effect.retry(schedule),
        Effect.catchAll(() => Effect.void)
      );

      return events;
    });

  const planned: Progress = { _tag: "Planned", plan: p };
  const complete: Progress = { _tag: "Complete" };

  return Stream.concat(
    Stream.make(planned),
    Stream.fromIterable(p.todo).pipe(
      Stream.mapEffect(runPlacement, { concurrency }),
      Stream.mapConcat((events) => events)
    )
  ).pipe(Stream.concat(Stream.make(complete)));
};

/**
 * Collapse an {@link ApiError} / {@link RateLimited} / {@link DecodeError}
 * into a human-readable reason string for tracker/log consumption.
 */
const describeError = (err: ApiError | RateLimited | DecodeError): string => {
  switch (err._tag) {
    case "RateLimited":
      return `HTTP 429 (retry-after ${err.retryAfterMs}ms)`;
    case "ApiError":
      return `${err.method} ${err.path} failed: ${err.status}`;
    case "DecodeError":
      return `decode: ${err.reason}`;
  }
};

/**
 * Convenience that runs {@link plan} then {@link execute}, draining the
 * Progress stream to completion. Useful for non-interactive/CI usage.
 */
export const solve = (
  options: ExecuteOptions = {}
): Effect.Effect<void, ApiError | DecodeError, MegaverseApi> =>
  plan.pipe(Effect.flatMap((p) => Stream.runDrain(execute(p, options))));
