Load the `docs-orchestrator` skill in SYNC mode.

Update only the documentation affected by implementation changes in the current
Git repository. Do not regenerate unrelated pages.

Arguments: $ARGUMENTS
Interpretation:
- a Git ref (for example `origin/main`, a SHA, `HEAD~3`) sets the comparison base;
- otherwise treat the text as a scope hint (feature, path, or domain).

Steps:

1. Resolve the Git root and confirm it matches the current project.
2. Determine the base:
   - use the supplied ref if present;
   - else use the last documented commit recorded by the project or OpenWiki;
   - else use `HEAD~1`.
   State the base you used.
3. Run:
   `node ~/.documentation-toolkit/scripts/docs-impact.mjs --root . --base <ref> --json`
4. Inspect the changed files and classify impact:
   - architecture/contracts/schema/security/config/operations → engineering;
   - user-visible behavior/labels/permissions/navigation/results → customer;
   - affected UI workflows → screenshots.
   Internal refactors with no behavior/contract change → no documentation
   impact (say so explicitly).
5. Load `codebase-documentation` and update only impacted OpenWiki pages and
   Claims. Reconcile stale Claims against current source.
6. Load `user-documentation` and update only impacted customer guides. Verify
   labels and permissions in the current UI/code.
7. Load `documentation-screenshots` and regenerate only affected screenshots.
8. Validate:
   - `validate-config.mjs`
   - Markdown links and image references
   - OpenWiki Claims/run state
   - public/internal separation
9. Report:
   - base ref and changed files;
   - pages updated/skipped and why;
   - screenshots regenerated/reused;
   - validation results;
   - remaining risks.

Do not commit, push, publish, or deploy. Do not update public docs for a purely
internal refactor.
