import { Effect, Fiber, type ManagedRuntime, Ref, Stream, type SubscriptionRef } from "effect";
import { useCallback, useSyncExternalStore } from "react";

/**
 * Bridge an Effect {@link SubscriptionRef} into React's concurrent store API.
 *
 * @remarks
 * - `subscribe` forks a fiber on the runtime that drains
 *   {@link SubscriptionRef.changes} and notifies React on every emission. The
 *   fiber is interrupted during teardown.
 * - `getSnapshot` reads the ref synchronously via `Effect.runSync`, matching
 *   useSyncExternalStore's invariants.
 */
export function useSubscriptionRef<A, R, E>(
  ref: SubscriptionRef.SubscriptionRef<A>,
  runtime: ManagedRuntime.ManagedRuntime<R, E>
): A {
  const subscribe = useCallback(
    (listener: () => void) => {
      const fiber = runtime.runFork(
        ref.changes.pipe(Stream.runForEach(() => Effect.sync(listener)))
      );
      return () => {
        Effect.runFork(Fiber.interrupt(fiber));
      };
    },
    [ref, runtime]
  );
  const getSnapshot = useCallback(() => Effect.runSync(Ref.get(ref)), [ref]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
