# Documentation screenshots

This directory contains the docs-only Playwright harness. It is separate from
the application's E2E and visual-regression suites.

## Setup

1. Install Playwright if the project does not already have it:

   ```sh
   npm install -D @playwright/test
   npx playwright install chromium
   ```

2. Start the application or set `DOCS_BASE_URL` to a running test instance.
3. Create a dedicated test user and set:

   ```sh
   DOCS_USER_EMAIL=docs-bot@example.com
   DOCS_USER_PASSWORD=...
   ```

4. Copy `auth.setup.ts` into `specs/` only after adapting the selectors, then
   add the setup project and `storageState` to `playwright.docs.config.ts`.

## Run

```sh
npx playwright test -c playwright.docs.config.ts
```

## Rules

- Synthetic demo data only.
- Never commit `.auth/`, results, reports, or credentials.
- Assert before capturing.
- Regenerate only affected screenshots.
- Update `inventory.yml` whenever a screenshot is added or replaced.
