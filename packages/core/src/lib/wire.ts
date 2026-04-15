import { type Static, Type } from "@sinclair/typebox";
import { CellSchema, ComethDirectionSchema, ServerCellSchema, SoloonColorSchema } from "./cells";

/**
 * TypeBox schema for `GET /map/:candidateId/goal`.
 */
export const GoalMapResponseSchema = Type.Object({
  goal: Type.Array(Type.Array(CellSchema)),
});
/**
 * Parsed response shape for `GET /map/:candidateId/goal`.
 */
export type GoalMapResponse = Static<typeof GoalMapResponseSchema>;

/**
 * TypeBox schema for `GET /map/:candidateId`.
 */
export const CurrentMapResponseSchema = Type.Object({
  map: Type.Object({
    _id: Type.String(),
    content: Type.Array(Type.Array(ServerCellSchema)),
    candidateId: Type.String(),
    phase: Type.Number(),
  }),
});
/**
 * Parsed response shape for `GET /map/:candidateId`.
 */
export type CurrentMapResponse = Static<typeof CurrentMapResponseSchema>;

/**
 * TypeBox schema for empty placement responses.
 */
export const EmptyResponseSchema = Type.Object({});
/**
 * Parsed response shape for endpoints that return an empty object.
 */
export type EmptyResponse = Static<typeof EmptyResponseSchema>;

/**
 * TypeBox schema for creating or deleting a polyanet at a coordinate.
 */
export const PolyanetBodySchema = Type.Object({
  candidateId: Type.String(),
  row: Type.Integer({ minimum: 0 }),
  column: Type.Integer({ minimum: 0 }),
});
/**
 * Request body for the polyanet placement endpoints.
 */
export type PolyanetBody = Static<typeof PolyanetBodySchema>;

/**
 * TypeBox schema for creating a colored soloon at a coordinate.
 */
export const SoloonBodySchema = Type.Composite([
  PolyanetBodySchema,
  Type.Object({ color: SoloonColorSchema }),
]);
/**
 * Request body for the soloon placement endpoints.
 */
export type SoloonBody = Static<typeof SoloonBodySchema>;

/**
 * TypeBox schema for creating a directed cometh at a coordinate.
 */
export const ComethBodySchema = Type.Composite([
  PolyanetBodySchema,
  Type.Object({ direction: ComethDirectionSchema }),
]);
/**
 * Request body for the cometh placement endpoints.
 */
export type ComethBody = Static<typeof ComethBodySchema>;
