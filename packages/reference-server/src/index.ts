import { node } from "@elysiajs/node";
import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";

import routes from "./routes";

const app = new Elysia({ adapter: node() })
  .use(openapi())
  .get("/", () => ({ ok: true, message: "Megaverse reference server" }))
  .use(routes)
  .listen(3001);

console.log("Reference server on http://localhost:3001");
console.log("OpenAPI UI at http://localhost:3001/openapi");

export type App = typeof app;
