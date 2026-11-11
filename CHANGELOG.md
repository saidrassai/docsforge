# Changelog

All notable changes to DocsForge are recorded here.
This project follows [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-11-11

### Added

- Canonical global toolkit at `~/.documentation-toolkit`.
- Six Agent Skills: `docs-orchestrator`, `codebase-documentation`,
  `user-documentation`, `documentation-screenshots`, `documentation-audit`,
  and `documentation-bootstrap`.
- Four reusable agents: `documentation-architect`, `documentation-writer`,
  `documentation-auditor`, and `screenshot-specialist`.
- Six global commands: `/docs-init`, `/docs-sync`, `/docs-audit`, `/docs-code`,
  `/docs-user`, and `/docs-screenshots`.
- Cross-host installer/synchronizer for OpenCode and Oh My Pi, with manifest
  hashing, timestamped backups, status checks, and safe uninstall.
- OpenWiki installation and host integration for OpenCode and Oh My Pi,
  including OpenWiki MCP tooling.
- Framework adapters for Next.js/Fumadocs, React, Python/MkDocs, Node.js,
  static sites, existing documentation frameworks, and projects without a UI.
- Project bootstrap with `.documentation/config.yml`, `openwiki/`,
  user-doc scaffolding, Playwright screenshot harness, `AGENTS.md` policy
  merge, and CI templates.
- Deterministic project audit, config validation, stack detection, and
  documentation-impact scripts.
- PowerShell and POSIX wrappers for Windows, WSL, Linux, and macOS.
- Security, licensing, backup, restore, and uninstall documentation.
