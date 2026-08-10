import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `@canoncore/config` ships source rather than a build (ADR-0005), so the consumer
  // is the thing that compiles it.
  transpilePackages: ["@canoncore/config"],
};

export default nextConfig;
