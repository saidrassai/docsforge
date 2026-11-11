---
name: documentation-screenshots
description: Capture real, current application screenshots for end-user documentation with Playwright. Use when creating or updating guides, when UI labels change, when screenshots are missing or stale, or when building a deterministic screenshot workflow with synthetic demo data, authentication state, stable locators, and targeted regeneration.
license: MIT
compatibility: OpenCode, Oh My Pi, Agent Skills
---

# Documentation Screenshots

Screenshots are evidence from the running product. Never substitute an
AI-generated mockup, a design file, or a recreated HTML page for a real
application screenshot.

Playwright is the preferred engine: <https://playwright.dev/>.

## Safety rules

1. Use a dedicated test environment and test user. Never a production account.
2. Use synthetic demo data. Never production customer data.
3. Keep credentials in environment variables or a local untracked file. Never
   commit them.
4. Do not capture secrets, API keys, billing details, or personal data. Mask
   or replace them.
5. Do not upload screenshots to a third-party service without authorization.
6. Do not modify application source to make a screenshot easier. If a stable
   test ID is missing, request it as a product change.

## Step 1 — Inspect the existing setup

Look for:

- `playwright.config.ts` / `.js`
- `tests/`, `e2e/`, `__tests__/`
- `@playwright/test` in `package.json`
- existing auth fixtures, storage state, seed scripts
- existing visual-regression snapshots
- dev server command, base URL, ports
- test IDs and accessibility labels

Do not overwrite the application's Playwright config. Create a separate
docs-only config, for example:

```text
playwright.docs.config.ts
.documentation/screenshots/
  inventory.yml
  fixtures/
  specs/
  README.md
docs/assets/screenshots/
```

If the project has no Playwright dependency, ask before adding it. Running via
`npx playwright` is acceptable for a one-off, but reproducible CI needs a pinned
dependency.

## Step 2 — Create the docs-only config

Template: `templates/playwright/playwright.docs.config.ts`.

Requirements:

- `testDir` points only at documentation screenshot specs.
- `snapshotDir` is not shared with visual-regression snapshots.
- `use.baseURL` comes from `DOCS_BASE_URL` or a safe local default.
- `viewport` is fixed (for example 1440×900 desktop; add mobile only when the
  product supports it). If you spread a Playwright device preset, set
  `viewport` after the spread so the preset does not override it.
- `locale`, `timezoneId`, `colorScheme`, and `reducedMotion` are fixed.
- `animations: "disabled"`; CSS transitions disabled where possible.
- `trace` on first retry only.
- HTML report written under `.documentation/screenshots/report/` and ignored by
  Git.
- workers: 1 by default for deterministic screenshots; raise only when proven
  safe.

Example:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./.documentation/screenshots/specs",
  outputDir: "./.documentation/screenshots/results",
  fullyParallel: false,
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
    screenshot: "off",
  },
  projects: [{ name: "docs-chromium", use: { ...devices["Desktop Chrome"] } }],
});
```

## Step 3 — Authenticate safely

Prefer a Playwright setup project that signs in once and saves `storageState`.

```ts
// .documentation/screenshots/auth.setup.ts
import { test as setup, expect } from "@playwright/test";
import path from "node:path";

const authFile = path.join(".documentation", "screenshots", ".auth", "user.json");

setup("authenticate", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.DOCS_USER_EMAIL!);
  await page.getByLabel("Password").fill(process.env.DOCS_USER_PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.context().storageState({ path: authFile });
});
```

Rules:

- Read credentials from `DOCS_USER_EMAIL` / `DOCS_USER_PASSWORD` or a secret
  manager. Never hardcode.
- Add `.auth/`, reports, and results to `.gitignore`.
- Use a role-specific user when permissions matter.
- For MFA, use a test-only bypass or a seeded session; never disable MFA in
  production.
- For multi-tenant products, seed a dedicated demo workspace.

## Step 4 — Prepare deterministic demo data

Options, in order:

1. A project-provided seed command (`npm run seed:demo`, `python manage.py
   seed_demo`).
2. A documented API/fixture setup run before screenshots.
3. A database snapshot for a local test environment.
4. UI-driven setup in a `beforeAll` only when it is fast and idempotent.

Requirements:

- Fixed names, dates, amounts, and IDs where visible.
- No real emails or domains; use `example.com`.
- Stable ordering; avoid "most recent" data unless the UI fixes it.
- Clean up or reset between runs.
- Never point at production.

Record the seed command in `.documentation/screenshots/README.md`.

## Step 5 — Capture the workflow

For each documented workflow:

1. Identify the route and target role.
2. Prepare the data and auth state.
3. Navigate to the starting page.
4. Perform the documented actions with the same labels the guide uses.
5. Capture meaningful states:
   - starting point (context)
   - the control or form that needs visual explanation
   - success/result state
   - error state only if the guide documents it
6. Save with a stable, descriptive path:
   `docs/assets/screenshots/<area>/<step-slug>.png`
7. Assert the expected UI state before capturing, so a broken flow fails loudly.
8. Reference the image from the guide next to the step.

Example spec:

```ts
import { test, expect } from "@playwright/test";
import path from "node:path";

