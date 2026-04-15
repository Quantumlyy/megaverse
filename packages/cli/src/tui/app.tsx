import { Solver, type MegaverseClient } from "@megaverse/engine";
import { FullScreenBox } from "fullscreen-ink";
import { Box } from "ink";
// biome-ignore lint/style/useImportType: Ugh
import React, { useEffect, useRef } from "react";

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
    </FullScreenBox>
  );
};

export default App;
