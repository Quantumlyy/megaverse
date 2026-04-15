import {
  type ComethDirection,
  CurrentMapResponseSchema,
  GoalMapResponseSchema,
  type Grid,
  type SoloonColor,
  utils,
} from "@megaverse/core";
import type { Static, TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

/**
 * Constructor options for a {@link MegaverseClient}.
 */
export interface MegaverseClientOptions {
  /**
   * Crossmint candidate identifier used in route templates and request bodies.
   */
  candidateId: string;
  /**
   * Base URL for the Megaverse API. Defaults to the public Crossmint challenge API.
   */
  baseUrl?: string;
}

/**
 * Thin Megaverse REST client with runtime response validation.
 *
 * @remarks
 * Read operations validate JSON responses with TypeBox before they are returned to callers.
 * Write operations throw when the remote API responds with a non-2xx status.
 */
export class MegaverseClient {
  /**
   * Creates a Megaverse API client.
   *
   * @param candidateId - Crossmint candidate identifier used in paths and request bodies.
   * @param baseUrl - API base URL. Defaults to `https://challenge.crossmint.com/api`.
   */
  public constructor(
    public readonly candidateId: string,
    public readonly baseUrl: string = "https://challenge.crossmint.com/api"
  ) {}

  /**
   * Fetches the target goal grid for the current candidate.
   *
   * @returns Goal grid expressed with internal cell tokens.
   * @throws Error if the HTTP request fails or the response does not match the expected schema.
   */
  public async fetchGoal(): Promise<Grid> {
    const { goal } = await this.request(
      "GET",
      "/map/[candidateId]/goal",
      undefined,
      GoalMapResponseSchema
    );

    return goal;
  }

  /**
   * Fetches the current map state and converts API payload cells into internal cell tokens.
   *
   * @returns Current grid expressed with internal cell tokens.
   * @throws Error if the HTTP request fails or the response does not match the expected schema.
   */
  public async fetchCurrent(): Promise<Grid> {
    const { map } = await this.request(
      "GET",
      "/map/[candidateId]",
      undefined,
      CurrentMapResponseSchema
    );

    return map.content.map((row) => row.map(utils.serverToCell));
  }

  /**
   * Places a polyanet at the provided coordinates.
   *
   * @param row - Zero-based target row.
   * @param column - Zero-based target column.
   * @returns Promise that resolves when the API accepts the placement.
   * @throws Error if the API responds with a non-2xx status.
   */
  public async placePolyanet(row: number, column: number): Promise<void> {
    await this.request("POST", "/polyanets", { row, column });
  }

  /**
   * Places a colored soloon at the provided coordinates.
   *
   * @param row - Zero-based target row.
   * @param column - Zero-based target column.
   * @param color - Soloon color to place.
   * @returns Promise that resolves when the API accepts the placement.
   * @throws Error if the API responds with a non-2xx status.
   */
  public async placeSoloon(row: number, column: number, color: SoloonColor): Promise<void> {
    await this.request("POST", "/soloons", { row, column, color });
  }

  /**
   * Places a directed cometh at the provided coordinates.
   *
   * @param row - Zero-based target row.
   * @param column - Zero-based target column.
   * @param direction - Cometh direction to place.
   * @returns Promise that resolves when the API accepts the placement.
   * @throws Error if the API responds with a non-2xx status.
   */
  public async placeCometh(row: number, column: number, direction: ComethDirection): Promise<void> {
    await this.request("POST", "/comeths", { row, column, direction });
  }

  /**
   * Deletes a polyanet at the provided coordinates.
   *
   * @param row - Zero-based target row.
   * @param column - Zero-based target column.
   * @returns Promise that resolves when the API accepts the deletion.
   * @throws Error if the API responds with a non-2xx status.
   */
  public async deletePolyanet(row: number, column: number): Promise<void> {
    await this.request("DELETE", "/polyanets", { row, column });
  }

  /**
   * Deletes a soloon at the provided coordinates.
   *
   * @param row - Zero-based target row.
   * @param column - Zero-based target column.
   * @returns Promise that resolves when the API accepts the deletion.
   * @throws Error if the API responds with a non-2xx status.
   */
  public async deleteSoloon(row: number, column: number): Promise<void> {
    await this.request("DELETE", "/soloons", { row, column });
  }

  /**
   * Deletes a cometh at the provided coordinates.
   *
   * @param row - Zero-based target row.
   * @param column - Zero-based target column.
   * @returns Promise that resolves when the API accepts the deletion.
   * @throws Error if the API responds with a non-2xx status.
   */
  public async deleteCometh(row: number, column: number): Promise<void> {
    await this.request("DELETE", "/comeths", { row, column });
  }

  private async request<S extends TSchema | undefined = undefined>(
    method: "GET" | "POST" | "DELETE",
    path: string,
    body?: Record<string, unknown>,
    schema?: S
  ): Promise<S extends TSchema ? Static<S> : undefined> {
    const url = `${this.baseUrl}${path.replace("[candidateId]", this.candidateId)}`;

    const init: RequestInit = { method };
    if (method !== "GET") {
      init.headers = { "content-type": "application/json" };
      init.body = JSON.stringify({ candidateId: this.candidateId, ...body });
    }

    const res = await fetch(url, init);
    if (!res.ok) throw new Error(`${method} ${path} failed: ${res.status}`);

    if (!schema) return undefined as S extends TSchema ? Static<S> : undefined;

    const raw = await res.json();
    return Value.Parse(schema, raw) as S extends TSchema ? Static<S> : undefined;
  }
}
