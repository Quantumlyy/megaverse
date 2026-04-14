import type {
  Cell,
  PlacedCell,
  ServerCell,
  NonNullServerCell,
  SoloonColor,
  ComethDirection,
} from "../cells"

const CELL_TO_SERVER = {
  POLYANET: { type: 0 },
  BLUE_SOLOON: { type: 1, color: "blue" },
  RED_SOLOON: { type: 1, color: "red" },
  PURPLE_SOLOON: { type: 1, color: "purple" },
  WHITE_SOLOON: { type: 1, color: "white" },
  UP_COMETH: { type: 2, direction: "up" },
  DOWN_COMETH: { type: 2, direction: "down" },
  LEFT_COMETH: { type: 2, direction: "left" },
  RIGHT_COMETH: { type: 2, direction: "right" },
} as const

const SOLOON_BY_COLOR = {
  blue: "BLUE_SOLOON",
  red: "RED_SOLOON",
  purple: "PURPLE_SOLOON",
  white: "WHITE_SOLOON",
} as const

const COMETH_BY_DIRECTION = {
  up: "UP_COMETH",
  down: "DOWN_COMETH",
  left: "LEFT_COMETH",
  right: "RIGHT_COMETH",
} as const

export function cellToServer<T extends PlacedCell>(cell: T) {
  return CELL_TO_SERVER[cell]
}

// TS types are cursed...
type ServerToCell<T extends ServerCell> =
  T extends null ? "SPACE" :
  T extends { type: 0 } ? "POLYANET" :
  T extends { type: 1; color: infer C extends SoloonColor } ? (typeof SOLOON_BY_COLOR)[C] :
  T extends { type: 2; direction: infer D extends ComethDirection } ? (typeof COMETH_BY_DIRECTION)[D] :
  never

export function serverToCell<T extends ServerCell>(sc: T): ServerToCell<T> {
  if (sc === null) return "SPACE" as ServerToCell<T>
  switch (sc.type) {
    case 0: return "POLYANET" as ServerToCell<T>
    case 1: return SOLOON_BY_COLOR[sc.color] as ServerToCell<T>
    case 2: return COMETH_BY_DIRECTION[sc.direction] as ServerToCell<T>
  }
}
