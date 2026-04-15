import type { ProgressTracker } from "./tracker";

/**
 * Progress tracker implementation that intentionally drops all events.
 */
export class NoopProgressTracker implements ProgressTracker {
  public onStart(): void {}
  public onPlan(): void {}
  public onSolveStart(): void {}
  public onPlacementStarted(): void {}
  public onPlacementFailed(): void {}
  public onPlacementSucceeded(): void {}
  public onComplete(): void {}
}
