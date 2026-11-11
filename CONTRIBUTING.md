# Contributing to DocsForge

Thanks for helping improve documentation infrastructure for coding agents.

## Ground rules

- Keep skills, agents, and commands canonical in this repository.
- The installed copies under `~/.config/opencode` and `~/.omp/agent` are
  generated artifacts. Do not edit them as the source of truth.
- Never fabricate screenshots, product behavior, permissions, or architecture.
- Keep internal engineering docs and public customer docs separate.
- Preserve unrelated host configuration and user content.
- Do not commit secrets, production data, or customer data.

## Development setup

Requirements:

- Node.js ≥ 22.22.0
- Git
- At least one of OpenCode or Oh My Pi for live discovery checks

```sh
git clone https://github.com/saidrassai/docsforge.git
cd docsforge

node scripts/check-syntax.mjs
node scripts/self-test.mjs
```

Install into local hosts while developing:

```sh
node scripts/docs-toolkit.mjs sync --host all
node scripts/docs-toolkit.mjs verify
node scripts/verify-hosts.mjs
```

## What to change

| Change | Edit |
| --- | --- |
| Skill behavior | `skills/<id>/SKILL.md` and `skills/<id>/references/` |
| Agent behavior | `agents/prompts/<role>.md` |
| Host frontmatter | `agents/agents.json` |
| Slash command | `commands/bodies/<name>.md` and `commands/commands.json` |
| Framework guidance | `adapters/<adapter>/ADAPTER.md` |
| Project scaffolding | `templates/` and `scripts/init-project.mjs` |
| Audit rules | `scripts/audit-project.mjs` |
| Stack detection | `scripts/detect-stack.mjs` |
| Config contract | `schemas/config.schema.json` and `scripts/validate-config.mjs` |

After changing skills, agents, or commands:

```sh
node scripts/docs-toolkit.mjs sync --host all
node scripts/docs-toolkit.mjs verify
```

## Adding a skill

1. Create `skills/<lowercase-kebab-id>/SKILL.md`.
2. Use frontmatter:

   ```yaml
   ---
   name: <same-as-directory>
   description: <what it does and when to use it>
   license: MIT
   compatibility: OpenCode, Oh My Pi, Agent Skills
   ---
   ```

3. Keep the body operational: inputs, procedure, evidence rules, validation,
   output contract, and boundaries.
4. Add references under `skills/<id>/references/` if they are reusable.
5. Run `sync` and `verify`. OMP requires `name` to match the directory.

## Adding an agent

1. Add a prompt at `agents/prompts/<role>.md`.
2. Add an entry to `agents/agents.json` with:
   - `id`
   - `description`
   - `prompt`
   - OpenCode `mode` and permissions
   - OMP `tools`
3. Run `sync` and `verify`.

## Adding a command

1. Add a body at `commands/bodies/<name>.md`.
2. Add an entry to `commands/commands.json`.
3. Use `$ARGUMENTS` for the full argument string.
4. Do not put `template` in Markdown frontmatter; the body is the template.
5. Run `sync` and `verify`.

## Adding an adapter

1. Create `adapters/<id>/ADAPTER.md`.
2. Cover detection, install scope, content root, navigation/search, versioning,
   security, and validation.
3. Update `adapters/manifest.json`.
4. Add templates under `templates/adapters/` if scaffolding is useful.
5. Update `detect-stack.mjs` if detection is automatic.

## Pull request checklist

- [ ] `node scripts/check-syntax.mjs` passes
- [ ] `node scripts/self-test.mjs` passes
- [ ] `node scripts/docs-toolkit.mjs verify` passes
- [ ] `node scripts/verify-hosts.mjs` passes (if hosts are available)
- [ ] Skills remain portable `SKILL.md` files
- [ ] No project-specific content was added to the global toolkit
- [ ] No secrets, customer data, or fabricated screenshots were added
- [ ] README/CHANGELOG updated when behavior changes

## Reporting bugs

Open an issue with:

- OS and Node version
- OpenCode/OMP version
- the command you ran
- expected and actual behavior
- relevant log lines with secrets redacted

## Security

Do not open a public issue for a vulnerability. See [SECURITY.md](SECURITY.md).
