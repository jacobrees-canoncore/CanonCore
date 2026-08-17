import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
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

/**
 * The role better-auth connects as, and the only role that may write anything below.
 *
 * **A third role exists because the thing that authenticates cannot be constrained by the identity
 * it is establishing.** `getSession` has to find a `session` row by its *token* before it knows
 * whose it is, and signing in has to find a `user` row by *email* with no session set at all —
 * neither of which a policy keyed on `canoncore.user_id` can permit. The argument in full, and the
 * three designs it rules out, is [`../auth/auth.ts`](../auth/auth.ts).
 *
 * **It is not a widening of ADR-0005 rule 1.** That rule is about the role *the application*
 * connects as, and `canoncore_app` is untouched: it still holds `SELECT` and nothing else, still
 * has no `BYPASSRLS`, and still reads every row through a policy. This role has no `BYPASSRLS`
 * either — what it has is a policy naming it, on five tables and no others, so its reach is written
 * down in this file rather than being a property of the server.
 *
 * `.existing()` for `applicationRole`'s reason: Neon provisions it.
 */
export const authRole = pgRole("canoncore_auth").existing();

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

/**
 * What kind of thing a Tombstone used to be — ActivityStreams' `formerType`, which "identifies the
 * type of the object that was deleted"
 * ([ActivityStreams 2.0 Vocabulary](https://www.w3.org/TR/activitystreams-vocabulary/#dfn-tombstone)).
 *
 * One value, because one kind of thing exists to be tombstoned. Version joins it when Versions do,
 * and an enum rather than free text is what makes that an `ALTER TYPE` somebody has to write rather
 * than a string a caller can invent.
 */
export const formerType = pgEnum("former_type", ["story"]);

/**
 * What is left where a Story used to be — `CONTEXT.md` → *Tombstone*, and
 * [ADR-0014](../../../../docs/adr/0014-shell-providers-and-per-source-retention.md) →
 * *Decision 8*. The identity, what kind of thing it was, and when it went, and nothing else.
 *
 * **Its own table, and the Story's row is deleted rather than flagged** — settled 17 August 2026 by
 * CAN-118 Purge every Snapshot of a Source whose licence terminates, and tombstone what it touched,
 * against columns on `story`. Decision 8's amendment holds the argument; what it comes to here is
 * that this table has no title column to grow, which is the accidental reversal that decision names.
 *
 * **Nothing in the application writes one.** The purge does, as `canoncore_migrator` —
 * `purge-source.ts` — because the application role holds `SELECT` and nothing else. What reads one
 * is CAN-111 Decide and build what a dropped Story renders as, which owns the 410.
 */
export const tombstone = pgTable(
  "tombstone",
  {
    /**
     * The former Story's id, which is the whole of what "the identity survives" means: a URL that
     * used to answer 200 can answer 410 at the same address.
     *
     * **No `defaultRandom()`, unlike every other primary key here.** A tombstone with an id of its
     * own would be a new record about a deletion rather than what the deleted thing became, and
     * the address the reader has would resolve to nothing.
     */
    id: uuid().primaryKey(),

    formerType: formerType("former_type").notNull(),

    /**
     * When the object was deleted, which is ActivityStreams' `deleted` — "a timestamp for when the
     * object was deleted" — carried under that name rather than a clearer one because ADR-0014
     * adopts the vocabulary verbatim. It is a timestamp and never a flag: a boolean here would be
     * the soft delete `CONTEXT.md` → *Tombstone* tells you not to reach for, and Decision 8
     * rejects keeping the row and hiding it.
     *
     * **`defaultNow()`, where `snapshot.fetched_at` deliberately has no default.** The two look
     * alike and are opposites: `fetched_at` is when something *else* happened, so a default would
     * quietly record the wrong moment, while this is when *this row was written* — the purge's own
     * transaction is the deletion, and `now()` inside it is the truest value available.
     */
    deleted: timestamp({ withTimezone: true }).notNull().defaultNow(),

    /**
     * The two columns the policy below needs, copied from the Story as it went.
     *
     * **Neither is a value any Source supplied**, which is what keeps this table inside Decision
     * 8's "never the Source's values": who owned a record and whether it was public are this
     * product's own facts about it. A tombstone of a private Story stays private, so a reader
     * learns "this existed and is gone" exactly where they could have learnt "this exists".
     *
     * `owner_id` is personal data all the same, so erasure has to reach this table — **CAN-30 GDPR
     * export and erasure**, which owns that job.
     *
     * **`snapshot`'s trick of delegating to `story`'s policy is unavailable here**, and the reason
     * is the shape rather than an oversight: that policy asks whether the Story is readable, and
     * this table exists precisely when the Story's row does not. So the rule is stated twice, in
     * two places that can never be in force at once.
     */
    ownerId: text("owner_id").notNull(),
    visibility: visibility().notNull(),
  },
  (t) => [
    // `story`'s constraint, for `story`'s reason: the empty string is the anonymous session user,
    // and no owner may equal it.
    check("tombstone_owner_id_not_blank", sql`length(${t.ownerId}) > 0`),

    pgPolicy("tombstone_readable_by_owner_or_when_public", {
      as: "permissive",
      for: "select",
      to: applicationRole,
      using: sql`${t.visibility} = 'public' or ${t.ownerId} = ${currentSessionUser}`,
    }),
  ],
);

