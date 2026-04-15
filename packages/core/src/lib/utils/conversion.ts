import type { ComethDirection, PlacedCell, ServerCell, SoloonColor } from "../cells";
import { _, A, B, D, L, P, R, U, V, W } from "../constants";

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
} as const;

const SOLOON_BY_COLOR = {
  blue: B,
  red: R,
  purple: V,
  white: W,
} as const;

const COMETH_BY_DIRECTION = {
  up: U,
  down: D,
  left: L,
  right: A,
} as const;

/**
 * Converts an internal non-empty cell token into the raw payload shape used by the Megaverse API.
 *
 * @typeParam T - Non-empty cell token type being converted.
 * @param cell - Internal cell token to convert.
 * @returns Raw API payload for the corresponding placed cell.
 */
export function cellToServer<T extends PlacedCell>(cell: T) {
  return CELL_TO_SERVER[cell];
}

// TS types are cursed...
type ServerToCell<T extends ServerCell> = T extends null
  ? typeof _
  : T extends { type: 0 }
    ? typeof P
    : T extends { type: 1; color: infer C extends SoloonColor }
      ? (typeof SOLOON_BY_COLOR)[C]
      : T extends { type: 2; direction: infer D extends ComethDirection }
        ? (typeof COMETH_BY_DIRECTION)[D]
        : never;

/**
 * Converts a raw Megaverse API cell payload into the internal cell token used by the solver.
 *
 * @typeParam T - Raw server cell payload type being converted.
 * @param sc - Raw API cell payload, including `null` for empty space.
 * @returns Internal cell token that corresponds to the server payload.
 */
export function serverToCell<T extends ServerCell>(sc: T): ServerToCell<T> {
  if (sc === null) return _ as ServerToCell<T>;
  switch (sc.type) {
    case 0:
      return P as ServerToCell<T>;
    case 1:
      return SOLOON_BY_COLOR[sc.color] as ServerToCell<T>;
    case 2:
      return COMETH_BY_DIRECTION[sc.direction] as ServerToCell<T>;
  }
}
