import { constants } from "@megaverse/core";
import { Chunk, Effect, Fiber, type Layer, Ref, Stream, TestClock, TestContext } from "effect";
import { describe, expect, it } from "vitest";

import {
  ApiError,
  execute,
  type MegaverseApi,
  type Plan,
  type Progress,
  plan,
  type RetryOptions,
} from "../src";
import { makeRecordingApi } from "./helpers";

const { _, L, P, R } = constants;

/**
 * Run a plain Effect against the given API layer and surface any Failure as
 * a rejected promise.
 */
const run = <A, E>(effect: Effect.Effect<A, E, MegaverseApi>, layer: Layer.Layer<MegaverseApi>) =>
  Effect.runPromise(effect.pipe(Effect.provide(layer)));

describe("plan", () => {
  it("computes only non-SPACE placements and counts skipped cells", async () => {
    const { layer } = makeRecordingApi({
      goal: [
        [P, _],
        [_, R],
      ],
      current: [
        [P, P],
        [_, _],
      ],
    });

    const result = await run(plan, layer);

    expect(result.todo).toEqual([{ row: 1, col: 1, cell: R }]);
    expect(result.skipped).toBe(1);
  });

  it("ignores extra current cells when the goal cell is SPACE", async () => {
    const { layer } = makeRecordingApi({ goal: [[_]], current: [[P]] });
    const result = await run(plan, layer);
    expect(result.todo).toEqual([]);
    expect(result.skipped).toBe(0);
  });
});

describe("execute", () => {
  const collect = <E, R>(stream: Stream.Stream<Progress, E, R>) =>
    Stream.runCollect(stream).pipe(Effect.map((c) => Array.from(Chunk.toReadonlyArray(c))));

  it("dispatches the correct placements via MegaverseApi.place", async () => {
    const { layer, calls } = makeRecordingApi();
    const p: Plan = {
      goal: [],
      current: [],
      todo: [
        { row: 0, col: 0, cell: P },
        { row: 1, col: 1, cell: R },
        { row: 2, col: 2, cell: L },
      ],
      skipped: 0,
    };

    const retry: RetryOptions = { maxAttempts: 2, baseDelayMs: 1, maxDelayMs: 1 };
    const events = await run(collect(execute(p, { retry, concurrency: 1 })), layer);

    expect(calls.filter((c) => c.method === "place")).toHaveLength(3);
    expect(calls.filter((c) => c.method === "place").map((c) => c.args[2])).toEqual([P, R, L]);
    expect(events[0]).toMatchObject({ _tag: "Planned", plan: { skipped: 0 } });
    expect(events[events.length - 1]).toEqual({ _tag: "Complete" });
    expect(events.filter((e) => e._tag === "Placed")).toHaveLength(3);
  });

  it("retries failed placements and eventually succeeds", async () =>
    Effect.gen(function* () {
      const attemptsRef = yield* Ref.make(0);
      const { layer } = makeRecordingApi({
        onPlace: () =>
          Ref.updateAndGet(attemptsRef, (n) => n + 1).pipe(
            Effect.flatMap((n) =>
              n < 3
                ? Effect.fail(
                    new ApiError({ status: 500, body: "transient", method: "POST", path: "/x" })
                  )
                : Effect.void
            )
          ),
      });

      const p: Plan = {
        goal: [],
        current: [],
        todo: [{ row: 1, col: 2, cell: P }],
        skipped: 0,
      };

      const fiber = yield* Effect.fork(
        collect(
          execute(p, {
            retry: { maxAttempts: 5, baseDelayMs: 100, maxDelayMs: 1_000 },
            concurrency: 1,
          })
        ).pipe(Effect.provide(layer))
      );

      yield* TestClock.adjust("10 seconds");
      const events = yield* Fiber.join(fiber);

      expect(yield* Ref.get(attemptsRef)).toBe(3);
      expect(events.filter((e) => e._tag === "Failed")).toHaveLength(2);
      expect(events.filter((e) => e._tag === "Placed")).toHaveLength(1);
    }).pipe(Effect.provide(TestContext.TestContext), Effect.runPromise));

  it("stops retrying when shouldRetry returns false", async () => {
    const { layer } = makeRecordingApi({
      onPlace: () =>
        Effect.fail(
          new ApiError({ status: 500, body: "fatal", method: "POST", path: "/polyanets" })
        ),
    });

    const p: Plan = {
      goal: [],
      current: [],
      todo: [{ row: 0, col: 0, cell: P }],
      skipped: 0,
    };

    const events = await run(
      collect(
        execute(p, {
          retry: {
            maxAttempts: 5,
            baseDelayMs: 100,
            maxDelayMs: 1_000,
            shouldRetry: () => false,
          },
          concurrency: 1,
        })
      ),
      layer
    );

    expect(events.filter((e) => e._tag === "Started")).toHaveLength(1);
    expect(events.filter((e) => e._tag === "Failed")).toHaveLength(1);
    expect(events.some((e) => e._tag === "Placed")).toBe(false);
  });

  it("stops after maxAttempts when failures continue", async () =>
    Effect.gen(function* () {
      const { layer } = makeRecordingApi({
        onPlace: () =>
          Effect.fail(
            new ApiError({ status: 500, body: "still failing", method: "POST", path: "/x" })
          ),
      });

      const p: Plan = {
        goal: [],
        current: [],
        todo: [{ row: 0, col: 0, cell: P }],
        skipped: 0,
      };

      const fiber = yield* Effect.fork(
        collect(
          execute(p, {
            retry: { maxAttempts: 3, baseDelayMs: 10, maxDelayMs: 100 },
            concurrency: 1,
          })
        ).pipe(Effect.provide(layer))
      );

      yield* TestClock.adjust("10 seconds");
      const events = yield* Fiber.join(fiber);

      expect(events.filter((e) => e._tag === "Started")).toHaveLength(3);
      expect(events.filter((e) => e._tag === "Failed")).toHaveLength(3);
      expect(events.some((e) => e._tag === "Placed")).toBe(false);
    }).pipe(Effect.provide(TestContext.TestContext), Effect.runPromise));

  it("applies jittered exponential backoff: each attempt is delayed", async () =>
    Effect.gen(function* () {
      const attemptsRef = yield* Ref.make(0);
      const { layer } = makeRecordingApi({
        onPlace: () =>
          Ref.updateAndGet(attemptsRef, (n) => n + 1).pipe(
            Effect.flatMap(() =>
              Effect.fail(new ApiError({ status: 500, body: "fail", method: "POST", path: "/x" }))
            )
          ),
      });

      const p: Plan = {
        goal: [],
        current: [],
        todo: [{ row: 0, col: 0, cell: P }],
        skipped: 0,
      };

      const fiber = yield* Effect.fork(
        collect(
          execute(p, {
            retry: { maxAttempts: 4, baseDelayMs: 100, maxDelayMs: 250 },
            concurrency: 1,
          })
        ).pipe(Effect.provide(layer))
      );

      // Before any clock tick, only the first attempt has executed.
      yield* TestClock.adjust("0 seconds");
      expect(yield* Ref.get(attemptsRef)).toBe(1);

      // Allow plenty of time to let all retries fire (3 more attempts).
      yield* TestClock.adjust("10 seconds");
      const events = yield* Fiber.join(fiber);

      expect(yield* Ref.get(attemptsRef)).toBe(4);
      expect(events.filter((e) => e._tag === "Started")).toHaveLength(4);
    }).pipe(Effect.provide(TestContext.TestContext), Effect.runPromise));
});
