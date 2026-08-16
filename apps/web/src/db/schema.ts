import { sql } from "drizzle-orm";
import {
  check,
  interval,
  pgEnum,
  pgPolicy,
  pgRole,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

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
 * it and `canoncore_migrator` are recorded. Drizzle needs telling: *"By default, drizzle-kit does
 * not manage roles"*, and `.existing()` marks one *"already present in your database"*
 * (https://orm.drizzle.team/docs/rls), so nothing here tries to create it.
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
    // What makes the empty string usable as a session user matching nobody, which is what
    // `session.ts` uses it for. No owner can equal it, so an anonymous reader matches the
    // policy's public branch and nothing else.
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

/**
 * Where a record's values came from, and how long what it said may be kept — `CONTEXT.md` →
 * *Source*.
 *
 * **One row per Source, shared by every reader, and the only table here with no policy over it.**
 * Why that shape rather than a row per person, and what it costs:
 * [ADR-0014](../../../../docs/adr/0014-shell-providers-and-per-source-retention.md) → *Decision
 * 6*. `rls.test.ts` carries the two tripwires that stand in for the cross-tenant test this table
 * cannot have.
 *
 * **Nothing in this repository writes a row**, and no migration seeds one: under decision 1 the
 * application does not know which Sources exist or what any of them permits, so the values arrive
 * from a Provider's capability endpoint. A migration stating a real Source's retention would be
 * the source-specific knowledge that decision removes from `apps/web`.
 */
export const source = pgTable(
  "source",
  {
    id: uuid().primaryKey().defaultRandom(),

    /**
     * How long a Snapshot of this Source may be kept, as a duration or as an explicit
     * `'infinity'` — never as a null, because "nobody has said yet" and "this Source imposes no
     * limit" would then be the same row, and the safe reading of the first is the opposite of the
     * second.
     *
     * `interval` rather than a count of days, because the terms this represents are written in
     * months: TMDB's `§1.C` limits the age of what is held to six months, and
     * `timestamptz + interval '6 months'` is that sentence where any number of days is a rounding
     * of it.
     *
     * **`'infinity'` makes the expiry test branchless** — `fetched_at + retention` is infinite,
     * so no `now()` reaches it. That needs PostgreSQL 17, which added infinite intervals
     * ([PostgreSQL 17 release notes](https://www.postgresql.org/docs/17/release-17.html)); the
     * versions this runs against are in [`ci.yml`](../../../../.github/workflows/ci.yml), which
     * records production's alongside the container's.
     */
    retention: interval().notNull(),
  },
  (t) => [
    // Zero or less is not a duration any terms express, and a row carrying one would expire every
    // Snapshot of that Source the instant it was written.
    check("source_retention_is_positive", sql`${t.retention} > interval '0'`),
  ],
);

/**
 * What one Source last said about one Story, and when it was read — `CONTEXT.md` → *Snapshot*.
 *
 * **It carries no values yet, and that is the whole of it for now.** What a Snapshot holds is
 * additive and belongs to the tickets that import anything; what cannot be added later without a
 * data migration is `fetched_at`, which is why it lands with the table
 * ([ADR-0014](../../../../docs/adr/0014-shell-providers-and-per-source-retention.md) →
 * *Decision 6*).
 */
export const snapshot = pgTable(
  "snapshot",
  {
    id: uuid().primaryKey().defaultRandom(),

    // Deleting a Story takes its Snapshots with it; deleting a Source is refused while any
    // Snapshot still points at it, because that row is the clock the Snapshot expires on, and a
    // Snapshot with no clock is one nothing will ever come back to refresh or to drop.
    storyId: uuid("story_id")
      .notNull()
      .references(() => story.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => source.id),

    /**
     * When the **Source** was read — not when this row was written, and the difference is why
     * there is no default. They diverge the moment a Provider serves anything it already held,
     * and only the first is the age a retention term limits. A `defaultNow()` here would look
     * identical, be wrong by however long the Provider had held the values, and be wrong in the
     * direction that keeps values longer than their terms allow.
     */
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    // ADR-0004's key, `(record, source)`: one row per Story per Source, holding what that Source
    // last said. A second row for the same pair would be a history, which the overlay does not
    // keep — the previous values are gone when the next fetch replaces them.
    unique("snapshot_one_row_per_story_and_source").on(t.storyId, t.sourceId),

    // **This policy names no owner, on purpose.** It asks whether the Story is readable and lets
    // `story`'s own policy answer, so the two can never disagree; a copy of the owner and
    // visibility rules here would be a second thing to keep in step, and a Story made public
    // whose Snapshots stayed private renders as a Story with nothing in it.
    pgPolicy("snapshot_readable_when_its_story_is", {
      as: "permissive",
      for: "select",
      to: applicationRole,
      using: sql`exists (select 1 from ${story} where ${story.id} = ${t.storyId})`,
    }),
  ],
);
