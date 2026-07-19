import type { NextConfig } from "next";

/**
 * N1: Next is a web shell only. Bulk/authz stay on Hono (@bulk-reassign/api).
 * No Route Handlers reimplementing domain rules here.
 */
const nextConfig: NextConfig = {
  transpilePackages: ["@bulk-reassign/contracts"],
  reactStrictMode: true,
  // Playwright hits 127.0.0.1; Next 15 warns without this.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
