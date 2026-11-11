---
name: documentation-audit
description: Independently audit a repository's engineering and customer documentation against actual code, tests, runtime behavior, navigation, permissions, and screenshots. Use for accuracy reviews, freshness checks, pre-release documentation reviews, and finding missing, stale, unsafe, or contradictory documentation. Reports findings first and does not rewrite unless asked.
license: MIT
compatibility: OpenCode, Oh My Pi, Agent Skills
---

# Documentation Audit

You are an independent reviewer. Your default output is **findings**, not
rewrites. Compare documentation with reality and provide evidence.

## Hard rules

1. Do not modify documentation during an audit unless the caller explicitly
   asks for remediation.
2. Every important finding needs evidence: file and line, route, command
   output, screenshot path, or a reproducible observation.
3. Do not infer permissions, behavior, or architecture from names.
4. Audit each repository independently. Never use another repository's docs as
   truth.
5. Treat both domains separately: engineering and customer.
6. Report `PASS`, `PARTIAL`, `BLOCKED`, and `NOT APPLICABLE` honestly.
7. If the running application is unavailable, say which checks are blocked.

## Step 1 — Establish scope

Ask or infer:

- Full audit, engineering-only, customer-only, or screenshots-only.
- Repository root (must be the current Git root).
- Baseline commit or date, if auditing a change.
- Whether a running application is available and at which URL.
- Whether remediation is requested.

Run:

```sh
node ~/.documentation-toolkit/scripts/audit-project.mjs --root . --json
```

The script performs deterministic checks. Then verify the high-severity
findings manually. A green script is not proof of accuracy.

## Step 2 — Engineering audit

### Architecture accuracy

- Does the documented architecture match actual modules, entrypoints, and
  dependency direction?
- Are diagrams consistent with the code?
- Are removed services or modules still documented?
- Are new modules undocumented?

### Data

- Do tables, columns, relationships, and constraints match migrations/schema?
- Are cardinalities correct?
- Are tenant boundaries and ownership rules documented accurately?
- Are indexes, cascades, retention, and audit history covered?

### APIs

- Do routes, methods, auth requirements, and permissions match?
- Are request/response schemas current?
- Is the error model accurate?
- Are deprecated endpoints marked?
- Do examples actually work?

### Behavior and security

- Are business rules and invariants current?
- Are permission checks and role matrices accurate?
- Are multi-tenancy boundaries described correctly?
- Are external services, jobs, retries, and failure modes covered?
- Are secrets, prompts, or sensitive operational details present in internal
  docs only (never public)?

### Operations

- Are environment variables complete, with defaults and required/optional
  status?
- Are deployment, rollback, backup, and restore procedures current?
- Are logs, metrics, alerts, and runbooks accurate?
- Are ADRs present for material decisions?

### Freshness

- Does `openwiki/.last-update.json` lag behind material changes?
- Are there stale Claims or unresolved evidence?
- Are pages missing source references?
- Are there broken internal links or invalid Mermaid diagrams?

## Step 3 — Customer documentation audit

### Completeness

- Is there a getting-started path that reaches a first success?
- Are all primary roles and journeys covered?
- Are core features documented as tasks, not feature descriptions?
- Are prerequisites and permissions stated?

### Accuracy

- Do menu names, page titles, buttons, and field labels match the running UI?
- Do navigation paths exist?
- Are permission requirements correct?
- Are expected results accurate?
- Are error states and troubleshooting current?
- Are features documented that no longer exist?
- Are new user-facing features undocumented?

### Structure and quality

- Is the article reachable from navigation and search?
- Is one primary task per article?
- Are steps ordered and actionable?
- Are links valid?
- Is terminology consistent with the product?
- Is the reading level appropriate for the audience?
- Is content duplicated or contradictory?

### Public safety

- Any internal architecture, source paths, prompts, secrets, feature flags, or
  admin runbooks in public content?
- Any real customer data in text or screenshots?
- Any private route linked or exposed?
- Does the public build include internal docs?

## Step 4 — Screenshot audit

For every screenshot referenced by a guide:

- Does the file exist?
- Is it referenced from the correct step?
- Does it show the current UI labels and layout?
- Is it a real application capture, not a mockup?
- Is the viewport/theme consistent with the guide?
- Is personal or production data masked?
- Is there alt text or a caption?
- Is it in the inventory?
- Is it separate from visual-regression snapshots?

Regenerate only after reporting. Do not silently replace images during an
audit.

## Step 5 — Classify

| Severity | Use when | Examples |
| --- | --- | --- |
| CRITICAL | Security exposure, data leak, or a primary path that cannot succeed | Public docs expose an admin route; onboarding cannot be completed |
| HIGH | Materially wrong for a primary journey | Button label changed; permission wrong; API contract wrong; architecture page contradicts code |
| MEDIUM | Important gap or drift, workaround exists | Missing troubleshooting; stale secondary screenshot; one module undocumented |
| LOW | Polish | Typo, heading style, inconsistent term, missing related link |

Every finding includes:

```text
ID: DOC-001
SEVERITY: HIGH
DOMAIN: customer | engineering | screenshots
LOCATION: docs/user/guides/invite-member.md:24
FINDING: Guide says "Invite teammate"; the current button is "Add member".
EVIDENCE: app/settings/members/page.tsx:118; screenshot at docs/assets/.../01-members.png shows "Add member".
IMPACT: Users cannot find the control by the documented label.
FIX: Replace the label and regenerate 01-members.png.
```

## Step 6 — Report

```text
DOCUMENTATION AUDIT — <project>
Repository: <root>
Scope: full | engineering | customer | screenshots
Baseline: <commit/date>
Runtime used: <URL or "not available">

SUMMARY
  Critical: <n>  High: <n>  Medium: <n>  Low: <n>
  Engineering: PASS|PARTIAL|BLOCKED|N/A
  Customer:    PASS|PARTIAL|BLOCKED|N/A
  Screenshots: PASS|PARTIAL|BLOCKED|N/A

FINDINGS
  <ordered by severity, each with evidence>

COVERAGE GAPS
  <domains/pages not audited and why>

REMEDIATION PLAN (only if requested)
  1. <smallest fix>
  2. <next>

VALIDATION PERFORMED
  <commands, routes, pages sampled>
```

Write the report to `.documentation/audit/<YYYY-MM-DD>-<scope>.md` and keep the
JSON output beside it. Do not commit unless asked.

## Step 7 — Remediation mode

Only when explicitly requested:

1. Fix CRITICAL and HIGH first.
2. Make the smallest correct change.
3. Re-verify against the same evidence.
4. Regenerate only affected screenshots.
5. Re-run the audit and report the delta.
6. Do not rewrite unrelated pages.

## Sampling guidance

For large documentation sets, do not claim a full audit after reading three
pages. Use:

- all CRITICAL/HIGH candidate pages from deterministic checks;
- all pages changed since the baseline;
- every primary journey;
- a stratified sample of the rest, with the sample recorded.

State the sampling method and coverage.

## Anti-patterns

- Rewriting content to make findings disappear.
- Reporting "docs are outdated" without a specific page and evidence.
- Treating a passing link checker as an accuracy audit.
- Auditing against another repository's implementation.
- Marking a screenshot current because the file exists.
- Using the application's source as proof of customer-visible behavior when the
  running UI differs.

See `references/severity-rubric.md` and `references/evidence-examples.md`.
