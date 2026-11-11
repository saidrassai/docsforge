import { defineConfig, devices } from "@playwright/test";

/**
 * Documentation-only Playwright configuration.
 *
 * This is intentionally separate from the application's E2E and visual
 * regression configuration. It writes screenshots into docs/assets/screenshots
 * and never shares snapshot directories with visual tests.
 */
export default defineConfig({
  testDir: "./.documentation/screenshots/specs",
  testMatch: ["**/*.spec.ts"],
  outputDir: "./.documentation/screenshots/results",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: ".documentation/screenshots/report", open: "never" }],
  ],
  use: {
    baseURL: process.env.DOCS_BASE_URL ?? "{{DOCS_BASE_URL}}",
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
    timezoneId: "UTC",
    colorScheme: "light",
    reducedMotion: "reduce",
    trace: "on-first-retry",
    screenshot: "off",
  },
  projects: [
    {
      name: "docs-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
{{WEB_SERVER_BLOCK}}
});
