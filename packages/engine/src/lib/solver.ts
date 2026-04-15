import type { ComethDirection, Grid, Placement, SoloonColor } from "@megaverse/core";
import { constants } from "@megaverse/core";

import type { MegaverseClient } from "./api/client";

import { NoopProgressTracker } from "./progress/noop";
import type { ProgressTracker } from "./progress/tracker";

const { _ } = constants;

/**
 * Immutable execution plan computed from the goal grid and current grid.
 */
export interface Plan {
  /**
   * Placements that still need to be sent to the API.
   */
  readonly todo: Placement[];
  /**
   * Number of non-empty goal cells that already matched the current map.
   */
  readonly skipped: number;
}

/**
 * Retry and backoff configuration used for placement requests.
 */
export interface RetryOptions {
  /**
   * Maximum number of attempts per placement, including the first try.
   */
  maxAttempts: number;
  /**
   * Initial exponential backoff window in milliseconds.
   */
  baseDelayMs: number;
  /**
   * Upper bound for the exponential backoff window in milliseconds.
   */
  maxDelayMs: number;
  /**
   * Optional predicate that decides whether a failed placement should be retried.
   */
  shouldRetry?: (err: unknown) => boolean;
}

const DEFAULT_RETRY: RetryOptions = {
  maxAttempts: 5,
  baseDelayMs: 500,
  maxDelayMs: 8_000,
  shouldRetry: () => true,
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Plans and executes the work required to transform the current Megaverse into the goal map.
 *
 * @remarks
 * `plan()` fetches the goal and current grids, computes the diff, and reports it to the tracker.
 * `execute()` consumes a previously generated plan with bounded concurrency and per-placement retries.
 */
export class Solver {
  /**
   * Creates a solver instance.
   *
   * @param client - Megaverse API client used for reads and placements.
   * @param tracker - Progress callback implementation notified throughout planning and execution.
   * @param retryOptions - Retry policy applied to each placement request.
   * @param concurrency - Number of placements to run in parallel during execution.
   */
  public constructor(
    private readonly client: MegaverseClient,
    private readonly tracker: ProgressTracker = new NoopProgressTracker(),
    private readonly retryOptions: RetryOptions = DEFAULT_RETRY,
    private readonly concurrency: number = 4
  ) {}

  /**
   * Plans and immediately executes the remaining placements for the current candidate.
   *
   * @returns Promise that resolves once execution finishes.
   */
  public async solve() {
    const plan = await this.plan();
    await this.execute(plan);
  }

  /**
   * Fetches the goal and current maps and computes the placement diff between them.
   *
   * @returns Placement plan containing outstanding work and the skipped count.
   */
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

  /**
   * Executes a previously computed placement plan.
   *
   * @param plan - Planned placements to process.
   * @returns Promise that resolves when all workers have drained the plan queue.
   */
  public async execute(plan: Plan) {
    this.tracker.onSolveStart();

    const worker = async () => {
      while (plan.todo.length > 0) {
        const p = plan.todo.shift();
        if (!p) return;
        await this.placeWithRetry(p);
      }
    };

    await Promise.all(Array.from({ length: this.concurrency }, worker));
    this.tracker.onComplete();
  }

  /**
   * Compares the desired grid with the current grid to determine which placements remain.
   *
   * @param goal - Desired final grid.
   * @param current - Current grid state.
   * @returns Plan containing only missing or mismatched non-empty goal cells.
   */
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

  /**
   * Executes a single placement with retries and tracker notifications.
   *
   * @param placement - Placement to attempt.
   * @returns Promise that resolves when the placement succeeds or retries are exhausted.
   */
  protected async placeWithRetry(placement: Placement) {
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

  /**
   * Dispatches a placement to the correct Megaverse API endpoint based on the cell token.
   *
   * @param placement - Placement to send to the API.
   * @returns Promise returned by the selected client method.
   * @throws Error if the placement cell is `SPACE`.
   */
  protected place(placement: Placement) {
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

  private backoffDelay(attempt: number) {
    const { maxDelayMs, baseDelayMs } = this.retryOptions;

    const exp = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));

    return Math.random() * exp;
  }
}
