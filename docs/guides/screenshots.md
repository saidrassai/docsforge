# Screenshots

Screenshots are evidence from the running product, not illustrations.

## Rules

1. Use a dedicated test environment and test user.
2. Use synthetic demo data.
3. Keep credentials in environment variables or a secret manager.
4. Mask secrets, personal data, billing details, and IDs.
5. Do not upload screenshots to third-party services without authorization.
6. Do not modify application source just to make a capture easier.

Never substitute an AI-generated mockup, a design file, or recreated HTML for a
real application screenshot.

## Docs-only Playwright config

DocsForge creates a separate config so screenshot tests do not share state with
the app's E2E or visual-regression suites:

```text
playwright.docs.config.ts
.documentation/screenshots/
  inventory.yml
  specs/
  README.md
docs/assets/screenshots/
```

The generated config:

- points `testDir` only at documentation specs;
- fixes viewport, locale, timezone, theme, and reduced motion;
- disables animations;
- uses one worker for deterministic output;
- writes reports and results under `.documentation/screenshots/`;
- does not share `snapshotDir` with visual regression.

If you spread a Playwright device preset, set `viewport` after the spread so the
preset does not override it.

## Authentication

Prefer a Playwright setup project that signs in once and saves `storageState`:

```ts
import { test as setup, expect } from "@playwright/test";
import path from "node:path";

const authFile = path.join(".documentation", "screenshots", ".auth", "owner.json");

setup("authenticate", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.DOCS_USER_EMAIL!);
  await page.getByLabel("Password").fill(process.env.DOCS_USER_PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
  await page.context().storageState({ path: authFile });
});
```

Never hardcode credentials. Never use a production account.

## Demo data

Use, in order:

1. a project-provided seed command;
2. a documented fixture/API setup;
3. a database snapshot for a local test environment;
4. UI-driven setup only when it is fast and idempotent.

Use fixed names, dates, amounts, and IDs. Use `example.com` for emails. Never
point at production.

## Capture workflow

For each documented workflow:

1. Identify the route and role.
2. Prepare data and auth state.
3. Navigate to the starting page.
4. Perform the documented actions with the same labels as the guide.
5. Capture starting, action, and result states.
6. Assert the expected UI state before each capture.
7. Save to `docs/assets/screenshots/<area>/<step>.png`.
8. Reference the image next to the step.
9. Update the inventory.

Example:

```ts
import { test, expect } from "@playwright/test";
import path from "node:path";

const out = (name: string) =>
  path.join("docs", "assets", "screenshots", "members", name);

test.use({ storageState: ".documentation/screenshots/.auth/owner.json" });

test("invite member", async ({ page }) => {
  await page.goto("/settings/members");
  await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();
  await page.screenshot({ path: out("01-members.png") });

  await page.getByRole("button", { name: "Add member" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.screenshot({ path: out("02-invite-dialog.png") });

  await page.getByLabel("Email").fill("demo.member@example.com");
  await page.getByLabel("Role").selectOption("Member");
  await page.getByRole("button", { name: "Send invitation" }).click();

  await expect(page.getByText("Invitation sent")).toBeVisible();
  await page.screenshot({ path: out("03-invitation-sent.png") });
});
```

## Locators

Prefer, in order:

1. `getByRole` with the accessible name;
2. `getByLabel` / `getByPlaceholder`;
3. stable visible text;
4. `data-testid`;
5. scoped CSS selectors only as a last resort.

Never depend on DOM order or generated class names.

## Inventory

Every documented screenshot has an entry:

```yaml
version: 1
screenshots:
  - id: members-invite-01
    guide: docs/user/guides/invite-member.md
    route: /settings/members
    role: workspace-owner
    spec: .documentation/screenshots/specs/members.spec.ts
    output: docs/assets/screenshots/members/01-members.png
    captured: 2026-11-11
    status: current
```

The inventory enables targeted regeneration: after a UI change, only entries
whose route, spec, or guide is affected are recaptured.

## No browser UI

If the product has no browser UI:

- mark screenshots `NOT APPLICABLE`;
- capture real CLI output as text blocks or terminal screenshots;
- do not install a browser stack the product cannot use.

## Validation

```sh
npx playwright test -c playwright.docs.config.ts
node ~/.documentation-toolkit/scripts/audit-project.mjs --root . --domain screenshots
```

The audit checks missing files, orphaned inventory entries, missing specs,
broken image references, stale capture dates, and public-safety leakage.
