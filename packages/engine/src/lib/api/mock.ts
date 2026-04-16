import {
  type Cell,
  type ComethDirection,
  constants,
  type Grid,
  type PlacedCell,
  type Placement,
  type SoloonColor,
} from "@megaverse/core";
import { Effect, Layer, Ref } from "effect";

import { ApiError, RateLimited } from "../errors";
import { MegaverseApi } from "./service";

const { _ } = constants;

/**
 * Recorded method invocation on the mock, including the tag, placement, and
 * attempt number (monotonic across the whole layer lifetime).
 */
export interface MockCall {
  readonly method: "fetchGoal" | "fetchCurrent" | "place";
  readonly placement?: Placement | undefined;
  readonly attempt: number;
}

/**
 * Tunables for {@link makeMegaverseApiMock}.
 */
export interface MockOptions {
  /**
   * Goal grid returned by `fetchGoal`.
   */
  readonly goal: Grid;
  /**
   * Optional seeded placements applied before the first `fetchCurrent` call.
   */
  readonly startingPlacements?: ReadonlyArray<Placement>;
  /**
   * Per-call artificial latency in milliseconds. Defaults to 0.
   */
  readonly latencyMs?: number;
  /**
   * Probability (0–1) that any placement call fails with 429 `RateLimited`.
   */
  readonly rateLimitRate?: number;
  /**
   * Probability (0–1) that any placement call fails with a generic `ApiError`.
   */
  readonly failureRate?: number;
}

/**
 * Observation handle returned alongside the mock Layer. All accessors are
 * Effects so the caller reads a consistent snapshot of the `Ref`-backed state.
 */
export interface MockHandle {
  readonly getState: Effect.Effect<Grid>;
  readonly reset: Effect.Effect<void>;
  readonly getCallCount: Effect.Effect<number>;
  readonly getCalls: Effect.Effect<ReadonlyArray<MockCall>>;
}

/**
 * Apply a placement to a mutable grid copy.
 */
const applyPlacement = (grid: Grid, placement: Placement): Grid => {
  const next = grid.map((row) => [...row]);
  const rowArr = next[placement.row];
  if (rowArr) rowArr[placement.col] = placement.cell as Cell;
  return next;
};

/**
 * Build an empty grid shaped like `goal`, replacing every cell with SPACE.
 */
const emptyLike = (goal: Grid): Grid => goal.map((row) => row.map(() => _ as Cell));

/**
 * Coerce a non-empty cell token back to the `{color}` / `{direction}` form
 * used by the real API so `place` validates that shape end-to-end.
 */
const cellWireShape = (cell: PlacedCell) => {
  if (cell === "POLYANET") return { kind: "polyanet" as const };
  if (cell.endsWith("_SOLOON")) {
    const color = cell.replace("_SOLOON", "").toLowerCase() as SoloonColor;
    return { kind: "soloon" as const, color };
  }
  const direction = cell.replace("_COMETH", "").toLowerCase() as ComethDirection;
  return { kind: "cometh" as const, direction };
};

/**
 * Build a {@link MegaverseApi} {@link Layer} backed by in-memory state.
 *
 * @remarks
 * Uses `Ref.unsafeMake` to eagerly seed the state Refs, which lets the
 * returned `MockHandle` share state with the Layer without threading a
 * Scope through the caller. This is pragmatic for tests — the Ref itself
 * is still fully thread-safe.
 */
export const makeMegaverseApiMock = (
  options: MockOptions
): { layer: Layer.Layer<MegaverseApi>; handle: MockHandle } => {
  const initial = options.startingPlacements
    ? options.startingPlacements.reduce(applyPlacement, emptyLike(options.goal))
    : emptyLike(options.goal);

  const stateRef = Ref.unsafeMake<Grid>(initial);
  const callsRef = Ref.unsafeMake<ReadonlyArray<MockCall>>([]);
  const attemptRef = Ref.unsafeMake(0);

  const recordCall = (method: MockCall["method"], placement?: Placement) =>
    Ref.updateAndGet(attemptRef, (n) => n + 1).pipe(
      Effect.flatMap((attempt) =>
        Ref.update(callsRef, (xs) => [...xs, { method, placement, attempt }])
      )
    );

  const latency = Effect.sleep(`${options.latencyMs ?? 0} millis`);

  const failureRoll = () => Math.random();

  const fetchGoal = Effect.gen(function* () {
    yield* recordCall("fetchGoal");
    yield* latency;
    return options.goal;
  });

  const fetchCurrent = Effect.gen(function* () {
    yield* recordCall("fetchCurrent");
    yield* latency;
    return yield* Ref.get(stateRef);
  });

  const place = (placement: Placement) =>
    Effect.gen(function* () {
      yield* recordCall("place", placement);
      yield* latency;

      if (options.rateLimitRate && failureRoll() < options.rateLimitRate) {
        return yield* Effect.fail(new RateLimited({ status: 429, retryAfterMs: 0 }));
      }
      if (options.failureRate && failureRoll() < options.failureRate) {
        return yield* Effect.fail(
          new ApiError({
            status: 500,
            body: "injected failure",
            method: "POST",
            path: `/${cellWireShape(placement.cell).kind}s`,
          })
        );
      }

      yield* Ref.update(stateRef, (g) => applyPlacement(g, placement));
    });

  const layer = Layer.succeed(MegaverseApi, MegaverseApi.of({ fetchGoal, fetchCurrent, place }));

  const handle: MockHandle = {
    getState: Ref.get(stateRef),
    reset: Effect.all([Ref.set(stateRef, initial), Ref.set(callsRef, []), Ref.set(attemptRef, 0)], {
      discard: true,
    }),
    getCallCount: Ref.get(callsRef).pipe(Effect.map((xs) => xs.length)),
    getCalls: Ref.get(callsRef),
  };

  return { layer, handle };
};
