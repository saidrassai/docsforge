# Evidence examples

## Good evidence

```text
Guide: docs/user/guides/invite-member.md:24
Current UI: app/settings/members/members-header.tsx:41 renders
  <Button>Add member</Button>
Runtime: /settings/members at 2026-11-11 shows "Add member".
Screenshot: docs/assets/screenshots/members/01-members.png shows "Add member".
```

## Weak evidence

- "The docs look old."
- "The README says X."
- "A file named permissions.ts exists."
- "The screenshot exists, so it is current."
- "Another project documents it this way."

## Engineering finding

```text
Documented: "Invoices are deleted immediately."
Code: src/billing/invoices/service.ts:88 sets deletedAt; a nightly job
  hard-deletes after 30 days (src/jobs/purge-invoices.ts:22).
Evidence: migration 2026_04_add_deleted_at.sql; tests in
  tests/billing/invoice-deletion.test.ts.
Impact: support and compliance expectations are wrong.
Fix: correct the lifecycle description and add the retention job.
```

## Customer finding

```text
Documented navigation: Settings → Team → Invite
Actual navigation: Settings → Members → Add member
Evidence: app router config; runtime page; current screenshot.
Impact: users cannot find the action.
Fix: update the path and labels; regenerate the first two screenshots.
```

## Screenshot finding

```text
Guide: docs/user/guides/export-report.md:31
Image: docs/assets/screenshots/reports/export-dialog.png
Problem: shows a "Download" button removed in release 4.2; current dialog
  uses "Export".
Evidence: app/reports/export-dialog.tsx:57; runtime capture.
Severity: HIGH (primary task, misleading action).
Fix: regenerate only this screenshot after updating the guide label.
```

## Blocked checks

If the app cannot run:

```text
BLOCKED: runtime label verification (no dev server, no test credentials).
Performed instead: source inspection + route inventory.
Residual risk: source may differ from the deployed build.
```
