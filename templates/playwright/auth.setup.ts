import { test as setup, expect } from "@playwright/test";
import path from "node:path";

/**
 * Optional authentication setup.
 *
 * Enable this only after creating a dedicated test user and setting the
 * environment variables. Never use production credentials.
 *
 * Add the saved storageState to the docs project in playwright.docs.config.ts:
 *   storageState: ".documentation/screenshots/.auth/user.json"
 *   dependencies: ["setup"]
 */
const authFile = path.join(".documentation", "screenshots", ".auth", "user.json");

setup("authenticate", async ({ page }) => {
  const email = process.env.DOCS_USER_EMAIL;
  const password = process.env.DOCS_USER_PASSWORD;
  if (!email || !password) {
    setup.skip(true, "DOCS_USER_EMAIL and DOCS_USER_PASSWORD are not set");
  }

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
  await page.context().storageState({ path: authFile });
});
