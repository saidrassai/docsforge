# Node.js adapter

Use for Node.js APIs, CLIs, libraries, and services without a customer-facing
browser UI.

## Recommended documentation

- `README.md` — install, quick start, primary example.
- `docs/` — task-oriented guides and reference.
- `openwiki/` — internal engineering knowledge.
- API reference generated from OpenAPI, TypeScript types, or route definitions
  where possible.
- CLI reference generated from the command parser's help output.

Do not install a browser Help Center or screenshot harness if there is no
browser UI.

## Structure

```text
README.md
docs/
  index.md
  getting-started.md
  guides/
  reference/
    api.md
    cli.md
    configuration.md
  troubleshooting.md
openwiki/
```

## API reference

Prefer generated artifacts:

- OpenAPI/Swagger → render or link the spec.
- TypeScript → generate from exported types when the toolchain supports it.
- GraphQL → use the schema.
- Route inventory → derive from the router, not from memory.

Keep examples executable. Run them in tests or a docs check.

## CLI reference

- Capture real `--help` output.
- Document exit codes.
- Document environment variables and config precedence.
- Provide a copy-paste quick start.
- Do not fabricate output.

## Validation

```sh
npm test
node .documentation/toolkit/audit-project.mjs --root . --domain user
```

For Markdown-only docs, a static site adapter is optional. If the repository
has no docs site, keep Markdown in `docs/` and link it from the README.
