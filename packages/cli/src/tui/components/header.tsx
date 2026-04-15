import { Box, Text } from "ink";
// biome-ignore lint/style/useImportType: Ugh
import React from "react";

interface HeaderProps {
  candidateId: string;
  baseUrl: string;
}

const Header: React.FC<HeaderProps> = ({ candidateId, baseUrl }) => {
  return (
    <Box paddingX={1}>
      <Text bold>🪐 Megaverse Solver </Text>
      <Text dimColor>
        candidate: {candidateId.slice(0, 8)}… base: {baseUrl}
      </Text>
    </Box>
  );
};

export default Header;
