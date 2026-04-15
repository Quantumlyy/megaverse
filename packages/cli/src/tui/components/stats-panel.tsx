import { Box, Text } from "ink";
// biome-ignore lint/style/useImportType: Ugh
import React from "react";

import type { TuiState } from "../tracker";

interface StatsPanelProps {
  stats: TuiState["stats"];
  complete: boolean;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ stats, complete }) => {
  const pct = stats.total > 0 ? Math.round((stats.placed / stats.total) * 100) : 0;
  const bar = "█".repeat(Math.round(pct / 5)) + "░".repeat(20 - Math.round(pct / 5));

  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1}>
      <Text bold>Progress</Text>
      <Text>
        {bar} {pct}%
      </Text>
      <Text>
        placed: <Text color="green">{stats.placed}</Text> / {stats.total}
      </Text>
      <Text>
        pending: <Text color="yellow">{stats.pending}</Text>
      </Text>
      <Text>
        failed: <Text color="red">{stats.failed}</Text>
      </Text>
      <Text>
        skipped: <Text dimColor>{stats.skipped}</Text>
      </Text>
      {complete && <Text color="green">✓ complete</Text>}
    </Box>
  );
};

export default StatsPanel;
