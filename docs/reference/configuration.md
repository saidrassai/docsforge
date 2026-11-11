# Configuration

Every initialized repository gets `.documentation/config.yml`.

The file is validated by `scripts/validate-config.mjs` and the published schema:

<https://github.com/saidrassai/docsforge/blob/main/schemas/config.schema.json>

## Full example

```yaml
version: 1

project:
  name: acme-saas
  type: saas

codebase:
  enabled: true
  engine: openwiki
  output: openwiki/
  instructions: openwiki/INSTRUCTIONS.md
  ignore_file: .openwikiignore

user_docs:
  enabled: true
  framework: fumadocs
  audience:
    - workspace owner/admin
    - end user
  content_directory: content/docs
  base_path: /docs
  public_url: https://docs.example.com

screenshots:
  enabled: true
  engine: playwright
  source: application
  demo_data: synthetic
  config: playwright.docs.config.ts
  content_directory: docs/assets/screenshots
  inventory: .documentation/screenshots/inventory.yml
  base_url: http://127.0.0.1:3000

automation:
  agent_completion_sync: true
  daily_ci_sync: true
  automatic_merge: false
  ci_provider: github
  docs_only_paths:
    - openwiki/
    - content/docs/
    - docs/assets/screenshots/
    - .documentation/
    - AGENTS.md
    - playwright.docs.config.ts

security:
  internal_docs_public: false
  production_data_in_screenshots: false
  secrets_in_docs: false
```

## Top-level fields

| Field | Required | Purpose |
| --- | --- | --- |
| `version` | Yes | Must be `1` |
| `project` | No | Name, type, description |
| `codebase` | No | OpenWiki engineering documentation |
| `user_docs` | No | Customer-facing documentation |
| `screenshots` | No | Playwright capture settings |
| `automation` | No | Agent-completion sync and CI |
| `security` | No | Publication and data boundaries |

## `project`

| Field | Type | Notes |
| --- | --- | --- |
| `name` | string | Defaults to the package/repository name |
| `type` | string | `saas`, `web-app`, `api`, `cli`, `library`, `mobile`, `desktop`, `internal-tool`, `docs-site` |
| `description` | string | Optional |

## `codebase`

| Field | Type | Notes |
| --- | --- | --- |
| `enabled` | boolean | Default `true` |
| `engine` | string | Only `openwiki` |
| `output` | string | Repository-relative output directory |
| `instructions` | string | OpenWiki brief path |
| `ignore_file` | string | OpenWiki read boundary |

## `user_docs`

| Field | Type | Notes |
| --- | --- | --- |
| `enabled` | boolean or `auto` | Whether customer docs are applicable |
| `framework` | string | `existing`, `fumadocs`, `nextra`, `docusaurus`, `starlight`, `vitepress`, `mkdocs`, `mintlify`, `gitbook`, `static`, `none` |
| `audience` | string or array | Primary roles |
| `content_directory` | string | Where guides live |
| `base_path` | string | Public URL path |
| `public_url` | string | Canonical public documentation URL |

## `screenshots`

| Field | Type | Notes |
| --- | --- | --- |
| `enabled` | boolean or `auto` | Only when a browser UI exists |
| `engine` | string | Only `playwright` |
| `source` | string | Only `application` |
| `demo_data` | string | Only `synthetic` |
| `config` | string | Docs-only Playwright config |
| `content_directory` | string | Screenshot asset directory |
| `inventory` | string | Screenshot inventory |
| `base_url` | string | Local/running application URL |

## `automation`

| Field | Type | Notes |
| --- | --- | --- |
| `agent_completion_sync` | boolean | Update docs before declaring implementation complete |
| `daily_ci_sync` | boolean | Scheduled docs-only PR/MR |
| `automatic_merge` | boolean | Must remain `false` by default |
| `ci_provider` | string | `auto`, `github`, `gitlab`, `bitbucket`, `none` |
| `docs_only_paths` | array | Paths the scheduled job may change |

## `security`

| Field | Safe value | Meaning |
| --- | --- | --- |
| `internal_docs_public` | `false` | Internal wiki must not be published |
| `production_data_in_screenshots` | `false` | Use synthetic data only |
| `secrets_in_docs` | `false` | Never store secrets in docs |

## Validation

```sh
node ~/.documentation-toolkit/scripts/validate-config.mjs --root . --json
```

The validator:

- rejects unknown engine values;
- rejects paths outside the repository;
- warns on unknown keys;
- warns on unsafe security settings;
- warns on `automatic_merge: true`.

Unknown keys are warnings, not hard failures, so a project can extend the
contract without waiting for a toolkit release.

## Overrides

Project configuration overrides global defaults. The global toolkit is not
modified when a project changes its own config.

`init-project.mjs` accepts explicit domain flags:

```sh
node ~/.documentation-toolkit/scripts/init-project.mjs --root . \
  --with-user-docs --with-screenshots --with-ci
```

Use `--force` to regenerate managed scaffold files. User content files such as
the screenshot inventory and specs are preserved.
