# CI automation

DocsForge adds automation only for the repository's existing CI host.

| Host | Output |
| --- | --- |
| GitHub | `.github/workflows/docs-check.yml`, `docs-sync.yml` |
| GitLab | `.documentation/ci/openwiki-update.gitlab-ci.yml` + include |
| Bitbucket | Staged custom pipeline |
| No recognized CI | Guidance only; no second CI platform |

## GitHub Actions

### Documentation check

Runs on pull requests, pushes, schedule, and manual dispatch.

It validates:

- `.documentation/config.yml`;
- documentation structure;
- deterministic audit output;
- screenshot references;
- the project-local toolkit scripts in `.documentation/toolkit/`.

### Documentation sync

Runs daily and on manual dispatch.

It:

1. checks out full history;
2. installs a pinned OpenWiki version;
3. runs `openwiki code --update --print`;
4. removes transient `.run.json`;
5. validates documentation;
6. opens a documentation-only PR;
7. never auto-merges;
8. fails visibly if OpenWiki fails.

`add-paths` is restricted to:

```text
openwiki
<user-docs content directory>
docs/assets/screenshots
.documentation/audit
AGENTS.md
```

## Secrets and variables

Provider credentials are separate from interactive agent sessions.

Example:

| Name | Kind | Purpose |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | Secret | Model provider |
| `OPENWIKI_PROVIDER` | Variable | Optional provider override |
| `OPENWIKI_MODEL_ID` | Variable | Optional model override |
| `LANGSMITH_API_KEY` | Secret | Optional tracing |

Screenshot CI may also need:

| Name | Kind |
| --- | --- |
| `DOCS_BASE_URL` | Variable |
| `DOCS_USER_EMAIL` | Secret |
| `DOCS_USER_PASSWORD` | Secret |

Never reuse interactive OAuth credentials in an unattended runner.

## Least privilege

The sync workflow needs:

```yaml
permissions:
  contents: write
  pull-requests: write
```

The check workflow needs only:

```yaml
permissions:
  contents: read
```

## No auto-merge

DocsForge never enables auto-merge during setup.

If a repository wants auto-merge later, it must:

1. enable GitHub auto-merge;
2. add branch protection or a ruleset;
3. require the checks that should gate generated docs;
4. decide whether human review is still required;
5. use a dedicated token with access only to documentation paths.

The default templates do not do this.

## GitLab

The staged include runs on a schedule or manually and opens a merge request.
It requires:

- `DOCS_GITLAB_TOKEN` with repository write and merge-request access;
- `OPENROUTER_API_KEY` or another provider key.

## Bitbucket

The staged custom pipeline requires:

- `OPENROUTER_API_KEY`;
- `DOCS_BITBUCKET_TOKEN` with repository write and pull-request access.

Enable a scheduled pipeline in Bitbucket repository settings.

## Optional screenshot workflow

A template exists at:

```text
templates/ci/github-actions/docs-screenshots.yml
```

It is not enabled by default because it needs:

- a deterministic docs screenshot suite;
- a dedicated test user;
- a CI-startable application;
- screenshot secrets.

## Failure behavior

- OpenWiki failure fails the job.
- Partial documentation is preserved in the PR/MR so the next run can resume.
- Transient `.run.json` is removed.
- The documentation check uploads an audit artifact.
