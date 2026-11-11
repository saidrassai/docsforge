Load the `documentation-audit` skill.

Audit documentation for the current Git repository. Report findings first. Do
not rewrite documentation unless the user explicitly asks for remediation.

Arguments: $ARGUMENTS
Scope mapping:
- `engineering` or `code` → engineering only;
- `customer` or `user` → customer only;
- `screenshots` → screenshots only;
- `full`, empty, or anything else → full audit.

Steps:

1. Resolve the Git root and confirm scope. If a runtime URL is available, note
   it; otherwise record runtime checks as BLOCKED.
2. Run:
   `node ~/.documentation-toolkit/scripts/audit-project.mjs --root . --domain <scope> --json`
3. Verify every CRITICAL and HIGH candidate manually against source, migrations,
   routes, authorization code, tests, or the running UI.
4. Audit engineering documentation:
   architecture, modules, database, APIs, auth, permissions, tenancy, business
   logic, integrations, jobs, caching, storage, AI systems, errors, testing,
   logging, deployment, environment variables, security, runbooks, ADRs,
   freshness, Claims, links, diagrams.
5. Audit customer documentation:
   coverage, navigation labels, permissions, prerequisites, expected results,
   screenshots, broken links, removed features, public-safety leakage.
6. Audit screenshots against the current UI and inventory.
7. Classify findings CRITICAL/HIGH/MEDIUM/LOW with evidence.
8. Write the report to `.documentation/audit/<date>-<scope>.md` and keep the
   JSON output beside it.
9. Provide a remediation plan only if requested.

Do not commit or push unless asked.
