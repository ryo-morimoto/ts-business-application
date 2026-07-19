import type { NextConfig } from "next";

/**
 * Next owns UI + BFF Route Handlers.
 * System of Record is a foreign in-process mock (snake_case DTOs / foreign errors).
 * Domain packages translate and compose; they do not own persistence.
 */
const nextConfig: NextConfig = {
  transpilePackages: [
    "@fulfillment-desk/contracts",
    "@fulfillment-desk/domain",
  ],
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
