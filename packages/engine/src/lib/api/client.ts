import type { Static, TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

import {
  CurrentMapResponseSchema,
  GoalMapResponseSchema,
  utils,
  type Grid,
  type ComethDirection,
  type SoloonColor,
} from "@megaverse/core";

export interface MegaverseClientOptions {
  candidateId: string;
  baseUrl?: string;
}

export class MegaverseClient {
  public constructor(
    public readonly candidateId: string,
    public readonly baseUrl: string = "https://challenge.crossmint.com/api"
  ) {}

  public async fetchGoal(): Promise<Grid> {
    const { goal } = await this.request(
      "GET",
      "/map/[candidateId]/goal",
      undefined,
      GoalMapResponseSchema
    );

    return goal;
  }

  public async fetchCurrent(): Promise<Grid> {
    const { map } = await this.request(
      "GET",
      "/map/[candidateId]",
      undefined,
      CurrentMapResponseSchema
    );

    return map.content.map((row) => row.map(utils.serverToCell));
  }

  public async placePolyanet(row: number, column: number): Promise<void> {
    await this.request("POST", "/polyanets", { row, column });
  }

  public async placeSoloon(row: number, column: number, color: SoloonColor): Promise<void> {
    await this.request("POST", "/soloons", { row, column, color });
  }

  public async placeCometh(row: number, column: number, direction: ComethDirection): Promise<void> {
    await this.request("POST", "/comeths", { row, column, direction });
  }

  public async deletePolyanet(row: number, column: number): Promise<void> {
    await this.request("DELETE", "/polyanets", { row, column });
  }

  public async deleteSoloon(row: number, column: number): Promise<void> {
    await this.request("DELETE", "/soloons", { row, column });
  }

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
