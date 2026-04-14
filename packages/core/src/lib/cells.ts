import { Type, type Static } from "@sinclair/typebox"

export const SOLOON_COLORS = ["blue", "red", "purple", "white"] as const
export type SoloonColor = (typeof SOLOON_COLORS)[number]

export const COMETH_DIRECTIONS = ["up", "down", "left", "right"] as const
export type ComethDirection = (typeof COMETH_DIRECTIONS)[number]

export const CELL_TYPES = [
  "SPACE",
  "POLYANET",
  "BLUE_SOLOON",
  "RED_SOLOON",
  "PURPLE_SOLOON",
  "WHITE_SOLOON",
  "UP_COMETH",
  "DOWN_COMETH",
  "LEFT_COMETH",
  "RIGHT_COMETH",
] as const

export const SoloonColorSchema = Type.Union(
  SOLOON_COLORS.map((c) => Type.Literal(c))
)

export const ComethDirectionSchema = Type.Union(
  COMETH_DIRECTIONS.map((d) => Type.Literal(d))
)

export const CellSchema = Type.Union(
  CELL_TYPES.map((c) => Type.Literal(c))
)
export type Cell = Static<typeof CellSchema>
export type PlacedCell = Exclude<Cell, "SPACE">


export const ServerCellSchema = Type.Union([
  Type.Null(),
  Type.Object({ type: Type.Literal(0) }),
  Type.Object({ type: Type.Literal(1), color: SoloonColorSchema }),
  Type.Object({ type: Type.Literal(2), direction: ComethDirectionSchema }),
])
export type ServerCell = Static<typeof ServerCellSchema>
export type NonNullServerCell = Exclude<ServerCell, null>
