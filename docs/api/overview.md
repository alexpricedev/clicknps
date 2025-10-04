# API Overview

The ClickNPS API is organized around REST principles. Our API has predictable resource-oriented URLs, accepts JSON-encoded request bodies, returns JSON-encoded responses, and uses standard HTTP response codes.

## Base URL

```
https://api.clicknps.com/v1
```

## Authentication

The ClickNPS API uses API keys to authenticate requests. You can view and manage your API keys in the [Dashboard](/settings/api-keys).

```bash
curl https://api.clicknps.com/v1/surveys \
  -H "Authorization: Bearer YOUR_API_KEY"
```

> 🔑 **API Key Format:** All API keys start with `sk_live_` for production or `sk_test_` for test mode.

## Rate Limits

| Plan | Requests/min | Requests/hour |
|------|--------------|---------------|
| Free | 60 | 1,000 |
| Pro | 600 | 10,000 |
| Enterprise | Unlimited | Unlimited |

When you exceed the rate limit, the API returns a `429 Too Many Requests` response:

```json
{
  "error": {
    "type": "rate_limit_exceeded",
    "message": "Rate limit exceeded. Retry after 60 seconds."
  }
}
```

## Endpoints

### Surveys

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/v1/surveys` | List all surveys |
| `POST` | `/v1/surveys` | Create a survey |
| `GET` | `/v1/surveys/:id` | Get survey details |
| `PATCH` | `/v1/surveys/:id` | Update a survey |
| `DELETE` | `/v1/surveys/:id` | Delete a survey |

### Responses

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/v1/responses` | List all responses |
| `GET` | `/v1/responses/:id` | Get response details |
| `POST` | `/v1/responses/:id/comment` | Add a comment |

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/v1/webhooks` | List webhooks |
| `POST` | `/v1/webhooks` | Create webhook |
| `DELETE` | `/v1/webhooks/:id` | Delete webhook |

## Request Format

All POST and PATCH requests must include a `Content-Type: application/json` header:

```bash
curl -X POST https://api.clicknps.com/v1/surveys \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Survey",
    "question": "How likely are you to recommend us?"
  }'
```

## Response Format

All responses are returned in JSON format:

```json
{
  "id": "survey_abc123",
  "name": "My Survey",
  "question": "How likely are you to recommend us?",
  "created_at": "2025-01-15T10:30:00Z",
  "status": "active"
}
```

## Error Handling

The API uses conventional HTTP response codes:

| Code | Description |
|------|-------------|
| `200` | Success |
| `201` | Created successfully |
| `400` | Bad request (invalid parameters) |
| `401` | Unauthorized (invalid API key) |
| `403` | Forbidden (insufficient permissions) |
| `404` | Not found |
| `429` | Rate limit exceeded |
| `500` | Server error |

### Error Response

```json
{
  "error": {
    "type": "validation_error",
    "message": "Invalid survey name",
    "field": "name"
  }
}
```

## Pagination

List endpoints support pagination using `limit` and `offset` parameters:

```bash
curl "https://api.clicknps.com/v1/surveys?limit=10&offset=20" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Response includes pagination metadata:

```json
{
  "data": [...],
  "pagination": {
    "total": 45,
    "limit": 10,
    "offset": 20,
    "has_more": true
  }
}
```

## Idempotency

POST requests support idempotency keys to safely retry requests:

```bash
curl -X POST https://api.clicknps.com/v1/surveys \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Idempotency-Key: unique-key-123" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

## Versioning

The API version is included in the URL path (`/v1/`). We maintain backwards compatibility and will notify you of any breaking changes at least 6 months in advance.

## SDKs

Official SDKs are available for:

- **JavaScript/TypeScript** - `npm install @clicknps/sdk`
- **Python** - `pip install clicknps`
- **Ruby** - `gem install clicknps`
- **Go** - `go get github.com/clicknps/go-sdk`

## Need Help?

- [Installation Guide](/docs/installation)
- [API Reference (detailed)](/docs/api/reference)
- [Support](/settings/support)
