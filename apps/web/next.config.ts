// First, and above the config it guards: evaluating this module validates the environment,
// so a missing variable throws here and `next build` fails rather than the request that would
// have read it. See `src/env.ts`.
import "./src/env";

import type { NextConfig } from "next";
import { securityHeaders } from "./src/security/headers";

const nextConfig: NextConfig = {
  // `@canoncore/config` ships TypeScript source with no build step, so the
  // consumer compiles it — see ADR-0005.
  transpilePackages: ["@canoncore/config"],

  /**
   * The security headers, on everything this deployment serves — **CAN-53 Set the security
   * headers, with the CSP report-only first**. What each one is and why, including the two that
   * are deliberately absent, is `src/security/headers.ts`.
   *
   * **Here rather than in a proxy**, which is the other place Next documents for this. A proxy is
   * what a *nonce* needs, because a nonce is per-request; these headers are the same on every
   * response, and `next.config` is the recipe Next gives for exactly that case
   * (https://nextjs.org/docs/app/guides/content-security-policy → *Without Nonces*).
   *
   * `/(.*)`  rather than `/:path*`, following that recipe, and it reaches everything: `headers`
   * are "checked before the filesystem which includes pages and `/public` files"
   * (https://nextjs.org/docs/app/api-reference/config/next-config-js/headers).
   */
  headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },

  experimental: {
    // **`forbidden()` and `unauthorized()` are experimental at 16.3.0 and refuse to work without
    // this**, which is the whole of what it switches on: the two functions, and the
    // `forbidden.tsx` / `unauthorized.tsx` files that render for them. Next's own reference for
    // both says so in terms. Why it is on before anything calls either, and what would turn it off
    // again: `docs/adr/0028-the-visual-identity.md` -> *The two states nothing calls yet*.
    authInterrupts: true,
  },
};

export default nextConfig;
