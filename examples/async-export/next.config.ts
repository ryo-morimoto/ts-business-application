import type { NextConfig } from "next";

/**
 * Single-package Next app. Business code lives in features/* (vertical slices).
 * app/ is routing + thin wiring only.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
