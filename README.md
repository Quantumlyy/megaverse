# Megaverse Solver

This repository contains a Crossmint Megaverse solver with a terminal UI, a reusable engine, shared schemas, and a local reference server for development and demos.

![Megaverse solver terminal UI](docs/solver-ui.png)

## Features

- Terminal UI that shows the goal grid next to the current grid.
- Plan-before-execute flow so you can review the diff before sending placements.
- Live progress panel with totals, retries, failures, and skipped cells.
- Execution log that records each placement attempt and result.
- Solver engine with configurable retry and concurrency behavior.
- Shared Megaverse cell types, payload schemas, and conversion helpers.
- Local reference server with OpenAPI docs for offline testing.
- Built-in local scenarios for smoke tests, phase replicas, and mixed-entity maps.

## Prerequisites

- Node.js
- pnpm

## Install

```sh
pnpm install
```

## Run the CLI Against Crossmint

The CLI defaults to `https://challenge.crossmint.com/api`, so you only need to provide your candidate ID.

```sh
CANDIDATE_ID=<your-candidate-id> pnpm cli
```

## Run the Local Reference Server

Start the mock server in one terminal:

```sh
pnpm server
```

The server listens on `http://localhost:3001` and serves the Megaverse API under `http://localhost:3001/api`.

OpenAPI UI:

```text
http://localhost:3001/openapi
```

## Run the CLI Against the Local Reference Server

Start the server first, then point the CLI at the local API in a second terminal. For local runs, `CANDIDATE_ID` selects the scenario to load.

```sh
CANDIDATE_ID=phase2 MEGAVERSE_BASE_URL=http://localhost:3001/api pnpm cli
```

## Available Local Scenarios

- `single`: 3x3, one polyanet; smoke test.
- `x-cross`: 11x11 Phase 1 X-cross; the classic.
- `phase2`: 11x11 Phase 2; the classic.
- `rainbow`: 7x9 repeating soloon rainbow; exercises all four colors.
- `compass`: 9x9 compass; central polyanet with comeths on each axis.
- `mosaic`: 10x10 mixed entities with a partial starting state; exercises diffing.

## Environment Variables

- `CANDIDATE_ID`: Required. Crossmint candidate ID for the real API, or a scenario ID when using the local reference server.
- `MEGAVERSE_BASE_URL`: Optional. Overrides the API base URL. Defaults to `https://challenge.crossmint.com/api`.

## Package Overview

- `@megaverse/core`: Shared cell constants, TypeBox schemas, wire payloads, and conversion/render helpers.
- `@megaverse/engine`: API client, solver, and progress tracking interfaces used by the CLI.
- `@megaverse/cli`: Ink-based terminal UI for planning and executing Megaverse placements.
- `@megaverse/reference-server`: Local Elysia server that emulates the Megaverse API and exposes scenario-based maps.
