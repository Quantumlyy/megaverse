import type { Grid, ServerCell, SoloonColor, ComethDirection } from "@megaverse/core"
import { utils, constants } from "@megaverse/core"

import { resolveScenario, type Scenario } from "./scenarios/registry"


const { _ } = constants

interface CandidateState {
  readonly candidateId: string
  readonly scenario: Scenario
  readonly grid: Grid<ServerCell>
}

const states = new Map<string, CandidateState>()

function gridToServer(grid: Grid): Grid<ServerCell> {
  return grid.map((row) =>
    row.map((cell): ServerCell => (cell === _ ? null : utils.cellToServer(cell)))
  )
}

function emptyGrid(rows: number, cols: number): Grid<ServerCell> {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null)
  )
}

function freshGrid(scenario: Scenario): Grid<ServerCell> {
  if (scenario.startingCurrent) return gridToServer(scenario.startingCurrent)

  const rows = scenario.goal.length
  const cols = scenario.goal[0]?.length ?? 0
  return emptyGrid(rows, cols)
}

function getOrCreate(candidateId: string) {
  let state = states.get(candidateId)

  if (!state) {
    const scenario = resolveScenario(candidateId)
    state = { candidateId, scenario, grid: freshGrid(scenario) }
    states.set(candidateId, state)
  }

  return state
}

// ── Operations ──────────────────────────────────────────────────────────

export function placePolyanet(candidateId: string, row: number, column: number) {
  const { grid } = getOrCreate(candidateId)
  grid[row]![column] = { type: 0 }
}

export function placeSoloon(
  candidateId: string,
  row: number,
  column: number,
  color: SoloonColor
) {
  const { grid } = getOrCreate(candidateId)
  grid[row]![column] = { type: 1, color }
}

export function placeCometh(
  candidateId: string,
  row: number,
  column: number,
  direction: ComethDirection
) {
  const { grid } = getOrCreate(candidateId)
  grid[row]![column] = { type: 2, direction }
}

export function remove(candidateId: string, row: number, column: number) {
  const { grid } = getOrCreate(candidateId)
  grid[row]![column] = null
}

export function getGrid(candidateId: string): Grid<ServerCell> {
  return getOrCreate(candidateId).grid
}

export function getGoal(candidateId: string): Grid {
  return getOrCreate(candidateId).scenario.goal
}
