# API reference: <surface>

## Authentication

<Mechanism, session/token lifecycle, source reference.>

## Authorization

<Permission model and enforcement point.>

## Endpoints

### `<METHOD> <path>`

- **Purpose:** <description>
- **Auth:** <required/optional>
- **Permission:** <permission>
- **Request:** <schema or fields>
- **Response:** <schema or fields>
- **Errors:** <status + code + meaning>
- **Idempotency:** <behavior>
- **Rate limit:** <limit>
- **Source:** `<path#Lx-Ly>`

## Error model

| Status | Code | Meaning | Client action |
| --- | --- | --- | --- |
| 400 | <code> | <meaning> | <action> |

## Examples

```http
POST /api/v1/<resource>
Content-Type: application/json

{
  "field": "value"
}
```

## Versioning and deprecation

- <Policy and source>
