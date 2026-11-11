# Documentation health rubric

Use this rubric to produce a defensible assessment. Every rating needs at
least one piece of evidence.

## Evidence sources

| Claim | Acceptable evidence |
| --- | --- |
| Repository is safe to modify | `git rev-parse --show-toplevel` output equals the intended root |
| Stack is Next.js | `package.json` dependency + framework config or app directory |
| Product has a UI | Routes/pages/templates + a runnable dev or preview command |
| Engineering wiki is current | `openwiki/.last-update.json` timestamp, clean Claims, recent commit coverage |
| API docs are accurate | Route definitions/OpenAPI file + a sampled documented endpoint |
| Permissions are accurate | Authorization middleware/policies + a sampled UI path |
| Screenshot is current | Capture artifact exists, route matches, UI labels match the current component |
| Help Center is public | Public route/build config + deployment target |
| CI is docs-only | Workflow diff restricted to documentation paths |

## Rating definitions

- **PASS** — complete for the project's scope, current, and validated.
- **PARTIAL** — exists but has named gaps, drift, or unverified claims.
- **MISSING** — required for this project and absent.
- **NOT APPLICABLE** — the project has no such surface (for example, no UI).

## Required coverage

### Engineering

- System context and architecture
- Repository/module map and dependency direction
- Runtime entrypoints and request lifecycle
- Database schema and entity relationships
- API contracts and error model
- Authentication and authorization
- Permissions and multi-tenancy boundaries
- Business rules and invariants
- External services and integrations
- Background jobs, queues, schedulers
- Caching, storage, and file handling
- AI/LLM components, prompts, and evaluation boundaries
- Error handling, logging, monitoring, alerting
- Deployment, environments, configuration
- Security and secret management
- Operational runbooks
- Architecture Decision Records

### Customer documentation

- Getting started / first successful outcome
- Core task guides for each primary role
- Concepts and terminology
- Permissions and prerequisites
- Navigation paths with exact labels
- Expected results and error states
- Troubleshooting and FAQs
- Related guides
- Real, current screenshots
- Search and navigation that work

## Severity

| Severity | Definition | Example |
| --- | --- | --- |
| CRITICAL | Causes harm, security exposure, or blocks a primary task | Public guide exposes an internal admin route or secret; setup instructions cannot work |
| HIGH | Materially wrong or missing for a primary journey | Documented button no longer exists; permission requirement is wrong; architecture page contradicts the code |
| MEDIUM | Incomplete or stale but not blocking | Missing troubleshooting section; screenshot has an outdated theme; one module undocumented |
| LOW | Polish | Typo, weak heading, inconsistent terminology, missing related link |

## Minimum-work decision

Choose the smallest operation that closes the highest-severity gap:

1. One stale page → SYNC that page.
2. One changed workflow → update the guide and its affected screenshots.
3. Missing engineering domain → OpenWiki incremental page update.
4. No infrastructure → INITIALIZE.
5. Accuracy unknown → AUDIT first.

Do not use INITIALIZE to fix a single stale page. Do not use AUDIT as a excuse
to rewrite content.
