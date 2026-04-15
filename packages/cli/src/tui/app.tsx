import { Box } from "ink";
import { Solver, type MegaverseClient } from "@megaverse/engine";
// biome-ignore lint/style/useImportType: Ugh
import React, { useEffect, useRef } from "react";

import { useTracker } from "./hooks/useTracker";

import { TuiProgressTracker } from "./tracker";

import GridPanel from "./components/grid-panel";
import Header from "./components/header";
import LogPanel from "./components/log-panel";
import StatsPanel from "./components/stats-panel";

interface AppProps {
  client: MegaverseClient;
  candidateId: string;
  baseUrl: string;
}

const App: React.FC<AppProps> = ({ client, candidateId, baseUrl }) => {
  const trackerRef = useRef<TuiProgressTracker | null>(null);
  if (!trackerRef.current) {
    trackerRef.current = new TuiProgressTracker();
  }

  const state = useTracker(trackerRef.current);

  useEffect(() => {
    const solver = new Solver(client, trackerRef.current ?? undefined);
    solver.solve().catch((err) => {
      console.error("Solver crashed:", err);
    });
  }, [client]);

  return (
    <Box flexDirection="column">
      <Header candidateId={candidateId} baseUrl={baseUrl} />
      <Box>
        <GridPanel title="Goal" grid={state.goal} />
        <Box marginX={1} />
        <GridPanel title="Current" grid={state.grid} cellStates={state.cellStates} />
        <Box marginX={1} />
        <StatsPanel stats={state.stats} complete={state.complete} />
      </Box>
      <LogPanel log={state.log} />
    </Box>
  );
};

export default App;
