# OpenWiki instructions

This file is the user-authored brief for this repository's engineering wiki.
OpenWiki reads it for scope and priorities and does not rewrite it during normal
runs.

## Scope

Document this repository's actual implementation for engineers and coding
agents. Do not document customer help content, marketing material, or another
repository.

## Priorities

1. System context and runtime architecture.
2. Repository/module map and dependency direction.
3. Database schema and entity relationships.
4. API contracts, authentication, authorization, and permissions.
5. Business rules, state transitions, and invariants.
6. Background jobs, integrations, caching, storage, and failure handling.
7. Deployment, environment configuration, security, and operations.
8. Testing strategy and local development.

## Evidence rules

- Ground every material statement in current source, tests, migrations,
  configuration, or runtime behavior.
- Preserve source references.
- Do not invent relationships, permissions, or behavior.
- Mark unverified statements explicitly or omit them.
- Respect `.openwikiignore`.

## Exclusions

- Customer-facing guides (maintained separately).
- Secrets, credentials, or production data.
- Generated or vendored code unless it defines a public contract.
- Content from other repositories or workspaces.

## Maintenance

- Update incrementally after behavior, contract, schema, security, or
  operational changes.
- Reconcile stale Claims by checking current evidence.
- Do not regenerate unaffected pages.
- Keep diagrams grounded in real code.
