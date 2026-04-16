import { MegaverseApiLive, MegaverseConfig } from "@megaverse/engine";
import { Effect, ManagedRuntime, Redacted } from "effect";
import { withFullScreen } from "fullscreen-ink";

import App from "./tui/app";

/**
 * Entry point — reads configuration via Effect `Config`, starts a
 * `ManagedRuntime` backed by {@link MegaverseApiLive}, and hands both to the
 * Ink TUI. All I/O (HTTP, placement retries, event streams) flows through
 * this runtime so cancellation and fiber lifetimes are properly managed.
 */
const main = Effect.gen(function* () {
  const { candidateId, baseUrl } = yield* MegaverseConfig;
  const runtime = ManagedRuntime.make(MegaverseApiLive);

  const ink = withFullScreen(
    <App runtime={runtime} candidateId={Redacted.value(candidateId)} baseUrl={baseUrl} />
  );

  yield* Effect.promise(() => ink.start());
  yield* Effect.promise(() => ink.waitUntilExit());
  yield* Effect.promise(() => runtime.dispose());
});

Effect.runPromise(
  main.pipe(
    Effect.catchAllCause((cause) =>
      Effect.sync(() => {
        console.error(cause.toString());
        process.exit(1);
      })
    )
  )
).catch((err) => {
  console.error(err);
  process.exit(1);
});