/**
 * ## better-auth's own tables
 *
 * **Written by hand rather than by `npx auth generate`, and that is a decision.** The generator
 * emits property names as column names, no policies and no role, so every table it produced would
 * arrive with row-level security off — which is the exact state migration 0005 and
 * `docs/infrastructure.md` → *Roles* exist to prevent. What is copied faithfully is the *shape*:
 * `getAuthTables` in `@better-auth/core` is the source, and the adapter resolves a field by looking
 * up `schema[model][fieldName]`, so **the property names below are better-auth's and cannot be
 * renamed**. The column names are ours, snake_case like every other table here.
 *
 * **Three shared rules, stated once rather than on each table.**
 *
 * 1. **Every one of them carries a policy naming `authRole` and nothing wider.** A policy is what
 *    turns row-level security *on*, so this is also what stops the table being readable in full by
 *    whoever is granted it next — the failure `docs/infrastructure.md` → *Roles* records against
 *    `source`. The `using` is `true` for the reason `authRole` exists; the narrowing is which five
 *    tables it names, and it names no other.
 * 2. **`canoncore_app` reaches `user` and `session`, under a policy keyed on the session user, and
 *    reaches `account`, `verification` and `rate_limit` not at all.** A password hash and a
 *    one-time token have no application reader, and no grant is a louder refusal than an empty
 *    result. `rls.test.ts` asserts both halves.
 * 3. **`timestamp` with a time zone, where better-auth's own generator emits one without.** The
 *    adapter hands drizzle a JS `Date` and reads one back, and a `timestamp` without a zone is read
 *    as the *server's* local time — so a session's `expires_at` would be wrong by the offset
 *    wherever that is not UTC. Every other timestamp in this file is `timestamptz` for the same
 *    reason.
 */

/**
 * A person with an account — better-auth's `user` model.
 *
 * **`text` primary keys, not `uuid`, throughout these five.** better-auth generates its own ids and
 * hands them over as strings, so a `uuid` column would refuse them; `story.owner_id` is `text` for
 * the same reason and now holds one of these.
 */
