import { FetchHttpClient, HttpBody, HttpClient, type HttpClientResponse } from "@effect/platform";
import {
  type ComethDirection,
  CurrentMapResponseSchema,
  GoalMapResponseSchema,
  type Grid,
  type Placement,
  type SoloonColor,
  utils,
} from "@megaverse/core";
import type { Static, TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { Config, Effect, Layer, Redacted } from "effect";

import { ApiError, DecodeError, RateLimited } from "../errors";
import { MegaverseApi } from "./service";

/**
 * Typed Config values consumed by {@link MegaverseApiLive}.
 *
 * @remarks
 * `CANDIDATE_ID` is redacted so it never leaks into logs or error messages.
 * `MEGAVERSE_BASE_URL` defaults to the public Crossmint challenge endpoint.
 */
export const MegaverseConfig = Config.all({
  candidateId: Config.redacted("CANDIDATE_ID"),
  baseUrl: Config.string("MEGAVERSE_BASE_URL").pipe(
    Config.withDefault("https://challenge.crossmint.com/api")
  ),
});

/**
 * Parse a `retry-after` header value into milliseconds.
 *
 * @remarks
 * Supports the two wire formats: delta-seconds (`"5"`) and HTTP-date.
 * Returns `0` when the header is missing or cannot be interpreted — the
 * solver's retry schedule falls back to exponential backoff in that case.
 */
const parseRetryAfterMs = (headers: Record<string, string>): number => {
  const raw = headers["retry-after"];
  if (!raw) return 0;
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) return seconds * 1000;
  const date = Date.parse(raw);
  if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  return 0;
};

/**
 * Parse a JSON response against a TypeBox schema, lifting validation
 * failures into the typed error channel as {@link DecodeError}.
 */
const decodeJson = <S extends TSchema>(
  schema: S,
  raw: unknown
): Effect.Effect<Static<S>, DecodeError> =>
  Effect.try({
    try: () => Value.Parse(schema, raw) as Static<S>,
    catch: (err): DecodeError =>
      new DecodeError({ reason: err instanceof Error ? err.message : String(err) }),
  });

/**
 * Build the {@link MegaverseApi} implementation from an `HttpClient` scoped
 * to a specific base URL and candidate id.
 */
const makeService = (client: HttpClient.HttpClient, candidateId: string, baseUrl: string) => {
  const candidateUrl = (path: string) => `${baseUrl}${path.replace("[candidateId]", candidateId)}`;

  /**
   * Wrap an HttpClient response Effect: classify 429s as `RateLimited`,
   * other non-2xx as `ApiError`, and return the response on success.
   */
  const classify = (
    method: string,
    path: string,
    req: Effect.Effect<HttpClientResponse.HttpClientResponse, unknown>
  ): Effect.Effect<HttpClientResponse.HttpClientResponse, ApiError | RateLimited> =>
    Effect.gen(function* () {
      const res = yield* req.pipe(
        Effect.mapError(
          (err): ApiError =>
            new ApiError({
              status: 0,
              body: err instanceof Error ? err.message : String(err),
              method,
              path,
            })
        )
      );
      if (res.status >= 200 && res.status < 300) return res;

      const body = yield* res.text.pipe(Effect.orElseSucceed(() => ""));
      if (res.status === 429) {
        return yield* Effect.fail(
          new RateLimited({
            status: res.status,
            retryAfterMs: parseRetryAfterMs(res.headers),
          })
        );
      }
      return yield* Effect.fail(new ApiError({ status: res.status, body, method, path }));
    });

  const fetchJson = <S extends TSchema>(
    path: string,
    schema: S
  ): Effect.Effect<Static<S>, ApiError | DecodeError> =>
    Effect.gen(function* () {
      const res = yield* classify("GET", path, client.get(candidateUrl(path))).pipe(
        Effect.catchTag(
          "RateLimited",
          (err): Effect.Effect<never, ApiError> =>
            Effect.fail(
              new ApiError({
                status: err.status,
                body: "rate limited",
                method: "GET",
                path,
              })
            )
        )
      );
      const raw = yield* res.json.pipe(
        Effect.mapError(
          (err): DecodeError =>
            new DecodeError({ reason: err instanceof Error ? err.message : String(err) })
        )
      );
      return yield* decodeJson(schema, raw);
    });

  const fetchGoal: Effect.Effect<Grid, ApiError | DecodeError> = fetchJson(
    "/map/[candidateId]/goal",
    GoalMapResponseSchema
  ).pipe(Effect.map((parsed) => parsed.goal));

  const fetchCurrent: Effect.Effect<Grid, ApiError | DecodeError> = fetchJson(
    "/map/[candidateId]",
    CurrentMapResponseSchema
  ).pipe(Effect.map((parsed) => parsed.map.content.map((row) => row.map(utils.serverToCell))));

  const writeJson = (
    path: string,
    body: Record<string, unknown>
  ): Effect.Effect<void, ApiError | RateLimited> =>
    classify(
      "POST",
      path,
      client.post(candidateUrl(path), {
        body: HttpBody.unsafeJson({ candidateId, ...body }),
      })
    ).pipe(Effect.asVoid);

  const place = ({ row, col, cell }: Placement): Effect.Effect<void, ApiError | RateLimited> => {
    if (cell === "POLYANET") {
      return writeJson("/polyanets", { row, column: col });
    }
    if (cell.endsWith("_SOLOON")) {
      const color = cell.replace("_SOLOON", "").toLowerCase() as SoloonColor;
      return writeJson("/soloons", { row, column: col, color });
    }
    if (cell.endsWith("_COMETH")) {
      const direction = cell.replace("_COMETH", "").toLowerCase() as ComethDirection;
      return writeJson("/comeths", { row, column: col, direction });
    }
    return Effect.die(new Error(`Cannot place SPACE at (${row},${col})`));
  };

  return MegaverseApi.of({ fetchGoal, fetchCurrent, place });
};

/**
 * Live implementation of {@link MegaverseApi} backed by `@effect/platform`'s
 * {@link HttpClient.HttpClient} and typed {@link MegaverseConfig} values.
 *
 * @remarks
 * Provides its own {@link FetchHttpClient.layer} so callers only need to
 * supply this layer. Override by providing an alternative HttpClient layer
 * before this one.
 */
export const MegaverseApiLive = Layer.effect(
  MegaverseApi,
  Effect.gen(function* () {
    const { candidateId, baseUrl } = yield* MegaverseConfig;
    const client = yield* HttpClient.HttpClient;
    return makeService(client, Redacted.value(candidateId), baseUrl);
  })
).pipe(Layer.provide(FetchHttpClient.layer));
