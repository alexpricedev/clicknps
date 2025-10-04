# ClickNPS API Documentation

## Overview

ClickNPS provides a simple API for generating one-click NPS survey links. This MVP implementation includes:

- **API key authentication** - Secure access to your account
- **Link minting** - Generate unique survey links for each score (0-10)
- **Response capture** - Automatic deduplication and comment collection
- **Privacy-first design** - No PII storage, only your opaque identifiers

## Quick Start

### 1. Get an API Key

Currently, API keys need to be created directly in the database. This will be moved to the dashboard in a future version.

```sql
-- Replace 'your-business-id' with your actual business UUID
INSERT INTO api_keys (business_id, key_hash, name) 
VALUES ('your-business-id', 'your-hashed-key', 'My API Key');
```

### 2. Mint Survey Links

**Endpoint:** `POST /api/v1/links/mint`

**Headers:**
```
Authorization: Bearer ck_your_api_key_here
Content-Type: application/json
```

**Request Body:**
```json
{
  "survey_id": "onboarding_survey",
  "subject_id": "user_123",
  "ttl_days": 30
}
```

**Response:**
```json
{
  "links": {
    "0": "http://localhost:3000/r/abc123...",
    "1": "http://localhost:3000/r/def456...",
    "2": "http://localhost:3000/r/ghi789...",
    ...
    "10": "http://localhost:3000/r/xyz789..."
  },
  "expires_at": "2025-10-19T12:00:00.000Z",
  "response": null
}
```

**Note:** This endpoint is **idempotent**. Calling it multiple times with the same `survey_id` and `subject_id` will return the same links. The `response` field will be `null` if the subject has not yet responded, or will contain the score (0-10) if they have already submitted a response.

### 3. Embed in Email

Use the links in your email templates:

```html
<p>How likely are you to recommend us to a friend?</p>
<div style="display: flex; gap: 5px;">
  <a href="{{link_0}}" style="padding: 8px 12px; background: #ef4444; color: white; text-decoration: none; border-radius: 4px;">0</a>
  <a href="{{link_1}}" style="padding: 8px 12px; background: #f97316; color: white; text-decoration: none; border-radius: 4px;">1</a>
  <!-- ... continue for scores 2-9 ... -->
  <a href="{{link_10}}" style="padding: 8px 12px; background: #22c55e; color: white; text-decoration: none; border-radius: 4px;">10</a>
</div>
```

### 4. Handle Responses

When users click a link:

1. **First click** - Response is recorded and user sees thank-you page
2. **Optional comment** - User can add feedback on the thank-you page  
3. **Subsequent clicks** - Ignored (deduplication)

## API Reference

### Authentication

All API requests require a Bearer token in the Authorization header:

```
Authorization: Bearer ck_your_api_key_here
```

### POST /api/v1/links/mint

Generate NPS survey links for a specific survey and subject.

**Parameters:**

- `survey_id` (string, required) - Your survey identifier (alphanumeric, underscores, hyphens only)
- `subject_id` (string, required) - Your subject identifier (alphanumeric, underscores, hyphens only)  
- `ttl_days` (integer, optional) - Link expiration in days (1-365, default: 30)

**Responses:**

- `201 Created` - Links generated successfully
- `400 Bad Request` - Invalid parameters
- `401 Unauthorized` - Invalid or missing API key
- `404 Not Found` - Business not found
- `500 Internal Server Error` - Server error

### GET /r/:token

Response capture endpoint. Users click these links to submit their NPS score.

**Behavior:**

- Records the response (first click only)
- Shows thank-you page with optional comment form
- Subsequent clicks show "already responded" message

## Data Model

### Survey Links

Each minted survey generates 11 unique links (scores 0-10):

- **Unique tokens** - Cryptographically secure, URL-safe
- **Score mapping** - Each token maps to a specific score (0-10)
- **Expiration** - Links expire after the specified TTL
- **Deduplication** - Only first response per subject per survey counts

### Responses

When a user clicks a link:

- **Response record** - Links the survey link to a timestamp
- **Optional comment** - Users can add free-text feedback
- **No PII** - Only your `survey_id` and `subject_id` are stored

## Example Workflow

```bash
# 1. Mint links for a survey
curl -X POST http://localhost:3000/api/v1/links/mint \
  -H "Authorization: Bearer ck_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "survey_id": "post_purchase",
    "subject_id": "order_12345",
    "ttl_days": 7
  }'

# 2. User clicks link (e.g., score 9)
# GET http://localhost:3000/r/generated_token_for_score_9

# 3. Response is recorded and user sees thank-you page
# 4. User optionally adds comment via form submission
```

## Error Handling

The API returns standard HTTP status codes:

- `200-299` - Success
- `400-499` - Client errors (bad request, unauthorized, not found)
- `500-599` - Server errors

All error responses include a JSON body with an `error` field:

```json
{
  "error": "Missing required fields: survey_id and subject_id"
}
```

## Rate Limiting

Currently no rate limiting is implemented. This will be added in a future version.

## Security

- **API keys** - Stored as HMAC-SHA256 hashes
- **HTTPS only** - All production traffic should use HTTPS
- **No PII** - Only your opaque identifiers are stored
- **Token security** - Survey tokens are cryptographically secure random strings