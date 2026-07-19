import { defineConfig, devices } from "@playwright/test";
import { createRequire } from "node:module";

const apiPort = 8788;
const vitePort = 5173;
const nextPort = 3010;

/**
 * Prefer a system Chromium (NixOS-friendly) when available.
 * Override with PLAYWRIGHT_CHROMIUM_EXECUTABLE.
 */
function chromiumExecutable(): string | undefined {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) {
    return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  }
  try {
    const require = createRequire(import.meta.url);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { execSync } = require("node:child_process") as typeof import("node:child_process");
    const path = execSync("command -v chromium", { encoding: "utf8" }).trim();
    return path || undefined;
  } catch {
    return undefined;
  }
}

const executablePath = chromiumExecutable();

/**
 * Two UI projects share one Hono API (N1).
 *
 * Browsers:
 * - Prefer system `chromium` (works on NixOS).
 * - Or download: `pnpm playwright:install` into ./.playwright-browsers
 *   and ensure host libs exist (glib, nss, …).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    launchOptions: executablePath
      ? { executablePath, args: ["--no-sandbox"] }
      : { args: ["--no-sandbox"] },
  },
  projects: [
    {
      name: "vite",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: `http://127.0.0.1:${vitePort}`,
      },
    },
    {
      name: "next",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: `http://127.0.0.1:${nextPort}`,
      },
    },
  ],
  webServer: [
    {
      command: "pnpm --filter @bulk-reassign/api start",
      url: `http://127.0.0.1:${apiPort}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        ...process.env,
        API_PORT: String(apiPort),
        API_HOST: "127.0.0.1",
      },
    },
    {
      command:
        "pnpm --filter @bulk-reassign/web dev -- --host 127.0.0.1 --port 5173",
      url: `http://127.0.0.1:${vitePort}`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        ...process.env,
        VITE_API_BASE_URL: `http://127.0.0.1:${apiPort}`,
      },
    },
    {
      command: "pnpm --filter @bulk-reassign/web-next dev",
      url: `http://127.0.0.1:${nextPort}`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        ...process.env,
        NEXT_PUBLIC_API_BASE_URL: `http://127.0.0.1:${apiPort}`,
      },
    },
  ],
});
