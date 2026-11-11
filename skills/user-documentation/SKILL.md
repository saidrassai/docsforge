---
name: user-documentation
description: Create and maintain customer-facing Help Center content for the actual product. Use when writing tutorials, how-to guides, feature explanations, onboarding, user journeys, navigation instructions, permission prerequisites, troubleshooting articles, or FAQs, and when selecting or configuring a documentation framework such as Fumadocs, MkDocs, Docusaurus, Nextra, or an existing Help Center.
license: MIT
compatibility: OpenCode, Oh My Pi, Agent Skills
---

# User Documentation

You write for people using the product, not for its engineers. The audience may
be customers, administrators, HR teams, managers, job seekers, or another role.
Every guide must help them complete a real task.

## Hard boundaries

- Document only behavior that exists in the product.
- Verify labels, routes, permissions, and results against the running UI or
  current source.
- Never expose internal architecture, database details, prompts, secrets,
  feature flags, operational runbooks, or admin-only implementation notes.
- Never fabricate screenshots. Use `documentation-screenshots`.
- Never copy internal engineering pages into public routes.
- Never publish or deploy without explicit authorization.

## Step 1 — Identify the product and audience

Read project context, then verify:

1. Product type and value proposition.
2. Public vs authenticated vs admin surfaces.
3. Primary user roles and their goals.
4. Role-specific permissions and prerequisites.
5. Primary journeys: onboarding, core task, recurring task, recovery.
6. Terminology the UI actually uses.
7. Supported locales and accessibility expectations.
8. Existing Help Center, if any.

Use `detect-stack.mjs` for the technical inventory, but verify the product
surface manually. A route existing in code does not prove it is customer-facing.

## Step 2 — Choose or preserve the documentation framework

Decision order:

1. **Existing working Help Center** → preserve it. Improve information
   architecture, content, and search; do not migrate without a reason.