export const user = pgTable(
  "user",
  {
    id: text().primaryKey(),
    name: text().notNull(),
    email: text().notNull().unique(),
    /**
     * Always false in this release, and the column lands anyway.
     *
     * **CAN-31 Email verification and password reset** owns making it mean something; it needs a
     * mail provider, which is why CAN-24 A signed-in and a signed-out path leaves it out. What
     * would be expensive later is adding a `notNull` column to a populated table, so it arrives
     * with its default now.
     */
    emailVerified: boolean("email_verified").notNull().default(false),
    /** better-auth's own field. Nothing here writes or renders one — no artwork does (ADR-0012). */
    image: text(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    pgPolicy("user_is_writable_by_the_auth_role", {
      as: "permissive",
      for: "all",
      to: authRole,
      using: sql`true`,
      withCheck: sql`true`,
    }),

    // The cross-tenant control ADR-0005 rule 2 requires, on the table that holds an email address.
    // A reader sees their own row and no other, and an unset session user reads nothing at all,
    // because `current_setting(..., true)` is NULL and `id = NULL` is NULL rather than true.
    pgPolicy("user_readable_by_itself", {
      as: "permissive",
      for: "select",
      to: applicationRole,
      using: sql`${t.id} = ${currentSessionUser}`,
    }),
  ],
);

/**
 * A signed-in session — better-auth's `session` model, and the row that answers *who is asking*.
 *
 * **This table is the seam between better-auth and row-level security.** `auth.api.getSession`
 * reads it as `canoncore_auth`, and the id it returns is what `withSession` puts in
 * `canoncore.user_id` — so the identity better-auth establishes and the identity the policies read
 * are the same value, moved by one function call and never re-derived.
 */
export const session = pgTable(
  "session",
  {
    id: text().primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    /**
     * The bearer of the whole session, held in the cookie. `unique` because better-auth looks a
     * session up by it, and a duplicate would make that lookup ambiguous.
     */
    token: text().notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    // Deleting a person takes their sessions with them, which is what makes an erasure request one
    // transaction rather than a sweep — the point ADR-0005 keeps users in our own Postgres for.
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [
    // better-auth reads a user's sessions by `user_id`, and the erasure cascade above walks it.
    index("session_user_id_idx").on(t.userId),

    pgPolicy("session_is_writable_by_the_auth_role", {
      as: "permissive",
      for: "all",
      to: authRole,
      using: sql`true`,
      withCheck: sql`true`,
    }),

    // Keyed on the *owner* rather than on the token, so that what the application role can see is
    // "my own sessions" and never "the session bearing this token" — a policy that took the token
    // would be a policy anyone holding a token could satisfy.
    pgPolicy("session_readable_by_its_owner", {
      as: "permissive",
      for: "select",
      to: applicationRole,
      using: sql`${t.userId} = ${currentSessionUser}`,
    }),
  ],
);

/**
 * How one person proves who they are — better-auth's `account` model. One row per credential.
 *
 * **`password` holds a scrypt hash, and `canoncore_app` is granted nothing on this table.** That is
 * the sharpest case of rule 2 in the block above: there is no application reader for a password
 * hash, now or later, so the answer is no privilege rather than a policy that happens to return
 * nothing. A grant added here would be a decision somebody has to write a policy for.
 *
 * The OAuth token columns are better-auth's and stay empty: no social provider is configured, and
 * the field exists on the model whether or not one is.
 */
export const account = pgTable(
  "account",
  {
    id: text().primaryKey(),
    accountId: text("account_id").notNull(),
    /** `credential` for an email and password. A social provider's id, if one is ever added. */
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text(),
    password: text(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("account_user_id_idx").on(t.userId),

    pgPolicy("account_is_writable_by_the_auth_role", {
      as: "permissive",
      for: "all",
      to: authRole,
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ],
);

/**
 * A one-time token and what it is about — better-auth's `verification` model.
 *
 * **Nothing writes one in this release, and the table lands with the others.** It is where email
 * verification and password reset keep their tokens, which is **CAN-31 Email verification and
 * password reset**; better-auth's schema carries it whether or not those are switched on, and a
 * table arriving later is a migration either way. What it must not do is arrive later *without a
 * policy*, which is the failure mode this block exists to close.
 */
export const verification = pgTable(
  "verification",
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("verification_identifier_idx").on(t.identifier),

    pgPolicy("verification_is_writable_by_the_auth_role", {
      as: "permissive",
      for: "all",
      to: authRole,
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ],
);

/**
 * How many requests one caller has made to one auth endpoint — better-auth's `rateLimit` model.
 *
 * **This table is the whole of why better-auth's rate limiting works here at all.** The default
 * storage is *memory*, and Vercel Functions are per-invocation isolates, so a memory-backed counter
 * is per-process: an attacker gets a fresh window on every cold start, and the limiter reports
 * success while enforcing nothing. `docs/research/production-readiness-baseline.md` → *Security
 * posture* holds the two documents that combine to say so, and flags the mechanism as inferred
 * rather than stated. The fix is `rateLimit.storage: "database"` in
 * [`../auth/auth.ts`](../auth/auth.ts), and this is the table it needs.
 *
 * **Not user-scoped, and it has a policy anyway.** The key is a path and a caller, not a person, so
 * there is nothing to key a tenant policy on — the same shape as `source`. It differs from `source`
 * in that `canoncore_app` is granted nothing on it, so the policy naming `authRole` is the only way
 * in, and a future grant to anyone else reads no rows rather than all of them.
 */
export const rateLimit = pgTable(
  "rate_limit",
  {
    id: text().primaryKey(),
    /** better-auth's own composite of the caller and the endpoint. Looked up on every request. */
    key: text().notNull().unique(),
    count: integer().notNull(),
    /**
     * Epoch milliseconds, as better-auth's `bigint` field. `mode: "number"` because the value it
     * writes is `Date.now()` — a JS number — and drizzle's default `bigint` mode would hand back a
     * `string`, which better-auth's own arithmetic would then do the wrong thing with.
     */
    lastRequest: bigint("last_request", { mode: "number" }).notNull(),
  },
  () => [
    pgPolicy("rate_limit_is_writable_by_the_auth_role", {
      as: "permissive",
      for: "all",
      to: authRole,
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ],
);
