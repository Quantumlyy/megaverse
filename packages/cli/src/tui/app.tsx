import { Solver, type MegaverseClient, type Plan } from "@megaverse/engine";
import { FullScreenBox } from "fullscreen-ink";
import { Box, Text, useInput } from "ink";
// biome-ignore lint/style/useImportType: Ugh
import React, { useEffect, useState } from "react";

import GridPanel from "./components/grid-panel";
import Header from "./components/header";
import LogPanel from "./components/log-panel";
import StatsPanel from "./components/stats-panel";
import { useTracker } from "./hooks/useTracker";
import { TuiProgressTracker } from "./tracker";

interface AppProps {
  client: MegaverseClient;
  candidateId: string;
  baseUrl: string;
}

type Phase = "planning" | "ready" | "executing" | "done";

const App: React.FC<AppProps> = ({ client, candidateId, baseUrl }) => {
  const [tracker] = useState(() => new TuiProgressTracker());
  const [solver] = useState(() => new Solver(client, tracker, {
    maxAttempts: 10,
    baseDelayMs: 1000,
    maxDelayMs: 20_000,
  }, 3));
  const [plan, setPlan] = useState<Plan | null>(null);
  const [phase, setPhase] = useState<Phase>("planning");
  const state = useTracker(tracker);

  useEffect(() => {
    solver
      .plan()
      .then((p) => {
        setPlan(p);
        setPhase("ready");
      })
      .catch((err) => {
        console.error("Plan failed:", err);
      });
  }, [solver]);

  useInput((input, key) => {
    if (phase === "ready" && plan && (key.return || input === " ")) {
      setPhase("executing");
      solver
        .execute(plan)
        .then(() => setPhase("done"))
        .catch((err) => {
          console.error("Execute failed:", err);
          setPhase("done");
        });
    }
  });

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
      <Prompt phase={phase} />
    </FullScreenBox>
  );
};

const Prompt: React.FC<{ phase: Phase }> = ({ phase }) => {
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
  return (
    <Box paddingX={1}>
      <Text color="green">✓ Done — press Ctrl+C to exit</Text>
    </Box>
  );
};

export default App;
