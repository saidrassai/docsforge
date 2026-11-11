# Security policy

## Supported versions

| Version | Supported |
| --- | --- |
| 1.x | Yes |
| < 1.0 | No |

## Reporting a vulnerability

Please **do not** open a public issue for a security vulnerability.

Report privately through GitHub Security Advisories:

<https://github.com/saidrassai/docsforge/security/advisories/new>

Include:

- affected version;
- operating system and host (OpenCode/OMP);
- reproduction steps;
- impact;
- any suggested fix.

You should receive an acknowledgement within a reasonable time. Please avoid
public disclosure until a fix is available.

## Security model

DocsForge manages local developer tooling. It does not host a service and does
not transmit project documentation.

### What DocsForge does

- Copies skills, agents, and commands into local host configuration.
- Backs up files before overwriting them.
- Records managed files by SHA-256 hash for exact uninstall.
- Registers OpenWiki as an MCP server through OpenWiki’s own integration
  command.
- Writes project-local configuration and documentation infrastructure.
- Never commits, pushes, publishes, deploys, or merges.

### What DocsForge does not do

- It does not collect or upload project source, docs, or screenshots.
- It does not require a hosted account or paid service.
- It does not store credentials in project files.
- It does not bypass host permissions or approval prompts.

## Sensitive data rules

Never commit or publish:

- API keys, tokens, cookies, or connection strings;
- `.env` values;
- production customer data;
- screenshots containing real users, emails, billing details, or IDs;
- internal runbooks, prompts, or architecture in a public Help Center;
- private keys or certificates.

Use synthetic demo data for screenshots. Use a dedicated test account. Keep
credentials in environment variables or a secret manager.

## OpenWiki telemetry

OpenWiki collects anonymous aggregate usage data by default. It does not send
file contents, repository names, prompts, model output, or credentials.

Disable it with either:

```sh
export OPENWIKI_TELEMETRY_DISABLED=1
export DO_NOT_TRACK=1
```

The generated CI workflow sets `OPENWIKI_TELEMETRY_DISABLED=1`.

## Native dependencies

OpenWiki depends on `better-sqlite3`, a native module. Prebuilt binaries are
normally used. On Windows, if no matching prebuild is available, install Visual
Studio Build Tools with the Desktop development with C++ workload.

## Dependency review

- DocsForge: MIT, no runtime dependencies.
- OpenWiki: MIT.
- Playwright: Apache-2.0.
- Fumadocs, MkDocs, Docusaurus, Nextra, Starlight, VitePress: permissive
  open-source licenses; each consuming project must review its own tree.

Run:

```sh
node scripts/docs-toolkit.mjs licenses
```
