# Screenshot inventory

The inventory prevents orphaned images and unnecessary regeneration.

## Schema

```yaml
version: 1
screenshots:
  - id: <stable-id>
    guide: <relative path to the article using it>
    route: <application route>
    role: <test role>
    spec: <relative path to the Playwright spec>
    output: <relative path to the image>
    captured: <YYYY-MM-DD>
    status: current | stale | missing
    notes: <optional>
```

## Rules

- `id` is unique and never reused for a different image.
- `guide` must contain a Markdown image reference to `output`.
- `spec` must exist and contain a screenshot call writing `output`.
- `route` is used to find affected screenshots after UI changes.
- `captured` is the date the current image was produced.
- `status` is updated by the capture workflow, not guessed.

## Audit checks

- Inventory entry with a missing output file → HIGH.
- Image referenced by a guide but absent from inventory → MEDIUM.
- Inventory entry whose guide does not reference the image → LOW.
- Spec missing → HIGH.
- Route no longer exists → HIGH.
- `captured` older than the last change to the route/component → MEDIUM
  (verify manually; do not auto-delete).
- Screenshot contains a known secret pattern → CRITICAL.

## Change mapping

When a UI file changes, map it to screenshots by:

1. Route string in the component or router.
2. `data-testid` / label strings shared with the spec.
3. Import graph from the changed component to a page.
4. Explicit `route` in the inventory.

Regenerate only the matching entries. If mapping is uncertain, audit the guide
visually before regenerating.
