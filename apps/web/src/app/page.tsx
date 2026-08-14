import { anonymous } from "@/db/session";
import { readVisibleStories } from "@/db/stories";
import { FrontPage } from "./front-page";

/**
 * Rendered per request, never at build time. Row-level security decides what this page contains
 * from the session user set inside the transaction, so a build-time render would be a render for
 * nobody — and it would need a database, which a preview build has no host for yet.
 */
export const dynamic = "force-dynamic";

export default async function Home() {
  return <FrontPage stories={await readVisibleStories(anonymous)} />;
}
