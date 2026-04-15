import { useSyncExternalStore } from "react";
import type { TuiProgressTracker, TuiState } from "../tracker";

export function useTracker(tracker: TuiProgressTracker): TuiState {
  return useSyncExternalStore(
    tracker.subscribe,
    () => tracker.getState(),
    () => tracker.getState()
  );
}
