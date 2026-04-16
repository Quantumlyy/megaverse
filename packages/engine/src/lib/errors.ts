import { Data } from "effect";

/**
 * The API responded with 429 Too Many Requests. Carries the parsed
 * `retry-after` window in milliseconds (0 when no header is present).
 */
export class RateLimited extends Data.TaggedError("RateLimited")<{
  readonly retryAfterMs: number;
  readonly status: number;
}> {}

/**
 * The API responded with a non-2xx status that is not a 429.
 *
 * @remarks
 * Status codes in the 5xx range are considered retryable by the
 * default retry policy; 4xx are terminal.
 */
export class ApiError extends Data.TaggedError("ApiError")<{
  readonly status: number;
  readonly body: string;
  readonly method: string;
  readonly path: string;
}> {}

/**
 * A successful response could not be decoded against the expected schema
 * or a transport failure prevented the response from being read.
 */
export class DecodeError extends Data.TaggedError("DecodeError")<{
  readonly reason: string;
}> {}

/**
 * Union of all tagged errors the Megaverse solver stream can fail with.
 */
export type SolverError = RateLimited | ApiError | DecodeError;
