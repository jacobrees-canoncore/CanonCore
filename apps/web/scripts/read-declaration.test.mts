// @vitest-environment node
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect, test } from "vitest";

/**
 * That `node` can load the operator command at all.
 *
 * **This is not a formality, and the failure it catches is one nothing else sees.** `node` runs
 * these scripts by stripping types rather than by compiling a project, so **every relative import on
 * the path from here down needs its `.ts` extension** — and everything under `src` that Next or
 * vitest reaches is written without one. So a module joined to this path later, or an import added
 * to one already on it, breaks the command while the build, the types, the lint and every other test
 * stay green. It happened while this command was being written, on the first run of it.
 *
 * **It is a load, not a run.** The script is invoked with no argument, which it refuses before it
 * opens a connection or fetches anything — so what the assertion below proves is that the whole
 * import graph resolved and the file reached its own checks. A resolution failure exits with
 * `ERR_MODULE_NOT_FOUND` instead, which is what the second assertion pins.
 *
 * The credential is supplied and is deliberately not a working one: the script refuses a missing
 * `MIGRATION_DATABASE_URL` *before* it looks at its argument, so without this the run would stop one
 * check earlier and say nothing about the argument. Nothing connects with it, because the missing
 * argument is refused first.
 *
 * `purge-source.mts` carries the same risk and has no such test; guarding it belongs to a change
 * about that command rather than to this one.
 */
const command = fileURLToPath(new URL("./read-declaration.mts", import.meta.url));

test("node can load the command, and it refuses before it reaches a database", async () => {
  const run = promisify(execFile)(
    process.execPath,
    ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", command],
    { env: { ...process.env, MIGRATION_DATABASE_URL: "postgresql://nothing-is-connected-to" } },
  );

  // It exits non-zero, so the promise rejects and the output is on the rejection.
  const failure = await run.catch((error: { stderr: string }) => error);
  const stderr = (failure as { stderr: string }).stderr;

  expect(stderr).toContain("Name the Provider to read");
  expect(stderr).not.toContain("ERR_MODULE_NOT_FOUND");
});
