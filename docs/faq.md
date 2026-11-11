# FAQ

## Is DocsForge a documentation generator?

It is a documentation **system**. OpenWiki generates and maintains the
engineering wiki. Agents write customer guides. Playwright captures screenshots.
DocsForge provides the installation, routing, adapters, validation, and
maintenance workflow around those tools.

## Do I need both OpenCode and Oh My Pi?

No. Install into either host:

```sh
node ~/.documentation-toolkit/scripts/docs-toolkit.mjs install --host opencode
node ~/.documentation-toolkit/scripts/docs-toolkit.mjs install --host omp
```

`--host all` installs both.

## Does it work on Windows?

Yes. The Node scripts are cross-platform and PowerShell wrappers are provided.
No administrator rights or symlinks are required.

## Does it install Fumadocs globally?

No. Fumadocs, MkDocs, Docusaurus, Nextra, Starlight, and VitePress are project
dependencies. DocsForge selects and configures the appropriate adapter.

## Does every project get a Help Center?

No. If the product has no customer-facing browser UI, DocsForge marks customer
docs and screenshots `NOT APPLICABLE` and avoids installing an unnecessary
Help Center.

## Does every project get screenshots?

Only browser-based products with a real UI. API, CLI, and library projects do
not get a Playwright harness.

## Can it use our existing docs framework?

Yes. Preserving a working Help Center is the first adapter choice. DocsForge
does not migrate without a concrete reason.

## Does it overwrite my `AGENTS.md`?

No. It merges a managed block:

```md
<!-- DOCUMENTATION:START -->
...
<!-- DOCUMENTATION:END -->
```

Text outside the markers is preserved.

## Does it overwrite my existing docs?

The initializer creates infrastructure. It preserves:

- existing `openwiki/INSTRUCTIONS.md`;
- existing `.openwikiignore`;
- existing screenshot inventory;
- existing screenshot specs;
- existing guides;
- existing unrelated configuration.

Use `--force` only when you intend to regenerate managed scaffold files.

## Does OpenWiki mix repositories?

No. Each repository has its own `openwiki/` and Claims. Linked workspaces are an
explicit read-only feature of OpenWiki, not an automatic merge.

## How does scheduled sync avoid editing source?

The generated CI workflow restricts changes to documentation paths through
`add-paths` or an equivalent path guard. It never auto-merges.

## Are screenshots AI-generated?

Never. DocsForge captures real screenshots from the running application with
Playwright. Mockups are prohibited.

## Can I use production data in screenshots?

No. Use synthetic demo data and a dedicated test user.

## How do I update DocsForge?

```sh
cd ~/.documentation-toolkit
git pull
node scripts/docs-toolkit.mjs sync --host all
node scripts/docs-toolkit.mjs verify
```

## How do I uninstall?

See [Uninstall and backups](operations/uninstall.md).

## Where is the source?

<https://github.com/saidrassai/docsforge>

## What license is it under?

MIT. See <https://github.com/saidrassai/docsforge/blob/main/LICENSE>.
