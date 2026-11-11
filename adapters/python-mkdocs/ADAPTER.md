# Python + MkDocs

Preferred adapter for Python-oriented products and standalone documentation.

- MkDocs: <https://www.mkdocs.org/>
- Material for MkDocs: <https://squidfunk.github.io/mkdocs-material/>
- License: BSD/MIT (verify current theme and plugins)
- Install scope: project virtual environment or docs build environment

## Detection

- `pyproject.toml`, `requirements.txt`, `manage.py`, `setup.py`.
- Existing `mkdocs.yml` → preserve and improve.
- No browser UI → prefer reference docs, not a Help Center with screenshots.

## Layout

```text
mkdocs.yml
docs/
  index.md
  getting-started/
  guides/
  concepts/
  reference/
  troubleshooting/
  assets/screenshots/
```

## Minimal `mkdocs.yml`

```yaml
site_name: <Product> Help
site_url: https://docs.example.com/
theme:
  name: material
  features:
    - navigation.sections
    - navigation.indexes
    - content.code.copy
    - search.suggest
plugins:
  - search
nav:
  - Home: index.md
  - Getting started:
      - getting-started/index.md
  - Guides:
      - guides/invite-member.md
  - Concepts:
      - concepts/roles.md
  - Troubleshooting:
      - troubleshooting/index.md
markdown_extensions:
  - admonition
  - attr_list
  - md_in_html
  - toc:
      permalink: true
```

## Setup

```sh
python -m venv .venv
. .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install mkdocs mkdocs-material
mkdocs serve
mkdocs build --strict
```

Pin versions in the project's dependency file for reproducible CI.

## Capabilities

- Navigation and sections
- Search
- Admonitions for warnings/prerequisites
- Code copy
- Responsive theme
- Image support
- Versioning via `mike` only if the product needs it

## Public safety

- `docs/` contains only public content.
- Never copy `openwiki/` into `docs/`.
- Keep operational runbooks in `openwiki/runbooks/`.
- Verify the built `site/` does not include internal files.

## Validation

```sh
mkdocs build --strict
node .documentation/toolkit/audit-project.mjs --root . --domain user
```

Check the built site locally, including search and mobile navigation.
