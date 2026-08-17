import { readViewer, sessionUserFor } from "@/auth/viewer";
import { readVisibleStories } from "@/db/stories";
import { FrontPage } from "./front-page";

/**
 * Rendered per request, never at build time. Row-level security decides what this page contains
 * from the session user set inside the transaction, so a build-time render would be a render for
 * nobody — and it would need a database, which a preview build has no host for yet.
 *
 * **Since CAN-24 A signed-in and a signed-out path the session user is a real identity rather than
 * always the anonymous one**, and the two lines below are the whole of that join: better-auth
 * resolves the cookie, and the id it returns is what the policy on `story` compares against. There
 * is no `where` clause here or in `readVisibleStories` — the policy is the filter, so a signed-in
 * reader's own private Stories arrive because the database let them and for no other reason.
 */
export const dynamic = "force-dynamic";

export default async function Home() {
  const viewer = await readViewer();
  return (
    <FrontPage
      stories={await readVisibleStories(sessionUserFor(viewer))}
      signedInAs={viewer?.email}
    />
  );
}
