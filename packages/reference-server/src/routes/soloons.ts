import { SoloonBodySchema, SoloonColorSchema } from "@megaverse/core";
import { Elysia, t } from "elysia";

import { placeSoloon, remove } from "../lib/candidateHandler";

export const soloonRoutes = new Elysia({ prefix: "/soloons" })
  .post(
    "/",
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
    "/",
    ({ body }) => {
      remove(body.candidateId, body.row, body.column);
      return {};
    },
    {
      body: t.Exclude(SoloonBodySchema, t.Object({ color: SoloonColorSchema })),
      detail: { summary: "Delete a soloon", tags: ["Placements"] },
    }
  );
