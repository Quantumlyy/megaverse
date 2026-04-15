import { Type, type Static } from "@sinclair/typebox";
import { CellSchema, ServerCellSchema, SoloonColorSchema, ComethDirectionSchema } from "./cells";

export const GoalMapResponseSchema = Type.Object({
  goal: Type.Array(Type.Array(CellSchema)),
});
export type GoalMapResponse = Static<typeof GoalMapResponseSchema>;

export const CurrentMapResponseSchema = Type.Object({
  map: Type.Object({
    _id: Type.String(),
    content: Type.Array(Type.Array(ServerCellSchema)),
    candidateId: Type.String(),
    phase: Type.Number(),
  }),
});
export type CurrentMapResponse = Static<typeof CurrentMapResponseSchema>;

export const EmptyResponseSchema = Type.Object({});
export type EmptyResponse = Static<typeof EmptyResponseSchema>;

// 🪐POLYanets
export const PolyanetBodySchema = Type.Object({
  candidateId: Type.String(),
  row: Type.Integer({ minimum: 0 }),
  column: Type.Integer({ minimum: 0 }),
});
export type PolyanetBody = Static<typeof PolyanetBodySchema>;

// 🌙SOLoons
export const SoloonBodySchema = Type.Composite([
  PolyanetBodySchema,
  Type.Object({ color: SoloonColorSchema }),
]);
export type SoloonBody = Static<typeof SoloonBodySchema>;

// ☄comETHs
export const ComethBodySchema = Type.Composite([
  PolyanetBodySchema,
  Type.Object({ direction: ComethDirectionSchema }),
]);
export type ComethBody = Static<typeof ComethBodySchema>;
