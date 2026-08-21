import { Working } from "./working";

/**
 * What every route shows while its own content is still being rendered.
 *
 * At the root, so it wraps every page in one Suspense boundary and no route has to remember to
 * bring its own. The shell renders immediately either way — the masthead and the footer are in the
 * layout, which is above this boundary — so what a reader waits for is the content alone.
 */
export default function Loading() {
  return <Working>Loading.</Working>;
}
