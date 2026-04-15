import { CurrentMapResponseSchema, GoalMapResponseSchema } from "@megaverse/core";
import { Elysia, t } from "elysia";

import { getGoal, getGrid } from "../lib/candidateHandler";

export const mapRoutes = new Elysia({ prefix: "/api/map" })
  .get("/:candidateId/goal", ({ params }) => ({ goal: getGoal(params.candidateId) }), {
    params: t.Object({ candidateId: t.String() }),
    response: GoalMapResponseSchema,
    detail: {
      summary: "Get goal map",
      tags: ["Map"],
    },
  })
  .get(
    "/:candidateId",
    ({ params }) => ({
      map: {
        _id: `ref_${params.candidateId}`,
        content: getGrid(params.candidateId),
        candidateId: params.candidateId,
        phase: 1,
      },
    }),
    {
      params: t.Object({ candidateId: t.String() }),
      response: CurrentMapResponseSchema,
      detail: { summary: "Get current map state", tags: ["Map"] },
    }
  );
