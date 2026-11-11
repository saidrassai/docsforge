# No customer-facing UI

If the product is an API, CLI, library, background service, or internal system
without a customer-facing browser UI:

- Do not install a Help Center.
- Do not install Playwright for documentation screenshots.
- Do not create fake UI guides.
- Mark `user_docs.enabled` and `screenshots.enabled` as `false` unless the
  project has a real documentation surface.

## Appropriate documentation

- README quick start
- Installation and configuration
- Task-oriented guides for developers/operators
- API/CLI/library reference
- Troubleshooting
- Architecture and operations in `openwiki/`

## Validation

- Commands in the docs are executable.
- Examples are tested or generated from source.
- Version compatibility is stated.
- No invented output.
