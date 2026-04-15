import { Type, type Static } from "@sinclair/typebox";
import { _, A, B, D, L, P, R, U, V, W } from "./constants";
import { StringEnum } from "./helper/typebox";

export const SOLOON_COLORS = ["blue", "red", "purple", "white"] as const;
export type SoloonColor = (typeof SOLOON_COLORS)[number];

export const COMETH_DIRECTIONS = ["up", "down", "left", "right"] as const;
export type ComethDirection = (typeof COMETH_DIRECTIONS)[number];

export const CELL_TYPES = [_, P, B, R, V, W, U, D, L, A] as const;

export const SoloonColorSchema = StringEnum(SOLOON_COLORS);

export const ComethDirectionSchema = StringEnum(COMETH_DIRECTIONS);

export const CellSchema = StringEnum(CELL_TYPES);
export type Cell = Static<typeof CellSchema>;
export type PlacedCell = Exclude<Cell, typeof _>;

export const ServerCellSchema = Type.Union([
  Type.Null(),
  Type.Object({ type: Type.Literal(0) }),
  Type.Object({ type: Type.Literal(1), color: SoloonColorSchema }),
  Type.Object({ type: Type.Literal(2), direction: ComethDirectionSchema }),
]);
export type ServerCell = Static<typeof ServerCellSchema>;
export type NonNullServerCell = Exclude<ServerCell, null>;
