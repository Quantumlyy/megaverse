import type { ComethDirection, Grid, Placement, SoloonColor } from "@megaverse/core";
import { constants } from "@megaverse/core";

import type { MegaverseClient } from "./api/client";

import { NoopProgressTracker } from "./progress/noop";
import type { ProgressTracker } from "./progress/tracker";

const { _ } = constants;

export interface Plan {
  readonly todo: ReadonlyArray<Placement>;
  readonly skipped: number;
}

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  shouldRetry?: (err: unknown) => boolean;
}

const DEFAULT_RETRY: RetryOptions = {
  maxAttempts: 5,
  baseDelayMs: 500,
  maxDelayMs: 8_000,
  shouldRetry: () => true,
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class Solver {
  private readonly client: MegaverseClient;
  private readonly tracker: ProgressTracker;
  private readonly retryOptions: RetryOptions;

  public constructor(
    client: MegaverseClient,
    tracker: ProgressTracker = new NoopProgressTracker(),
    retryOptions: RetryOptions = DEFAULT_RETRY
  ) {
    this.client = client;
    this.tracker = tracker;
    this.retryOptions = retryOptions;
  }

  public async solve(): Promise<void> {
    const plan = await this.plan();
    await this.execute(plan);
  }

  public async plan(): Promise<Plan> {
    const [goal, current] = await Promise.all([
      this.client.fetchGoal(),
      this.client.fetchCurrent(),
    ]);

    this.tracker.onStart(current, goal);

    const plan = this.computePlan(goal, current);
    this.tracker.onPlan(plan.todo.length, plan.skipped);

    return plan;
  }

  public async execute(plan: Plan): Promise<void> {
    this.tracker.onSolveStart();

    for (const placement of plan.todo) {
      await this.placeWithRetry(placement);
    }

    this.tracker.onComplete();
  }

  protected computePlan(goal: Grid, current: Grid): Plan {
    const todo: Array<Placement> = [];
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
  }

  protected async placeWithRetry(placement: Placement): Promise<void> {
    const { row, col, cell } = placement;
    const opts = this.retryOptions;

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
      this.tracker.onPlacementStarted(row, col, cell, attempt);

      try {
        await this.place(placement);
        this.tracker.onPlacementSucceeded(row, col, cell, attempt);
        return;
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        this.tracker.onPlacementFailed(row, col, reason, attempt);

        const lastAttempt = attempt === opts.maxAttempts;
        const retryable = opts.shouldRetry?.(err) ?? true;
        if (lastAttempt || !retryable) return;

        await sleep(this.backoffDelay(attempt));
      }
    }
  }

  protected place(placement: Placement): Promise<void> {
    const { row, col, cell } = placement;

    if (cell === "POLYANET") return this.client.placePolyanet(row, col);

    if (cell.endsWith("_SOLOON")) {
      const color = cell.replace("_SOLOON", "").toLowerCase() as SoloonColor;
      return this.client.placeSoloon(row, col, color);
    }

    if (cell.endsWith("_COMETH")) {
      const direction = cell.replace("_COMETH", "").toLowerCase() as ComethDirection;
      return this.client.placeCometh(row, col, direction);
    }

    throw new Error(`Cannot place SPACE at (${row},${col})`);
  }

  private backoffDelay(attempt: number): number {
    const { maxDelayMs, baseDelayMs } = this.retryOptions;

    const exp = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));

    return Math.random() * exp;
  }
}
