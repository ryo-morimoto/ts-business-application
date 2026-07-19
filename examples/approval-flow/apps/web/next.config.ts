import type { NextConfig } from "next";

/**
 * Plan B: Next owns HTTP surface. Domain rules live in packages/domain;
 * Route Handlers call them in-process (no separate API process).
 */
const nextConfig: NextConfig = {
  transpilePackages: [
    "@approval-flow/contracts",
    "@approval-flow/domain",
  ],
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
