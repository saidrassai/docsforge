# Fumadocs staging

These files are references, not an automatic installer. Fumadocs APIs change;
follow the version-matched documentation at <https://www.fumadocs.dev/>.

Before applying:

1. Confirm the Next.js router and version.
2. Check for an existing `/docs` route, middleware, rewrites, or catch-all.
3. Add the Fumadocs packages with the project's package manager.
4. Adapt import aliases and file paths.
5. Build and test the route.
6. Add redirects if the URL changes.

Never apply these files directly over an existing docs implementation.
