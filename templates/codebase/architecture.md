# Architecture: <system>

## Purpose

<What the system does and for whom.>

## Context

```mermaid
flowchart LR
  User[User] --> App[Application]
  App --> DB[(Database)]
  App --> External[External service]
```

## Containers / modules

| Module | Responsibility | Depends on | Owns data |
| --- | --- | --- | --- |
| <module> | <responsibility> | <modules> | <tables> |

## Runtime flows

### <Flow name>

```mermaid
sequenceDiagram
  participant U as User
  participant A as Application
  participant S as Service
  U->>A: Request
  A->>S: Operation
  S-->>A: Result
  A-->>U: Response
```

## Invariants

- <Invariant and source reference.>

## Decisions

- [ADR-0001](adr/0001-<slug>.md)

## Evidence

- `<path#Lx-Ly>`
- `<test path>`
- `<migration path>`
