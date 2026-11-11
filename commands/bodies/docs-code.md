Load the `codebase-documentation` skill.

Work only on engineering documentation for the current Git repository, using
OpenWiki as the primary engine. Do not touch customer-facing guides.

Arguments: $ARGUMENTS
Interpret as a focus area, page, module, route, table, or question. If empty,
perform an incremental update focused on recent changes.

Steps:

1. Resolve the Git root. Read `.documentation/config.yml`,
   `openwiki/INSTRUCTIONS.md`, `openwiki/quickstart.md`, and the wiki index.
2. Check `.last-update.json` and recent changes. Identify impacted pages.
3. Use OpenWiki retrieval (`openwiki_search` / `openwiki_read`) for concrete
   questions; do not preload the whole wiki.
4. If the wiki is missing, initialize it through the OpenWiki lifecycle or the
   documented CLI. If provider credentials are unavailable, stop and report
   BLOCKED instead of inventing content.
5. Research the actual implementation with source, tests, migrations, config,
   and runtime evidence.
6. Update only affected pages. Reconcile Claims:
   confirm, revise, add, or retract with evidence.
7. Add or repair Mermaid diagrams only when grounded in real modules, routes,
   tables, or jobs.
8. Preserve source references (`path#Lx-Ly`).
9. Validate: lifecycle complete, no leftover `.run.json`, Claims consistent,
   links resolve, no secrets or ignored paths.
10. Report pages, Claims, evidence, skipped scope, and remaining gaps.

Do not document customer workflows here. Do not commit, push, publish, or
deploy.
