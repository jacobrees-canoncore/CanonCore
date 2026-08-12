import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `@canoncore/config` ships TypeScript source with no build step, so the
  // consumer compiles it — see ADR-0005.
  transpilePackages: ["@canoncore/config"],
};

export default nextConfig;
