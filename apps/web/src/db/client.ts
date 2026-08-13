import { env } from "@/env";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { resolveDatabaseConnection } from "./database-url";
import * as schema from "./schema";

/**
 * The connection pool, and the one place it is made.
 *
 * **Opened on the first query rather than when this module loads.** `next build` evaluates a
 * route's module graph to read its exports, so resolving the connection at module scope would
 * make a build fail wherever the runtime environment is not yet present — which is every preview
 * build, since Neon injects a branch's host at deployment time and not before.
 *
 * Nothing exported here can run a query on its own. `session.ts` is the only door in, because a
 * query outside its transaction is a query with no session user set, and ADR-0005 rule 3 says
 * what that costs.
 */
let pool: Pool | undefined;

function connect(): Pool {
  if (!pool) {
    const connection = resolveDatabaseConnection(env);
    // The deployment reporting the host it actually reached, which is the observation
    // `docs/infrastructure.md` → *How a preview reaches its own database* was missing: the
    // injected values never appear in `vercel env pull`, so a running deployment is the only
    // thing that can say. Not a credential — a hostname opens nothing on its own.
    console.info(
      `[canoncore] database host ${connection.host} (VERCEL_ENV=${env.VERCEL_ENV ?? "unset"})`,
    );
    pool = new Pool({ connectionString: connection.url });
  }
  return pool;
}

export function database() {
  return drizzle(connect(), { schema });
}

export type Database = ReturnType<typeof database>;
