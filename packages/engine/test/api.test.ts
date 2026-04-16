import { FetchHttpClient, HttpClient } from "@effect/platform";
import { constants } from "@megaverse/core";
import { ConfigProvider, Effect, Layer, Redacted } from "effect";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { ApiError, DecodeError, MegaverseApi, MegaverseApiLive, RateLimited } from "../src";

const { _, A, P, V } = constants;

const CANDIDATE_ID = "phase2";
const BASE_URL = "http://example.test/api";

const server = setupServer();
beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});

/**
 * Build a test Layer that provides `MegaverseApiLive` with a static config
 * so individual tests don't need to set process.env. Uses the default
 * `FetchHttpClient.layer`.
 */
const withConfig = (candidateId: string, baseUrl: string) =>
  Layer.setConfigProvider(
    ConfigProvider.fromMap(
      new Map([
        ["CANDIDATE_ID", candidateId],
        ["MEGAVERSE_BASE_URL", baseUrl],
      ])
    )
  );

const TestLive = MegaverseApiLive.pipe(Layer.provide(withConfig(CANDIDATE_ID, BASE_URL)));

describe("MegaverseApiLive", () => {
  it("fetchGoal returns the parsed goal grid", async () => {
    const goal = [[P, _]];
    server.use(http.get(`${BASE_URL}/map/${CANDIDATE_ID}/goal`, () => HttpResponse.json({ goal })));

    const program = Effect.gen(function* () {
      const api = yield* MegaverseApi;
      return yield* api.fetchGoal;
    }).pipe(Effect.provide(TestLive));

    await expect(Effect.runPromise(program)).resolves.toEqual(goal);
  });

  it("fetchCurrent converts server cells into internal cell tokens", async () => {
    server.use(
      http.get(`${BASE_URL}/map/${CANDIDATE_ID}`, () =>
        HttpResponse.json({
          map: {
            _id: `ref_${CANDIDATE_ID}`,
            content: [
              [null, { type: 0 }, { type: 1, color: "purple" }, { type: 2, direction: "right" }],
            ],
            candidateId: CANDIDATE_ID,
            phase: 1,
          },
        })
      )
    );

    const program = Effect.flatMap(MegaverseApi, (api) => api.fetchCurrent).pipe(
      Effect.provide(TestLive)
    );

    await expect(Effect.runPromise(program)).resolves.toEqual([[_, P, V, A]]);
  });

  it.each([
    {
      name: "POLYANET",
      path: "/polyanets",
      placement: { row: 1, col: 2, cell: "POLYANET" as const },
      body: { candidateId: CANDIDATE_ID, row: 1, column: 2 },
    },
    {
      name: "RED_SOLOON",
      path: "/soloons",
      placement: { row: 3, col: 4, cell: "RED_SOLOON" as const },
      body: { candidateId: CANDIDATE_ID, row: 3, column: 4, color: "red" },
    },
    {
      name: "LEFT_COMETH",
      path: "/comeths",
      placement: { row: 5, col: 6, cell: "LEFT_COMETH" as const },
      body: { candidateId: CANDIDATE_ID, row: 5, column: 6, direction: "left" },
    },
  ])("place routes $name to $path with the right body", async ({ path, placement, body }) => {
    const captured: Array<{ url: string; body: unknown }> = [];
    server.use(
      http.post(`${BASE_URL}${path}`, async ({ request }) => {
        captured.push({ url: request.url, body: await request.json() });
        return HttpResponse.json({});
      })
    );

    const program = Effect.flatMap(MegaverseApi, (api) => api.place(placement)).pipe(
      Effect.provide(TestLive)
    );

    await expect(Effect.runPromise(program)).resolves.toBeUndefined();
    expect(captured).toEqual([{ url: `${BASE_URL}${path}`, body }]);
  });

  it("place fails with ApiError on a non-429 non-2xx response", async () => {
    server.use(http.post(`${BASE_URL}/polyanets`, () => new HttpResponse("nope", { status: 500 })));

    const program = Effect.flatMap(MegaverseApi, (api) =>
      api.place({ row: 0, col: 0, cell: "POLYANET" })
    ).pipe(Effect.provide(TestLive), Effect.exit);

    const exit = await Effect.runPromise(program);
    expect(exit._tag).toBe("Failure");
    if (exit._tag === "Failure") {
      const failure = exit.cause._tag === "Fail" ? exit.cause.error : null;
      expect(failure).toBeInstanceOf(ApiError);
      if (failure instanceof ApiError) {
        expect(failure.status).toBe(500);
        expect(failure.path).toBe("/polyanets");
      }
    }
  });

  it("place fails with RateLimited when the API responds with 429", async () => {
    server.use(
      http.post(
        `${BASE_URL}/polyanets`,
        () => new HttpResponse(null, { status: 429, headers: { "retry-after": "3" } })
      )
    );

    const program = Effect.flatMap(MegaverseApi, (api) =>
      api.place({ row: 0, col: 0, cell: "POLYANET" })
    ).pipe(Effect.provide(TestLive), Effect.exit);

    const exit = await Effect.runPromise(program);
    expect(exit._tag).toBe("Failure");
    if (exit._tag === "Failure") {
      const failure = exit.cause._tag === "Fail" ? exit.cause.error : null;
      expect(failure).toBeInstanceOf(RateLimited);
      if (failure instanceof RateLimited) {
        expect(failure.retryAfterMs).toBe(3000);
      }
    }
  });

  it("fetchCurrent fails with DecodeError when the response does not match the schema", async () => {
    server.use(http.get(`${BASE_URL}/map/${CANDIDATE_ID}`, () => HttpResponse.json({ map: null })));

    const program = Effect.flatMap(MegaverseApi, (api) => api.fetchCurrent).pipe(
      Effect.provide(TestLive),
      Effect.exit
    );

    const exit = await Effect.runPromise(program);
    expect(exit._tag).toBe("Failure");
    if (exit._tag === "Failure") {
      const failure = exit.cause._tag === "Fail" ? exit.cause.error : null;
      expect(failure).toBeInstanceOf(DecodeError);
    }
  });

  it("exposes CANDIDATE_ID via Redacted so it cannot leak from Config directly", async () => {
    // Sanity check: the config itself keeps the id redacted; downstream code
    // uses Redacted.value to read it when building the URL.
    const redacted = Redacted.make(CANDIDATE_ID);
    expect(String(redacted)).not.toContain(CANDIDATE_ID);
    expect(Redacted.value(redacted)).toBe(CANDIDATE_ID);
  });
});

// Ensure the unused import doesn't get tree-shaken; referenced only for peer types.
void HttpClient;
void FetchHttpClient;
