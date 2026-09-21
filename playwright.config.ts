import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? "list" : "html",
  use: { baseURL, trace: "on-first-retry" },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 5"] } },
  ],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: { GASCOMP_AI_ASSISTANCE_ENABLED: "false" },
  },
});
