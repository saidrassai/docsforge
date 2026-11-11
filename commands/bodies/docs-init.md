Load the `documentation-bootstrap` and `docs-orchestrator` skills.

Initialize documentation infrastructure for the Git repository that contains
the current working directory. Do not initialize or modify documentation for
any other repository.

Arguments: $ARGUMENTS
If an argument is a path, it must resolve inside the current Git root. If the
argument is `--dry-run`, stop after the preview.

Steps:

1. Run `git rev-parse --show-toplevel`. If this is not a Git repository, stop
   and ask whether to initialize Git. Do not write outside the root.
2. Read existing `AGENTS.md`, `CLAUDE.md`, `.documentation/config.yml`,
   `openwiki/`, and any docs directory. Preserve unrelated content.
3. Run:
   `node ~/.documentation-toolkit/scripts/detect-stack.mjs --root . --json`
   Verify the detected stack, product type, UI presence, docs framework, E2E
   tooling, and CI host.
4. Run `init-project.mjs --root . --dry-run` and review the proposed changes.
5. Apply with `init-project.mjs --root .` unless the user requested dry-run.
6. Confirm the project config validates:
   `node ~/.documentation-toolkit/scripts/validate-config.mjs --root .`
7. Create or preserve `openwiki/INSTRUCTIONS.md` with a project-specific brief.
   Do not generate the wiki itself unless the user asked for content.
8. Select a user-docs framework using the adapter decision order. Preserve an
   existing Help Center. Do not install Fumadocs/MkDocs globally.
9. Configure the docs-only Playwright harness only when a browser UI exists.
10. Merge the documentation policy into `AGENTS.md` without replacing existing
    instructions.
11. Add CI only for the repository's existing CI host. Never create a second CI
    platform.
12. Run an initial audit:
    `node ~/.documentation-toolkit/scripts/audit-project.mjs --root . --json`
13. Report using the orchestrator output contract. Include what was skipped and
    the single smallest next action.

Do not commit, push, publish, deploy, or create fake guides/screenshots.
