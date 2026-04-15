import { Elysia, t } from "elysia";
import { SoloonBodySchema, SoloonColorSchema } from "@megaverse/core";

import { placeSoloon, remove } from "../lib/candidateHandler";

export const soloonRoutes = new Elysia()
  .post(
    "/api/soloons",
    ({ body }) => {
      placeSoloon(body.candidateId, body.row, body.column, body.color);
      return {};
    },
    {
      body: SoloonBodySchema,
      detail: { summary: "Place a soloon", tags: ["Placements"] },
    }
  )
  .delete(
    "/api/soloons",
    ({ body }) => {
      remove(body.candidateId, body.row, body.column);
      return {};
    },
    {
      body: t.Exclude(SoloonBodySchema, t.Object({ color: SoloonColorSchema })),
      detail: { summary: "Delete a soloon", tags: ["Placements"] },
    }
  );
