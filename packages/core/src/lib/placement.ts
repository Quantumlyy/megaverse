import type { Cell, PlacedCell } from "./cells"

export interface Placement {
  row: number
  col: number
  cell: PlacedCell
}

export type Grid<T = Cell> = T[][]
