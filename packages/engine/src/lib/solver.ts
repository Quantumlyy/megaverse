import type { ComethDirection, Grid, Placement, SoloonColor } from "@megaverse/core";
import { constants } from "@megaverse/core";

import type { MegaverseClient } from "./api/client";

import { NoopProgressTracker } from "./progress/noop";
import type { ProgressTracker } from "./progress/tracker";

const { _ } = constants;

interface Plan {
  readonly todo: ReadonlyArray<Placement>;
  readonly skipped: number;
}

export class Solver {
  private readonly client: MegaverseClient;
  private readonly tracker: ProgressTracker;

  public constructor(
    client: MegaverseClient,
    tracker: ProgressTracker = new NoopProgressTracker()
  ) {
    this.client = client;
    this.tracker = tracker;
  }

  public async solve(): Promise<void> {
    const [goal, current] = await Promise.all([
      this.client.fetchGoal(),
      this.client.fetchCurrent(),
    ]);

    this.tracker.onStart(current, goal);

    const plan = this.plan(goal, current);
    this.tracker.onPlan(plan.todo.length, plan.skipped);

    for (const placement of plan.todo) {
      const { row, col, cell } = placement;
      this.tracker.onPlacementStarted(row, col, cell, 1);

      await new Promise((r) => setTimeout(r, 400));

      try {
        await this.place(placement);
        this.tracker.onPlacementSucceeded(row, col, cell, 1);
      } catch (err) {
        this.tracker.onPlacementFailed(
          row,
          col,
          err instanceof Error ? err.message : String(err),
          1
        );
      }
    }

    this.tracker.onComplete();
  }

  protected plan(goal: Grid, current: Grid): Plan {
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
}
