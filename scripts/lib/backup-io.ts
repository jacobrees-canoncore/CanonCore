// Reaching the two things the backup talks to: a Postgres client program, and the blob store.
//
// **Split out because three callers need it and one of them is not a backup script.**
// `backup-database.ts` writes a backup, `restore-database.ts` reads one, and `check-docs.ts` asks
// the store whether a recent one exists at all. Each had its own spelling of these two until
// CAN-55's review found them already diverging — one `postgres()` reported the message Node gives
// when a program says nothing and the other dropped it, and two of the three listings ignored the
// store's own `hasMore`.
//
// The pure half of the design is `backup.ts`, which has no I/O at all and is where the decisions
// and the tests are. This is the I/O half, deliberately kept thin enough not to need tests of its
// own — the same seam, and the same reasoning, as `neon-api.ts` beside `worktree-database.ts`.

import { execFileSync } from "node:child_process";
import { list } from "@vercel/blob";
import { BACKUP_PREFIX, type StoredBackup } from "./backup.ts";

/**
 * Run a Postgres client program, with the connection in the environment and nothing on argv.
 *
 * **What it says when it fails is the whole reason this is not two lines inline.** Node's own error
 * for a non-zero exit is `Command failed: pg_dump …` and nothing else, and a nightly job whose
 * failure mail says only that is a job somebody has to reproduce before they can read it. libpq
 * puts every diagnosis on stderr — the host it could not reach, the certificate it would not
 * accept, the relation it was refused — so stderr is captured and becomes the message. Both of
 * CAN-55's failures on a runner were read straight off that message and neither was reproducible
 * locally (`docs/incidents.md` → *The backup job took three runs on a runner*).
 */
export function postgres(
  program: string,
  args: string[],
  environment: Record<string, string>,
): string {
  try {
    return execFileSync(program, args, {
      encoding: "utf8",
      env: { ...process.env, ...environment },
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const failure = error as { stderr?: string; status?: number | null; message?: string };
    const said = failure.stderr?.trim();
    throw new Error(
      `${program} exited ${failure.status ?? "abnormally"}` +
        (said ? `: ${said}` : ` and said nothing: ${failure.message}`),
    );
  }
}

/**
 * Every backup the store holds, following the cursor rather than reading one page.
 *
 * **A page is not the store, and the difference decides whether something gets deleted.** `list`
 * answers up to its limit and says `hasMore`; a caller that ignores it prunes against a partial
 * listing and reports freshness from one too. Thirty files never reach a 1,000 limit today, which
 * is exactly why a single page reads as correct until the day it is not.
 */
export async function storedBackups(token: string): Promise<StoredBackup[]> {
  const all: StoredBackup[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: BACKUP_PREFIX, cursor, token, limit: 1000 });
    all.push(
      ...page.blobs.map(({ pathname, uploadedAt, size, url }) => ({
        pathname,
        uploadedAt,
        size,
        url,
      })),
    );
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return all;
}
