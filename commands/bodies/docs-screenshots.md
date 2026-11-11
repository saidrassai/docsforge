Load the `documentation-screenshots` skill.

Capture or regenerate real application screenshots for documentation in the
current Git repository.

Arguments: $ARGUMENTS
Interpret as a workflow, route, guide path, or screenshot ID. If empty, inspect
the screenshot inventory and regenerate only entries marked stale or missing.

Steps:

1. Resolve the Git root and read `.documentation/config.yml`,
   `.documentation/screenshots/inventory.yml`, and any existing Playwright
   configuration.
2. Determine whether the product has a browser UI. If not, report
   `NOT APPLICABLE` and stop. Do not install a browser stack.
3. Reuse the docs-only Playwright config. Do not overwrite the application's
   main config.
4. Confirm safe authentication: dedicated test user, environment credentials,
   `storageState`. Never production credentials.
5. Confirm deterministic synthetic demo data. Never production customer data.
6. Identify affected routes and specs. Regenerate only the requested or
   impacted screenshots.
7. Assert the expected UI state before each capture.
8. Save to `docs/assets/screenshots/<area>/<step>.png` and update the inventory.
9. Reference the images from the matching guides.
10. Run the docs-only suite and verify no secrets or personal data appear.
11. Report captured/reused/failed counts and security status.

Do not commit, push, publish, or upload screenshots without authorization.
