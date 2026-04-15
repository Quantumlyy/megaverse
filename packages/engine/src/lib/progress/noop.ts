import type { ProgressTracker } from "./tracker";

export class NoopProgressTracker implements ProgressTracker {
  onStart(): void {}
  onPlan(): void {}
  onPlacementStarted(): void {}
  onPlacementFailed(): void {}
  onPlacementSucceeded(): void {}
  onComplete(): void {}
}
