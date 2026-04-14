import { Elysia } from "elysia"

import { mapRoutes } from "./map"
import { polyanetRoutes } from "./polyanets"
import { soloonRoutes } from "./soloons"
import { comethRoutes } from "./comeths"

export const routes = new Elysia()
  .use(mapRoutes)
  .use(polyanetRoutes)
  .use(soloonRoutes)
  .use(comethRoutes)

export default routes
