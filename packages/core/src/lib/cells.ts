import { type Static, Type } from "@sinclair/typebox";
import { _, A, B, D, L, P, R, U, V, W } from "./constants";
import { StringEnum } from "./helper/typebox";

/**
 * Allowed Megaverse API values for soloon colors.
 */
export const SOLOON_COLORS = ["blue", "red", "purple", "white"] as const;
/**
 * Union of supported soloon colors.
 */
export type SoloonColor = (typeof SOLOON_COLORS)[number];

/**
 * Allowed Megaverse API values for cometh directions.
 */
export const COMETH_DIRECTIONS = ["up", "down", "left", "right"] as const;
/**
 * Union of supported cometh directions.
 */
export type ComethDirection = (typeof COMETH_DIRECTIONS)[number];

/**
 * Ordered list of internal cell tokens used by solver grids and mock scenarios.
 */
export const CELL_TYPES = [_, P, B, R, V, W, U, D, L, A] as const;

/**
 * TypeBox schema for a supported soloon color string.
 */
export const SoloonColorSchema = StringEnum(SOLOON_COLORS);

/**
 * TypeBox schema for a supported cometh direction string.
 */
export const ComethDirectionSchema = StringEnum(COMETH_DIRECTIONS);

/**
 * TypeBox schema for any internal Megaverse cell token.
 */
export const CellSchema = StringEnum(CELL_TYPES);
/**
 * Internal string token used to represent a Megaverse grid cell.
 */
export type Cell = Static<typeof CellSchema>;
/**
 * Any non-empty internal grid cell token.
 */
export type PlacedCell = Exclude<Cell, typeof _>;

/**
 * TypeBox schema for the raw cell shape returned by the Megaverse API.
 */
export const ServerCellSchema = Type.Union([
  Type.Null(),
  Type.Object({ type: Type.Literal(0) }),
  Type.Object({ type: Type.Literal(1), color: SoloonColorSchema }),
  Type.Object({ type: Type.Literal(2), direction: ComethDirectionSchema }),
]);
/**
 * Raw Megaverse API cell payload, including `null` for empty cells.
 */
export type ServerCell = Static<typeof ServerCellSchema>;
/**
 * Raw Megaverse API cell payload for a non-empty cell.
 */
export type NonNullServerCell = Exclude<ServerCell, null>;
