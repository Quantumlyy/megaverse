import { MegaverseClient } from "@megaverse/engine";
import { withFullScreen } from "fullscreen-ink";

import App from "./tui/app";

const candidateId = process.env.CANDIDATE_ID;
const baseUrl = process.env.MEGAVERSE_BASE_URL ?? "https://challenge.crossmint.com/api";

if (!candidateId) {
  console.error("CANDIDATE_ID env var required");
  process.exit(1);
}

const client = new MegaverseClient(candidateId, baseUrl);

const ink = withFullScreen(<App client={client} candidateId={candidateId} baseUrl={baseUrl} />);

await ink.start();
await ink.waitUntilExit();