2. **Next.js** → evaluate [Fumadocs](https://www.fumadocs.dev/) first.
3. **Other React framework** → evaluate Docusaurus, Nextra, Starlight, or
   VitePress based on the app's rendering model and hosting.
4. **Python-oriented product** → evaluate MkDocs (Material theme).
5. **Independent documentation product** → a dedicated static site.
6. **No customer-facing UI** → do not install a Help Center. Produce
   task-oriented reference guides for the actual interface (API, CLI, library)
   or mark the domain `NOT APPLICABLE`.

Never install a docs framework globally. It belongs to the application
project. Use `adapters/` for selection criteria, setup, and validation.

### Next.js + Fumadocs baseline

If selected, confirm the app's Next.js version and router. A typical setup:

```text
content/docs/                 # MDX content
source.config.ts              # Fumadocs content source
lib/source.ts                 # loader
app/docs/[[...slug]]/page.tsx # docs route
app/docs/layout.tsx           # docs layout
mdx-components.tsx            # MDX components
```

Required capabilities:

- sidebar/navigation
- search
- categories and ordering
- article layout with table of contents
- related articles
- responsive layout
- images with alt text
- internal links
- versioning only when the product actually versions docs

Do not scaffold a route that collides with an existing app route. Check
`app/`, `pages/`, middleware, and rewrites first.

## Step 3 — Inventory the real UI

For each surface, record:

| Field | Example |
| --- | --- |
| Route | `/settings/members` |
| Audience | Workspace owner/admin |
| Auth | Required |
| Permission | `members:invite` |
| Navigation path | Settings → Members |
| Primary action | Invite member |
| Form fields | Email, role |
| Success result | Invitation sent confirmation |
| Error states | Already a member; seat limit reached |
| Related guides | Roles and permissions; Billing |

Prefer source-of-truth UI strings from the component or i18n catalog, then
confirm in the running app. If the UI and source disagree, trust the running
app for customer docs and report the discrepancy.

## Step 4 — Build the information architecture

Minimum structure when applicable:

```text
Getting started
  What is <product>?
  Create your account
  Complete onboarding
Guides
  <Core task 1>
  <Core task 2>
Concepts
  Roles and permissions
  Workspaces / accounts
  Billing / plans
Reference
  Settings
  Limits
Troubleshooting
  Common problems
  Error messages
FAQ
```

Rules:

- Organize by user goal, not by internal module.
- Use the product's vocabulary.
- Keep one primary task per article.
- Link related articles instead of duplicating content.
- Do not create an article for every button.

## Step 5 — Write the guide

Every task guide must answer:

1. **What it does** — one sentence.
2. **Who can use it** — roles.
3. **Required permissions** — exact permission or role, verified.
4. **Prerequisites** — account, plan, data, setup.
5. **Where to find it** — exact navigation path with UI labels.
6. **What to click** — numbered steps, one action per step.
7. **What to enter** — field names, formats, constraints.
8. **How to complete** — final action.
9. **Expected result** — what the user sees.
10. **Common problems** — symptoms, cause, resolution.
11. **Related guides** — 2–5 links.

### Writing style

- Second person, present tense: "Select **Save**."
- Imperative steps: "Enter the workspace name."
- One instruction per numbered step.
- Bold exact UI labels: **Settings**, **Invite member**.
- Put paths in code style only for technical audiences; otherwise use
  breadcrumbs: Settings → Members.
- Explain *why* only when it prevents a mistake.
- Define jargon on first use.
- Avoid "simply", "just", "obviously".
- State the expected result after the action, not only at the end.
- Use inclusive, neutral language.

### Example skeleton

```md
---
title: Invite a member to your workspace
description: Add a teammate and choose their role.
audience: Workspace owners and admins
---

# Invite a member to your workspace

Invite a teammate so they can access your workspace.

## Who can use this

Workspace owners and admins with the **Invite members** permission.

## Before you start

- You need an owner or admin role.
- Your plan must have an available seat.

## Steps

1. Open **Settings**.
2. Select **Members**.
3. Select **Invite member**.
4. Enter the teammate's email address.
5. Choose a role.
6. Select **Send invitation**.

The teammate appears in the member list with the status **Invited**.

## Troubleshooting

### "No seats available"

Your plan has reached its member limit. Remove a member or upgrade the plan.

## Related guides

- [Roles and permissions](/docs/concepts/roles)
- [Manage member access](/docs/guides/manage-access)
```

## Step 6 — Add screenshots

Use the `documentation-screenshots` skill. For each workflow:

1. Capture the starting state.
2. Capture the action that needs visual clarification.
3. Capture the result.
4. Crop to the relevant area; do not include real customer data.
5. Add alt text that describes the task context, not the pixels.
6. Reference the image next to the step it supports.

Screenshots supplement instructions; they do not replace exact labels.

## Step 7 — Validate

1. Every navigation label exists in the current UI.
2. Every route resolves.
3. Permissions and prerequisites match the authorization code.
4. Steps can be completed in a clean test account.
5. Expected results match the running app.
6. Screenshots are current and contain synthetic data only.
7. Internal links resolve; external links are intentional.
8. No internal paths, secrets, prompts, feature-flag names, or admin runbooks
   appear in public content.
9. Search finds the primary articles.
10. The article is reachable from navigation.

Run:

```sh
node ~/.documentation-toolkit/scripts/audit-project.mjs --root . --domain user
```

## Step 8 — Publish safely

- Do not deploy, publish, or push without explicit authorization.
- Verify the public build does not include `openwiki/`, internal docs, source
  maps with secrets, or admin routes.
- Check `robots.txt`, sitemap, canonical URLs, and redirects.
- Confirm authentication is not required for public guides unless intended.
- Confirm search indexing settings.

## Content model and frontmatter

Use project-defined frontmatter if one exists. Otherwise:

```yaml
---
title: Invite a member
description: Add a teammate and choose their role.
audience: Workspace owners and admins
permissions:
  - members:invite
screenshots:
  - /assets/screenshots/members/invite-member.png
updated: 2026-11-11
---
```

Keep frontmatter validated. Do not add fields the framework does not support.

## Output contract

```text
FRAMEWORK: <existing|fumadocs|mkdocs|docusaurus|...>
AUDIENCE: <roles>
ARTICLES: created=<n> updated=<n>
JOURNEYS: <list>
SCREENSHOTS: captured=<n> reused=<n> needed=<n>
VALIDATION: <result>
PUBLIC SAFETY: pass|fail — <evidence>
```

See `references/guide-template.md`, `references/adapter-selection.md`, and
`references/public-safety.md`.
