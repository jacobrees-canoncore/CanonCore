// First, and above the config it guards: evaluating this module validates the environment,
// so a missing variable throws here and `next build` fails rather than the request that would
// have read it. See `src/env.ts`.
import "./src/env";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `@canoncore/config` ships TypeScript source with no build step, so the
  // consumer compiles it — see ADR-0005.
  transpilePackages: ["@canoncore/config"],
};

export default nextConfig;
