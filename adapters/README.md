# Adapters

A documentation adapter connects the toolkit's user-documentation workflow to
the project's actual Help Center framework.

Selection order:

1. Preserve a working Help Center.
2. Next.js → evaluate Fumadocs first.
3. Other React framework → Docusaurus, Nextra, Starlight, or VitePress.
4. Python-oriented → MkDocs.
5. Independent docs → dedicated static site.
6. No customer UI → no Help Center.

Each adapter describes:

- detection signals;
- install scope and exact packages;
- content directory and URL mapping;
- navigation/search/category behavior;
- versioning guidance;
- migration and redirects;
- validation commands;
- license and security notes.

Adapters never install globally and never modify application routes without
confirmation. Stage setup files under `.documentation/adapters/` first.
