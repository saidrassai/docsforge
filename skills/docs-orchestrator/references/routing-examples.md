# Routing examples

## Example 1 — New SaaS repository

Input: Next.js app, Prisma, Playwright already present, no docs.

Decision: `INITIALIZE`.

Minimum work:

1. Validate Git root and stack.
2. Bootstrap `.documentation/config.yml`, `openwiki/INSTRUCTIONS.md`.
3. Keep the existing Playwright setup; add a docs-only config.
4. Select Fumadocs as the recommended adapter; stage, do not install without
   confirmation.
5. Add `AGENTS.md` documentation policy.
6. Add GitHub docs-check and scheduled OpenWiki workflows.
7. Run an initial audit.

## Example 2 — Renamed button in a settings page

Input: diff changes `Invite teammate` to `Add member` and the route stays the
same.

Decision: `SYNC`, customer docs + screenshots only.

Minimum work:

1. `docs-impact.mjs` maps the component to the invite-member guide.
2. Update every occurrence of the label in that guide.
3. Regenerate the two screenshots for that workflow.
4. Do not touch architecture pages.

## Example 3 — Internal refactor

Input: extract a service class; public behavior unchanged.

Decision: `SYNC`, engineering docs only if architecture or contracts changed.
Otherwise report `no documentation impact` with evidence.

## Example 4 — New API endpoint

Input: adds `POST /api/v1/exports`.

Decision: `SYNC`, engineering docs (API reference, module page, permissions)
and customer docs only if the feature is exposed in the UI.

Minimum work:

1. Update the OpenWiki API/domain page with source references.
2. Add request/response/error examples from the actual handler and schema.
3. If a UI exists, add a task guide and screenshots.
4. Add a test reference if the repository documents testing.

## Example 5 — Audit request

Input: "Are our docs accurate?"

Decision: `AUDIT` only. Run deterministic checks, sample high-risk pages,
verify against code/UI, report findings. Do not rewrite.

## Example 6 — CLI/library without UI

Input: Python SDK.

Decision: engineering docs via OpenWiki; user docs are API/reference guides,
not a Help Center. Mark screenshot domain `NOT APPLICABLE`. Do not install a
browser screenshot harness.
