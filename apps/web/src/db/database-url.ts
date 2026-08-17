/**
 * Which database this deployment talks to, and the assertion that it is the right one.
 *
 * Two environments compose their connection string from different things, and getting it wrong
 * is silent rather than loud: a preview that reaches production's branch works perfectly and
 * reads production's rows. So this module resolves the string and then checks the host it
 * arrived at, rather than assuming the platform handed it the right one — which is the half
 * `docs/infrastructure.md` → *How a preview reaches its own database* records as cited but never
 * observed.
 *
 * Pure, and separate from the pool in `session.ts`, so every branch below is reachable from a
 * test without a database.
 */

/** The subset of the validated environment that says which database to open. */
export type DatabaseEnvironment = {
  readonly VERCEL_ENV?: "production" | "preview" | "development";
  readonly DATABASE_URL?: string;
  readonly DATABASE_APP_USER?: string;
  readonly DATABASE_APP_PASSWORD?: string;
  readonly DATABASE_AUTH_USER?: string;
  readonly DATABASE_AUTH_PASSWORD?: string;
  readonly DATABASE_PRODUCTION_HOST?: string;
  readonly NEON_PGHOST?: string;
  readonly NEON_PGDATABASE?: string;
};

export type DatabaseConnection = {
  /** The connection string to open. */
  readonly url: string;
  /** The host it resolved to, for the deployment to report rather than assume. */
  readonly host: string;
};

function required(environment: DatabaseEnvironment, name: keyof DatabaseEnvironment): string {
  const value = environment[name];
  if (!value) {
    throw new Error(
      `${name} is not set, and this deployment cannot reach a database without it. ` +
        "docs/infrastructure.md -> Environment variables says which environments carry it.",
    );
  }
  return value;
}

/**
 * The Neon compute a hostname addresses, which is what "the same database" actually means.
 *
 * One Neon compute answers to more than one name: `list_branch_computes` on production returns
 * `ep-aged-moon-zaujrwy4.c-2.eu-west-2.aws.neon.tech` and
 * `ep-aged-moon-zaujrwy4-pooler.c-2.eu-west-2.aws.neon.tech` for the same `compute_id` (read
 * 14 August 2026). Comparing whole hostnames would therefore answer *no* to two names for one
 * database — which fails two ways, and the dangerous one is the preview: a preview reaching
 * production's unpooled host is production's data, and a whole-hostname check would wave it
 * through. A branch's compute id is always a different one, so nothing else collides.
 */
function computeOf(host: string): string {
  return host.split(".")[0]!.replace(/-pooler$/, "");
}

function hostOf(url: string, name: string): string {
  const host = URL.parse(url)?.hostname;
  if (!host) {
    throw new Error(`${name} is not a connection string a host can be read from.`);
  }
  return host;
}

export function resolveDatabaseConnection(environment: DatabaseEnvironment): DatabaseConnection {
  if (environment.VERCEL_ENV === "preview") {
    // Composed, never read whole. Neon injects a branch's own variables per deployment, but the
    // connection string among them carries the *owner* role, which has BYPASSRLS and is
    // therefore the one role this application may never be (ADR-0005, rule 1). So the branch
    // supplies where, and our own two variables supply who.
    //
    // DATABASE_URL is not consulted here even if something sets it: in preview it could only be
    // the static, project-level, production string, which is the exact failure below.
    const host = required(environment, "NEON_PGHOST");
    const database = required(environment, "NEON_PGDATABASE");
    const user = required(environment, "DATABASE_APP_USER");
    const password = required(environment, "DATABASE_APP_PASSWORD");
    const productionHost = required(environment, "DATABASE_PRODUCTION_HOST");

    if (computeOf(host) === computeOf(productionHost)) {
      throw new Error(
        `This preview resolved production's database host (${host}). Preview branching is off, ` +
          "or a project-level NEON_PGHOST is shadowing the branch's injected one — " +
          "docs/infrastructure.md -> Database. Refusing to connect: a preview that reaches " +
          "production reads and would eventually write production's rows.",
      );
    }

    // `verify-full` rather than `require`, which means the same thing today and will not for
    // ever: `pg` 8 treats `prefer`, `require` and `verify-ca` as aliases for `verify-full`, while
    // `pg` 9 gives those three libpq's own meanings, "which have weaker security guarantees"
    // (`pg-connection-string` 2.14.0's deprecation warning). libpq's `require` is encrypted with
    // the certificate unchecked (https://www.postgresql.org/docs/current/libpq-ssl.html), so this
    // string would quietly stop verifying at an upgrade — CAN-84 A preview's composed
    // sslmode=require silently stops verifying certificates under pg 9. The two variables holding
    // the other connection strings say the same thing: docs/infrastructure.md -> The SSL mode
    // every connection asks for.
    const credentials = `${encodeURIComponent(user)}:${encodeURIComponent(password)}`;
    return { url: `postgresql://${credentials}@${host}/${database}?sslmode=verify-full`, host };
  }

  const url = required(environment, "DATABASE_URL");
  const host = hostOf(url, "DATABASE_URL");

  if (environment.VERCEL_ENV === "production") {
    // The check that keeps the preview check honest. DATABASE_PRODUCTION_HOST is the only thing
    // a preview can compare itself against, and a value left behind by an endpoint that no
    // longer exists would match nothing and pass for ever. Production is the one deployment
    // that knows whether it is still true.
    const productionHost = required(environment, "DATABASE_PRODUCTION_HOST");
    if (computeOf(host) !== computeOf(productionHost)) {
      throw new Error(
        `Production resolved database host ${host}, but DATABASE_PRODUCTION_HOST expected ` +
          `${productionHost}. One of the two is stale; until they agree a preview cannot tell ` +
          "whether it has reached its own branch.",
      );
    }
  }

  return { url, host };
}

/**
 * The same database, reached as the auth role.
 *
 * **Composed from the application's connection rather than resolved beside it**, which is the
 * whole design of this function: the host, the database, the SSL mode, the preview-versus-
 * production branch and both of its assertions are inherited, so the two roles cannot end up
 * pointed at different databases. A second `DATABASE_AUTH_URL` variable would be exactly that
 * risk, and it would be a second Sensitive string nobody can read back to compare.
 *
 * Why a third role exists at all: [`../auth/auth.ts`](../auth/auth.ts).
 */
export function resolveAuthDatabaseConnection(
  environment: DatabaseEnvironment,
): DatabaseConnection {
  const application = resolveDatabaseConnection(environment);
  const user = required(environment, "DATABASE_AUTH_USER");
  const password = required(environment, "DATABASE_AUTH_PASSWORD");

  // The `URL` setters percent-encode what they are given, so a password containing `:`, `@`, `/`
  // or `?` survives — which the preview branch above has to do by hand with `encodeURIComponent`
  // because it is building the string rather than editing one. Everything after the authority is
  // left alone, which is what carries `?sslmode=verify-full` across unchanged.
  const composed = new URL(application.url);
  composed.username = user;
  composed.password = password;

  return { url: composed.toString(), host: application.host };
}
