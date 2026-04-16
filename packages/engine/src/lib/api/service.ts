import type { Grid, Placement } from "@megaverse/core";
import { Context, type Effect } from "effect";

import type { ApiError, DecodeError, RateLimited } from "../errors";

/**
 * Effect service describing the Megaverse REST surface the solver depends on.
 *
 * @remarks
 * Implementations live in {@link ./live} (real HTTP against Crossmint) and
 * {@link ./mock} (in-memory, Ref-backed for tests). Consumers only ever
 * see this Context.Tag — the underlying transport is swapped at `Layer`
 * composition time.
 */
export class MegaverseApi extends Context.Tag("@megaverse/engine/MegaverseApi")<
  MegaverseApi,
  {
    /**
     * Fetches the goal grid for the configured candidate.
     */
    readonly fetchGoal: Effect.Effect<Grid, ApiError | DecodeError>;
    /**
     * Fetches the current grid state for the configured candidate, converting
     * server cell payloads into internal cell tokens.
     */
    readonly fetchCurrent: Effect.Effect<Grid, ApiError | DecodeError>;
    /**
     * Dispatches a single placement to the correct endpoint based on cell type.
     *
     * @remarks
     * `RateLimited` surfaces 429s so callers (the solver stream) can apply
     * jittered exponential backoff. Terminal API failures surface as `ApiError`.
     */
    readonly place: (p: Placement) => Effect.Effect<void, ApiError | RateLimited>;
  }
>() {}
