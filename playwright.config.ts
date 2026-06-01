import { defineConfig, devices } from "@playwright/test";

const isCi = Boolean(process.env.CI);

export default defineConfig({
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  reporter: isCi ? "github" : "list",
  retries: isCi ? 1 : 0,
  testDir: "./e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: isCi ? "on-first-retry" : "off",
  },
  webServer: {
    command: "pnpm start",
    reuseExistingServer: false,
    timeout: 120_000,
    url: "http://localhost:3000",
  },
  workers: isCi ? 1 : undefined,
});
