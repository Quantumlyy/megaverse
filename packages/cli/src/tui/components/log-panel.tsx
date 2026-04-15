import { Box, Text } from "ink";
// biome-ignore lint/style/useImportType: Ugh
import React from "react";

import { LogLevel, type LogEntry, type TuiState } from "../tracker";

interface LogPanelProps {
  log: TuiState["log"];
}

const LogPanel: React.FC<LogPanelProps> = ({ log }) => {
  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1}>
      <Text bold>Log</Text>
      {log.map((entry) => (
        <LogEntryItem
          key={`${entry.time.toISOString()}-${entry.text}`}
          level={entry.level}
          text={entry.text}
          time={entry.time}
        />
      ))}
    </Box>
  );
};

const LogEntryItem: React.FC<LogEntry> = (entry) => {
  return (
    <Text key={`${entry.time.toISOString()}-${entry.text}`}>
      <Text color="gray">{entry.time.toLocaleTimeString()}</Text>{" "}
      <Text
        color={
          entry.level === LogLevel.OK ? "green" : entry.level === LogLevel.ERR ? "red" : ''
        }
      >
        {entry.level === LogLevel.OK ? "✓" : entry.level === LogLevel.ERR ? "✗" : "·"}
      </Text>{" "}
      <Text>{entry.text}</Text>
    </Text>
  );
};

export default LogPanel;
