# Contributing

Issues and pull requests are welcome.

## Ground rules

- Keep skills, agents, and commands canonical in the repository.
- Installed host copies are generated artifacts.
- Never fabricate screenshots, product behavior, permissions, or architecture.
- Keep internal engineering docs and public customer docs separate.
- Preserve unrelated host configuration and user content.
- Do not commit secrets, production data, or customer data.

## Development setup

Requirements:

- Node.js ≥ 22.22.0
- Git
- At least one of OpenCode or Oh My Pi for live checks

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
| Skill behavior | `skills/<id>/SKILL.md` and references |
| Agent behavior | `agents/prompts/<role>.md` |
| Host frontmatter | `agents/agents.json` |
| Slash command | `commands/bodies/<name>.md` and `commands/commands.json` |
| Framework guidance | `adapters/<adapter>/ADAPTER.md` |
| Project scaffolding | `templates/` and `scripts/init-project.mjs` |
| Audit rules | `scripts/audit-project.mjs` |
| Stack detection | `scripts/detect-stack.mjs` |
| Config contract | `schemas/config.schema.json` and `scripts/validate-config.mjs` |
| Docs site | `docs/` and `mkdocs.yml` |

## Pull request checklist

- [ ] `node scripts/check-syntax.mjs`
- [ ] `node scripts/self-test.mjs`
- [ ] `node scripts/docs-toolkit.mjs verify`
- [ ] `node scripts/verify-hosts.mjs` (if hosts are available)
- [ ] Skills remain portable `SKILL.md` files
- [ ] No project-specific content added to the global toolkit
- [ ] No secrets, customer data, or fabricated screenshots
- [ ] README/CHANGELOG updated when behavior changes

## Reporting bugs

Open an issue with:

- OS and Node version;
- OpenCode/OMP version;
- the command you ran;
- expected and actual behavior;
- relevant log lines with secrets redacted.

## Security

Do not open a public issue for a vulnerability. See [Security](security.md).
