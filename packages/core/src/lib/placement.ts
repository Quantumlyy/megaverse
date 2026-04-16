import type { Cell, PlacedCell } from "./cells";

/**
 * A single planned placement operation in a Megaverse grid.
 */
export interface Placement {
  /**
   * Zero-based target row.
   */
  row: number;
  /**
   * Zero-based target column.
   */
  col: number;
  /**
   * Non-empty cell token to place at the target coordinates.
   */
  cell: PlacedCell;
}

/**
 * Rectangular grid of Megaverse cells or related per-cell data.
 */
export type Grid<T = Cell> = T[][];
