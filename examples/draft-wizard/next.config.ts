import type { NextConfig } from "next";

/**
 * Single-package Next app.
 * Business logic: modules/drafting (deep module).
 * app/ is RSC + Server Actions + Route Handlers only.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
