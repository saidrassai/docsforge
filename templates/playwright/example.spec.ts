import { test, expect } from "@playwright/test";
import path from "node:path";

/**
 * Example documentation screenshot spec.
 *
 * Replace the route, labels, and output path with the real workflow. Assert
 * the expected UI state before every capture so a broken flow fails loudly.
 */
const out = (name: string) =>
  path.join("docs", "assets", "screenshots", "example", name);

test("example workflow", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
  await page.screenshot({ path: out("01-start.png") });
});
