# User documentation plan

This file describes the customer-facing documentation setup. It lives outside
the public content directory so it is never published.

The configured content directory is recorded in `.documentation/config.yml`
under `user_docs.content_directory`. It is separate from the internal
engineering wiki in `openwiki/`.

## Framework

The selected framework and rationale are recorded in
`.documentation/state.json` and `.documentation/adapters/recommendation.md`.
Do not invent product behavior to fill the content directory.

## Structure

```text
<content_directory>/
  index.*
  getting-started/
  guides/
  concepts/
  troubleshooting/
```

## Rules

- Verify labels, routes, permissions, and results against the running product.
- One primary task per article.
- Use real screenshots from `docs/assets/screenshots/`.
- Never publish internal architecture, secrets, prompts, or runbooks.
- Keep URLs stable; add redirects when moving pages.
- Templates live in `.documentation/templates/`.

## Next step

Run `/docs-user "<primary journey>"` to generate the first real guide, or
`/docs-screenshots` to set up screenshot capture.
