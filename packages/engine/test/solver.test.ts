import { constants } from "@megaverse/core";
import { afterEach, describe, expect, it, vi } from "vitest";

import { type Plan, type RetryOptions, Solver } from "../src";
import { RecordingClient, RecordingTracker } from "./helpers";

const { _, L, P, R } = constants;

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Solver", () => {
  it("plan computes only non-SPACE placements and counts skipped cells", async () => {
    const client = new RecordingClient();
    const tracker = new RecordingTracker();
    client.goal = [
      [P, _],
      [_, R],
    ];
    client.current = [
      [P, P],
      [_, _],
    ];

    const solver = new Solver(client, tracker);
    const plan = await solver.plan();

    expect(plan).toEqual({
      todo: [{ row: 1, col: 1, cell: R }],
      skipped: 1,
    });
  });

  it("plan ignores extra current cells when the goal cell is SPACE", async () => {
    const client = new RecordingClient();
    client.goal = [[_]];
    client.current = [[P]];

    const solver = new Solver(client);
    const plan = await solver.plan();

    expect(plan).toEqual({ todo: [], skipped: 0 });
  });

  it("execute dispatches the correct client method for each planned cell", async () => {
    const client = new RecordingClient();
    const tracker = new RecordingTracker();
    const plan: Plan = {
      todo: [
        { row: 0, col: 0, cell: P },
        { row: 1, col: 1, cell: R },
        { row: 2, col: 2, cell: L },
      ],
      skipped: 0,
    };
    const retryOptions: RetryOptions = {
      maxAttempts: 2,
      baseDelayMs: 1,
      maxDelayMs: 1,
    };

    const solver = new Solver(client, tracker, retryOptions, 1);
    await solver.execute(plan);

    expect(client.calls).toEqual([
      { method: "placePolyanet", args: [0, 0] },
      { method: "placeSoloon", args: [1, 1, "red"] },
      { method: "placeCometh", args: [2, 2, "left"] },
    ]);
  });

  it("retries failed placements and eventually succeeds", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);

    const client = new RecordingClient();
    const tracker = new RecordingTracker();
    const plan: Plan = {
      todo: [{ row: 1, col: 2, cell: P }],
      skipped: 0,
    };
    let attempts = 0;

    client.handlers.placePolyanet = async () => {
      attempts += 1;
      if (attempts < 3) {
        throw new Error("transient");
      }
    };

    const solver = new Solver(
      client,
      tracker,
      { maxAttempts: 5, baseDelayMs: 100, maxDelayMs: 1_000 },
      1
    );

    const execution = solver.execute(plan);
    await vi.runAllTimersAsync();
    await execution;

    expect(attempts).toBe(3);
    expect(tracker.events.filter((event) => event.name === "onPlacementFailed")).toHaveLength(2);
    expect(tracker.events.filter((event) => event.name === "onPlacementSucceeded")).toHaveLength(1);
  });

  it("stops retrying when shouldRetry returns false", async () => {
    const client = new RecordingClient();
    const tracker = new RecordingTracker();
    const plan: Plan = {
      todo: [{ row: 0, col: 0, cell: P }],
      skipped: 0,
    };
    let attempts = 0;

    client.handlers.placePolyanet = async () => {
      attempts += 1;
      throw new Error("fatal");
    };

    const solver = new Solver(
      client,
      tracker,
      {
        maxAttempts: 5,
        baseDelayMs: 100,
        maxDelayMs: 1_000,
        shouldRetry: () => false,
      },
      1
    );

    await solver.execute(plan);

    expect(attempts).toBe(1);
    expect(tracker.events.filter((event) => event.name === "onPlacementFailed")).toHaveLength(1);
  });

  it("stops after maxAttempts when failures continue", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);

    const client = new RecordingClient();
    const plan: Plan = {
      todo: [{ row: 0, col: 0, cell: P }],
      skipped: 0,
    };
    let attempts = 0;

    client.handlers.placePolyanet = async () => {
      attempts += 1;
      throw new Error("still failing");
    };

    const solver = new Solver(
      client,
      new RecordingTracker(),
      {
        maxAttempts: 3,
        baseDelayMs: 10,
        maxDelayMs: 100,
      },
      1
    );

    const execution = solver.execute(plan);
    await vi.runAllTimersAsync();
    await execution;

    expect(attempts).toBe(3);
  });

  it("uses jittered exponential backoff and caps delays at maxDelayMs", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const client = new RecordingClient();
    const tracker = new RecordingTracker();
    const plan: Plan = {
      todo: [{ row: 0, col: 0, cell: P }],
      skipped: 0,
    };
    let attempts = 0;

    client.handlers.placePolyanet = async () => {
      attempts += 1;
      throw new Error("keep failing");
    };

    const solver = new Solver(
      client,
      tracker,
      { maxAttempts: 4, baseDelayMs: 100, maxDelayMs: 250 },
      1
    );

    const execution = solver.execute(plan);

    await Promise.resolve();
    expect(attempts).toBe(1);

    await vi.advanceTimersByTimeAsync(49);
    expect(attempts).toBe(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(attempts).toBe(2);

    await vi.advanceTimersByTimeAsync(99);
    expect(attempts).toBe(2);

    await vi.advanceTimersByTimeAsync(1);
    expect(attempts).toBe(3);

    await vi.advanceTimersByTimeAsync(124);
    expect(attempts).toBe(3);

    await vi.advanceTimersByTimeAsync(1);
    expect(attempts).toBe(4);

    await execution;

    expect(tracker.events.filter((event) => event.name === "onPlacementStarted")).toHaveLength(4);
  });
});