const out = (name: string) =>
  path.join("docs", "assets", "screenshots", "members", name);

test.use({ storageState: ".documentation/screenshots/.auth/owner.json" });

test("invite member", async ({ page }) => {
  await page.goto("/settings/members");
  await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();
  await page.screenshot({ path: out("01-members.png"), fullPage: false });

  await page.getByRole("button", { name: "Invite member" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.screenshot({ path: out("02-invite-dialog.png") });

  await page.getByLabel("Email").fill("demo.member@example.com");
  await page.getByLabel("Role").selectOption("Member");
  await page.getByRole("button", { name: "Send invitation" }).click();

  await expect(page.getByText("Invitation sent")).toBeVisible();
  await page.screenshot({ path: out("03-invitation-sent.png") });
});
```

## Step 6 — Locator policy

Prefer, in order:

1. `getByRole` with the accessible name.
2. `getByLabel` / `getByPlaceholder` for form fields.
3. `getByText` for stable visible copy.
4. `data-testid` when the UI has no stable semantic locator.
5. CSS selectors only as a last resort, scoped and documented.

Never depend on DOM order, generated class names, or translated text when the
product supports multiple locales.

If a stable locator is missing, add a test ID as a deliberate product change or
use a semantic locator. Do not use brittle XPath.

## Step 7 — Visual quality

- Crop to the relevant region; avoid enormous full-page images unless the
  whole page is the point.
- Keep the product header/navigation when it establishes location.
- Do not include browser chrome, personal bookmarks, or dev tools.
- Use the product's default theme unless the guide documents theme switching.
- Hide or mask dynamic timestamps, IDs, avatars, and counts.
- Add a short caption or alt text that explains the task context.
- Use annotations (arrows/boxes) only when they clarify the action; keep them
  consistent across the Help Center.
- Optimize file size; prefer PNG for UI, WebP/JPEG only when quality allows.

Playwright masking:

```ts
await page.screenshot({
  path: out("01-dashboard.png"),
  mask: [
    page.getByTestId("current-time"),
    page.getByTestId("user-avatar"),
    page.getByTestId("account-id"),
  ],
  maskColor: "#e5e7eb",
});
```

## Step 8 — Inventory and targeted regeneration

Maintain `.documentation/screenshots/inventory.yml`:

```yaml
version: 1
screenshots:
  - id: members-invite-01
    guide: docs/user/guides/invite-member.md
    route: /settings/members
    role: workspace-owner
    spec: .documentation/screenshots/specs/members.spec.ts
    output: docs/assets/screenshots/members/01-members.png
    status: current
    captured: 2026-11-11
```

Rules:

- Every documented screenshot has an inventory entry.
- Every inventory entry points to an existing file and a real spec.
- On UI change, regenerate only entries whose route/spec/guide is affected.
- Update `captured` and `status`.
- Audit checks missing files and stale entries.

## Step 9 — No browser UI

If the product is an API, CLI, library, or desktop app without a browser UI:

- Mark screenshot automation `NOT APPLICABLE`.
- For a CLI, capture real terminal output as text blocks or deterministic
  terminal screenshots from the actual command; never fabricate output.
- For desktop, use the project's supported capture method and document it.
- Do not install Playwright or a browser stack that the product cannot use.

## Step 10 — Verify

1. `npx playwright test -c playwright.docs.config.ts` passes.
2. Every referenced image exists.
3. Images show the current labels and layout.
4. No secrets, real users, or production data appear.
5. Inventory matches the files and guides.
6. Only affected screenshots changed.
7. The guide still makes sense without the images.

## Output contract

```text
ENGINE: playwright
CONFIG: <path>
SPECS: <n> run
CAPTURED: <n>
REUSED: <n>
FAILED: <n> (<reason>)
OUTPUT: docs/assets/screenshots/
INVENTORY: updated=<n>
SECURITY: synthetic data only — pass|fail
```

See `references/playwright-patterns.md` and
`references/screenshot-inventory.md`.
