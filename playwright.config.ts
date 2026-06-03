import { defineConfig, devices } from "@playwright/test";

const isCi = Boolean(process.env.CI);
const port = process.env.PORT ?? "3000";
const baseURL = `http://localhost:${port}`;

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
    baseURL,
    trace: isCi ? "on-first-retry" : "off",
  },
  webServer: {
    command: "pnpm start",
    reuseExistingServer: false,
    timeout: 120_000,
    url: baseURL,
  },
  workers: isCi ? 1 : undefined,
});
