import type { ComethDirection, Grid, SoloonColor } from "@megaverse/core";

import { MegaverseClient, type ProgressTracker } from "../src";

export interface ClientCall {
  readonly method: string;
  readonly args: readonly unknown[];
}

export class RecordingClient extends MegaverseClient {
  public goal: Grid = [];
  public current: Grid = [];
  public calls: ClientCall[] = [];
  public handlers = {
    placePolyanet: async (_row: number, _column: number) => {},
    placeSoloon: async (_row: number, _column: number, _color: SoloonColor) => {},
    placeCometh: async (_row: number, _column: number, _direction: ComethDirection) => {},
    deletePolyanet: async (_row: number, _column: number) => {},
    deleteSoloon: async (_row: number, _column: number) => {},
    deleteCometh: async (_row: number, _column: number) => {},
  };

  public constructor(candidateId: string = "candidate") {
    super(candidateId, "http://example.test/api");
  }

  public override async fetchGoal(): Promise<Grid> {
    return this.goal;
  }

  public override async fetchCurrent(): Promise<Grid> {
    return this.current;
  }

  public override async placePolyanet(row: number, column: number): Promise<void> {
    this.calls.push({ method: "placePolyanet", args: [row, column] });
    await this.handlers.placePolyanet(row, column);
  }

  public override async placeSoloon(
    row: number,
    column: number,
    color: SoloonColor
  ): Promise<void> {
    this.calls.push({ method: "placeSoloon", args: [row, column, color] });
    await this.handlers.placeSoloon(row, column, color);
  }

  public override async placeCometh(
    row: number,
    column: number,
    direction: ComethDirection
  ): Promise<void> {
    this.calls.push({ method: "placeCometh", args: [row, column, direction] });
    await this.handlers.placeCometh(row, column, direction);
  }

  public override async deletePolyanet(row: number, column: number): Promise<void> {
    this.calls.push({ method: "deletePolyanet", args: [row, column] });
    await this.handlers.deletePolyanet(row, column);
  }

  public override async deleteSoloon(row: number, column: number): Promise<void> {
    this.calls.push({ method: "deleteSoloon", args: [row, column] });
    await this.handlers.deleteSoloon(row, column);
  }

  public override async deleteCometh(row: number, column: number): Promise<void> {
    this.calls.push({ method: "deleteCometh", args: [row, column] });
    await this.handlers.deleteCometh(row, column);
  }
}

export interface TrackerEvent {
  readonly name: string;
  readonly args: readonly unknown[];
}

export class RecordingTracker implements ProgressTracker {
  public events: TrackerEvent[] = [];

  public onStart(initial: Grid, goal: Grid, ts?: number): void {
    this.record("onStart", initial, goal, ts);
  }

  public onPlan(total: number, skipped: number, ts?: number): void {
    this.record("onPlan", total, skipped, ts);
  }

  public onSolveStart(ts?: number): void {
    this.record("onSolveStart", ts);
  }

  public onPlacementStarted(
    row: number,
    col: number,
    cell: string,
    attempt?: number,
    ts?: number
  ): void {
    this.record("onPlacementStarted", row, col, cell, attempt, ts);
  }

  public onPlacementFailed(
    row: number,
    col: number,
    reason: string,
    attempt?: number,
    ts?: number
  ): void {
    this.record("onPlacementFailed", row, col, reason, attempt, ts);
  }

  public onPlacementSucceeded(
    row: number,
    col: number,
    cell: string,
    attempt?: number,
    ts?: number
  ): void {
    this.record("onPlacementSucceeded", row, col, cell, attempt, ts);
  }

  public onComplete(ts?: number): void {
    this.record("onComplete", ts);
  }

  private record(name: string, ...args: unknown[]): void {
    this.events.push({ name, args });
  }
}
