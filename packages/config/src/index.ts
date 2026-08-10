/**
 * Values that every consumer of this workspace has to agree on. Shipped as source:
 * `exports` points at this file and the consumer transpiles it, so there is no `dist/`
 * to go stale (ADR-0005).
 */

/**
 * The canonical origin. `www` rather than the apex, because the session cookie has to
 * stay host-only; the apex serves a 301 to it (ADR-0010, `docs/infrastructure.md`).
 */
export const canonicalOrigin = "https://www.canoncore.com";

/** The product's name, as a reader sees it. */
export const siteName = "CanonCore";
