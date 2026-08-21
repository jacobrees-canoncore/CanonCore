import { readViewer, sessionUserFor } from "@/auth/viewer";
import { readDeclaredSources } from "@/db/sources";
import { SourcesPage } from "./sources-page";

/**
 * Rendered per request, for `../page.tsx`'s reason: every read here goes through a transaction that
 * says who is asking, so a build-time render would be a render for nobody.
 *
 * A Source belongs to nobody and every reader sees the same ones, so what the session user changes
 * here is nothing at all — but the transaction is still where the read happens, and a page that
 * skipped it would be reading as whoever asked last on a pooled connection.
 */
export const dynamic = "force-dynamic";

/** What every Source declares, and what each declaration refuses. */
export default async function Sources() {
  const viewer = await readViewer();
  const sources = await readDeclaredSources(sessionUserFor(viewer));

  return <SourcesPage sources={sources} />;
}
