import { sql } from "drizzle-orm";
import type { PgTableExtraConfigValue } from "drizzle-orm/pg-core";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  interval,
  jsonb,
  pgEnum,
  pgPolicy,
  pgRole,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import type { Attribution, ClassificationTerm } from "../providers/declaration.ts";

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
 * neither of which a policy keyed on `canoncore.user_id` can permit. The decision is
 * [ADR-0021](../../../../docs/adr/0021-a-third-database-role-for-better-auth.md), which holds the
 * argument and the three designs it rules out; [`../auth/auth.ts`](../auth/auth.ts) is the code.
 *
 * **It is not a widening of ADR-0005 rule 1.** That rule is about the role *the application*
 * connects as, and `canoncore_app` is untouched by *this*: it reads every row through a policy,
 * has no `BYPASSRLS`, and holds `SELECT` and nothing else on every table but `anchor` — where it
 * may mint one and do nothing else, which is CAN-25's own decision and reaches none of the tables
 * below. This role has no `BYPASSRLS`
 * either — what it has is a policy naming it, on five tables and no others, so its reach is written
 * down in this file rather than being a property of the server.
 *
 * `.existing()` for `applicationRole`'s reason: Neon provisions it.
 */
export const authRole = pgRole("canoncore_auth").existing();

/** Whether a record can be seen by people other than its owner. Set per record. */
export const visibility = pgEnum("visibility", ["private", "public"]);

/**
 * A shared identity carrying no metadata at all — `CONTEXT.md` → *Anchor*, and
 * [ADR-0003](../../../../docs/adr/0003-no-shared-catalogue.md).
 *
 * **One column, and the emptiness is the design rather than a stage it is at.** Separate people's
 * Stories attach to the same Anchor when they are about the same thing, and a Placement points at
 * an Anchor rather than at anyone's row — so what two people share is an identity and nothing else.
 * Because an Anchor holds nothing, there is nothing on it to edit, and therefore nothing to
 * moderate: no queue, no votes, no trust levels, which is what ADR-0003 buys by refusing a shared
 * catalogue outright. **A column arriving here is that decision being reversed**, so `rls.test.ts`
 * pins this table's column list exactly as it pins `source`'s.
 *
 * **Deliberately not tenant-scoped, and the emptiness is the reason.** There is nothing on an
 * Anchor to leak, so there is no cross-tenant read for a policy to fail and none is written: the
 * two below say *anyone may read one* and *any signed-in reader may mint one*. `rls.test.ts`
 * records that exclusion with its reason, beside the cross-tenant tests it is the exception to.
 *
 * **Never updatable and never deletable, by there being no privilege rather than by a policy.**
 * Migration 0011 grants `SELECT` and `INSERT` and stops, so an update or a delete is
 * `permission denied for table anchor` — a loud refusal, where a restrictive policy would give back
 * the silence ADR-0005 rule 2 is about. A mutable Anchor is the shared record everybody can edit
 * that this whole shape exists to avoid.
 */
export const anchor = pgTable(
  "anchor",
  {
    id: uuid().primaryKey().defaultRandom(),
  },
  () => [
    // Every reader sees every Anchor, signed in or not, which is what a shared identity has to
    // mean: an Ordering of mine naming an Anchor resolves against whichever records *you* hold.
    pgPolicy("anchor_readable_by_anyone", {
      as: "permissive",
      for: "select",
      to: applicationRole,
      using: sql`true`,
    }),

    // Minting one, and the only write the application role may make anywhere in this schema.
    //
    // **The check is that the session user is somebody**, which is the one distinction this table
    // draws: `session.ts` sets the empty string for a request from nobody, and a transaction that
    // set nothing at all leaves `current_setting(..., true)` NULL. Neither passes — the empty
    // string because it is not `<> ''`, and NULL because a comparison with it is NULL, which a
    // `WITH CHECK` refuses exactly as it refuses false
    // (https://www.postgresql.org/docs/17/sql-createpolicy.html). So an anonymous reader mints
    // nothing and any signed-in one may; `rls.test.ts` exercises both branches.
    pgPolicy("anchor_mintable_by_any_signed_in_reader", {
      as: "permissive",
      for: "insert",
      to: applicationRole,
      withCheck: sql`${currentSessionUser} <> ''`,
    }),
  ],
);

