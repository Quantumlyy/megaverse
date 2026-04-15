import type { ProgressTracker } from "./tracker";

export class NoopProgressTracker implements ProgressTracker {
  public onStart(): void {}
  public onPlan(): void {}
  public onPlacementStarted(): void {}
  public onPlacementFailed(): void {}
  public onPlacementSucceeded(): void {}
  public onComplete(): void {}
}
