# Agents

DocsForge installs four reusable agents.

| Agent | Purpose |
| --- | --- |
| `documentation-architect` | Plan and maintain engineering docs and documentation infrastructure |
| `documentation-writer` | Write customer guides from verified product behavior |
| `documentation-auditor` | Read-only audit with evidence and severity |
| `screenshot-specialist` | Build deterministic Playwright screenshot workflows |

## When to use each

### `documentation-architect`

Use for:

- `/docs-init`
- `/docs-code`
- `/docs-sync` engineering work
- architecture and module documentation
- database and API references
- ADRs and runbooks
- adapter and project structure decisions

It inspects the repository before writing, preserves source evidence, and
respects the boundary between internal and customer docs.

### `documentation-writer`

Use for:

- `/docs-user`
- customer tutorials
- feature explanations
- onboarding
- navigation instructions
- permissions and prerequisites
- troubleshooting articles
- FAQs

It verifies labels, routes, roles, and expected results against the running
product or current UI code.

### `documentation-auditor`

Use for:

- `/docs-audit`
- pre-release reviews
- documentation freshness checks
- security-boundary reviews
- screenshot accuracy reviews

It is read-only by default. It reports findings before any remediation.

### `screenshot-specialist`

Use for:

- `/docs-screenshots`
- new workflow captures
- UI label changes
- missing or stale screenshots
- deterministic auth and fixture setup

It never fabricates screenshots and never uses production data.

## Host formats

### OpenCode

OpenCode agents are Markdown files with V2 frontmatter:

```yaml
---
description: Reviews documentation without editing files
mode: subagent
permissions:
  - action: edit
    resource: "*"
    effect: deny
---
```

The body becomes the system prompt.

### Oh My Pi

OMP agents are task-agent definitions:

```yaml
---
name: documentation-auditor
description: Independently audit documentation against code and runtime.
tools: read, grep, glob, bash
---
```

The body becomes the system prompt.

## Delegation

Ask your primary agent:

```text
Use the documentation-auditor subagent to audit the customer docs.
```

Or invoke the matching command and let the command delegate.

If subagents are unavailable, the same skill can be executed directly.
