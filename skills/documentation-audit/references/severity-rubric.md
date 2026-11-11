# Severity rubric

## CRITICAL

Use when the documentation can cause security harm, data exposure, or makes a
primary outcome impossible.

- Public guide exposes an internal/admin route, secret, prompt, or customer data.
- Setup instructions reference a command that does not exist and has no
  alternative.
- A documented permission grants broader access than the product actually
  permits.
- A migration/rollback runbook would destroy data.
- Screenshot contains production customer PII or credentials.
- Public build serves internal `openwiki/` content.

## HIGH

Use when a primary journey is materially wrong or missing.

- Button/menu label changed and the guide cannot be followed.
- Permission or prerequisite is wrong.
- API endpoint, method, or required field is wrong.
- Architecture page contradicts a core runtime path.
- A primary feature has no user guide.
- A documented feature was removed.
- Database relationship documented with the wrong cardinality.
- Deployment instructions miss a required environment variable.

## MEDIUM

Use when the documentation is incomplete or stale but a user can recover.

- Troubleshooting missing for a common error.
- Secondary screenshot outdated.
- One module or non-primary endpoint undocumented.
- Diagram missing but prose is correct.
- Broken related link.
- New non-critical setting undocumented.
- Inconsistent terminology.

## LOW

Use for quality and polish.

- Typo or grammar.
- Heading hierarchy.
- Redundant sentence.
- Missing meta description.
- Inconsistent capitalization.
- Missing "related guides" link.

## Escalation rules

- A HIGH finding in a security-sensitive area becomes CRITICAL.
- Three related MEDIUM findings on the same primary journey may be grouped as
  HIGH.
- A LOW finding never blocks release.
- Do not downgrade a finding because the fix is expensive.

## Status vocabulary

| Status | Meaning |
| --- | --- |
| PASS | Checked and correct |
| PARTIAL | Some evidence, some gaps |
| BLOCKED | Cannot verify (no runtime, no credentials, environment down) |
| NOT APPLICABLE | Domain does not exist for this product |
| FAIL | Checked and incorrect |
