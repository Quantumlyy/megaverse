import { ComethBodySchema, ComethDirectionSchema } from "@megaverse/core";
import { Elysia, t } from "elysia";

import { placeCometh, remove } from "../lib/candidateHandler";

export const comethRoutes = new Elysia({ prefix: "/comeths" })
  .post(
    "/",
    ({ body }) => {
      placeCometh(body.candidateId, body.row, body.column, body.direction);
      return {};
    },
    {
      body: ComethBodySchema,
      detail: { summary: "Place a cometh", tags: ["Placements"] },
    }
  )
  .delete(
    "/",
    ({ body }) => {
      remove(body.candidateId, body.row, body.column);
      return {};
    },
    {
      body: t.Exclude(ComethBodySchema, t.Object({ direction: ComethDirectionSchema })),
      detail: { summary: "Delete a cometh", tags: ["Placements"] },
    }
  );
