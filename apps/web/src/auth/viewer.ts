import { anonymous } from "@/db/session";
import { headers } from "next/headers";
import { auth } from "./auth";

/**
 * Who is asking, read once per request from the session cookie.
 *
 * **This is the seam the ticket is about.** better-auth resolves the cookie to a user as
 * `canoncore_auth`, and `userId` is then handed to `withSession`, which puts it in
 * `canoncore.user_id` — the value every policy in `schema.ts` compares against. So the identity
 * better-auth establishes and the identity the database enforces are one value moved by one call,
 * never derived twice.
 */
export type Viewer = {
  readonly userId: string;
  /** Shown so that being signed in is visible rather than inferred from what the page contains. */
  readonly email: string;
};

/**
 * The signed-in person, or `undefined` for a visitor with no account.
 *
 * **One representation of "nobody", and it is the absence.** `sessionUserFor` below is the only
 * place that turns it into `anonymous`, so there is no state where a `Viewer` exists and means no
 * one.
 */
export async function readViewer(): Promise<Viewer | undefined> {
  const session = await auth().api.getSession({ headers: await headers() });
  if (!session) return undefined;
  return { userId: session.user.id, email: session.user.email };
}

/**
 * The session user a read should run as: this person's id, or the empty string that owns nothing.
 *
 * `session.ts` says why the anonymous case is a *value* rather than a second code path — the same
 * transaction, the same role, the same policy, and `story_owner_id_not_blank` is what makes the
 * empty string match no owner.
 */
export function sessionUserFor(viewer: Viewer | undefined): string {
  return viewer?.userId ?? anonymous;
}
