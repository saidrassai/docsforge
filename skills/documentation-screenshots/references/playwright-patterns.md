# Playwright patterns for documentation screenshots

## Project layout

```text
playwright.docs.config.ts
.documentation/
  screenshots/
    auth.setup.ts
    inventory.yml
    specs/
      members.spec.ts
    fixtures/
      demo-data.ts
    .auth/              # gitignored
    results/            # gitignored
    report/             # gitignored
docs/
  assets/screenshots/
  user/
```

## Config with auth setup

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./.documentation/screenshots",
  testMatch: ["**/*.spec.ts"],
  outputDir: "./.documentation/screenshots/results",
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["html", { outputFolder: ".documentation/screenshots/report", open: "never" }]],
  use: {
    baseURL: process.env.DOCS_BASE_URL ?? "http://127.0.0.1:3000",
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
    timezoneId: "UTC",
    colorScheme: "light",
    reducedMotion: "reduce",
    trace: "on-first-retry",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "docs",
      use: { ...devices["Desktop Chrome"], storageState: ".documentation/screenshots/.auth/owner.json" },
      dependencies: ["setup"],
    },
  ],
  webServer: process.env.DOCS_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://127.0.0.1:3000",
        reuseExistingServer: !process.env.CI,
      },
});
```

## Masking dynamic content

```ts
await page.screenshot({
  path: "docs/assets/screenshots/billing/01-invoices.png",
  mask: [
    page.getByTestId("invoice-date"),
    page.getByTestId("customer-email"),
    page.getByTestId("invoice-id"),
  ],
  maskColor: "#e5e7eb",
});
```

## Stable screenshots

```ts
await page.addStyleTag({
  content: `*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; caret-color: transparent !important; }`,
});
await page.evaluate(() => document.fonts.ready);
await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();
```

## Role-based storage state

```ts
// auth.setup.ts
const roles = [
  { file: "owner.json", email: process.env.DOCS_OWNER_EMAIL!, password: process.env.DOCS_OWNER_PASSWORD! },
  { file: "member.json", email: process.env.DOCS_MEMBER_EMAIL!, password: process.env.DOCS_MEMBER_PASSWORD! },
];
for (const role of roles) {
  const context = await browser.newContext();
  const page = await context.newPage();
  // sign in, assert, save storageState
  await context.close();
}
```

## Error-state capture

```ts
await page.route("**/api/members", (route) =>
  route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ error: "already_member" }) }),
);
// Trigger the action, assert the visible error, capture it.
```

Use route interception only when the real UI handles the error. Do not fake a
screen the product cannot produce.

## CI

```yaml
- run: npm ci
- run: npx playwright install --with-deps chromium
- run: npx playwright test -c playwright.docs.config.ts
  env:
    DOCS_BASE_URL: http://127.0.0.1:3000
    DOCS_OWNER_EMAIL: ${{ secrets.DOCS_OWNER_EMAIL }}
    DOCS_OWNER_PASSWORD: ${{ secrets.DOCS_OWNER_PASSWORD }}
```

For docs-only screenshot changes, restrict the workflow to `docs/assets/screenshots/**`
and the screenshot specs. Do not let it modify application source.

## Anti-patterns

- `page.waitForTimeout(3000)` instead of an assertion.
- Full-page screenshots of every step.
- Real customer data.
- Hardcoded credentials.
- Sharing `snapshotDir` with visual regression.
- Capturing after a forced scroll that hides the relevant control.
- Updating all screenshots because one page changed.
