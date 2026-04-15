import type { Grid } from "@megaverse/core";

import { compass, mosaicGoal, mosaicStart, phase2, rainbow, single, xCross } from "./hand";

export interface Scenario {
  readonly id: string;
  readonly description: string;
  readonly goal: Grid;
  readonly startingCurrent?: Grid;
}

export const DEFAULT_SCENARIO = "x-cross" as const;

export const SCENARIOS: {
  [DEFAULT_SCENARIO]: Scenario;
} & Record<string, Scenario> = {
  single: {
    id: "single",
    description: "3x3, one polyanet — smoke test",
    goal: single,
  },
  "x-cross": {
    id: "x-cross",
    description: "11x11 Phase 1 X-cross — the classic",
    goal: xCross,
  },
  phase2: {
    id: "phase2",
    description: "11x11 Phase 2 — the classic",
    goal: phase2,
  },
  rainbow: {
    id: "rainbow",
    description: "7x9 repeating soloon rainbow — exercises all four colors",
    goal: rainbow,
  },
  compass: {
    id: "compass",
    description: "9x9 compass — central polyanet with comeths on each axis",
    goal: compass,
  },
  mosaic: {
    id: "mosaic",
    description: "10x10 mixed entities with partial starting state — exercises diffing",
    goal: mosaicGoal,
    startingCurrent: mosaicStart,
  },
};

export function resolveScenario(candidateId: string): Scenario {
  return SCENARIOS[candidateId] ?? SCENARIOS[DEFAULT_SCENARIO];
}
