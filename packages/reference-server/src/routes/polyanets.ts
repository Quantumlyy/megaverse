import { PolyanetBodySchema } from "@megaverse/core";
import { Elysia } from "elysia";

import { placePolyanet, remove } from "../lib/candidateHandler";

export const polyanetRoutes = new Elysia()
  .post(
    "/api/polyanets",
    ({ body }) => {
      placePolyanet(body.candidateId, body.row, body.column);
      return {};
    },
    {
      body: PolyanetBodySchema,
      detail: { summary: "Place a polyanet", tags: ["Placements"] },
    }
  )
  .delete(
    "/api/polyanets",
    ({ body }) => {
      remove(body.candidateId, body.row, body.column);
      return {};
    },
    {
      body: PolyanetBodySchema,
      detail: { summary: "Delete a polyanet", tags: ["Placements"] },
    }
  );