/**
 * The thing that happened, independent of how anyone consumes it — `CONTEXT.md` → *Story*.
 *
 * Four columns are what the row-level security policy needs to be a real one — an id, a title, an
 * owner and a Visibility — and two more are the catalogue shape: the Anchor every Story carries,
 * and the optional pointer to the Version whose details best represent it. Everything else a Story
 * will carry is additive.
 *
 * **There is no episode number here, and adding one would reverse a decision**
 * ([ADR-0002](../../../../docs/adr/0002-orderings-are-separate-from-containment.md)). A position
 * belongs to a Placement in one Ordering, because the same Story sits in two orderings that
 * disagree — a column here could hold only one of the answers and would make the other a lie.
 */
export const story = pgTable(
  "story",
  {
    id: uuid().primaryKey().defaultRandom(),
    title: text().notNull(),
    ownerId: text("owner_id").notNull(),
    visibility: visibility().notNull().default("private"),

    /**
     * The Anchor this Story is a record of, minted when the Story is created and never absent —
     * `CONTEXT.md` → *Anchor*.
     *
     * **`notNull` is what makes "every Story carries an Anchor" a fact rather than an intention.**
     * A Story with no Anchor is invisible to every Ordering and to every other person's records,
     * because an Anchor is the only thing two people's rows are ever joined on
     * ([ADR-0003](../../../../docs/adr/0003-no-shared-catalogue.md)) — and a nullable column is one
     * whose null case somebody has to keep answering for ever after.
     *
     * No `on delete` clause, so it is PostgreSQL's default of `no action`: nothing deletes an
     * Anchor, and an attempt to delete one a Story still points at is refused rather than
     * cascading into a person's catalogue.
     */
    anchorId: uuid("anchor_id")
      .notNull()
      .references(() => anchor.id),

    /**
     * The Version whose details best represent this Story, or nothing — `CONTEXT.md` →
     * *Canonical version*, and [ADR-0001](../../../../docs/adr/0001-two-levels-story-and-version.md).
     *
     * **Nullable on purpose, and the null is the useful state.** It lets a Story state a runtime
     * and a year without adjudicating which of fifteen releases is the real one; LRM's
     * representative-expression attribute exists for the same job and permits leaving the source
     * unidentified. What it is not is a default, a primary or a preferred Version — those are the
     * words `CONTEXT.md` tells you not to reach for, because each implies the others are lesser.
     *
     * The foreign key is composite rather than on this column alone. `story_canonical_version` at
     * the foot of this table says why.
     */
    canonicalVersionId: uuid("canonical_version_id"),
  },
  (t): PgTableExtraConfigValue[] => [
    // What makes the empty string usable as a session user matching nobody, which is what
    // `session.ts` uses it for. No owner can equal it, so an anonymous reader matches the
    // policy's public branch and nothing else.
    check("story_owner_id_not_blank", sql`length(${t.ownerId}) > 0`),

    /**
     * **The canonical Version has to be a Version of *this* Story**, which a foreign key on
     * `canonical_version_id` alone cannot say: it would accept any Version in the table, including
     * somebody else's, and the page would render that Version's runtime under this Story's title.
     * So the key is the pair, against the matching `unique` on `version`.
     *
     * `story.id` is in the key and is never null, and `canonical_version_id` may be — which is
     * exactly what PostgreSQL's default matching does with it: *"a referencing row need not satisfy
     * the foreign key constraint if any of its referencing columns are null"*
     * ([foreign keys](https://www.postgresql.org/docs/17/ddl-constraints.html)). So a Story naming
     * no canonical Version is not asked to match anything, and `MATCH FULL` — which would demand
     * that *all* of them be null — is deliberately not what this wants.
     *
     * **`no action` rather than `set null`, and the difference matters twice.** PostgreSQL's
     * column-list form is what would be wanted — `ON DELETE SET NULL ( column_name [, ... ] )`
     * ([CREATE TABLE](https://www.postgresql.org/docs/17/sql-createtable.html)) — and drizzle
     * cannot express it: `onDelete` takes one of five `UpdateDeleteAction` strings and no columns
     * at all (`drizzle-orm/pg-core/foreign-keys.d.ts`, checked at 0.45.2). Plain `set null` would
     * try to null `story.id` as well and fail, since it is the primary key. So deleting a Version some Story
     * has named is refused until that Story lets go of it. Deleting the *Story* is unaffected: its
     * Versions go by the cascade on `version.story_id`, and `no action` is checked at the end of
     * the statement, by which point the row that referenced them is gone too.
     *
     * **This key is also why this callback and `version`'s carry an explicit return type.** The two
     * tables now name each other — a Version names its Story, a Story names its canonical Version —
     * and TypeScript follows that circle and infers `any` for both unless something breaks it.
     * Drizzle documents the column-level form of the same fix, an `AnyPgColumn` return type on a
     * `references` callback that points back
     * ([indexes and constraints](https://orm.drizzle.team/docs/indexes-constraints)); the circle
     * here runs through a foreign key and a policy rather than through one column, so the
     * annotation goes on the callback that holds them.
     */
    foreignKey({
      name: "story_canonical_version",
      columns: [t.canonicalVersionId, t.id],
      foreignColumns: [version.id, version.storyId],
    }),

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
 * The form a Version takes — `CONTEXT.md` → *Medium*.
 *
 * It belongs to the Version rather than to the Story because a change of form alone is what makes
 * a new Version ([ADR-0001](../../../../docs/adr/0001-two-levels-story-and-version.md)): the
 * television Rose and the audiobook of its novelisation are not the same thing to watch.
 *
 * The seven the glossary names, as an enum for `former_type`'s reason — a value nobody has agreed
 * on becomes an `ALTER TYPE` somebody has to write, rather than a string a caller can invent.
 * **What an open list looks like is *Nature***, which is several things at once and is not this
 * column: a magazine strip is Medium `comic` and Nature `magazine strip`, and stuffing the second
 * in here is how the closed set stops being one.
 */
export const medium = pgEnum("medium", [
  "television",
  "prose",
  "audio",
  "comic",
  "webcast",
  "game",
  "stage",
]);

/**
 * One specific way a Story can be watched, read or listened to — `CONTEXT.md` → *Version*, and
 * [ADR-0001](../../../../docs/adr/0001-two-levels-story-and-version.md).
 *
 * **Runtime lives here and never on the Story, which is the whole of what two levels buys.**
 * Versions of one Story are not interchangeable — they differ in length and content, and some cover
 * only part of it — so a runtime on the Story would be a claim about whichever Version somebody
 * happened to import first. A Story that wants to state one names a canonical Version instead.
 *
 * **Version reason and Nature are not here yet**, and both are additive: each is multi-valued, so
 * each is a table rather than a column, and neither is read by anything this release renders.
 */
export const version = pgTable(
  "version",
  {
    id: uuid().primaryKey().defaultRandom(),

    // Deleting a Story takes its Versions with it: a Version is one way of consuming that Story and
    // means nothing without it, which is the opposite of the Anchor above.
    storyId: uuid("story_id")
      .notNull()
      .references(() => story.id, { onDelete: "cascade" }),

    medium: medium().notNull(),

    /**
     * How long this Version runs, and absent for one that has no length in time — a comic and a
     * prose Version have pages rather than minutes.
     *
     * `interval` for `source.retention`'s reason: a duration is what PostgreSQL's duration type is
     * for, and it holds a three-hour film and a ninety-second webcast without either being a
     * rounding of the other. **It is read back as a count of seconds rather than as itself**,
     * because an interval renders as `03:08:00` at one length and `1 day 03:08:00` at another, and
     * a display that parses both is a display that parses. [`stories.ts`](stories.ts) is where that
     * happens, and says what the cast in it is for.
     */
    runtime: interval(),
  },
  (t): PgTableExtraConfigValue[] => [
    // What `story_canonical_version` references, and the whole of why it exists: a composite
    // foreign key needs a unique constraint over the same pair, and `id` being a primary key on its
    // own is not one. It adds no meaning and forbids nothing that was not already forbidden.
    unique("version_id_with_its_story").on(t.id, t.storyId),

    // A runtime of no time at all is not a length any Version has. **A `null` runtime still
    // passes**, which is the intended reading rather than a hole: a check constraint "is satisfied
    // if the check expression evaluates to true or the null value"
    // (https://www.postgresql.org/docs/17/ddl-constraints.html), and a Version with no runtime is
    // the ordinary case for half the media in the enum above.
    check("version_runtime_is_positive", sql`${t.runtime} > interval '0'`),

    // Read on every Story page, and walked by the cascade above when a Story is deleted. A foreign
    // key constrains the referencing column and indexes nothing — *"the declaration of a foreign key
    // constraint does not automatically create an index on the referencing columns"*, though *"it is
    // often a good idea to index the referencing columns too"* because a delete of a referenced row
    // *"will require a scan of the referencing table"*
    // (https://www.postgresql.org/docs/17/ddl-constraints.html). `part_of` carries one on `whole_id`
    // for the same reason, and needs none on `part_id` because the primary key leads with it.
    index("version_story_id_idx").on(t.storyId),

    // `snapshot`'s shape for `snapshot`'s reason: this policy names no owner. It asks whether the
    // Story is readable and lets `story`'s own policy answer, so the two can never disagree, and a
    // Story made public whose Versions stayed private renders as a Story nobody can watch.
    pgPolicy("version_readable_when_its_story_is", {
      as: "permissive",
      for: "select",
      to: applicationRole,
      using: sql`exists (select 1 from ${story} where ${story.id} = ${t.storyId})`,
    }),
  ],
);

/**
 * Unordered containment between Stories — `CONTEXT.md` → *Part of*, and
 * [ADR-0002](../../../../docs/adr/0002-orderings-are-separate-from-containment.md).
 *
 * **Two columns and no third, which is the decision this table holds.** An edge carries no
 * position, because inventing one for a set that has none would be a lie: Rose is part of Series 1
 * and Series 1 is part of Doctor Who, while *which episode comes first* is a Placement in an
 * Ordering and lives nowhere near here. Three standards separate the two mechanisms independently,
 * and ADR-0002 names them.
 *
 * **Recursive and many to many**: a Story may be part of several at once, and a Story that is part
 * of one may contain others. The primary key is the pair, so the same edge cannot be recorded
 * twice, and there is no id of its own — an edge is identified by what it joins.
 *
 * **A cycle is not prevented, and the bound is worth stating.** What is refused is the one-step
 * case below; a longer loop would need a recursive check on every write, and nothing here reads
 * containment transitively yet. The first thing that does — a completeness roll-up over
 * containment — is what has to decide whether to forbid one or to tolerate it.
 */
export const partOf = pgTable(
  "part_of",
  {
    /** The contained Story. Rose, in *Rose is part of Series 1*. */
    partId: uuid("part_id")
      .notNull()
      .references(() => story.id, { onDelete: "cascade" }),

    /** The containing Story. Series 1, in the same sentence. */
    wholeId: uuid("whole_id")
      .notNull()
      .references(() => story.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.partId, t.wholeId] }),

    // Nothing is part of itself. It is the one cycle a single row can express, and the only one
    // this table can refuse without reading the rest of it.
    check("part_of_is_not_its_own_whole", sql`${t.partId} <> ${t.wholeId}`),

    // The primary key above already indexes `part_id`, which is the leading column and the one a
    // Story page reads. `whole_id` gets its own for the cascade's sake — a Story being deleted
    // scans this table for edges naming it.
    index("part_of_whole_id_idx").on(t.wholeId),

    // Both ends, because an edge is a fact about two Stories: one naming a Story the reader cannot
    // see would tell them it exists. `version`'s policy delegates for the same reason this one
    // does — `story`'s policy is the single place the rule is written.
    pgPolicy("part_of_readable_when_both_its_stories_are", {
      as: "permissive",
      for: "select",
      to: applicationRole,
      using: sql`exists (select 1 from ${story} where ${story.id} = ${t.partId})
        and exists (select 1 from ${story} where ${story.id} = ${t.wholeId})`,
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
 * **No migration seeds a row**: under decision 1 the application does not know which Sources exist
 * or what any of them permits, so every value below arrives from a Provider's capability
 * declaration. A migration stating a real Source's retention would be the source-specific knowledge
 * that decision removes from `apps/web`.
 *
 * **The row *is* the declaration, and it is what one Provider declares about one Source** — read by
 * [`read-declaration.ts`](../providers/read-declaration.ts), refused or accepted by
 * [`declaration.ts`](../providers/declaration.ts), and written by
 * [`record-declaration.ts`](record-declaration.ts) as `canoncore_migrator`, because the application
 * role writes nothing anywhere but the Anchor mint. What each absence means is
 * [`refusals.ts`](../providers/refusals.ts): a nullable column here is a Provider that does not do
 * that thing, and the application withholds rather than assuming a default.
 *
 * **What is *not* here is a history of declarations**, and that is a decision rather than an
 * omission. Nothing may be done under a superseded declaration — the one in force binds, and no
 * judgement derived from any declaration is ever stored — so the only thing a consumer needs about
 * the old one is that a Snapshot predates it, which `snapshot.source_declared_at` below carries.
 */
export const source = pgTable(
  "source",
  {
    id: uuid().primaryKey().defaultRandom(),

    /**
     * The Provider this declaration was read from, as an origin and an optional path with no
     * trailing slash — the address the contract says a consumer appends `/v1/...` to.
     *
     * **It is half of the Source's identity here, and that is load-bearing.** A declared identifier
     * is *scoped to the Provider that declared it*: anyone may stand up a service claiming to serve
     * any Source, so the identifier says what a Provider calls its Source and never that two
     * Providers are serving the same one.
     */
    providerBaseUrl: text("provider_base_url").notNull(),

    /**
     * What that Provider calls its Source, from `source.id` in the declaration.
     *
     * Named `declared_id` rather than `source_id`, which on this table would read as a reference to
     * itself, and rather than `id`, which is this row's own key. Nothing joins on it: it is what a
     * second read of the same Provider is matched against, and what a person is shown.
     */
    declaredId: text("declared_id").notNull(),

    /** The Source's name as a person should see it, and the Source's own address. */
    name: text().notNull(),
    url: text().notNull(),

    /**
     * When this declaration last changed, on the **Provider's** clock.
     *
     * It is what orders two reads. Comparing payloads detects that something changed and cannot say
     * which is later, and a consumer holding two declarations with no order between them has to
     * guess ([ADR-0022](../../../../docs/adr/0022-the-provider-contract.md) → *Decision 2*).
     * `snapshot.source_declared_at` below is the same value copied against what was stored under it.
     */
    declaredAt: timestamp("declared_at", { withTimezone: true }).notNull(),

    /**
     * When the application read it, on **this** clock, so a declaration nothing has re-read in a
     * long time is visible as one.
     *
     * **`defaultNow()`, where `snapshot.fetched_at` deliberately has none**, and the two are
     * opposites for `tombstone.deleted`'s reason: this is when *this row* was written, and the
     * transaction's own `now()` is the truest value there is for that.
     */
    readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),

    /**
     * How long a Snapshot of this Source may be kept, as a duration or as an explicit
     * `'infinity'` — never as a null, because "nobody has said yet" and "this Source imposes no
     * limit" would then be the same row, and the safe reading of the first is the opposite of the
     * second. A declaration that says nothing about retention is refused whole, so no row exists
     * for it at all.
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

    /**
     * The terms the Source's content is under. The identity carries the *version*, because two
     * versions of one licence differ materially and a consumer cannot work out which it is looking
     * at from the name alone.
     *
     * `shareAlike` is declared by the Provider rather than derived here: deriving it would mean
     * shipping a licence table into the application, which is source knowledge by another name.
     */
    licenceSpdx: text("licence_spdx").notNull(),
    licenceName: text("licence_name").notNull(),
    licenceUrl: text("licence_url").notNull(),
    licenceShareAlike: boolean("licence_share_alike").notNull(),

    /**
     * What must be displayed wherever this Source's values are, **including nothing at all**.
     *
     * **`jsonb` rather than a table of notices, and the reason is what the application does with
     * it**: it renders the texts and their conditions verbatim and never queries into them, so a
     * second table would buy joins nothing asks for. The shape is
     * [`Attribution`](../providers/declaration.ts), which the parse guarantees before this is
     * written and which reads it back on the way out.
     */
    attribution: jsonb().$type<Attribution>().notNull(),

    /**
     * What the Source's terms forbid, verbatim. An open vocabulary reserving `non-commercial` and
     * `no-ai-training`, surfaced as written rather than mapped onto anything of this project's own.
     *
     * **Empty is the answer for "nothing", and never null.** The member is required in the contract
     * for the reason `retention` is: silence read as permission is the one thing absence must never
     * mean.
     */
    restrictions: text().array().notNull(),

    /**
     * This Provider's classification vocabulary, each term declaring what it obliges — and **null
     * where it does not classify at all**, which refuses its Artwork.
     *
     * The null is the whole point of the column: a rule that runs on a flag cannot run on a Provider
     * that has no flag, and an image displayed because the flag was absent rather than because it
     * said no is the silent failure the declaration exists to prevent
     * ([ADR-0012](../../../../docs/adr/0012-adult-works-catalogued-artwork-never-displayed.md),
     * reached through the contract rather than through any Source's own field name).
     */
    classification: jsonb().$type<readonly ClassificationTerm[]>(),

    /**
     * Whether an Ordering from this Provider is the Source's own sequence — and **null where it
     * serves no Ordering at all**, which refuses importing one as canonical.
     *
     * Three states in one nullable boolean, and each is a different answer: null is *no Orderings*,
     * false is *one community's reading*, true is *the Source's own sequence*.
     */
    orderingsCanonical: boolean("orderings_canonical"),

    /**
     * Whether this Provider can tell a record that is genuinely gone from one it merely failed to
     * fetch, and what evidence it claims — **null where it declares no liveness at all**.
     *
     * Null and false lead to the same refusal and are still two values, because they are two
     * different claims: one Provider has said it cannot, and the other has said nothing.
     */
    livenessConfirmsDeletion: boolean("liveness_confirms_deletion"),
    livenessEvidence: text("liveness_evidence"),

    /**
     * When this Provider last **answered** with something that is not a capability declaration, and
     * what was wrong with it. Null on a Source whose declaration reads.
     *
     * **The pair is what makes "fails the Source closed, and says so" durable.** Without it a read
     * that failed is known only to whoever watched it run: `read_at` deliberately does not move on a
     * failure, so a Source whose Provider has been answering rubbish for months would render exactly
     * like a healthy one. With it, the fact is a column, a sentence on `/sources`, and a refusal.
     *
     * **Set only where the Provider answered.** An unreachable host, a timeout and a `503` are
     * *not* a Provider stating anything — the contract says a `503` "is never evidence that anything
     * was deleted", and an outage, a revoked credential and a network partition are indistinguishable
     * from each other. A `200` carrying something that is not a declaration is distinguishable: the
     * Provider replied, and what it replied is not terms this contract describes.
     *
     * **What it withdraws is what the declaration *permits*, never what it obliges**
     * (`../providers/refusals.ts`). Retention, attribution and the restrictions go on binding,
     * because a broken Provider is not a Source whose terms have relaxed; Artwork, a canonical
     * Ordering and acting on `gone` are withheld, because those rest on a declaration this Provider
     * has stopped standing behind.
     */
    unreadableSince: timestamp("unreadable_since", { withTimezone: true }),
    unreadableBecause: text("unreadable_because"),
  },
  (t) => [
    // ADR-0022's scoping rule, as a constraint rather than as a convention: one row per Source *per
    // Provider*. Two Providers declaring the same identifier are two rows, and a second read of one
    // Provider matches its own row.
    unique("source_one_row_per_provider_and_declared_id").on(t.providerBaseUrl, t.declaredId),

    // Zero or less is not a duration any terms express, and a row carrying one would expire every
    // Snapshot of that Source the instant it was written.
    check("source_retention_is_positive", sql`${t.retention} > interval '0'`),

    // The contract's own normalisation, held here rather than trusted to the caller: a Provider
    // stored twice under two spellings of one address would be two Sources, and the unique above
    // would not notice. `normaliseProviderUrl` in `../providers/read-declaration.ts` is what strips
    // it; this is what makes the strip a fact about the table.
    check("source_provider_base_url_has_no_trailing_slash", sql`${t.providerBaseUrl} not like '%/'`),

    // A vocabulary with no term in it is neither "does not classify" nor a vocabulary, so it is a
    // third state nothing could act on. The parse refuses one; this is what stops a row acquiring
    // one by any other route.
    check(
      "source_classification_vocabulary_is_not_empty",
      sql`${t.classification} is null or jsonb_array_length(${t.classification}) > 0`,
    ),

    // Evidence for a claim nobody made. The block is declared or it is not, and half of it is
    // neither answer.
    check(
      "source_liveness_evidence_belongs_to_a_liveness_declaration",
      sql`${t.livenessEvidence} is null or ${t.livenessConfirmsDeletion} is not null`,
    ),

    // Both halves or neither: a moment with no reason cannot be shown to anybody, and a reason with
    // no moment cannot be told from one recorded years ago.
    check(
      "source_unreadable_is_a_moment_and_a_reason",
      sql`(${t.unreadableSince} is null) = (${t.unreadableBecause} is null)`,
    ),
  ],
);

/**
 * What one Source last said about one Story, and when it was read — `CONTEXT.md` → *Snapshot*.
 *
 * **It carries no values yet, and that is the whole of it for now.** What a Snapshot holds is
 * additive and belongs to the tickets that import anything; what cannot be added later without a
 * data migration is `fetched_at`, which is why it lands with the table
 * ([ADR-0014](../../../../docs/adr/0014-shell-providers-and-per-source-retention.md) →
 * *Decision 6*). `source_declared_at` joined it for the same reason: it is what the row was stored
 * under, so a row written before the column existed could never be given a truthful one.
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

    /**
     * The `declared_at` of the Source's capability declaration that was in force when this Snapshot
     * was stored.
     *
     * **This is what stops a declaration changing between reads being silent.** Nothing derived from
     * a declaration is ever written down — every refusal is computed from the declaration in force
     * at the moment it is asked (`../providers/refusals.ts`) — so the one thing a consumer still
     * needs about the superseded declaration is that these values predate it. With this column that
     * is a comparison; without it, a Provider narrowing what it declares would quietly re-govern
     * values read under something else.
     *
     * **Copied rather than referenced**, because it is a fact about this row at the moment it was
     * written, and a foreign key into `source` would move with the next declaration and take the
     * fact with it. `readSnapshot` in `../providers/refusals.ts` is the comparison, and withholding
     * until a refresh is what it decides.
     */
    sourceDeclaredAt: timestamp("source_declared_at", { withTimezone: true }).notNull(),
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
 * `purge-source.ts` — because the application role cannot write one: its only write anywhere is the
 * Anchor mint above. What reads one is CAN-111 Decide and build what a dropped Story renders as,
 * which owns the 410.
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
 * 2. **`canoncore_app` reaches none of them at all.** Nothing in the application reads a `user` or a
 *    `session` row — pages read Stories, and `auth/viewer.ts` resolves the cookie through the auth
 *    role — so there is no grant, and therefore no policy naming `applicationRole` on any of these
 *    five. **An earlier version of this granted `SELECT` on `user` and `session`** with a policy
 *    keyed on the session user, and a review found the reason: it existed only so a cross-tenant
 *    read test had something to exercise, which is a production privilege bought to make a test
 *    possible. What replaced it is stronger and cheaper — the application is refused these tables
 *    outright, which is a loud error where a policy returning no rows is the silence ADR-0005 rule 2
 *    is entirely about. `rls.test.ts` asserts the refusal on all five.
 *
 *    **When a reader does arrive it brings its own grant, policy and cross-tenant test.** The first
 *    is a public Ordering's author attribution — CAN-57 Make a public Ordering discoverable and
 *    shareable — and row-level security is already *on* for these tables, so a grant added without a
 *    policy reads zero rows rather than everything.
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
  () => [
    pgPolicy("user_is_writable_by_the_auth_role", {
      as: "permissive",
      for: "all",
      to: authRole,
      using: sql`true`,
      withCheck: sql`true`,
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
