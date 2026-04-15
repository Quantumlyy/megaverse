import { Elysia } from "elysia";

import { comethRoutes } from "./comeths";
import { mapRoutes } from "./map";
import { polyanetRoutes } from "./polyanets";
import { soloonRoutes } from "./soloons";

export const routes = new Elysia({
  prefix: "/api",
})
  .use(mapRoutes)
  .use(polyanetRoutes)
  .use(soloonRoutes)
  .use(comethRoutes);

export default routes;
