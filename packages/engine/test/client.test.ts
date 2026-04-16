import { constants } from "@megaverse/core";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";

import { MegaverseClient } from "../src";
import { server } from "./setup/msw";

const { _, A, P, V } = constants;

const CANDIDATE_ID = "phase2";
const DEFAULT_BASE_URL = "https://challenge.crossmint.com/api";
const CUSTOM_BASE_URL = "http://example.test/api";

describe("MegaverseClient", () => {
  it("fetchGoal uses the default base URL and returns the parsed goal grid", async () => {
    const goal = [[P, _]];
    const client = new MegaverseClient(CANDIDATE_ID);

    server.use(
      http.get(`${DEFAULT_BASE_URL}/map/${CANDIDATE_ID}/goal`, () => {
        return HttpResponse.json({ goal });
      })
    );

    await expect(client.fetchGoal()).resolves.toEqual(goal);
  });

  it("fetchCurrent converts server cells into internal grid cells", async () => {
    const client = new MegaverseClient(CANDIDATE_ID, CUSTOM_BASE_URL);

    server.use(
      http.get(`${CUSTOM_BASE_URL}/map/${CANDIDATE_ID}`, () => {
        return HttpResponse.json({
          map: {
            _id: `ref_${CANDIDATE_ID}`,
            content: [
              [null, { type: 0 }, { type: 1, color: "purple" }, { type: 2, direction: "right" }],
            ],
            candidateId: CANDIDATE_ID,
            phase: 1,
          },
        });
      })
    );

    await expect(client.fetchCurrent()).resolves.toEqual([[_, P, V, A]]);
  });

  it.each([
    {
      name: "placePolyanet",
      method: "POST",
      path: "/polyanets",
      invoke: (client: MegaverseClient) => client.placePolyanet(1, 2),
      body: { candidateId: CANDIDATE_ID, row: 1, column: 2 },
    },
    {
      name: "placeSoloon",
      method: "POST",
      path: "/soloons",
      invoke: (client: MegaverseClient) => client.placeSoloon(3, 4, "red"),
      body: { candidateId: CANDIDATE_ID, row: 3, column: 4, color: "red" },
    },
    {
      name: "placeCometh",
      method: "POST",
      path: "/comeths",
      invoke: (client: MegaverseClient) => client.placeCometh(5, 6, "left"),
      body: { candidateId: CANDIDATE_ID, row: 5, column: 6, direction: "left" },
    },
    {
      name: "deletePolyanet",
      method: "DELETE",
      path: "/polyanets",
      invoke: (client: MegaverseClient) => client.deletePolyanet(7, 8),
      body: { candidateId: CANDIDATE_ID, row: 7, column: 8 },
    },
    {
      name: "deleteSoloon",
      method: "DELETE",
      path: "/soloons",
      invoke: (client: MegaverseClient) => client.deleteSoloon(9, 10),
      body: { candidateId: CANDIDATE_ID, row: 9, column: 10 },
    },
    {
      name: "deleteCometh",
      method: "DELETE",
      path: "/comeths",
      invoke: (client: MegaverseClient) => client.deleteCometh(11, 12),
      body: { candidateId: CANDIDATE_ID, row: 11, column: 12 },
    },
  ])("$name sends the correct method, path, and body", async ({ method, path, invoke, body }) => {
    const requests: Array<{ method: string; url: string; body: unknown }> = [];
    const url = `${CUSTOM_BASE_URL}${path}`;
    const client = new MegaverseClient(CANDIDATE_ID, CUSTOM_BASE_URL);

    server.use(
      method === "POST"
        ? http.post(url, async ({ request }) => {
            requests.push({
              method: request.method,
              url: request.url,
              body: await request.json(),
            });
            return HttpResponse.json({});
          })
        : http.delete(url, async ({ request }) => {
            requests.push({
              method: request.method,
              url: request.url,
              body: await request.json(),
            });
            return HttpResponse.json({});
          })
    );

    await invoke(client);

    expect(requests).toEqual([{ method, url, body }]);
  });

  it("throws the formatted error when the API responds with a non-2xx status", async () => {
    const client = new MegaverseClient(CANDIDATE_ID, CUSTOM_BASE_URL);

    server.use(
      http.post(`${CUSTOM_BASE_URL}/polyanets`, () => {
        return new HttpResponse(null, { status: 429 });
      })
    );

    await expect(client.placePolyanet(1, 2)).rejects.toThrow("POST /polyanets failed: 429");
  });

  it("throws when a read response fails runtime schema validation", async () => {
    const client = new MegaverseClient(CANDIDATE_ID, CUSTOM_BASE_URL);

    server.use(
      http.get(`${CUSTOM_BASE_URL}/map/${CANDIDATE_ID}`, () => {
        return HttpResponse.json({ map: null });
      })
    );

    await expect(client.fetchCurrent()).rejects.toThrow();
  });
});
