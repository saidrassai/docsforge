# Claim reconciliation examples

OpenWiki Claims are material propositions backed by versioned source evidence.
A stale Claim means "recheck the source", not "delete the sentence".

## Example 1 — Evidence moved, fact unchanged

Claim: "Invitations expire after 7 days."

Evidence was `src/invitations.ts#L40-L52`; the file moved to
`src/modules/invitations/service.ts#L58-L70` and the constant is still 7 days.

Decision:

- Confirm the Claim after reading the new source.
- Update the evidence reference if the lifecycle requires it.
- Do not rewrite page prose.

## Example 2 — Behavior changed

Claim: "Only workspace owners can invite members."

New policy allows owners and admins. Source changed in
`src/auth/policies/workspace.ts`.

Decision:

- Rewrite the prose to name both roles.
- Submit a revised Claim with the same id and new evidence.
- Check customer documentation separately; it may also be wrong.

## Example 3 — Feature removed

Claim: "Exports are emailed as CSV."

The job and endpoint were deleted; no replacement exists.

Decision:

- Remove or correct the page prose.
- Retract the Claim id.
- Do not leave a "coming soon" statement unless the product actually states it.

## Example 4 — New material fact

A new queue retries failed webhooks three times with exponential backoff.

Decision:

- Add the fact to the integration page.
- Submit a new Claim without an id.
- Cite the queue configuration and retry handler.

## Example 5 — Unverifiable statement

Existing prose says "The cache is Redis." The repository only references a
generic cache interface and deployment configuration is external.

Decision:

- Do not confirm as fact.
- Rewrite as "The application uses a cache interface configured at deployment;
  this repository does not pin the provider." if that is useful.
- Or omit the statement.

## Anti-patterns

- Confirming every Claim without reading evidence.
- Retracting a Claim because the line number moved.
- Copying a Claim from another repository.
- Submitting unchanged Claims repeatedly.
- Reporting `complete` before `openwiki_finish` succeeds.
