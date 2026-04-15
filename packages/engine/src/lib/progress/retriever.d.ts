import type { Grid } from "@megaverse/core";

export interface ProgressStats {
  /**
   * The total number of cells in the goal that aren't SPACE and weren't already correct
   */
  readonly total: number;
  /**
   * The number of cells that have been placed
   */
  readonly placed: number;
  /**
   * The number of cells that have failed
   */
  readonly failed: number;
  /**
   * The number of cells that are pending/in-flight
   */
  readonly pending: number;
  /**
   * The number of cells that are todo
   */
  readonly todo: number;
  /**
   * The number of cells that have been skipped
   */
  readonly skipped: number;
  /**
   * The total number of attempts made across all cells
   */
  readonly attempts: number;
  /**
   * The number of attempts beyond the first (attempts - resolved cells)
   */
  readonly retries: number;
  /**
   * The duration of the execution in milliseconds
   */
  readonly durationMs?: number;
}

export interface ProgressRetriever<TStatus, THistory> {
  /**
   * @returns The current progress stats
   */
  stats(): ProgressStats;

  /**
   * @returns The current grid state
   */
  grid(): Grid;
  /**
   * @returns The current statuses
   */
  statuses(): ReadonlyArray<ReadonlyArray<TStatus>>;
  /**
   * @param row The row of the cell
   * @param col The column of the cell
   * @returns The status of the cell
   */
  statusAt(row: number, col: number): TStatus;

  /**
   * @returns The history of execution
   */
  history(): ReadonlyArray<THistory>;
  /**
   * @param row The row of the cell
   * @param col The column of the cell
   * @returns The history of the cell
   */
  historyAt(row: number, col: number): ReadonlyArray<THistory>;

  /**
   * @returns The date and time the execution started
   */
  startedAt(): Date | undefined;
  /**
   * @returns The date and time the execution completed
   */
  completedAt(): Date | undefined;
  /**
   * @returns Whether the execution is complete
   */
  isComplete(): boolean;
}
