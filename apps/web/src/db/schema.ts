import { sql } from "drizzle-orm";
import { check, pgEnum, pgPolicy, pgRole, pgTable, text, uuid } from "drizzle-orm/pg-core";

/**
 * The name of the session setting that says who is asking. `session.ts` writes it and the
 * policy below reads it, so it is declared once here and imported there.
 *
 * A custom setting needs a prefix and a dot, which is what makes `canoncore.` part of the name
 * rather than decoration: PostgreSQL accepts a `SET` of an unknown parameter only when it is
 * "two-part [name] ... separated by a dot"
 * (https://www.postgresql.org/docs/current/runtime-config-custom.html).
 */
export const sessionUserSetting = "canoncore.user_id";


/**
 * Interpolated into the policy as text rather than as a bind parameter. A policy is DDL, so
 * `drizzle-kit generate` renders this template into a migration file once; a parameter would
 * be rendered as `$1` and the migration would not run.
 */
const currentSessionUser = sql.raw(`current_setting('${sessionUserSetting}', true)`);

/**
 * The role the application connects as, and the only role this policy is granted to.
 *
 * `.existing()` because Neon provisions it, not us — `docs/infrastructure.md` → *Roles* is where
 * it and `canoncore_migrator` are recorded. `drizzle-kit` does not manage roles unless
 * `entities.roles` is turned on, so nothing here tries to create it.
 */
export const applicationRole = pgRole("canoncore_app").existing();

/** Whether a record can be seen by people other than its owner. Set per record. */
export const visibility = pgEnum("visibility", ["private", "public"]);

/**
 * The thing that happened, independent of how anyone consumes it — `CONTEXT.md` → *Story*.
 *
 * Minimal on purpose: an id, a title, an owner and a Visibility are what the row-level security
 * policy needs to be a real one, and everything else a Story will carry is additive.
 */
export const story = pgTable(
  "story",
  {
    id: uuid().primaryKey().defaultRandom(),
    title: text().notNull(),
    ownerId: text("owner_id").notNull(),
    visibility: visibility().notNull().default("private"),
  },
  (t) => [
    // What makes the empty string safe as the anonymous session user (`session.ts`): with this
    // constraint in place, no owner can ever equal it, so the anonymous path differs from a
    // signed-in one by the value of one setting rather than by a code path.
    check("story_owner_id_not_blank", sql`length(${t.ownerId}) > 0`),

    // Defining a policy enables row-level security on the table, so there is no separate
    // `.enableRLS()` to forget. `current_setting(..., true)` returns NULL when nothing set it,
    // and `owner_id = NULL` is NULL rather than true — which is why an unset session reads no
    // owned rows instead of every row.
    pgPolicy("story_readable_by_owner_or_when_public", {
      as: "permissive",
      for: "select",
      to: applicationRole,
      using: sql`${t.visibility} = 'public' or ${t.ownerId} = ${currentSessionUser}`,
    }),
  ],
);
