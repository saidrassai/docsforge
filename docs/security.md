# Security

## Reporting

Do not open a public issue for a vulnerability.

Report privately through GitHub Security Advisories:

<https://github.com/saidrassai/docsforge/security/advisories/new>

Include:

- affected version;
- operating system and host;
- reproduction steps;
- impact;
- suggested fix.

## Security model

DocsForge manages local developer tooling. It does not host a service and does
not transmit project documentation.

### What it does

- copies skills, agents, and commands into local host configuration;
- backs up files before overwriting them;
- records managed files by SHA-256 hash;
- registers OpenWiki through OpenWiki’s own integration command;
- writes project-local documentation infrastructure;
- never commits, pushes, publishes, deploys, or merges.

### What it does not do

- collect or upload source, docs, or screenshots;
- require a hosted account or paid service;
- store credentials in project files;
- bypass host permissions or approval prompts.

## Sensitive data

Never commit or publish:

- API keys, tokens, cookies, or connection strings;
- `.env` values;
- production customer data;
- screenshots containing real users, emails, billing details, or IDs;
- internal runbooks, prompts, or architecture in a public Help Center;
- private keys or certificates.

Use synthetic demo data. Use a dedicated test account. Keep credentials in
environment variables or a secret manager.

## Public and internal separation

| Content | Location | Visibility |
| --- | --- | --- |
| Architecture, APIs, schema, runbooks | `openwiki/` | Internal |
| Customer guides | configured user-docs directory | Public |
| Screenshots | `docs/assets/screenshots/` | Public, synthetic data |
| Audit reports | `.documentation/audit/` | Internal |
| CI config | `.github/` or `.gitlab-ci.yml` | Internal |

Never import `openwiki/` into a public docs build. Never link a public route to
an internal directory.

## Audit checks

The deterministic audit detects:

- public references to `openwiki/`;
- possible private keys, API secrets, AWS keys, GitHub tokens, and Slack tokens;
- internal-only markers in public content;
- localhost URLs in customer docs;
- tracked `.env` files;
- missing screenshots and stale capture dates;
- inconsistent inventory entries;
- auto-merge configuration;
- unrestricted documentation workflows.

## OpenWiki telemetry

OpenWiki collects anonymous aggregate usage data by default. It does not send
file contents, repository names, prompts, model output, or credentials.

Disable it with:

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

| Component | License |
| --- | --- |
| DocsForge | MIT |
| OpenWiki | MIT |
| Playwright | Apache-2.0 |
| Fumadocs | MIT |
| MkDocs | BSD-2-Clause |
| Material for MkDocs | MIT |
| Docusaurus | MIT |
| Nextra | MIT |
| Astro Starlight | MIT |
| VitePress | MIT |

Run:

```sh
node scripts/docs-toolkit.mjs licenses
```

See the repository [SECURITY.md](https://github.com/saidrassai/docsforge/blob/main/SECURITY.md)
for the full policy.
