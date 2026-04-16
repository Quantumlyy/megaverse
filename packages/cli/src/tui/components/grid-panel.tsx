import type { Grid } from "@megaverse/core";
import { utils } from "@megaverse/core";
import { TitledBox } from "@mishieck/ink-titled-box";
import { Box, Text } from "ink";
// biome-ignore lint/style/useImportType: Ugh
import React from "react";

import type { CellRenderState } from "../store";

const STATE_COLOR: Record<CellRenderState, string | undefined> = {
  empty: "gray",
  todo: "gray",
  pending: "yellow",
  placed: undefined,
  failed: "red",
};

interface GridPanelProps {
  title: string;
  grid: Grid;
  cellStates?: ReadonlyMap<string, CellRenderState>;
}

const GridPanel: React.FC<GridPanelProps> = ({ title, grid, cellStates }) => {
  return (
    <TitledBox
      flexDirection="column"
      borderStyle="round"
      paddingX={1}
      flexGrow={1}
      alignItems="center"
      justifyContent="center"
      borderTop
      borderBottom
      borderLeft
      borderRight
      titles={[title]}
    >
      {grid.map((row, r) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: what else would I use ffs
        <Box key={r}>
          {row.map((cell, c) => {
            const state = cellStates?.get(`${r},${c}`);
            const color = state ? STATE_COLOR[state] : undefined;

            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: what else would I use ffs
              <Text key={`${r},${c}`} color={color || ""}>
                {utils.cellToEmoji(cell)}
              </Text>
            );
          })}
        </Box>
      ))}
    </TitledBox>
  );
};

export default GridPanel;
