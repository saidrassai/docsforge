<!-- DOCUMENTATION:START -->
## Documentation

This repository uses the global DocsForge.

- Read `.documentation/config.yml` before documentation work.
- Engineering knowledge lives in `openwiki/` and is maintained with OpenWiki.
  It is **internal** and must not be published through the Help Center.
- Customer guides live in the directory configured by
  `user_docs.content_directory`. Verify labels, permissions, navigation, and
  expected results against the actual product.
- Screenshots must be real captures from the running application, produced with
  synthetic demo data. Never use AI-generated mockups or production customer
  data.
- When starting a meaningful coding task, read the relevant existing
  documentation and identify documentation impact. Do not run a full
  regeneration at startup.
- Before declaring a meaningful implementation task complete, update affected
  engineering knowledge, customer guides, and screenshots; validate them; and
  report documentation impact.
- Internal refactors that do not change behavior, contracts, architecture,
  security, schema, or workflows do not require public documentation changes.
- Use `/docs-sync`, `/docs-audit`, `/docs-code`, `/docs-user`, or
  `/docs-screenshots` for documentation work.
<!-- DOCUMENTATION:END -->
