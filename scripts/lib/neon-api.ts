// Reaching the Neon project: where it is, which key opens it, and one request helper.
//
// **Split out because two scripts need it and they fail differently.**
// `provision-worktree-database.ts` treats every failure as a SKIP and exits 0, because a lane
// without a database of its own is a working lane; `sweep-worktree-databases.ts` stops, because a
// half-read listing is not something to delete from. So this module *throws* and states no policy,
// and each caller maps `NeonUnavailable` to its own — which is the whole reason the error is a type
// rather than a message.
//
// The pure half of the design is `worktree-database.ts`, which has no I/O at all and is where the
// deletion decision lives. This is the I/O half, deliberately kept thin enough not to need tests of
// its own. Design: docs/adr/0025-a-preview-database-per-worktree.md.

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** The `canoncore` Neon project — docs/infrastructure.md -> Database. */
export const NEON_PROJECT = "steep-wave-52467839";

const NEON_API = "https://console.neon.tech/api/v2";

/** Where the machine keeps the key. docs/infrastructure.md -> The Neon API key. */
const KEY_FILE = join(homedir(), ".config", "canoncore", "neon-api-key");

/** Neon could not be asked, or answered something this cannot use. Never a lane's fault. */
export class NeonUnavailable extends Error {}

/**
 * The key, from the environment or from the machine's own file.
 *
 * **It is never in this repository and never in a Vercel variable.** It can create and destroy
 * databases, so it lives on the machine that runs the hook and nowhere a deployment can reach —
 * docs/adr/0016-provisioning-plain-api-keys-neon-excepted.md.
 */
function neonKey(): string {
  const fromEnvironment = process.env.NEON_API_KEY?.trim();
  if (fromEnvironment) return fromEnvironment;
  let fromFile = "";
  try {
    fromFile = readFileSync(KEY_FILE, "utf8").trim();
  } catch {
    /* absent and unreadable are the same problem here, and get the same message */
  }
  if (fromFile) return fromFile;
  throw new NeonUnavailable(
    `no Neon API key. Set NEON_API_KEY, or put one in ${KEY_FILE} — ` +
      "docs/infrastructure.md -> The Neon API key says which key and how to reissue it",
  );
}

/** One request against the project, as parsed JSON. Throws `NeonUnavailable` for anything else. */
export async function neonRequest(path: string, init: RequestInit = {}): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${NEON_API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${neonKey()}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
  } catch (error) {
    if (error instanceof NeonUnavailable) throw error;
    throw new NeonUnavailable(`Neon could not be reached: ${(error as Error).message}`);
  }
  const body = await response.text();
  if (!response.ok)
    throw new NeonUnavailable(
      `Neon answered ${response.status} to ${init.method ?? "GET"} ${path}: ${body.slice(0, 200)}`,
    );
  return body ? JSON.parse(body) : {};
}

export type NeonBranchRow = { id: string; name: string; protected?: boolean; default?: boolean };

/** Every branch on the project. */
export async function neonBranches(): Promise<NeonBranchRow[]> {
  const body = (await neonRequest(`/projects/${NEON_PROJECT}/branches`)) as {
    branches?: NeonBranchRow[];
  };
  return body.branches ?? [];
}
