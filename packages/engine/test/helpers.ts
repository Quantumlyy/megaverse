import type { Cell, Grid } from "@megaverse/core";
import { Effect, Layer } from "effect";
import type { ApiError, Progress, RateLimited } from "../src";
import { MegaverseApi } from "../src";

/**
 * Describes a single call recorded by {@link makeRecordingApi}.
 */
export interface ApiCall {
  readonly method: "fetchGoal" | "fetchCurrent" | "place";
  readonly args: readonly unknown[];
}

export interface RecordingApiOptions {
  readonly goal?: Grid;
  readonly current?: Grid;
  /**
   * Handler invoked for each `place` call. Defaults to success.
   * Throwing a tagged error (RateLimited / ApiError) is honored.
   */
  readonly onPlace?: (call: {
    row: number;
    col: number;
    cell: Cell;
  }) => Effect.Effect<void, ApiError | RateLimited>;
}

/**
 * Build a fully controllable Layer-backed replacement for the Effect-era
 * `RecordingClient` used by the class-based tests.
 */
export const makeRecordingApi = (options: RecordingApiOptions = {}) => {
  const calls: ApiCall[] = [];

  const fetchGoal = Effect.sync(() => {
    calls.push({ method: "fetchGoal", args: [] });
    return options.goal ?? [];
  });

  const fetchCurrent = Effect.sync(() => {
    calls.push({ method: "fetchCurrent", args: [] });
    return options.current ?? [];
  });

  const place = ({ row, col, cell }: { row: number; col: number; cell: Cell }) => {
    calls.push({ method: "place", args: [row, col, cell] });
    return options.onPlace
      ? options.onPlace({ row, col, cell })
      : (Effect.void as Effect.Effect<void, ApiError | RateLimited>);
  };

  const layer = Layer.succeed(MegaverseApi, MegaverseApi.of({ fetchGoal, fetchCurrent, place }));

  return { layer, calls };
};

/**
 * Collect all {@link Progress} events produced by running an execute stream
 * against a provided API layer.
 */
export const dispatchTrackerEvents = (events: ReadonlyArray<Progress>) => {
  const names: string[] = [];
  for (const e of events) names.push(e._tag);
  return names;
};
