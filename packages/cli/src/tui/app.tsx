import { execute, type MegaverseApi, type Plan, plan as planEffect } from "@megaverse/engine";
import type { ConfigError } from "effect";
import { Effect, Fiber, type ManagedRuntime, Stream } from "effect";
import { FullScreenBox } from "fullscreen-ink";
import { Box, Text, useInput } from "ink";
// biome-ignore lint/style/useImportType: React must be a value import for JSX runtime
import React, { useEffect, useMemo, useRef, useState } from "react";

import GridPanel from "./components/grid-panel";
import Header from "./components/header";
import LogPanel from "./components/log-panel";
import StatsPanel from "./components/stats-panel";
import { useSubscriptionRef } from "./hooks/useSubscriptionRef";
import { makeStore, updateWith } from "./store";

interface AppProps {
  readonly runtime: ManagedRuntime.ManagedRuntime<MegaverseApi, ConfigError.ConfigError>;
  readonly candidateId: string;
  readonly baseUrl: string;
}

type Phase = "planning" | "ready" | "executing" | "done" | "error";

const App: React.FC<AppProps> = ({ runtime, candidateId, baseUrl }) => {
  const store = useMemo(() => Effect.runSync(makeStore), []);
  const apply = useMemo(() => updateWith(store), [store]);
  const state = useSubscriptionRef(store, runtime);

  const [plan, setPlan] = useState<Plan | null>(null);
  const [phase, setPhase] = useState<Phase>("planning");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const executionFiberRef = useRef<Fiber.RuntimeFiber<void, unknown> | null>(null);

  // Planning phase: fetch the plan, seed the store via a synthetic Planned event.
  useEffect(() => {
    const fiber = runtime.runFork(
      planEffect.pipe(
        Effect.tap((p) => apply({ _tag: "Planned", plan: p })),
        Effect.tap((p) =>
          Effect.sync(() => {
            setPlan(p);
            setPhase("ready");
          })
        ),
        Effect.catchAllCause((cause) =>
          Effect.sync(() => {
            setErrorMessage(`Plan failed: ${cause.toString()}`);
            setPhase("error");
          })
        )
      )
    );
    return () => {
      Effect.runFork(Fiber.interrupt(fiber));
    };
  }, [runtime, apply]);

  // Execution phase: drain the Progress stream into the store. The stream's
  // own Planned event is a no-op re-seed — idempotent.
  useInput((input, key) => {
    if (phase === "ready" && plan && (key.return || input === " ")) {
      setPhase("executing");
      executionFiberRef.current = runtime.runFork(
        execute(plan, {
          retry: { maxAttempts: 10, baseDelayMs: 1000, maxDelayMs: 20_000 },
          concurrency: 3,
        }).pipe(
          Stream.runForEach(apply),
          Effect.tap(() => Effect.sync(() => setPhase("done"))),
          Effect.catchAllCause((cause) =>
            Effect.sync(() => {
              setErrorMessage(`Execute failed: ${cause.toString()}`);
              setPhase("error");
            })
          )
        )
      );
    }
  });

  useEffect(() => {
    return () => {
      const fiber = executionFiberRef.current;
      if (fiber) Effect.runFork(Fiber.interrupt(fiber));
    };
  }, []);

  return (
    <FullScreenBox flexDirection="column">
      <Header candidateId={candidateId} baseUrl={baseUrl} />
      <Box flexGrow={1}>
        <Box flexGrow={1} flexBasis={0}>
          <GridPanel title="Goal" grid={state.goal} />
        </Box>
        <Box flexGrow={1} flexBasis={0}>
          <GridPanel title="Current" grid={state.grid} cellStates={state.cellStates} />
        </Box>
      </Box>
      <Box height={14}>
        <Box flexGrow={1}>
          <LogPanel log={state.log} />
        </Box>
        <Box width={32}>
          <StatsPanel stats={state.stats} complete={state.complete} />
        </Box>
      </Box>
      <Prompt phase={phase} errorMessage={errorMessage} />
    </FullScreenBox>
  );
};

const Prompt: React.FC<{ phase: Phase; errorMessage: string | null }> = ({
  phase,
  errorMessage,
}) => {
  if (phase === "planning") {
    return (
      <Box paddingX={1}>
        <Text dimColor>Planning…</Text>
      </Box>
    );
  }
  if (phase === "ready") {
    return (
      <Box paddingX={1}>
        <Text color="yellow">▶ Press </Text>
        <Text bold color="yellow">
          Enter
        </Text>
        <Text color="yellow"> or </Text>
        <Text bold color="yellow">
          Space
        </Text>
        <Text color="yellow"> to start solving</Text>
      </Box>
    );
  }
  if (phase === "executing") {
    return (
      <Box paddingX={1}>
        <Text color="cyan">⚡ Solving…</Text>
      </Box>
    );
  }
  if (phase === "error") {
    return (
      <Box paddingX={1}>
        <Text color="red">✗ {errorMessage ?? "Unknown error"} — press Ctrl+C to exit</Text>
      </Box>
    );
  }
  return (
    <Box paddingX={1}>
      <Text color="green">✓ Done — press Ctrl+C to exit</Text>
    </Box>
  );
};

export default App;
