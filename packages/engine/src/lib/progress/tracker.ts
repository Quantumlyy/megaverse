import type { Cell, Grid } from "@megaverse/core";

// One of these days we will get Temporal 😭
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal
/**
 * Event sink used by the solver to report planning and execution lifecycle changes.
 *
 * @remarks
 * The expected call order is `onStart`, `onPlan`, `onSolveStart`, zero or more placement events,
 * and finally `onComplete`. Timestamp parameters are millisecond epoch values and default to `Date.now()`
 * when callers do not provide them.
 */
export interface ProgressTracker {
  /**
   * @param goal The goal grid (/api/map/[candidateId]/goal)
   * @param initial The initial grid from (/api/map/[candidateId])
   * @param ts TS of occurrence
   */
  onStart(initial: Grid, goal: Grid, ts?: number): void;

  /**
   * @param total The total number of operations required to solve the map
   * @param skipped The number of operations skipped due to already being in the goal state
   * @param ts TS of occurrence
   */
  onPlan(total: number, skipped: number, ts?: number): void;

  /**
   * @param ts TS of occurrence
   */
  onSolveStart(ts?: number): void;

  /**
   * @param row The row of the cell
   * @param col The column of the cell
   * @param cell The cell to be placed
   * @param attempt The attempt number
   * @param ts TS of occurrence
   */
  onPlacementStarted(row: number, col: number, cell: Cell, attempt?: number, ts?: number): void;
  /**
   * @param row The row of the cell
   * @param col The column of the cell
   * @param reason The reason for the failure
   * @param attempt The attempt number
   * @param ts TS of occurrence
   */
  onPlacementFailed(row: number, col: number, reason: string, attempt?: number, ts?: number): void;
  /**
   * @param row The row of the cell
   * @param col The column of the cell
   * @param cell The cell that was placed
   * @param attempt The attempt number
   * @param ts TS of occurrence
   */
  onPlacementSucceeded(row: number, col: number, cell: Cell, attempt?: number, ts?: number): void;

  /**
   * @param ts TS of occurrence
   */
  onComplete(ts?: number): void;
}
