# Engineering coverage checklist

Use this as an inspection list. Mark each item `covered`, `partial`,
`missing`, or `not applicable` with a reason.

## 1. Context

- [ ] Product purpose and primary actors
- [ ] System boundary and external dependencies
- [ ] Deployment environments and topology
- [ ] Repository and package layout
- [ ] Monorepo ownership and dependency rules

## 2. Architecture

- [ ] Container/module diagram
- [ ] Runtime entrypoints (HTTP, worker, CLI, scheduled)
- [ ] Request lifecycle and middleware order
- [ ] Frontend rendering/data strategy
- [ ] Backend layering and transaction boundaries
- [ ] Synchronous and asynchronous flow diagrams
- [ ] Architectural invariants
- [ ] ADR index and decisions

## 3. Data

- [ ] Database engines and connection strategy
- [ ] Schema inventory
- [ ] Entity relationships and cardinality
- [ ] Indexes, constraints, cascades
- [ ] Migration workflow and rollback
- [ ] Tenant isolation and row ownership
- [ ] Soft delete, retention, audit history
- [ ] Seed and fixture data
- [ ] ER diagram

## 4. APIs

- [ ] Route inventory with auth and permission
- [ ] Request validation and normalization
- [ ] Response shapes
- [ ] Error model and status mapping
- [ ] Pagination/filtering/sorting
- [ ] Idempotency and concurrency
- [ ] Rate limits
- [ ] Versioning and deprecation
- [ ] Webhooks/events
- [ ] OpenAPI/GraphQL artifacts

## 5. Identity and access

- [ ] Authentication methods
- [ ] Session/token lifecycle
- [ ] Authorization model
- [ ] Permission matrix
- [ ] Ownership and tenant checks
- [ ] Admin/support access
- [ ] Audit logging
- [ ] Secret management

## 6. Behavior

- [ ] Business rules and calculations
- [ ] State machines and transitions
- [ ] Background jobs and retries
- [ ] External integrations and failure modes
- [ ] Caching and invalidation
- [ ] Storage and uploads
- [ ] Notifications/email
- [ ] AI/LLM components and guardrails

## 7. Quality

- [ ] Test strategy and commands
- [ ] Unit/integration/E2E boundaries
- [ ] Fixtures and test data
- [ ] Logging and correlation
- [ ] Metrics, tracing, alerts
- [ ] Error taxonomy
- [ ] Performance constraints

## 8. Operations

- [ ] Environment variables and defaults
- [ ] Local development setup
- [ ] Build and release pipeline
- [ ] Deploy and rollback
- [ ] Backup and restore
- [ ] Data migration
- [ ] Incident runbooks
- [ ] On-call and escalation

## 9. Security

- [ ] Threat boundaries
- [ ] Input validation
- [ ] SSRF/injection/upload risks
- [ ] Tenant data isolation
- [ ] PII handling and retention
- [ ] Dependency and secret scanning
- [ ] Least-privilege infrastructure

## 10. Maintainability

- [ ] Module ownership
- [ ] Extension points
- [ ] Known limitations
- [ ] Deprecated paths
- [ ] Documentation freshness policy
